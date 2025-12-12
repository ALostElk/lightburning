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

      const res = await api.getFrequentFoods(20, mealType);

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
      url: `/pages/diet/manual/index?food=${encodeURIComponent(JSON.stringify(food))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}&fromFavorites=true`
    });
  },

  // 获取食物 Emoji - 与主页保持一致
  getFoodEmoji(name, category) {
    if (!name) return '🍽️';

    const emojiMap = {
      // 主食类
      '米饭': '🍚', '白饭': '🍚', '糙米': '🍚', '粥': '🍚', '稀饭': '🍚',
      '面条': '🍜', '拉面': '🍜', '米线': '🍜', '粉丝': '🍜', '意面': '🍝', '意大利面': '🍝',
      '面包': '🍞', '吐司': '🍞', '馒头': '🍞', '花卷': '🍞', '全麦': '🍞',
      '包子': '🥟', '饺子': '🥟', '馄饨': '🥟', '锅贴': '🥟', '烧麦': '🥟',
      '饼': '🫓', '煎饼': '🫓', '烙饼': '🫓', '葱油饼': '🫓', '手抓饼': '🫓',
      '粽子': '🍙', '饭团': '🍙', '寿司': '🍣',
      '燕麦': '🥣', '麦片': '🥣', '谷物': '🌾', '玉米': '🌽',

      // 肉类
      '鸡肉': '🍗', '鸡腿': '🍗', '鸡翅': '🍗', '鸡胸': '🍗', '炸鸡': '🍗', '烤鸡': '🍗',
      '牛肉': '🥩', '牛排': '🥩', '牛腩': '🥩', '肥牛': '🥩',
      '猪肉': '🥓', '培根': '🥓', '火腿': '🥓', '香肠': '🌭', '热狗': '🌭', '腊肠': '🌭',
      '排骨': '🍖', '骨头': '🍖', '羊肉': '🍖', '烤肉': '🍖', '肉串': '🍢',
      '鸭': '🦆', '鸭肉': '🦆', '烤鸭': '🦆',

      // 海鲜类
      '鱼': '🐟', '三文鱼': '🐟', '鲈鱼': '🐟', '鳕鱼': '🐟', '带鱼': '🐟', '烤鱼': '🐟', '桂鱼': '🐟', '松鼠桂鱼': '🐟',
      '虾': '🦐', '虾仁': '🦐', '龙虾': '🦞', '大虾': '🦐', '基围虾': '🦐',
      '蟹': '🦀', '螃蟹': '🦀', '蟹肉': '🦀',
      '贝': '🦪', '蛤蜊': '🦪', '生蚝': '🦪', '扇贝': '🦪', '蚌': '🦪',
      '墨鱼': '🦑', '鱿鱼': '🦑', '章鱼': '🐙',

      // 蛋奶类
      '鸡蛋': '🥚', '蛋': '🥚', '煎蛋': '🍳', '炒蛋': '🍳', '蒸蛋': '🍳', '卤蛋': '🥚', '卤鸡蛋': '🥚', '煮蛋': '🥚',
      '牛奶': '🥛', '奶': '🥛', '酸奶': '🥛', '乳酪': '🧀', '芝士': '🧀', '奶酪': '🧀',
      '黄油': '🧈', '奶油': '🧈',

      // 蔬菜类
      '蔬菜': '🥗', '沙拉': '🥗', '青菜': '🥬', '白菜': '🥬', '生菜': '🥬', '菠菜': '🥬', '小菜': '🥬',
      '西蓝花': '🥦', '花菜': '🥦', '花椰菜': '🥦', '西兰花': '🥦',
      '胡萝卜': '🥕', '萝卜': '🥕', '红萝卜': '🥕',
      '番茄': '🍅', '西红柿': '🍅',
      '土豆': '🥔', '马铃薯': '🥔', '红薯': '🍠', '地瓜': '🍠', '紫薯': '🍠',
      '黄瓜': '🥒', '青瓜': '🥒',
      '茄子': '🍆', '辣椒': '🌶️', '青椒': '🫑', '彩椒': '🫑',
      '洋葱': '🧅', '葱': '🧅', '大蒜': '🧄', '蒜': '🧄', '姜': '🫚',
      '蘑菇': '🍄', '香菇': '🍄', '金针菇': '🍄', '平菇': '🍄',
      '豆腐': '🧊', '豆干': '🧊', '豆皮': '🧊',
      '豆': '🫘', '黄豆': '🫘', '绿豆': '🫘', '红豆': '🫘', '豆芽': '🌱',
      '南瓜': '🎃', '冬瓜': '🍈',

      // 水果类
      '苹果': '🍎', '青苹果': '🍏',
      '香蕉': '🍌',
      '橙子': '🍊', '橘子': '🍊', '柑橘': '🍊', '柚子': '🍊',
      '柠檬': '🍋',
      '葡萄': '🍇', '提子': '🍇',
      '草莓': '🍓',
      '樱桃': '🍒', '车厘子': '🍒',
      '桃': '🍑', '桃子': '🍑',
      '梨': '🍐',
      '西瓜': '🍉',
      '芒果': '🥭',
      '菠萝': '🍍', '凤梨': '🍍',
      '猕猴桃': '🥝', '奇异果': '🥝',
      '椰子': '🥥', '椰汁': '🥥',
      '榴莲': '🥑', '牛油果': '🥑', '鳄梨': '🥑',
      '蓝莓': '🫐',
      '瓜': '🍈', '哈密瓜': '🍈', '甜瓜': '🍈',

      // 饮品类
      '咖啡': '☕', '拿铁': '☕', '美式': '☕', '卡布奇诺': '☕',
      '茶': '🍵', '绿茶': '🍵', '红茶': '🍵', '奶茶': '🧋', '珍珠奶茶': '🧋',
      '果汁': '🧃', '橙汁': '🧃', '苹果汁': '🧃',
      '可乐': '🥤', '汽水': '🥤', '饮料': '🥤', '苏打': '🥤',
      '啤酒': '🍺', '白酒': '🍶', '红酒': '🍷', '葡萄酒': '🍷', '香槟': '🥂', '酒': '🍸',
      '水': '💧', '矿泉水': '💧',
      '豆浆': '🥛', '汤': '🍲',

      // 甜点零食类
      '蛋糕': '🍰', '生日蛋糕': '🎂', '芝士蛋糕': '🍰',
      '冰淇淋': '🍦', '雪糕': '🍦', '冰棍': '🍨',
      '甜甜圈': '🍩', '甜点': '🍩',
      '饼干': '🍪', '曲奇': '🍪',
      '巧克力': '🍫',
      '糖果': '🍬', '糖': '🍬',
      '棒棒糖': '🍭',
      '布丁': '🍮', '果冻': '🍮',
      '薯片': '🥔', '薯条': '🍟', '炸薯条': '🍟',
      '爆米花': '🍿',
      '坚果': '🥜', '花生': '🥜', '核桃': '🌰', '栗子': '🌰', '杏仁': '🌰',
      '蜂蜜': '🍯',
      '月饼': '🥮',

      // 快餐类
      '汉堡': '🍔', '汉堡包': '🍔',
      '披萨': '🍕', '比萨': '🍕',
      '三明治': '🥪', '帕尼尼': '🥪',
      '塔可': '🌮', '墨西哥卷': '🌯', '卷饼': '🌯',
      '炸鸡块': '🍗', '鸡块': '🍗',

      // 中餐常见
      '炒饭': '🍚', '蛋炒饭': '🍚', '扬州炒饭': '🍚',
      '炒面': '🍜', '拌面': '🍜',
      '火锅': '🍲', '麻辣烫': '🍲', '麻辣香锅': '🍲', '煲': '🍲', '香锅': '🍲',
      '烧烤': '🍢', '串串': '🍢', 'BBQ': '🍢',
      '豆浆油条': '🥛',
      '春卷': '🥟', '炸春卷': '🥟',
      '粉': '🍜', '河粉': '🍜', '肠粉': '🍜',
      '北京烤鸭': '🦆', '南京烤鸭': '🦆',

      // 日韩料理
      '乌冬面': '🍜', '荞麦面': '🍜',
      '刺身': '🍣', '生鱼片': '🍣',
      '咖喱': '🍛', '咖喱饭': '🍛',
      '便当': '🍱', '饭盒': '🍱',
      '天妇罗': '🍤', '炸虾': '🍤',
      '泡菜': '🥬', '韩式': '🥢',
      '石锅拌饭': '🍚', '拌饭': '🍚',
      '年糕': '🍡', '糯米糕': '🍡',

      // 西餐
      '牛扒': '🥩', '煎牛排': '🥩',
      '意粉': '🍝', '通心粉': '🍝',
      '沙律': '🥗', '凯撒沙拉': '🥗',
      '浓汤': '🥣', '奶油汤': '🥣',
      '可颂': '🥐', '羊角包': '🥐', '牛角包': '🥐',
      '法棍': '🥖', '长棍面包': '🥖',
      '华夫饼': '🧇', '松饼': '🥞', '薄饼': '🥞', '煎饼果子': '🥞',
      '培根蛋': '🍳', '早餐': '🍳'
    };

    for (const key in emojiMap) {
      if (name.includes(key)) return emojiMap[key];
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
      url: `/pages/diet/manual/index?food=${encodeURIComponent(JSON.stringify(food))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 跳转到手动输入
  goToManual() {
    wx.navigateTo({
      url: `/pages/diet/manual/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
