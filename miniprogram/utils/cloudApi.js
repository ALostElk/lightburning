/**
 * 云函数统一调用接口
 * 对应后端的 healthService、dietService、qwenAI、foodRecognitionQwen
 */

// ==================== HealthService ====================

/**
 * 更新用户个人信息
 */
export const updateProfile = (data) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'updateProfile',
      payload: data
    }
  });
};

/**
 * 获取用户个人信息
 */
export const getProfile = () => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'getProfile'
    }
  });
};

/**
 * 生成减重计划
 * @param {number} targetWeightChange - 目标体重变化(kg)，负数为减重
 * @param {number} totalDays - 总天数
 */
export const generatePlan = (targetWeightChange, totalDays) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'generatePlan',
      payload: { targetWeightChange, totalDays }
    }
  });
};

/**
 * 获取活跃计划
 */
export const getActivePlan = () => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'getActivePlan'
    }
  });
};

/**
 * 获取周度概览数据
 */
export const getWeeklyOverview = () => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'getWeeklyOverview'
    }
  });
};

/**
 * 动态调整计划
 * @param {string} date - 日期 YYYY-MM-DD
 * @param {number} actualDeficit - 实际热量差
 */
export const adjustPlan = (date, actualDeficit) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'adjustPlan',
      payload: { date, actualDeficit }
    }
  });
};

/**
 * 每日评价
 * @param {string} date - 日期 YYYY-MM-DD（可选，默认今日）
 */
export const evaluateDaily = (date) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'evaluate',
      payload: { date }
    }
  });
};

/**
 * 推荐运动
 */
export const recommendExercise = () => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'recommendExercise'
    }
  });
};

/**
 * 记录运动
 * @param {Object} data - { name, duration, calories, date }
 */
export const logExercise = (data) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'logExercise',
      payload: data
    }
  });
};

// ==================== DietService ====================

/**
 * 快速搜索食物（仅本地，用于实时建议）
 * @param {string} keyword - 关键词
 * @param {number} limit - 返回数量
 */
export const quickSearchFood = (keyword, limit = 10) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'quickSearch',
      payload: { keyword, limit }
    }
  });
};

/**
 * 完整搜索食物（三层架构：本地+AI+API）
 * @param {string} keyword - 关键词
 * @param {number} limit - 返回数量
 * @param {string} mode - 'quick' | 'full'
 */
export const searchFood = (keyword, limit = 20, mode = 'full') => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'searchFood',
      payload: { keyword, limit, mode }
    }
  });
};

/**
 * 拍照识别食物
 * @param {Object} input - { fileID } 或 { imageData }
 */
export const recognizeFood = (input) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'recognizeAndSearch',
      payload: input
    }
  });
};

/**
 * 添加饮食记录
 * @param {Object} record - 记录数据
 */
export const addDietLog = (record) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'addDietLog',
      payload: record
    }
  });
};

/**
 * 获取某日饮食记录
 * @param {string} date - 日期 YYYY-MM-DD（可选，默认今日）
 */
export const getDietLogs = (date) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getDietLogs',
      payload: { date }
    }
  });
};

/**
 * 获取日期范围内的饮食记录
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 */
export const getDietLogsByRange = (startDate, endDate) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getDietLogsByRange',
      payload: { startDate, endDate }
    }
  });
};

/**
 * 获取运动记录
 * @param {string} date - 日期
 */
export const getExerciseLogs = (date) => {
  return wx.cloud.callFunction({
    name: 'healthService',
    data: {
      action: 'getExerciseLogs',
      payload: { date }
    }
  });
};

/**
 * 更新饮食记录
 * @param {string} logId - 记录ID
 * @param {Object} updates - 更新数据
 */
export const updateDietLog = (logId, updates) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'updateDietLog',
      payload: { logId, updates }
    }
  });
};

/**
 * 删除饮食记录
 * @param {string} logId - 记录ID
 */
export const deleteDietLog = (logId) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'deleteDietLog',
      payload: { logId }
    }
  });
};

/**
 * 获取用户常用食物
 * @param {number} limit - 返回数量
 */
export const getFrequentFoods = (limit = 20, mealType = '') => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getFrequentFoods',
      payload: { 
        limit,
        mealType: mealType || undefined // 如果为空字符串则不传
      }
    }
  });
};

/**
 * 添加自定义菜品
 * @param {Object} dish - 菜品数据
 */
export const addCustomDish = (dish) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'addCustomDish',
      payload: dish
    }
  });
};

/**
 * 获取用户自定义菜品列表
 * @param {number} limit - 返回数量
 */
export const getUserDishes = (limit = 50) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getUserDishes',
      payload: { limit }
    }
  });
};

