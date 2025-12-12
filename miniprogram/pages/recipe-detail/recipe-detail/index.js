// pages/recipe-detail/index.js
const { recipes } = require('../../utils/recipeData.js');

Page({
  data: {
    recipe: null,
    loading: true,
    isFavorited: false,
    showNutritionDetail: false
  },

  onLoad(options) {
    const recipeId = parseInt(options.id);
    this.loadRecipeDetail(recipeId);
    this.checkFavoriteStatus(recipeId);
  },

  /**
   * 加载食谱详情
   */
  loadRecipeDetail(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (recipe) {
      this.setData({
        recipe,
        loading: false
      });
    } else {
      wx.showToast({
        title: '食谱不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 检查收藏状态
   */
  checkFavoriteStatus(recipeId) {
    const favorites = wx.getStorageSync('favoriteRecipes') || [];
    const isFavorited = favorites.includes(recipeId);
    this.setData({ isFavorited });
  },

  /**
   * 切换收藏
   */
  onToggleFavorite() {
    const recipeId = this.data.recipe.id;
    let favorites = wx.getStorageSync('favoriteRecipes') || [];
    
    if (this.data.isFavorited) {
      favorites = favorites.filter(id => id !== recipeId);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      favorites.push(recipeId);
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }
    
    wx.setStorageSync('favoriteRecipes', favorites);
    this.setData({ isFavorited: !this.data.isFavorited });
  },

  /**
   * 切换营养详情显示
   */
  onToggleNutritionDetail() {
    this.setData({
      showNutritionDetail: !this.data.showNutritionDetail
    });
  },

  /**
   * 开始烹饪（记录到今日饮食）
   */
  onStartCooking() {
    wx.showModal({
      title: '开始烹饪',
      content: '烹饪完成后要记得记录到今日饮食哦！',
      confirmText: '好的',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到饮食记录页面
          wx.showToast({
            title: '祝您烹饪愉快！',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 分享食谱
   */
  onShareAppMessage() {
    const recipe = this.data.recipe;
    return {
      title: `推荐一道健康食谱：${recipe.name}`,
      path: `/pages/recipe-detail/index?id=${recipe.id}`,
      imageUrl: recipe.image
    };
  },

  /**
   * 预览图片
   */
  onPreviewImage() {
    wx.previewImage({
      urls: [this.data.recipe.image],
      current: this.data.recipe.image
    });
  },

  /**
   * 复制食材清单
   */
  onCopyIngredients() {
    const ingredients = this.data.recipe.ingredients
      .map((ing, index) => `${index + 1}. ${ing.name} ${ing.amount}`)
      .join('\n');
    
    wx.setClipboardData({
      data: ingredients,
      success: () => {
        wx.showToast({
          title: '已复制食材清单',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 保存到我的菜品
   */
  onSaveToMyRecipes() {
    const recipe = this.data.recipe;
    let myRecipes = wx.getStorageSync('myRecipes') || [];
    
    // 检查是否已存在
    const exists = myRecipes.some(r => r.id === recipe.id);
    if (exists) {
      wx.showToast({
        title: '已在我的菜品中',
        icon: 'none'
      });
      return;
    }
    
    myRecipes.push({
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      addedAt: new Date().toISOString()
    });
    
    wx.setStorageSync('myRecipes', myRecipes);
    
    wx.showToast({
      title: '已保存到我的菜品',
      icon: 'success'
    });
  }
});

