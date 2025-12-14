/**
 * 食物搜索页面 - diet-search/index
 * 功能：搜索食物 + 我的常用
 */
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    statusBarHeight: 44,
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
    favoriteMealFilter: 'all',  // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
    
    // 搜索结果（统一格式）
    searchResults: [],
    
    // 编辑弹窗
    showFoodEditModal: false,
    editingFood: {},
    
    // 来源标记
    fromPage: '', // 用于存储来源标记（如 'camera'）
    
    // 我的常用 - 餐次切换
    currentMealTab: 'breakfast', // 当前选中的餐次
    mealTabs: [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ],
    
    // 重构：移除静态数据，改为动态容器
    favorites: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    },
    isLoadingFavorites: false
  },

  debounceTimer: null,

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const mealType = options.mealType || 'snack';
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44,
      targetDate: options.date || this.getTodayString(),
      selectedMealType: mealType,
      favoriteMealFilter: mealType,  // 默认筛选当前餐次
      // 捕获来源参数 (例如 ?from=camera)
      fromPage: options.from || ''
    });
    this.loadRecentSearches();
    this.loadFrequentFoods();
    this.autoSelectMealTab();
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
  // [核心重构] 加载所有餐次的常用食物
  async loadFrequentFoods() {
    this.setData({ isLoadingFavorites: true });

    try {
      // 定义四个餐次类型
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      // 并行发起 4 个请求，每个餐次取前 10 个高频食物
      const requests = mealTypes.map(type => 
        api.getFrequentFoods(10, type)
          .then(res => {
            const data = res.result?.data || [];
            // 调试日志：确认 API 返回的数据
            console.log(`[API ${type}] 返回 ${data.length} 条数据`, data.map(item => item.name));
            return { 
              type, 
              list: data
            };
          })
          .catch(err => {
            console.error(`加载${type}常用食物失败:`, err);
            return { type, list: [] }; // 容错处理
          })
      );

      const results = await Promise.all(requests);

      // 组装数据
      const newFavorites = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: []
      };
      
      results.forEach(({ type, list }) => {
        // 确保 type 是有效的餐次类型
        if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(type)) {
          console.warn(`无效的餐次类型: ${type}`);
          return;
        }
        
        // 数据清洗 & 补充 Emoji (如果没有图片)
        newFavorites[type] = (list || []).map(item => ({
          name: item.name,
          calories: item.avgCalories || item.calories || 0,
          protein: item.avgProtein || item.protein || 0,
          carbs: item.avgCarbs || item.carbs || 0,
          fat: item.avgFat || item.fat || 0,
          grams: item.avgGrams || item.grams || 100,
          id: item.foodId || item.name || `${type}-${item.name}`,
          // 如果后端没存 emoji，前端根据分类补一个
          emoji: item.emoji || this.getFoodEmoji(item.name, item.category),
          // 保留完整数据
          _fullData: item
        }));
        
        // 调试日志：确认每个餐次的数据
        console.log(`[${type}] 加载了 ${newFavorites[type].length} 个常用食物:`, newFavorites[type].map(f => f.name));
      });

      // 最终确认：打印所有餐次的数据统计
      console.log('=== 常用食物数据统计 ===');
      Object.keys(newFavorites).forEach(key => {
        console.log(`${key}: ${newFavorites[key].length} 个`, newFavorites[key].map(f => f.name));
      });

      this.setData({ favorites: newFavorites });

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

  // 输入变化（新方法名）
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.quickSearch(keyword);
    }, 300);
  },

  // 兼容旧方法名
  onInput(e) {
    this.onSearchInput(e);
  },

  // 确认搜索（新方法名）
  onSearchConfirm() {
    this.fullSearch();
  },

  // 快速搜索（支持从标签点击）
  async quickSearch(keyword) {
    // 如果是从标签点击，获取 data-key
    if (typeof keyword === 'object' && keyword.currentTarget) {
      const key = keyword.currentTarget.dataset.key;
      this.setData({ keyword: key });
      keyword = key;
    }
    
    if (!keyword || !keyword.trim()) {
      this.setData({ 
        results: [], 
        userDishes: [], 
        hasMore: false,
        searchResults: []
      });
      return;
    }

    this.setData({ isSearching: true, error: null });

    try {
      const res = await api.quickSearchFood(keyword, 10);

      if (res.result?.success) {
        const data = res.result.data;
        // 合并结果和用户菜品
        const allResults = [
          ...(data.results || []),
          ...(data.userDishes || [])
        ].map((item, index) => ({
          id: item._id || item.foodId || `item-${index}`,
          name: item.name,
          calories: item.calories || item.avgCalories || 0,
          protein: item.protein || item.avgProtein || 0,
          carbs: item.carbs || item.avgCarbs || 0,
          fat: item.fat || item.avgFat || 0,
          grams: item.grams || item.avgGrams || 100,
          _fullData: item
        }));
        
        this.setData({
          results: data.results || [],
          userDishes: data.userDishes || [],
          hasMore: data.hasMore || false,
          searchSource: 'local',
          searchResults: allResults
        });
      }
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({ searchResults: [] });
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
        const merged = data.merged || [];
        const allResults = merged.map((item, index) => ({
          id: item._id || item.foodId || `item-${index}`,
          name: item.name,
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          grams: item.grams || 100,
          _fullData: item
        }));
        
        this.setData({
          results: merged,
          hasMore: false,
          searchSource: data.source || 'full',
          searchResults: allResults
        });
      }
    } catch (err) {
      console.error('完整搜索失败:', err);
      this.setData({ 
        error: err.message || '搜索失败',
        searchResults: []
      });
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

  // 清除输入（新方法名）
  clearSearch() {
    this.setData({
      keyword: '',
      results: [],
      userDishes: [],
      hasMore: false,
      searchResults: []
    });
  },

  // 兼容旧方法名
  clearInput() {
    this.clearSearch();
  },

  // 选择食物（打开编辑弹窗）
  selectFood(e) {
    // 优先使用索引获取数据，更可靠
    const index = e.currentTarget.dataset.index;
    const item = index !== undefined ? this.data.searchResults[index] : e.currentTarget.dataset.item;
    
    if (!item) {
      console.error('[selectFood] item 为空');
      return;
    }
    
    // 预处理数据：计算每100g基准值
    // 常用食物的数据已经是每100g的，直接使用
    const per100 = {
      cal: item.calories || 0,
      pro: item.protein || 0,
      car: item.carbs || 0,
      fat: item.fat || 0
    };
    
    this.setData({
      showFoodEditModal: true,
      editingFood: {
        name: item.name || '',
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        grams: item.grams || 100, // 使用原有份量或默认100g
        emoji: item.emoji || '🍽️',
        // 缓存基准值用于计算
        _per100: per100,
        // 保留完整数据
        _fullData: item._fullData || item
      }
    });
  },

  // 直接添加食物（统一打开调整份量弹窗）
  addFoodDirect(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation(); // 阻止事件冒泡，避免触发 selectFood
    }
    
    // 获取索引，然后从 searchResults 中获取完整数据
    const index = e.currentTarget.dataset.index;
    const item = index !== undefined ? this.data.searchResults[index] : e.currentTarget.dataset.item;
    
    console.log('[addFoodDirect] 点击+号，index:', index, 'item:', item);
    
    if (!item) {
      console.error('[addFoodDirect] item 为空，无法打开弹窗');
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }
    
    // 统一打开编辑弹窗，让用户在弹窗中调整份量后确认添加
    // 计算每100g基准值
    const per100 = {
      cal: item.calories || 0,
      pro: item.protein || 0,
      car: item.carbs || 0,
      fat: item.fat || 0
    };
    
    // 设置编辑数据
    const editingFood = {
      name: item.name || '',
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      grams: item.grams || 100, // 使用原有份量或默认100g
      emoji: item.emoji || '🍽️',
      // 缓存基准值用于计算
      _per100: per100,
      // 保留完整数据
      _fullData: item._fullData || item
    };
    
    console.log('[addFoodDirect] 准备打开弹窗，editingFood:', editingFood);
    
    this.setData({
      showFoodEditModal: true,
      editingFood: editingFood
    });
    
    console.log('[addFoodDirect] 已设置 showFoodEditModal: true');
  },

  // 实时计算
  onSliderChange(e) {
    const grams = parseInt(e.detail.value);
    const base = this.data.editingFood._per100;
    const ratio = grams / 100;
    
    this.setData({
      'editingFood.grams': grams,
      'editingFood.calories': Math.round(base.cal * ratio),
      'editingFood.protein': (base.pro * ratio).toFixed(1),
      'editingFood.carbs': (base.car * ratio).toFixed(1),
      'editingFood.fat': (base.fat * ratio).toFixed(1)
    });
  },

  // 确认添加 (核心修复)
  async confirmAddFood() {
    const food = this.data.editingFood;
    
    // 场景 A: 来自相机页 (需要返回数据)
    if (this.data.fromPage === 'camera') {
      try {
        // 获取 eventChannel（通过 navigateTo 的 events 参数传递）
        // 在微信小程序中，目标页面通过 this.getOpenerEventChannel() 获取
        const eventChannel = this.getOpenerEventChannel ? this.getOpenerEventChannel() : null;
        if (eventChannel && eventChannel.emit) {
          // 构造返回数据，确保格式符合相机页面的期望
          // 相机页面期望：每100g的营养数据，以及实际份量（grams）
          // 注意：相机页面会根据 grams 和每100g数据重新计算营养值
          const per100Cal = food._per100?.cal || food.calories || 0;
          const per100Pro = food._per100?.pro || food.protein || 0;
          const per100Car = food._per100?.car || food.carbs || 0;
          const per100Fat = food._per100?.fat || food.fat || 0;
          const grams = food.grams || 100;
          
          const returnData = {
            name: food.name,
            calories: per100Cal,  // 每100g的热量（相机页面会重新计算）
            protein: per100Pro,   // 每100g的蛋白质
            carbs: per100Car,     // 每100g的碳水
            fat: per100Fat,       // 每100g的脂肪
            grams: grams,         // 实际份量（克）- 相机页面会使用这个值
            emoji: food.emoji || '🍽️',
            // 兼容字段：相机页面可能使用这些字段名作为份量
            amount: grams,
            weight: grams,
            estimatedWeight: grams,
            servingSize: grams,
            portion: grams,
            // 保留完整数据
            _fullData: food._fullData || food
          };
          
          eventChannel.emit('acceptFoodFromSearch', returnData);
          // 关闭弹窗
          this.setData({ showFoodEditModal: false });
          // 延迟返回，让用户看到反馈
          setTimeout(() => {
            wx.navigateBack();
          }, 300);
          return;
        } else {
          // 如果无法获取 eventChannel，直接返回上一页
          this.setData({ showFoodEditModal: false });
          wx.navigateBack();
        }
      } catch (err) {
        console.error('事件通道错误:', err);
        // 即使出错也返回上一页
        this.setData({ showFoodEditModal: false });
        wx.navigateBack();
      }
    } 
    // 场景 B: 来自主页/日常记录 (直接入库，不返回)
    else {
      wx.showLoading({ title: '添加中...' });
      
      try {
        // 调用云函数添加记录
        const res = await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'addDietLog',
            payload: {
              name: food.name,
              calories: parseInt(food.calories) || 0,
              protein: parseFloat(food.protein) || 0,
              carbs: parseFloat(food.carbs) || 0,
              fat: parseFloat(food.fat) || 0,
              grams: parseInt(food.grams) || 100,
              // 关键：确保 mealType 正确
              mealType: this.data.keyword ? this.data.selectedMealType : this.data.currentMealTab,
              recordDate: this.data.targetDate || this.getTodayString(),
              unit: 'g',
              foodSource: 'manual_search'
            }
          }
        });

        if (res.result && res.result.success) {
          wx.showToast({ title: '已添加', icon: 'success' });
          
          // [新增] 成功后立即刷新常用列表，体现"动态变化"
          this.loadFrequentFoods();
          
          // 添加成功后返回饮食主页面
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/diet/index/index'
            });
          }, 1500);
        } else {
          throw new Error(res.result?.error || '添加失败');
        }
      } catch (err) {
        console.error('添加失败:', err);
        wx.showToast({ title: err.message || '添加失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    }
  },

  // 关闭编辑弹窗
  closeFoodEdit() {
    this.setData({ showFoodEditModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 跳转到手动输入
  goToManual() {
    wx.navigateTo({
      url: `/pages/diet/manual/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 根据时间自动选择 Tab
  autoSelectMealTab() {
    const hour = new Date().getHours();
    let tab = 'snack';
    if (hour >= 5 && hour < 10) tab = 'breakfast';
    else if (hour >= 10 && hour < 16) tab = 'lunch';
    else if (hour >= 16 && hour < 21) tab = 'dinner';
    this.setData({ currentMealTab: tab });
  },

  // 切换餐次 Tab
  switchMealTab(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentMealTab: key });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