/**
 * 更新自定义菜品
 * @param {string} dishId - 菜品ID
 * @param {Object} updates - 更新数据
 */
export const updateCustomDish = (dishId, updates) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'updateCustomDish',
      payload: { dishId, updates }
    }
  });
};

/**
 * 删除自定义菜品
 * @param {string} dishId - 菜品ID
 */
export const deleteCustomDish = (dishId) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'deleteCustomDish',
      payload: { dishId }
    }
  });
};

/**
 * 计算食物热量
 * @param {string} foodId - 食物ID
 * @param {string} source - 数据来源 'FoodDB' | 'UserDishes'
 * @param {number} amount - 数量
 * @param {string} unit - 单位
 */
export const calculateCalories = (foodId, source, amount, unit = 'g') => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'calculateCalories',
      payload: { foodId, source, amount, unit }
    }
  });
};

// ==================== QwenAI ====================

/**
 * AI分析并生成建议
 * @param {Object} userData - 用户信息
 * @param {Array} dietRecords - 饮食记录
 * @param {Object} nutritionGap - 营养缺口
 */
export const analyzeAndRecommend = (userData, dietRecords, nutritionGap) => {
  return wx.cloud.callFunction({
    name: 'qwenAI',
    data: {
      action: 'analyzeAndRecommend',
      userData,
      dietRecords,
      nutritionGap
    },
    config: {
      timeout: 20000 // 20秒超时
    }
  });
};

/**
 * 生成食谱推荐理由
 * @param {Object} recipe - 食谱信息
 * @param {Object} userData - 用户信息
 * @param {Object} nutritionGap - 营养缺口
 */
export const generateRecipeReason = (recipe, userData, nutritionGap) => {
  return wx.cloud.callFunction({
    name: 'qwenAI',
    data: {
      action: 'generateRecipeReason',
      recipe,
      userData,
      nutritionGap
    },
    config: {
      timeout: 15000 // 15秒超时
    }
  });
};

/**
 * 自定义提示词调用AI
 * @param {string} prompt - 提示词
 */
export const customPrompt = (prompt) => {
  return wx.cloud.callFunction({
    name: 'qwenAI',
    data: {
      action: 'customPrompt',
      prompt
    },
    config: {
      timeout: 20000 // 20秒超时
    }
  });
};

// ==================== 食谱推荐 ====================

/**
 * 获取推荐食谱
 * @param {Object} options - 推荐选项
 * @param {string} options.type - 推荐类型 'goal' | 'preference' | 'ai'
 * @param {number} options.limit - 返回数量
 * @param {number} options.days - 分析天数（用于AI推荐）
 */
export const getRecommendedRecipes = (options = {}) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getRecommendedRecipes',
      payload: options
    }
  });
};

/**
 * 分析营养缺口
 * @param {number} days - 分析天数，默认7天
 */
export const analyzeNutritionGap = (days = 7) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'analyzeNutritionGap',
      payload: { days }
    }
  });
};

/**
 * 获取用户常吃食材
 * @param {number} limit - 返回数量
 */
export const getFavoriteIngredients = (limit = 10) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getFavoriteIngredients',
      payload: { limit }
    }
  });
};

/**
 * 获取食谱详情
 * @param {string} recipeId - 食谱ID
 */
export const getRecipeDetail = (recipeId) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getRecipeDetail',
      payload: { recipeId }
    }
  });
};

/**
 * 收藏食谱
 * @param {string} recipeId - 食谱ID
 */
export const favoriteRecipe = (recipeId) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'favoriteRecipe',
      payload: { recipeId }
    }
  });
};

/**
 * 取消收藏食谱
 * @param {string} recipeId - 食谱ID
 */
export const unfavoriteRecipe = (recipeId) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'unfavoriteRecipe',
      payload: { recipeId }
    }
  });
};

/**
 * 获取用户收藏的食谱
 * @param {number} limit - 返回数量
 */
export const getFavoriteRecipes = (limit = 50) => {
  return wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'getFavoriteRecipes',
      payload: { limit }
    }
  });
};

// ==================== 工具函数 ====================

/**
 * 统一错误处理
 */
export const handleError = (error, defaultMsg = '操作失败') => {
  console.error('云函数调用失败:', error);
  
  const errMsg = error?.result?.error || error?.errMsg || defaultMsg;
  
  wx.showToast({
    title: errMsg,
    icon: 'none',
    duration: 2000
  });
  
  return Promise.reject(error);
};

/**
 * 统一成功提示
 */
export const showSuccess = (msg, duration = 2000) => {
  wx.showToast({
    title: msg,
    icon: 'success',
    duration
  });
};

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
export const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 日期格式化
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 计算两个日期之间的天数
 */
export const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

