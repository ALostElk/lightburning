/**
 * 拍照识别页面 - diet-camera/index
 * 设计语言: Daylight Futurism (日光未来主义)
 * 集成云函数: dietService (recognizeAndSearch)
 */

Page({
  data: {
    // 状态栏高度
    statusBarHeight: 44,

    // 结果页显示控制
    showResult: false,
    tempImagePath: '',

    // 图片预览（兼容旧版）
    imagePreview: null,

    // 分析状态
    isAnalyzing: false,
    error: null,

    // 识别结果（简化结构：{ name, calories }）
    recognizedFoods: [],

    // 总热量
    totalCalories: 0,

    // 餐次选择
    selectedMealType: 'lunch', // 默认午餐
    mealTypes: [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ],
    showMealTypeSelector: false,

    // 餐次标签（兼容旧版）
    mealTypeLabels: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    },

    // 餐次 Emoji
    mealEmojis: {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '✨'
    },

    // 提交状态
    isSubmitting: false,

    // 目标日期
    targetDate: '',

    // 编辑弹窗
    showFoodEditModal: false,
    editingIndex: -1, // 当前正在编辑的索引
    editingFood: {},  // 编辑副本

    // 旧版兼容属性
    selectedFoods: {},
    foodAmounts: {},
    hasSelectedFoods: false,
    selectedCount: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44
    });
    
    const date = options.date || this.getTodayString();
    const mealType = options.mealType || this.inferMealType();
    this.setData({
      targetDate: date,
      selectedMealType: mealType
    });
  },

  // 统一分析入口
  startAnalysis(imagePath) {
    // 1. 自动判断餐次
    const hour = new Date().getHours();
    let defaultMeal = 'snack';
    if (hour >= 5 && hour < 10) defaultMeal = 'breakfast';
    else if (hour >= 10 && hour < 16) defaultMeal = 'lunch';
    else if (hour >= 16 && hour < 21) defaultMeal = 'dinner';

    this.setData({ 
      isAnalyzing: true, 
      tempImagePath: imagePath,
      imagePreview: imagePath, // 兼容旧版
      selectedMealType: defaultMeal,
      showResult: false,
      recognizedFoods: [],
      totalCalories: 0,
      error: null
    });

    // 2. 调用 AI 识别
    this.analyzeImage(imagePath);
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

  // 相机初始化完成
  onCameraInit() {
    console.log('相机初始化完成');
  },

  // 相机错误处理
  onCameraError(e) {
    console.error('相机错误:', e);
    wx.showToast({ title: '相机初始化失败', icon: 'none' });
  },

  // 拍照
  takePhoto() {
    const ctx = wx.createCameraContext();
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        this.startAnalysis(res.tempImagePath);
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({ title: '拍照失败，请重试', icon: 'none' });
      }
    });
  },

  // 选择图片（从相册）
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        this.startAnalysis(res.tempFiles[0].tempFilePath);
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({ title: '选择图片失败', icon: 'none' });
        }
      }
    });
  },

  // 分析图片
  async analyzeImage(filePath) {
    this.setData({
      isAnalyzing: true,
      error: null,
      recognizedFoods: [],
      totalCalories: 0
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
        // 处理数据结构：包含完整营养信息和每100g数据
        const simplifiedFoods = foods.map(food => {
          const amount = food.amount || food.weight || food.estimatedWeight || food.servingSize || food.portion || 100;
          const ratio = amount / 100;
          
          return {
            name: food.name,
            emoji: food.emoji || '🍽️',
            grams: Math.round(amount),
            calories: Math.round((food.calories || 0) * ratio),
            protein: ((food.protein || 0) * ratio).toFixed(1),
            carbs: ((food.carbs || 0) * ratio).toFixed(1),
            fat: ((food.fat || 0) * ratio).toFixed(1),
            // 每100g数据用于重算
            calPer100: food.calories || 0,
            proPer100: food.protein || 0,
            carPer100: food.carbs || 0,
            fatPer100: food.fat || 0,
            // 选中状态（默认选中）
            isSelected: true,
            // 保留完整数据用于后续提交
            _fullData: food
          };
        });

        this.setData({ 
          recognizedFoods: simplifiedFoods,
          isAnalyzing: false,
          showResult: true
        });
        this.calculateTotal();
      } else {
        this.setData({ 
          error: '未能识别出食物，请重新拍照或手动输入',
          isAnalyzing: false,
          showResult: true
        });
      }
    } catch (err) {
      console.error('识别失败:', err);
      this.setData({ 
        error: err.message || '识别失败，请重试',
        isAnalyzing: false,
        showResult: true
      });
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

  // 切换餐次（新方法）
  selectMeal(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ selectedMealType: type });
  },

  // 切换餐次选择器（兼容旧版）
  toggleMealTypeSelector() {
    this.setData({ showMealTypeSelector: !this.data.showMealTypeSelector });
  },

  // 选择餐次（兼容旧版）
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

  // 统一保存所有食物
  async saveAll() {
    if (this.data.isSubmitting) {
      return;
    }

    // 过滤出选中的食物
    const selectedFoods = this.data.recognizedFoods.filter(item => item.isSelected);
    
    if (selectedFoods.length === 0) {
      wx.showToast({ title: '请至少选择一项', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      // 收集所有要添加的食物（仅选中的）
      const foodsToAdd = selectedFoods.map(food => {
        return {
          name: food.name,
          calories: parseInt(food.calories) || 0,
          protein: parseFloat(food.protein) || 0,
          fat: parseFloat(food.fat) || 0,
          carbs: parseFloat(food.carbs) || 0,
          mealType: this.data.selectedMealType,
          recordDate: this.data.targetDate,
          grams: parseInt(food.grams) || 100,
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
      this.setData({ isSubmitting: false });
    }
  },

  // 切换选中状态
  toggleSelection(e) {
    const index = e.currentTarget.dataset.index;
    const key = `recognizedFoods[${index}].isSelected`;
    this.setData({
      [key]: !this.data.recognizedFoods[index].isSelected
    });
    this.calculateTotal(); // 重新计算总热量
  },

  // 计算总热量（仅计算选中项）
  calculateTotal() {
    const total = this.data.recognizedFoods.reduce((sum, item) => {
      return item.isSelected ? sum + (parseInt(item.calories) || 0) : sum;
    }, 0);
    this.setData({ totalCalories: total });
  },

  // 打开编辑
  openFoodEdit(e) {
    const index = e.currentTarget.dataset.index;
    const food = this.data.recognizedFoods[index];
    this.setData({
      showFoodEditModal: true,
      editingIndex: index,
      editingFood: { ...food } // 复制对象
    });
  },

  // 关闭编辑
  closeFoodEdit() {
    this.setData({ showFoodEditModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 滑动条改变
  onSliderChange(e) {
    const grams = parseInt(e.detail.value);
    const food = this.data.editingFood;
    
    // 实时计算
    const ratio = grams / 100;
    this.setData({
      'editingFood.grams': grams,
      'editingFood.calories': Math.round((food.calPer100 || 0) * ratio),
      'editingFood.protein': ((food.proPer100 || 0) * ratio).toFixed(1),
      'editingFood.carbs': ((food.carPer100 || 0) * ratio).toFixed(1),
      'editingFood.fat': ((food.fatPer100 || 0) * ratio).toFixed(1),
    });
  },

  // 保存修改
  saveFoodEdit() {
    const { editingIndex, editingFood, recognizedFoods } = this.data;
    if (editingIndex < 0) return;
    
    const newList = [...recognizedFoods];
    newList[editingIndex] = { ...editingFood };
    
    this.setData({
      recognizedFoods: newList,
      showFoodEditModal: false
    });
    this.calculateTotal(); // 重新计算总热量
  },

  // 删除某一项
  removeFood(e) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.recognizedFoods];
    list.splice(index, 1);
    this.setData({ recognizedFoods: list });
    this.calculateTotal();
  },

  // 重拍
  retakePhoto() {
    this.setData({ 
      showResult: false, 
      recognizedFoods: [],
      tempImagePath: '',
      imagePreview: null,
      totalCalories: 0,
      error: null
    });
  },

  // 重新拍照（兼容旧版方法名）
  retake() {
    this.retakePhoto();
  },

  // 跳转到手动搜索（支持回调）
  goToSearch() {
    const eventChannel = wx.navigateTo({
      url: `/pages/diet/search/index?mealType=${this.data.selectedMealType}&date=${this.data.targetDate}&from=camera`,
      events: {
        // 监听搜索页传回的数据
        acceptFoodFromSearch: (data) => {
          // data 应为 { name: '苹果', calories: 50, protein: 0.3, carbs: 13, fat: 0.2, ... }
          const amount = data.amount || data.weight || data.estimatedWeight || data.servingSize || data.portion || 100;
          const ratio = amount / 100;
          
          const newFood = {
            name: data.name,
            emoji: data.emoji || '🍽️',
            grams: Math.round(amount),
            calories: Math.round((data.calories || 0) * ratio),
            protein: ((data.protein || 0) * ratio).toFixed(1),
            carbs: ((data.carbs || 0) * ratio).toFixed(1),
            fat: ((data.fat || 0) * ratio).toFixed(1),
            // 每100g数据用于重算
            calPer100: data.calories || 0,
            proPer100: data.protein || 0,
            carPer100: data.carbs || 0,
            fatPer100: data.fat || 0,
            // 选中状态（默认选中）
            isSelected: true,
            _fullData: data
          };
          const newFoods = [...this.data.recognizedFoods, newFood];
          this.setData({ recognizedFoods: newFoods });
          this.calculateTotal();
        }
      }
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
