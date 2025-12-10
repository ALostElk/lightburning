/**
 * 拍照识别页面 - diet-camera/index
 * 设计语言: Daylight Futurism (日光未来主义)
 * 集成云函数: dietService (recognizeAndSearch)
 */

Page({
  data: {
    // 状态栏高度
    statusBarHeight: 44,

    // 图片预览
    imagePreview: null,

    // 分析状态
    isAnalyzing: false,
    error: null,

    // 识别结果
    recognizedFoods: [],
    selectedFoods: {},
    foodAmounts: {},

    // 餐次选择
    selectedMealType: 'snack',
    showMealTypeSelector: false,

    // 餐次标签
    mealTypeLabels: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    },

    // 餐次 Emoji
    mealEmojis: {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🌙',
      snack: '🍎'
    },

    // 提交状态
    isSubmitting: false,

    // 目标日期
    targetDate: '',

    // 计算属性
    hasSelectedFoods: false,
    selectedCount: 0,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  },

  onLoad(options) {
    this.initStatusBar();
    const date = options.date || this.getTodayString();
    const mealType = options.mealType || this.inferMealType();
    this.setData({
      targetDate: date,
      selectedMealType: mealType
    });
  },

  // 初始化状态栏高度
  initStatusBar() {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 44
    });
  },

  // 获取今日日期字符串
  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // 根据时间推断餐次
  inferMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 14) return 'lunch';
    if (hour >= 17 && hour < 21) return 'dinner';
    return 'snack';
  },

  // 选择图片
  async chooseImage(e) {
    const sourceType = e.currentTarget.dataset.source === 'album' ? ['album'] : ['camera'];

    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType,
        sizeType: ['compressed']
      });

      const tempFilePath = res.tempFiles[0].tempFilePath;
      this.setData({ imagePreview: tempFilePath });
      this.analyzeImage(tempFilePath);
    } catch (err) {
      if (err.errMsg !== 'chooseMedia:fail cancel') {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    }
  },

  // 分析图片
  async analyzeImage(filePath) {
    this.setData({
      isAnalyzing: true,
      error: null,
      recognizedFoods: [],
      selectedFoods: {},
      foodAmounts: {},
      hasSelectedFoods: false,
      selectedCount: 0,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    });

    try {
      // 上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `food-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        filePath
      });

      // 调用识别云函数
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'recognizeAndSearch',
          payload: { fileID: uploadRes.fileID }
        }
      });

      if (res.result?.success && res.result?.data?.foods?.length > 0) {
        const foods = res.result.data.foods;
        const selected = {};
        const amounts = {};

        foods.forEach((food, i) => {
          selected[i] = true;
          // 使用 AI 估算的重量，支持多种字段名
          // AI可能返回 amount、weight、servingSize、estimatedWeight 等字段
          const estimatedAmount = food.amount || food.weight || food.estimatedWeight || food.servingSize || food.portion;
          amounts[i] = estimatedAmount ? Math.round(estimatedAmount) : 100;
        });

        this.setData({
          recognizedFoods: foods,
          selectedFoods: selected,
          foodAmounts: amounts
        });

        // 更新计算属性
        this.updateComputedValues();
      } else {
        this.setData({ error: '未能识别出食物，请重新拍照或手动输入' });
      }
    } catch (err) {
      console.error('识别失败:', err);
      this.setData({ error: err.message || '识别失败，请重试' });
    } finally {
      this.setData({ isAnalyzing: false });
    }
  },

  // 切换食物选择
  toggleFood(e) {
    const index = e.currentTarget.dataset.index;
    const selected = { ...this.data.selectedFoods };
    selected[index] = !selected[index];
    this.setData({ selectedFoods: selected });
    this.updateComputedValues();
  },

  // 调整份量
  adjustAmount(e) {
    const { index, delta } = e.currentTarget.dataset;
    const amounts = { ...this.data.foodAmounts };
    amounts[index] = Math.max(10, (amounts[index] || 100) + delta);
    this.setData({ foodAmounts: amounts });
    this.updateComputedValues();
  },

  // 更新计算属性
  updateComputedValues() {
    const { recognizedFoods, selectedFoods, foodAmounts } = this.data;

    let selectedCount = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    recognizedFoods.forEach((food, index) => {
      if (selectedFoods[index]) {
        selectedCount++;
        const amount = foodAmounts[index] || 100;
        const factor = amount / 100;

        totalCalories += Math.round(food.calories * factor);
        totalProtein += food.protein * factor;
        totalCarbs += food.carbs * factor;
        totalFat += food.fat * factor;
      }
    });

    this.setData({
      hasSelectedFoods: selectedCount > 0,
      selectedCount,
      totalCalories,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10
    });
  },

  // 切换餐次选择器
  toggleMealTypeSelector() {
    this.setData({ showMealTypeSelector: !this.data.showMealTypeSelector });
  },

  // 选择餐次
  selectMealType(e) {
    this.setData({
      selectedMealType: e.currentTarget.dataset.type,
      showMealTypeSelector: false
    });
  },

  // 计算营养
  calculateNutrition(food, amount) {
    const factor = amount / 100;
    return {
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor * 10) / 10,
      fat: Math.round(food.fat * factor * 10) / 10,
      carbs: Math.round(food.carbs * factor * 10) / 10
    };
  },

  // 提交记录
  async submit() {
    // 防止重复提交
    if (this.data.isSubmitting) {
      return;
    }

    const { recognizedFoods, selectedFoods, foodAmounts, selectedMealType, targetDate } = this.data;

    const selectedIndexes = Object.keys(selectedFoods).filter(i => selectedFoods[i]);
    if (selectedIndexes.length === 0) {
      wx.showToast({ title: '请至少选择一种食物', icon: 'none' });
      return;
    }

    // 立即设置提交状态，防止重复点击
    this.setData({ isSubmitting: true });

    try {
      // 收集所有要添加的食物
      const foodsToAdd = selectedIndexes.map(index => {
        const food = recognizedFoods[index];
        const amount = foodAmounts[index] || 100;
        const nutrition = this.calculateNutrition(food, amount);
        return {
          name: food.name,
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
          mealType: selectedMealType,
          recordDate: targetDate,
          grams: amount,
          unit: 'g',
          foodSource: 'ai_recognition'
        };
      });

      // 逐个添加
      for (const foodData of foodsToAdd) {
        await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'addDietLog',
            payload: foodData
          }
        });
      }

      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      // 失败时重置提交状态，允许重试
      this.setData({ isSubmitting: false });
    }
  },

  // 重新拍照
  retake() {
    this.setData({
      imagePreview: null,
      recognizedFoods: [],
      selectedFoods: {},
      foodAmounts: {},
      error: null,
      hasSelectedFoods: false,
      selectedCount: 0,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    });
  },

  // 跳转到手动搜索
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
