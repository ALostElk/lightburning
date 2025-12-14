/**
 * 自定义菜品页面 - diet-custom/index
 */

Page({
  data: {
    statusBarHeight: 44,
    isEdit: false,
    dishId: null,
    name: '',
    description: '',
    servingSize: '1份',
    gramsPerServing: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    imageUrl: '',
    isSaving: false,
    targetDate: '',
    selectedMealType: 'snack',
    addToMeal: '', // '' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
    mealOptions: [
      { key: 'breakfast', label: '早餐' },
      { key: 'lunch', label: '午餐' },
      { key: 'dinner', label: '晚餐' },
      { key: 'snack', label: '加餐' }
    ]
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44,
      targetDate: options.date || this.getTodayString(),
      selectedMealType: options.mealType || 'snack'
    });

    // 编辑模式
    if (options.dish) {
      try {
        const dish = JSON.parse(decodeURIComponent(options.dish));
        this.setData({
          isEdit: true,
          dishId: dish._id,
          name: dish.name || '',
          description: dish.description || '',
          servingSize: dish.servingSize || '1份',
          gramsPerServing: dish.gramsPerServing || '',
          calories: dish.calories || '',
          protein: dish.protein || '',
          carbs: dish.carbs || '',
          fat: dish.fat || '',
          imageUrl: dish.imageUrl || ''
        });
      } catch (e) {
        console.error('解析菜品数据失败:', e);
      }
    }
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // 输入处理
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onServingSizeInput(e) {
    this.setData({ servingSize: e.detail.value });
  },

  onGramsInput(e) {
    const value = e.detail.value;
    this.setData({ gramsPerServing: value === '' ? '' : Number(value) || '' });
  },

  onNutritionInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [field]: value });
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      const tempFilePath = res.tempFiles[0].tempFilePath;

      wx.showLoading({ title: '上传中...' });

      // 上传到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `user-dishes/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        filePath: tempFilePath
      });

      wx.hideLoading();

      this.setData({ imageUrl: uploadRes.fileID });
    } catch (err) {
      wx.hideLoading();
      if (err.errMsg !== 'chooseMedia:fail cancel') {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  },

  // 删除图片
  removeImage() {
    this.setData({ imageUrl: '' });
  },

  // 切换"添加到餐次"
  selectMealToAdd(e) {
    const meal = e.currentTarget.dataset.meal;
    // 如果点击已选中的，则取消选中（即不添加）
    this.setData({
      addToMeal: this.data.addToMeal === meal ? '' : meal
    });
  },

  // 保存
  async save() {
    const { name, description, servingSize, gramsPerServing, calories, protein, carbs, fat, imageUrl, isEdit, dishId, addToMeal, targetDate } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }

    this.setData({ isSaving: true });

    try {
      const dishData = {
        name: name.trim(),
        description: description.trim(),
        servingSize: servingSize || '1份',
        gramsPerServing: gramsPerServing === '' ? 0 : (Number(gramsPerServing) || 0),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        imageUrl: imageUrl || ''
      };

      let finalDishId = dishId;

      // 1. 保存/更新自定义菜品
      if (isEdit) {
        // 更新
        await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'updateCustomDish',
            payload: {
              dishId,
              updates: dishData
            }
          }
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        // 新增
        const res = await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'addCustomDish',
            payload: dishData
          }
        });
        // 获取新创建的菜品ID
        finalDishId = res.result?._id || res.result?.data?._id;
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      // 2. [新增] 如果选了餐次，自动添加饮食记录
      if (addToMeal && finalDishId) {
        const grams = gramsPerServing === '' ? 100 : (Number(gramsPerServing) || 100);
        await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'addDietLog',
            payload: {
              foodId: finalDishId,
              foodSource: 'UserDishes',
              name: dishData.name,
              calories: dishData.calories,
              protein: dishData.protein,
              carbs: dishData.carbs,
              fat: dishData.fat,
              grams: grams,
              unit: 'g',
              mealType: addToMeal,
              recordDate: targetDate || this.getTodayString(),
              imageUrl: dishData.imageUrl || ''
            }
          }
        });
        wx.showToast({ title: '已添加到' + this.getMealLabel(addToMeal), icon: 'success' });
      }

      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  // 获取餐次标签
  getMealLabel(mealKey) {
    const meal = this.data.mealOptions.find(m => m.key === mealKey);
    return meal ? meal.label : '';
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
