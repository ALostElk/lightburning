/**
 * 食谱推荐核心算法
 * 基于用户目标、偏好和营养摄入情况进行智能推荐
 * 集成通义千问AI进行智能分析
 * 
 * 注意：本模块已优化为统一通过云函数调用，不再直接调用AI服务
 */

const api = require('./cloudApi.js');

class RecipeRecommendEngine {
  constructor() {
    this.app = getApp();
    this.useAI = true; // 是否启用AI分析
  }

  /**
   * 获取推荐食谱列表
   * @param {Object} options - 推荐选项
   * @returns {Array} 推荐的食谱列表
   */
  getRecommendedRecipes(options = {}) {
    const {
      type = 'goal', // goal: 基于目标, preference: 基于偏好, ai: 智能推荐
      limit = 10
    } = options;

    const allRecipes = this.getAllRecipes();
    const userInfo = wx.getStorageSync('userInfo') || {};
    const recentDietRecords = this.getRecentDietRecords(7); // 最近7天

    let scoredRecipes = allRecipes.map(recipe => {
      let score = 0;
      
      // 基于目标的评分
      if (type === 'goal' || type === 'ai') {
        score += this.calculateGoalScore(recipe, userInfo);
      }

      // 基于偏好的评分
      if (type === 'preference' || type === 'ai') {
        score += this.calculatePreferenceScore(recipe, userInfo);
      }

      // 基于营养缺口的评分（智能推荐）
      if (type === 'ai') {
        score += this.calculateNutritionGapScore(recipe, recentDietRecords);
      }

      return {
        ...recipe,
        recommendScore: score
      };
    });

    // 按评分排序并返回前N个
    scoredRecipes.sort((a, b) => b.recommendScore - a.recommendScore);
    return scoredRecipes.slice(0, limit);
  }

  /**
   * 计算基于目标的评分
   */
  calculateGoalScore(recipe, userInfo) {
    let score = 0;
    const goal = userInfo.goal || '减脂';

    if (goal === '减脂') {
      // 低热量高蛋白优先
      if (recipe.calories < 400) score += 30;
      else if (recipe.calories < 600) score += 20;
      else score += 5;

      if (recipe.protein > 20) score += 25;
      else if (recipe.protein > 15) score += 15;

      if (recipe.fat < 10) score += 15;
    } else if (goal === '保持体重') {
      // 营养均衡优先
      if (recipe.calories >= 400 && recipe.calories <= 700) score += 30;
      if (recipe.protein >= 15 && recipe.protein <= 30) score += 20;
      if (recipe.carbs >= 30 && recipe.carbs <= 60) score += 20;
    }

    return score;
  }

  /**
   * 计算基于偏好的评分
   */
  calculatePreferenceScore(recipe, userInfo) {
    let score = 0;
    const preferences = userInfo.dietaryPreferences || [];
    const allergens = userInfo.allergens || [];

    // 匹配用户偏好
    if (preferences.includes('不吃辣') && !recipe.tags.includes('辣味')) {
      score += 15;
    }
    if (preferences.includes('少油') && recipe.tags.includes('少油')) {
      score += 15;
    }
    if (preferences.includes('素食') && recipe.tags.includes('素食')) {
      score += 20;
    }

    // 排除过敏源
    const hasAllergen = recipe.ingredients.some(ing => 
      allergens.includes(ing.name)
    );
    if (hasAllergen) {
      score -= 100; // 严重扣分
    }

    // 基于用户历史常吃食物
    const favoriteIngredients = this.getUserFavoriteIngredients();
    const matchCount = recipe.ingredients.filter(ing =>
      favoriteIngredients.includes(ing.name)
    ).length;
    score += matchCount * 10;

    return score;
  }

  /**
   * 计算基于营养缺口的评分
   */
  calculateNutritionGapScore(recipe, recentDietRecords) {
    let score = 0;

    // 计算最近的平均营养摄入
    const avgNutrition = this.calculateAverageNutrition(recentDietRecords);
    const goals = {
      protein: this.app.globalData.dailyProteinGoal,
      carbs: this.app.globalData.dailyCarbGoal,
      fat: this.app.globalData.dailyFatGoal
    };

    // 如果蛋白质摄入不足，推荐高蛋白食谱
    if (avgNutrition.protein < goals.protein * 0.8) {
      if (recipe.protein > 20) score += 40;
    }

    // 如果碳水摄入过多，推荐低碳食谱
    if (avgNutrition.carbs > goals.carbs * 1.2) {
      if (recipe.carbs < 30) score += 30;
    }

    // 如果脂肪摄入过多，推荐低脂食谱
    if (avgNutrition.fat > goals.fat * 1.2) {
      if (recipe.fat < 8) score += 30;
    }

    return score;
  }

