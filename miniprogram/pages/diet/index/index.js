// miniprogram/pages/diet/index/index.js
import * as api from '../../../utils/cloudApi.js';
import * as calc from '../../../utils/calculator.js';

Page({
  data: {
    currentDate: '',
    consumedCalories: 0,
    targetCalories: 2000,
    remaining: 2000,
    meals: [
      {
        type: 'breakfast',
        name: '早餐',
        calories: 0,
        foods: []
      },
      {
        type: 'lunch',
        name: '午餐',
        calories: 0,
        foods: []
      },
      {
        type: 'dinner',
        name: '晚餐',
        calories: 0,
        foods: []
      },
      {
        type: 'snack',
        name: '加餐',
        calories: 0,
        foods: []
      }
    ]
  },

  onLoad(options) {
    this.setCurrentDate();
    this.loadUserProfile();
    this.loadDietRecords();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadDietRecords();
  },

  setCurrentDate() {
    const currentDate = api.getTodayString();
    this.setData({ currentDate });
  },

  async loadUserProfile() {
    try {
      // 先从缓存加载
      const cachedProfile = wx.getStorageSync('userProfile');
      if (cachedProfile && cachedProfile.targetCalories) {
        this.setData({
          targetCalories: cachedProfile.targetCalories
        });
        return;
      }

      // 从云端加载
      const res = await api.getProfile();
      if (res.result && res.result.success && res.result.data) {
        const profile = res.result.data;
        const calculations = calc.calculateAll(profile);
        this.setData({
          targetCalories: Math.round(calculations.tdee)
        });
        wx.setStorageSync('userProfile', profile);
      }
    } catch (err) {
      console.error('加载用户信息失败', err);
    }
  },

  async loadDietRecords() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await api.getDietLogs(this.data.currentDate);
      wx.hideLoading();
      
      if (res.result && res.result.success && res.result.data) {
        const records = res.result.data;
        if (records.length > 0) {
          this.processDietRecords(records);
        } else {
          this.resetMeals();
        }
      } else {
        this.resetMeals();
      }
    } catch (err) {
      wx.hideLoading();
      console.error('加载饮食记录失败', err);
      api.handleError(err, '加载饮食记录失败');
      this.resetMeals();
    }
  },

  processDietRecords(records) {
    const meals = this.data.meals.map(meal => ({
      ...meal,
      foods: [],
      calories: 0
    }));

    let totalCalories = 0;

    records.forEach(record => {
      const mealIndex = meals.findIndex(m => m.type === record.mealType);
      if (mealIndex !== -1) {
        const calories = record.totalCalories || record.calories || 0;
        meals[mealIndex].foods.push({
          id: record._id || record.logId,
          name: record.foodName || record.name,
          amount: record.amount || 0,
          unit: record.unit || 'g',
          calories: calories
        });
        meals[mealIndex].calories += calories;
        totalCalories += calories;
      }
    });

    this.setData({
      meals,
      consumedCalories: Math.round(totalCalories),
      remaining: this.data.targetCalories - Math.round(totalCalories)
    });
  },

  resetMeals() {
    this.setData({
      meals: [
        { type: 'breakfast', name: '早餐', calories: 0, foods: [] },
        { type: 'lunch', name: '午餐', calories: 0, foods: [] },
        { type: 'dinner', name: '晚餐', calories: 0, foods: [] },
        { type: 'snack', name: '加餐', calories: 0, foods: [] }
      ],
      consumedCalories: 0,
      remaining: this.data.targetCalories
    });
  },

  goToCamera() {
    wx.navigateTo({
      url: '/pages/diet/camera/index'
    });
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/diet/search/index'
    });
  },

  goToManual() {
    wx.navigateTo({
      url: '/pages/diet/manual/index'
    });
  },

  addMeal(e) {
    const { type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/diet/search/index?mealType=${type}`
    });
  },

  editFood(e) {
    const { meal, id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/diet/manual/index?id=${id}&mealType=${meal}&mode=edit`
    });
  },

  deleteFood(e) {
    const { meal, id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条饮食记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(id);
        }
      }
    });
  },

  async performDelete(id) {
    wx.showLoading({ title: '删除中...' });
    
    try {
      const res = await api.deleteDietLog(id);
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        api.showSuccess('删除成功');
        this.loadDietRecords();
      } else {
        throw new Error(res.result?.error || '删除失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('删除失败', err);
      api.handleError(err, '删除失败');
    }
  }
});
