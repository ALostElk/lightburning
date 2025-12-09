// pages/ai-suggestion/index.js
const { RecipeRecommendEngine } = require('../../utils/recipeEngine.js');
const { generateMockDietRecords } = require('../../utils/recipeData.js');
const api = require('../../utils/cloudApi.js');

Page({
  data: {
    loading: true,
    nutritionGap: null,
    nutritionGapDisplay: {
      protein: { sign: '', value: 0 },
      carbs: { sign: '', value: 0 },
      fat: { sign: '', value: 0 },
      calories: { sign: '', value: 0 }
    },
    suggestions: [],
    recommendedRecipes: [],
    weeklyStats: null,
    showDetailAnalysis: false
  },

  onLoad() {
    this.engine = new RecipeRecommendEngine();
    this.initMockData();
    this.loadAnalysis();
  },

  /**
   * 初始化模拟数据（仅用于演示）
   */
  initMockData() {
    // 如果没有饮食记录，生成模拟数据
    const existingRecords = wx.getStorageSync('dietRecords') || [];
    if (existingRecords.length === 0) {
      const mockRecords = generateMockDietRecords();
      wx.setStorageSync('dietRecords', mockRecords);
    }
  },

  /**
   * 加载分析数据（AI增强版）
   */
  async loadAnalysis() {
    this.setData({ loading: true });

    wx.showLoading({ title: 'AI正在分析中...' });

    try {
      // 分析营养缺口
      const nutritionGap = this.engine.analyzeNutritionGap(7);
      
      // 使用AI生成建议（异步）
      const suggestions = await this.engine.generateAISuggestion(nutritionGap);
      
      // 获取推荐食谱
      const recommendedRecipes = this.engine.getRecommendedRecipes({
        type: 'ai',
        limit: 6
      });

      // 为每个食谱生成AI推荐理由（可选）
      // 注意：这会增加请求次数，建议只为前3个食谱生成
      for (let i = 0; i < Math.min(3, recommendedRecipes.length); i++) {
        const reason = await this.engine.generateRecipeReason(recommendedRecipes[i]);
        if (reason) {
          recommendedRecipes[i].aiReason = reason;
        }
      }

      // 计算每周统计
      const weeklyStats = this.calculateWeeklyStats();
      
      // 格式化营养缺口显示数据
      const nutritionGapDisplay = this.formatNutritionGap(nutritionGap);

      this.setData({
        nutritionGap,
        nutritionGapDisplay,
        suggestions,
        recommendedRecipes,
        weeklyStats,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('分析失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: 'AI分析失败，使用默认分析',
        icon: 'none'
      });

      // 降级处理：使用默认分析
      const nutritionGap = this.engine.analyzeNutritionGap(7);
      const suggestions = this.engine.generateDefaultSuggestions(nutritionGap);
      const recommendedRecipes = this.engine.getRecommendedRecipes({
        type: 'ai',
        limit: 6
      });
      const weeklyStats = this.calculateWeeklyStats();
      
      // 格式化营养缺口显示数据
      const nutritionGapDisplay = this.formatNutritionGap(nutritionGap);

      this.setData({
        nutritionGap,
        nutritionGapDisplay,
        suggestions,
        recommendedRecipes,
        weeklyStats,
        loading: false
      });
    }
  },

  /**
   * 格式化营养缺口显示数据
   */
  formatNutritionGap(gap) {
    if (!gap) return this.data.nutritionGapDisplay;
    
    return {
      protein: {
        sign: gap.proteinDeficit > 0 ? '-' : '+',
        value: Math.round(gap.proteinDeficit > 0 ? gap.proteinDeficit : gap.proteinExcess)
      },
      carbs: {
        sign: gap.carbsDeficit > 0 ? '-' : '+',
        value: Math.round(gap.carbsDeficit > 0 ? gap.carbsDeficit : gap.carbsExcess)
      },
      fat: {
        sign: gap.fatDeficit > 0 ? '-' : '+',
        value: Math.round(gap.fatDeficit > 0 ? gap.fatDeficit : gap.fatExcess)
      },
      calories: {
        sign: gap.caloriesDeficit > 0 ? '-' : '+',
        value: Math.round(gap.caloriesDeficit > 0 ? gap.caloriesDeficit : gap.caloriesExcess)
      }
    };
  },

  /**
   * 计算每周统计
   */
  calculateWeeklyStats() {
    const records = this.engine.getRecentDietRecords(7);
    
    if (records.length === 0) {
      return null;
    }

    const total = records.reduce((acc, record) => {
      acc.calories += record.calories || 0;
      acc.protein += record.protein || 0;
      acc.carbs += record.carbs || 0;
      acc.fat += record.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const avg = {
      calories: Math.round(total.calories / records.length),
      protein: Math.round(total.protein / records.length),
      carbs: Math.round(total.carbs / records.length),
      fat: Math.round(total.fat / records.length)
    };

    const app = getApp();
    const goals = {
      calories: app.globalData.dailyCalorieGoal,
      protein: app.globalData.dailyProteinGoal,
      carbs: app.globalData.dailyCarbGoal,
      fat: app.globalData.dailyFatGoal
    };

    return {
      days: records.length,
      avg,
      goals,
      completion: {
        calories: Math.round((avg.calories / goals.calories) * 100),
        protein: Math.round((avg.protein / goals.protein) * 100),
        carbs: Math.round((avg.carbs / goals.carbs) * 100),
        fat: Math.round((avg.fat / goals.fat) * 100)
      }
    };
  },

  /**
   * 切换详细分析
   */
  onToggleDetailAnalysis() {
    this.setData({
      showDetailAnalysis: !this.data.showDetailAnalysis
    });
  },

  /**
   * 刷新分析
   */
  onRefresh() {
    this.loadAnalysis();
  },

  /**
   * 查看食谱详情
   */
  onRecipeClick(e) {
    const recipeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe-detail/index?id=${recipeId}`
    });
  },

  /**
   * 查看更多推荐
   */
  onViewMoreRecipes() {
    wx.navigateTo({
      url: '/pages/recipe-recommend/index'
    });
  },

  /**
   * 获取进度条颜色
   */
  getProgressColor(percentage) {
    if (percentage < 80) return '#FFB84D';
    if (percentage > 120) return '#FF6B6B';
    return '#51CF66';
  },

  /**
   * 获取建议严重度图标
   */
  getSeverityIcon(severity) {
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    return icons[severity] || 'ℹ️';
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadAnalysis();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});