  /**
   * 获取最近N天的饮食记录
   */
  getRecentDietRecords(days = 7) {
    const allRecords = wx.getStorageSync('dietRecords') || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= cutoffDate;
    });
  }

  /**
   * 计算平均营养摄入
   */
  calculateAverageNutrition(records) {
    if (records.length === 0) {
      return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    }

    const total = records.reduce((acc, record) => {
      acc.protein += record.protein || 0;
      acc.carbs += record.carbs || 0;
      acc.fat += record.fat || 0;
      acc.calories += record.calories || 0;
      return acc;
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

    const count = records.length;
    return {
      protein: total.protein / count,
      carbs: total.carbs / count,
      fat: total.fat / count,
      calories: total.calories / count
    };
  }

  /**
   * 获取用户常吃的食材
   */
  getUserFavoriteIngredients() {
    const allRecords = wx.getStorageSync('dietRecords') || [];
    const ingredientCount = {};

    allRecords.forEach(record => {
      if (record.ingredients) {
        record.ingredients.forEach(ing => {
          ingredientCount[ing] = (ingredientCount[ing] || 0) + 1;
        });
      }
    });

    // 返回出现次数最多的前10个
    return Object.entries(ingredientCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }

  /**
   * 获取所有食谱（从数据库加载）
   */
  getAllRecipes() {
    // 这里应该从云数据库或本地数据库获取
    // 暂时返回模拟数据
    return require('./recipeData.js').recipes;
  }

  /**
   * 生成智能推荐提示语（AI增强版）
   * @param {object} nutritionGap - 营养缺口数据
   * @returns {Promise<array>} - AI生成的建议列表
   */
  async generateAISuggestion(nutritionGap) {
    // 如果启用AI，统一通过云函数调用
    if (this.useAI) {
      try {
        const userData = wx.getStorageSync('userInfo') || {};
        const dietRecords = this.getRecentDietRecords(7);
        
        const res = await api.analyzeAndRecommend(userData, dietRecords, nutritionGap);
        
        if (res.result && res.result.success && res.result.data.suggestions) {
          return res.result.data.suggestions.map(s => ({
            type: s.type || 'general',
            message: s.message,
            title: s.title || '',
            icon: s.icon || '💡',
            severity: s.severity || 'info',
            priority: s.priority || 3
          }));
        }
      } catch (error) {
        console.warn('AI分析失败，使用默认规则:', error);
      }
    }

    // 降级到默认规则生成
    return this.generateDefaultSuggestions(nutritionGap);
  }

  /**
   * 默认规则生成建议（AI失败时的降级方案）
   */
  generateDefaultSuggestions(nutritionGap) {
    const suggestions = [];

    if (nutritionGap.proteinDeficit > 20) {
      suggestions.push({
        type: 'protein',
        title: '蛋白质摄入不足',
        message: `检测到您近${nutritionGap.days}天蛋白质平均摄入不足${Math.round(nutritionGap.proteinDeficit)}克，建议增加高蛋白食物摄入。`,
        icon: '💪',
        severity: 'warning',
        priority: 1
      });
    }

    if (nutritionGap.carbsExcess > 30) {
      suggestions.push({
        type: 'carbs',
        title: '碳水化合物偏高',
        message: `您近期碳水化合物摄入偏高，建议适当控制主食摄入量。`,
        icon: '🍚',
        severity: 'warning',
        priority: 2
      });
    }

    if (nutritionGap.fatExcess > 15) {
      suggestions.push({
        type: 'fat',
        title: '脂肪摄入较多',
        message: `您近期脂肪摄入较多，试试清淡少油的烹饪方式吧！`,
        icon: '🥗',
        severity: 'info',
        priority: 3
      });
    }

    if (nutritionGap.caloriesExcess > 500) {
      suggestions.push({
        type: 'calories',
        title: '热量超标',
        message: `近期热量摄入超标，推荐一些低卡美味的食谱给您。`,
        icon: '🔥',
        severity: 'error',
        priority: 1
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'good',
        title: '营养均衡',
        message: '您的饮食很均衡！继续保持，这里有一些新食谱供您尝试。',
        icon: '👍',
        severity: 'success',
        priority: 5
      });
    }

    // 按优先级排序
    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 为食谱生成AI推荐理由
   */
  async generateRecipeReason(recipe) {
    if (!this.useAI) {
      return null;
    }

    try {
      const userData = wx.getStorageSync('userInfo') || {};
      const nutritionGap = this.analyzeNutritionGap(7);

      const res = await api.generateRecipeReason(recipe, userData, nutritionGap);
      
      if (res.result && res.result.success) {
        return res.result.reason;
      }
      return null;
    } catch (error) {
      console.warn('生成推荐理由失败:', error);
      return null;
    }
  }

  /**
   * 分析营养缺口
   */
  analyzeNutritionGap(days = 7) {
    const recentRecords = this.getRecentDietRecords(days);
    const avgNutrition = this.calculateAverageNutrition(recentRecords);
    const goals = {
      protein: this.app.globalData.dailyProteinGoal,
      carbs: this.app.globalData.dailyCarbGoal,
      fat: this.app.globalData.dailyFatGoal,
      calories: this.app.globalData.dailyCalorieGoal
    };

    return {
      days,
      proteinDeficit: Math.max(0, goals.protein - avgNutrition.protein),
      proteinExcess: Math.max(0, avgNutrition.protein - goals.protein),
      carbsDeficit: Math.max(0, goals.carbs - avgNutrition.carbs),
      carbsExcess: Math.max(0, avgNutrition.carbs - goals.carbs),
      fatDeficit: Math.max(0, goals.fat - avgNutrition.fat),
      fatExcess: Math.max(0, avgNutrition.fat - goals.fat),
      caloriesDeficit: Math.max(0, goals.calories - avgNutrition.calories),
      caloriesExcess: Math.max(0, avgNutrition.calories - goals.calories)
    };
  }
}

module.exports = {
  RecipeRecommendEngine
};

