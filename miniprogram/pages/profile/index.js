// pages/profile/index.js
import * as api from '../../utils/cloudApi.js';
import * as calc from '../../utils/calculator.js';

Page({
  data: {
    profile: {
      gender: 'male',
      age: 25,
      height: 170,
      weight: 70,
      targetWeight: 65,
      goal: '减脂',
      activityLevel: 1.375
      
    },
    
    
    
    // 活动等级选项
    activityLevels: [],
    activityLevelIndex: 1,  // 当前选中的活动等级索引
    
    // 目标选项
    goals: ['减脂', '增肌', '保持'],
    goalIndex: 0,  // 当前选中的目标索引
    
    // 性别选项
    genders: ['男', '女'],
    
    // UI状态
    loading: false,
    editing: false
  },

  onLoad() {
    const activityLevels = calc.getActivityLevels();
    this.setData({
      activityLevels,
      activityLevelIndex: this.findActivityLevelIndex(activityLevels, this.data.profile.activityLevel)
    });
    
    this.loadProfile();
  },

  /**
   * 加载用户信息
   */
  async loadProfile() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const res = await api.getProfile();
      
      if (res.result?.success && res.result?.data) {
        const profile = res.result.data;
        
        const newProfile = {
          gender: profile.gender || 'male',
          age: profile.age || 25,
          height: profile.height || 170,
          weight: profile.weight || 70,
          targetWeight: profile.targetWeight || profile.weight - 5,
          goal: profile.goal || '减脂',
          activityLevel: profile.activityLevel || 1.375
        };
        
        this.setData({
          profile: newProfile,
          activityLevelIndex: this.findActivityLevelIndex(this.data.activityLevels, newProfile.activityLevel),
          goalIndex: this.data.goals.indexOf(newProfile.goal)
        });
      }
      
      wx.hideLoading();
    } catch (error) {
      console.error('加载个人信息失败:', error);
      wx.hideLoading();
    }
  },

  /**
   * 查找活动等级索引
   */
  findActivityLevelIndex(levels, value) {
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].value === value) {
        return i;
      }
    }
    return 1; // 默认返回索引1（轻度活动）
  },

  /**
   * 计算健康指标
   */
  calculateHealth() {
    const { gender, age, height, weight, targetWeight, goal, activityLevel } = this.data.profile;
    
    // 计算BMI
    const bmi = calc.calculateBMI(weight, height);
    const bmiCategory = calc.getBMICategory(bmi);
    
    // 计算BMR和TDEE
    const bmr = calc.calculateBMR(weight, height, age, gender);
    const tdee = calc.calculateTDEE(bmr, activityLevel);
    
    // 计算营养素推荐
    const macros = calc.calculateMacroNutrients(tdee, goal);
    
    // 计算水分推荐
    const waterIntake = calc.calculateWaterIntake(weight);
    
    this.setData({
      bmi,
      bmiCategory,
      bmr,
      tdee,
      macros,
      waterIntake
    });
  },

  /**
   * 输入变化处理
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`profile.${field}`]: field === 'gender' || field === 'goal' ? value : Number(value)
    });
  },

  /**
   * 性别选择
   */
  onGenderChange(e) {
    const value = Number(e.detail.value);
    this.setData({
      'profile.gender': value === 0 ? 'male' : 'female'
    });
  },

  /**
   * 目标选择
   */
  onGoalChange(e) {
    const index = e.detail.value;
    const goal = this.data.goals[index];
    this.setData({
      'profile.goal': goal,
      goalIndex: index
    });
    this.calculateHealth();
  },

  /**
   * 活动等级选择
   */
  onActivityLevelChange(e) {
    const index = e.detail.value;
    const level = this.data.activityLevels[index];
    this.setData({
      'profile.activityLevel': level.value,
      activityLevelIndex: index
    });
    this.calculateHealth();
  },

  /**
   * 验证输入
   */
  validateInput() {
    const { age, height, weight, targetWeight } = this.data.profile;
    
    if (!calc.validateInput.age(age)) {
      wx.showToast({ title: '年龄应在18-80岁之间', icon: 'none' });
      return false;
    }
    
    if (!calc.validateInput.height(height)) {
      wx.showToast({ title: '身高应在100-250cm之间', icon: 'none' });
      return false;
    }
    
    if (!calc.validateInput.weight(weight)) {
      wx.showToast({ title: '体重应在30-200kg之间', icon: 'none' });
      return false;
    }
    
    if (!calc.validateInput.targetWeight(targetWeight, weight)) {
      wx.showToast({ title: '目标体重设置不合理', icon: 'none' });
      return false;
    }
    
    return true;
  },

  /**
   * 保存信息
   */
  async onSave() {
    if (!this.validateInput()) {
      return;
    }
    
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '保存中...' });
      
      const res = await api.updateProfile(this.data.profile);
      
      if (res.result?.success) {
        api.showSuccess('保存成功');
        
        // 更新全局数据
        const app = getApp();
        app.globalData.userInfo = res.result.data;
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        throw new Error(res.result?.error || '保存失败');
      }
      
      wx.hideLoading();
      this.setData({ loading: false });
    } catch (error) {
      console.error('保存失败:', error);
      wx.hideLoading();
      this.setData({ loading: false });
      api.handleError(error, '保存失败');
    }
  },

  /**
   * 重置信息
   */
  onReset() {
    wx.showModal({
      title: '重置确认',
      content: '确定要重置所有信息吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            profile: {
              gender: 'male',
              age: 25,
              height: 170,
              weight: 70,
              targetWeight: 65,
              goal: '减脂',
              activityLevel: 1.375
            }
          });
          this.calculateHealth();
        }
      }
    });
  }
});
