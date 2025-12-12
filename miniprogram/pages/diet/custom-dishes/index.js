/**
 * 自定义菜品页面 - diet-custom/index
 */

Page({
  data: {
    isEdit: false,
    dishId: null,
    name: '',
    description: '',
    servingSize: '1份',
    gramsPerServing: 100,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    imageUrl: '',
    isSaving: false,
    targetDate: '',
    selectedMealType: 'snack'
  },

  onLoad(options) {
    this.setData({
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
          gramsPerServing: dish.gramsPerServing || 100,
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
    this.setData({ gramsPerServing: Number(e.detail.value) || 100 });
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

  // 保存
  async save() {
    const { name, description, servingSize, gramsPerServing, calories, protein, carbs, fat, imageUrl, isEdit, dishId } = this.data;

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
        gramsPerServing: Number(gramsPerServing) || 100,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        imageUrl: imageUrl || ''
      };

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
        await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'addCustomDish',
            payload: dishData
          }
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
