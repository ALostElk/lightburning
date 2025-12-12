/**
 * 我的常用页面 - diet-favorites/index
 */

Page({
  data: {
    activeTab: 'frequent', // 'frequent' | 'custom'
    frequentFoods: [],
    customDishes: [],
    isLoading: false,
    targetDate: '',
    selectedMealType: 'snack',
    mealTypeLabels: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    },
    // 餐次筛选
    filterMealType: '', // 空字符串表示"全部"
    showMealFilter: false
  },

  onLoad(options) {
    const mealType = options.mealType || 'snack';
    this.setData({
      targetDate: options.date || this.getTodayString(),
      selectedMealType: mealType,
      activeTab: options.tab || 'frequent',
      // 默认按当前餐次筛选
      filterMealType: mealType
    });
  },

  onShow() {
    this.loadData();
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 切换餐次筛选
  toggleMealFilter() {
    this.setData({ showMealFilter: !this.data.showMealFilter });
  },

  // 选择餐次筛选
  selectMealFilter(e) {
    const mealType = e.currentTarget.dataset.type;
    this.setData({
      filterMealType: mealType,
      showMealFilter: false
    });
    this.loadFrequentFoods();
  },

  // 加载数据
  async loadData() {
    this.setData({ isLoading: true });

    try {
      // 并行加载常用食物和自定义菜品
      await Promise.all([
        this.loadFrequentFoods(),
        this.loadCustomDishes()
      ]);
    } catch (err) {
      console.error('加载数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载常用食物（按餐次筛选）
  async loadFrequentFoods() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getFrequentFoods',
          payload: {
            mealType: this.data.filterMealType,
            limit: 30
          }
        }
      });

      // 处理常用食物数据，添加 emoji
      const frequentFoods = (res.result?.data || []).map(food => ({
        ...food,
        emoji: this.getFoodEmoji(food.name)
      }));

      this.setData({ frequentFoods });
    } catch (err) {
      console.error('加载常用食物失败:', err);
    }
  },

  // 加载自定义菜品
  async loadCustomDishes() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getUserDishes',
          payload: { limit: 50 }
        }
      });

      this.setData({ customDishes: res.result?.data || [] });
    } catch (err) {
      console.error('加载自定义菜品失败:', err);
    }
  },

  // 根据食物名称获取 emoji
  getFoodEmoji(name) {
    if (!name) return '🍽️';

    const emojiMap = {
      '米饭': '🍚', '面条': '🍜', '面包': '🍞', '馒头': '🍞',
      '饺子': '🥟', '包子': '🥟', '粥': '🥣', '燕麦': '🥣',
      '披萨': '🍕', '汉堡': '🍔', '三明治': '🥪',
      '鸡肉': '🍗', '鸡腿': '🍗', '鸡胸肉': '🍗',
      '牛肉': '🥩', '牛排': '🥩', '猪肉': '🥓',
      '鱼': '🐟', '虾': '🦐', '蟹': '🦀',
      '蛋': '🥚', '鸡蛋': '🥚', '牛奶': '🥛',
      '沙拉': '🥗', '蔬菜': '🥗', '西兰花': '🥦',
      '苹果': '🍎', '香蕉': '🍌', '橙子': '🍊',
      '咖啡': '☕', '茶': '🍵', '奶茶': '🧋',
      '蛋糕': '🍰', '冰淇淋': '🍦', '巧克力': '🍫'
    };

    for (const [keyword, emoji] of Object.entries(emojiMap)) {
      if (name.includes(keyword)) return emoji;
    }
    return '🍽️';
  },

  // 选择常用食物 - 需要先获取完整营养数据
  async selectFood(e) {
    const food = e.currentTarget.dataset.food;

    wx.showLoading({ title: '加载中...' });

    try {
      // 根据 foodId 和 foodSource 获取完整食物信息
      let fullFood = null;

      if (food.foodId) {
        const res = await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'getFoodDetail',
            payload: {
              foodId: food.foodId,
              source: food.foodSource || 'FoodDB'
            }
          }
        });

        if (res.result?.success) {
          fullFood = res.result.data;
        }
      }

      // 如果获取失败，用搜索兜底
      if (!fullFood) {
        const searchRes = await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'quickSearch',
            payload: { keyword: food.name, limit: 1 }
          }
        });

        if (searchRes.result?.success && searchRes.result.data.results?.length > 0) {
          fullFood = searchRes.result.data.results[0];
        }
      }

      wx.hideLoading();

      if (fullFood) {
        wx.navigateTo({
          url: `/pages/diet/manual/index?food=${encodeURIComponent(JSON.stringify(fullFood))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
        });
      } else {
        // 无法获取完整数据，跳转到搜索页
        wx.navigateTo({
          url: `/pages/diet/search/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}&keyword=${encodeURIComponent(food.name)}`
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('获取食物详情失败:', err);
      // 跳转到搜索页兜底
      wx.navigateTo({
        url: `/pages/diet/search/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}&keyword=${encodeURIComponent(food.name)}`
      });
    }
  },

  // 选择自定义菜品
  selectCustomDish(e) {
    const dish = e.currentTarget.dataset.dish;

    // 将自定义菜品转换为标准食物格式
    const food = {
      _id: dish._id,
      name: dish.name,
      calories: dish.calories,
      protein: dish.protein,
      fat: dish.fat,
      carbs: dish.carbs,
      servingSize: dish.servingSize,
      gramsPerServing: dish.gramsPerServing || 100,
      source: 'UserDishes'
    };

    wx.navigateTo({
      url: `/pages/diet/manual/index?food=${encodeURIComponent(JSON.stringify(food))}&mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 编辑自定义菜品
  editDish(e) {
    const dish = e.currentTarget.dataset.dish;
    wx.navigateTo({
      url: `/pages/diet/custom-dishes/index?dish=${encodeURIComponent(JSON.stringify(dish))}`
    });
  },

  // 删除自定义菜品
  async deleteDish(e) {
    const dishId = e.currentTarget.dataset.id;

    const confirmRes = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个自定义菜品吗？',
        success: resolve
      });
    });

    if (!confirmRes.confirm) return;

    wx.showLoading({ title: '删除中...' });

    try {
      await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'deleteCustomDish',
          payload: { dishId }
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });

      // 刷新列表
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 跳转到添加自定义菜品
  goToAddCustom() {
    wx.navigateTo({
      url: `/pages/diet/custom-dishes/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 跳转到搜索
  goToSearch() {
    wx.navigateTo({
      url: `/pages/diet/search/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}`
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
