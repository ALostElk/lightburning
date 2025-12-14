// pages/recipe-recommend/index.js
const { RecipeRecommendEngine } = require('../../utils/recipeEngine.js');

Page({
  data: {
    recommendType: 'goal', // goal, preference, ai
    recipes: [],
    loading: true,
    aiSuggestions: [],
    userInfo: null
  },

  onLoad() {
    this.engine = new RecipeRecommendEngine();
    this.loadUserInfo();
    this.loadRecommendations();
  },

  onShow() {
    // 每次显示页面时刷新推荐
    this.loadRecommendations();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  /**
   * 加载推荐食谱（AI增强版）
   */
  async loadRecommendations() {
    this.setData({ loading: true });

    const type = this.data.recommendType;
    wx.showLoading({
      title: type === 'ai' ? 'AI智能分析中...' : '正在生成推荐...'
    });

    try {
      // 获取推荐食谱
      const recipes = this.engine.getRecommendedRecipes({
        type,
        limit: 10
      });

      // 如果是智能推荐，使用AI生成建议
      let aiSuggestions = [];
      if (type === 'ai') {
        const nutritionGap = this.engine.analyzeNutritionGap(7);
        aiSuggestions = await this.engine.generateAISuggestion(nutritionGap);
      }

      this.setData({
        recipes,
        aiSuggestions,
        loading: false
      });

      wx.hideLoading();
    } catch (error) {
      console.error('推荐失败:', error);
      wx.hideLoading();

      // 降级处理
      const recipes = this.engine.getRecommendedRecipes({
        type,
        limit: 10
      });

      this.setData({
        recipes,
        aiSuggestions: [],
        loading: false
      });
    }
  },

  /**
   * 切换推荐类型
   */
  onTabChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      recommendType: type
    });
    this.loadRecommendations();
  },

  /**
   * 刷新推荐
   */
  onRefresh() {
    this.loadRecommendations();
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
   * 收藏食谱
   */
  onFavoriteClick(e) {
    const recipeId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    // 获取当前收藏列表
    let favorites = wx.getStorageSync('favoriteRecipes') || [];

    const isFavorited = favorites.includes(recipeId);

    if (isFavorited) {
      // 取消收藏
      favorites = favorites.filter(id => id !== recipeId);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      // 添加收藏
      favorites.push(recipeId);
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }

    wx.setStorageSync('favoriteRecipes', favorites);

    // 更新UI
    const recipes = this.data.recipes;
    recipes[index].isFavorited = !isFavorited;
    this.setData({ recipes });
  },

  /**
   * 分享食谱
   */
  onShareClick(e) {
    const recipe = e.currentTarget.dataset.recipe;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 小程序分享
    return {
      title: `推荐一道健康食谱：${recipe.name}`,
      path: `/pages/recipe-detail/index?id=${recipe.id}`,
      imageUrl: recipe.image
    };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadRecommendations();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 获取标签颜色类
   */
  getTagClass(tag) {
    const tagMap = {
      '高蛋白': 'tag-protein',
      '低卡': 'tag-lowcal',
      '低脂': 'tag-lowcal',
      '素食': 'tag-veg'
    };
    return tagMap[tag] || 'tag';
  }
});
