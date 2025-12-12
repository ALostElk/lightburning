/**
 * 手动输入页面 - diet-manual/index
 */
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    name: '',
    amount: 100,
    baseNutrition: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    },
    calculatedNutrition: {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    },
    selectedMealType: 'snack',
    showMealTypeSelector: false,
    isManualMode: true,
    isSubmitting: false,
    error: null,
    targetDate: '',
    food: null,
    quickAmounts: [50, 100, 150, 200, 250, 300],
    mealTypeLabels: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '加餐'
    }
  },

  onLoad(options) {
    const date = options.date || this.getTodayString();
    const mealType = options.mealType || 'snack';
    let food = null;
    let isManualMode = true;

    if (options.food) {
      try {
        food = JSON.parse(decodeURIComponent(options.food));
        isManualMode = false;
      } catch (e) {
        console.error('解析食物数据失败:', e);
      }
    }

    this.setData({
      targetDate: date,
      selectedMealType: mealType,
      food,
      isManualMode,
      name: food?.name || '',
      baseNutrition: {
        calories: food?.calories || 0,
        protein: food?.protein || 0,
        fat: food?.fat || 0,
        carbs: food?.carbs || 0
      }
    });

    this.calculateNutrition();
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // 计算营养值
  calculateNutrition() {
    const { baseNutrition, amount } = this.data;
    const factor = amount / 100;

    this.setData({
      calculatedNutrition: {
        calories: Math.round(baseNutrition.calories * factor),
        protein: Math.round(baseNutrition.protein * factor * 10) / 10,
        fat: Math.round(baseNutrition.fat * factor * 10) / 10,
        carbs: Math.round(baseNutrition.carbs * factor * 10) / 10
      }
    });
  },

  // 输入名称
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  // 输入营养值
  onNutritionInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = Number(e.detail.value) || 0;
    const baseNutrition = { ...this.data.baseNutrition };
    baseNutrition[field] = value;
    this.setData({ baseNutrition });
    this.calculateNutrition();
  },

  // 输入份量
  onAmountInput(e) {
    const amount = Math.max(1, Math.min(500, Number(e.detail.value) || 0));
    this.setData({ amount });
    this.calculateNutrition();
  },

  // 滑动条变化
  onSliderChange(e) {
    const amount = e.detail.value;
    this.setData({ amount });
    this.calculateNutrition();
  },

  // 滑动条滑动中
  onSliderChanging(e) {
    const amount = e.detail.value;
    this.setData({ amount });
    this.calculateNutrition();
  },

  // 调整份量
  adjustAmount(e) {
    const delta = e.currentTarget.dataset.delta;
    const amount = Math.max(1, Math.min(500, this.data.amount + delta));
    this.setData({ amount });
    this.calculateNutrition();
  },

  // 快捷份量
  setQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ amount });
    this.calculateNutrition();
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

  // 提交
  async submit() {
    const { name, calculatedNutrition, selectedMealType, targetDate, amount, food } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true, error: null });

    try {
      await api.addDietLog({
        name: name.trim(),
        calories: calculatedNutrition.calories,
        protein: calculatedNutrition.protein,
        fat: calculatedNutrition.fat,
        carbs: calculatedNutrition.carbs,
        mealType: selectedMealType,
        recordDate: targetDate,
        grams: amount,
        unit: 'g',
        foodId: food?._id || '',
        foodSource: food ? 'FoodDB' : 'manual'
      });

      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ delta: 2 }); // 返回到饮食记录页
      }, 1500);
    } catch (err) {
      this.setData({ error: err.message || '保存失败' });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
