/**
 * 食物搜索页面 - diet-search/index
 * 功能：搜索食物 + 我的常用
 */
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    keyword: '',
    isSearching: false,
    isDeepSearching: false,
    results: [],
    userDishes: [],
    hasMore: false,
    error: null,
    recentSearches: [],
    searchSource: '',
    targetDate: '',
    selectedMealType: 'snack',
    mealTypeLabels: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    },

    // 标签相关
    activeTab: 'search', // 'search' | 'favorites'

    // 常用食物
    frequentFoods: [],
    isLoadingFavorites: false,
    favoriteMealFilter: 'all'  // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  },

  debounceTimer: null,

  onLoad(options) {
    const mealType = options.mealType || 'snack';
    this.setData({
      targetDate: options.date || this.getTodayString(),
      selectedMealType: mealType,
      favoriteMealFilter: mealType  // 默认筛选当前餐次
    });
    this.loadRecentSearches();
    this.loadFrequentFoods();
  },

  onShow() {
    // 每次显示页面时刷新常用食物
    this.loadFrequentFoods();
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // ============ 标签切换 ============
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });

    if (tab === 'favorites' && this.data.frequentFoods.length === 0) {
      this.loadFrequentFoods();
    }
  },

  switchToSearch() {
    this.setData({ activeTab: 'search' });
  },

  // 切换常用食物餐次筛选
  switchFavoriteMeal(e) {
    const meal = e.currentTarget.dataset.meal;
    if (meal !== this.data.favoriteMealFilter) {
      this.setData({ favoriteMealFilter: meal });
      this.loadFrequentFoods();
    }
  },

  onSearchFocus() {
    // 搜索框聚焦时切换到搜索标签
    if (this.data.activeTab !== 'search') {
      this.setData({ activeTab: 'search' });
    }
  },

  // ============ 常用食物 ============
  async loadFrequentFoods() {
    this.setData({ isLoadingFavorites: true });

    try {
      // 根据筛选条件决定是否传入 mealType
      const mealType = this.data.favoriteMealFilter === 'all' ? '' : this.data.favoriteMealFilter;

      const res = await api.getFrequentFoods(20);

      if (res.result?.success) {
        const foods = res.result.data || [];
        // 转换字段名并添加 emoji
        const foodsWithEmoji = foods.map(food => ({
          _id: food.foodId || food.name,
          name: food.name,
          calories: food.avgCalories,
          protein: food.avgProtein,
          carbs: food.avgCarbs,
          fat: food.avgFat,
          grams: food.avgGrams,
          useCount: food.count,
          source: food.foodSource,
          emoji: this.getFoodEmoji(food.name, food.category)
        }));
        this.setData({ frequentFoods: foodsWithEmoji });
      }
    } catch (err) {
      console.error('加载常用食物失败:', err);
    } finally {
      this.setData({ isLoadingFavorites: false });
    }
  },

  // 选择常用食物 - 直接跳转到确认页面
  selectFavorite(e) {
    const food = e.currentTarget.dataset.food;
    wx.navigateTo({
      url: `/pages/diet-manual/index?food=${encodeURIComponent(JSON.stringify(food))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}&fromFavorites=true`
    });
  },

  // 获取食物 Emoji
  getFoodEmoji(name, category) {
    if (!name) return '🍽️';

    // 根据名称匹配
    const nameEmojiMap = {
      '米饭': '🍚', '白饭': '🍚', '糙米': '🍚',
      '面条': '🍜', '拉面': '🍜', '意面': '🍝',
      '面包': '🍞', '吐司': '🍞', '全麦': '🍞',
      '包子': '🥟', '饺子': '🥟', '馄饨': '🥟',
      '鸡肉': '🍗', '鸡胸': '🍗', '鸡腿': '🍗',
      '牛肉': '🥩', '牛排': '🥩',
      '猪肉': '🥓', '培根': '🥓',
      '鱼': '🐟', '三文鱼': '🐟', '鳕鱼': '🐟',
      '虾': '🦐', '龙虾': '🦞',
      '鸡蛋': '🥚', '蛋': '🥚', '煮蛋': '🥚',
      '牛奶': '🥛', '酸奶': '🥛', '奶': '🥛',
      '咖啡': '☕', '美式': '☕', '拿铁': '☕',
      '茶': '🍵', '绿茶': '🍵',
      '沙拉': '🥗', '蔬菜': '🥗', '青菜': '🥬',
      '苹果': '🍎', '香蕉': '🍌', '橙子': '🍊', '葡萄': '🍇',
      '汉堡': '🍔', '披萨': '🍕',
      '蛋糕': '🍰', '甜点': '🍰',
      '冰淇淋': '🍦', '雪糕': '🍦',
      '燕麦': '🥣', '麦片': '🥣',
      '坚果': '🥜', '杏仁': '🥜',
      '豆腐': '🧈', '豆浆': '🥛'
    };

    for (const key in nameEmojiMap) {
      if (name.includes(key)) return nameEmojiMap[key];
    }

    // 根据分类匹配
    const categoryEmojiMap = {
      '主食': '🍚',
      '肉类': '🥩',
      '蛋奶': '🥚',
      '蔬菜': '🥗',
      '水果': '🍎',
      '饮料': '🥤',
      '零食': '🍪'
    };

    if (category && categoryEmojiMap[category]) {
      return categoryEmojiMap[category];
    }

    return '🍽️';
  },

  // ============ 搜索相关 ============
  loadRecentSearches() {
    const saved = wx.getStorageSync('recentFoodSearches') || [];
    this.setData({ recentSearches: saved });
  },

  saveSearch(term) {
    let searches = wx.getStorageSync('recentFoodSearches') || [];
    searches = searches.filter(s => s !== term);
    searches.unshift(term);
    searches = searches.slice(0, 10);
    wx.setStorageSync('recentFoodSearches', searches);
    this.setData({ recentSearches: searches });
  },

  // 输入变化
  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.quickSearch(keyword);
    }, 300);
  },

  // 快速搜索
  async quickSearch(keyword) {
    if (!keyword.trim()) {
      this.setData({ results: [], userDishes: [], hasMore: false });
      return;
    }

    this.setData({ isSearching: true, error: null });

    try {
      const res = await api.quickSearchFood(keyword, 10);

      if (res.result?.success) {
        const data = res.result.data;
        this.setData({
          results: data.results || [],
          userDishes: data.userDishes || [],
          hasMore: data.hasMore || false,
          searchSource: 'local'
        });
      }
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      this.setData({ isSearching: false });
    }
  },

  // 完整搜索
  async fullSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;

    this.setData({ isDeepSearching: true, error: null });
    this.saveSearch(keyword);

    try {
      const res = await api.searchFood(keyword, 20, 'full');

      if (res.result?.success) {
        const data = res.result.data;
        this.setData({
          results: data.merged || [],
          hasMore: false,
          searchSource: data.source || 'full'
        });
      }
    } catch (err) {
      this.setData({ error: err.message || '搜索失败' });
    } finally {
      this.setData({ isDeepSearching: false });
    }
  },

  // 使用最近搜索
  useRecentSearch(e) {
    const term = e.currentTarget.dataset.term;
    this.setData({ keyword: term });
    this.fullSearch();
  },

  // 清空最近搜索
  clearRecentSearches() {
    wx.removeStorageSync('recentFoodSearches');
    this.setData({ recentSearches: [] });
  },

  // 清除输入
  clearInput() {
    this.setData({
      keyword: '',
      results: [],
      userDishes: [],
      hasMore: false
    });
  },

  // 选择食物
  selectFood(e) {
    const food = e.currentTarget.dataset.food;
    wx.navigateTo({
      url: `/pages/diet-manual/index?food=${encodeURIComponent(JSON.stringify(food))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 跳转到手动输入
  goToManual() {
    wx.navigateTo({
      url: `/pages/diet-manual/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
