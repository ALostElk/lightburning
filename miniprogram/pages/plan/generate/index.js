// pages/plan/generate/index.js
import * as api from '../../../utils/cloudApi.js';
import * as calc from '../../../utils/calculator.js';

/**
 * 计划生成页面
 * 用于创建和预览健康计划
 */
Page({
  data: {
    // 用户信息
    profile: null,
    
    // 计划参数
    targetWeightChange: -5,  // 目标减重(kg)
    totalDays: 90,           // 计划天数
    
    // 预览信息
    dailyDeficit: 0,         // 每日热量差
    dailyCalorieGoal: 0,     // 每日热量目标
    endDate: '',             // 预计完成日期
    weeklyChange: 0,         // 每周体重变化
    planHealth: {},          // 计划健康性评估
    
    // UI状态
    loading: false,
    generating: false
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.loadProfile();
  },

  /**
   * 加载用户信息
   * @private
   */
  async loadProfile() {
    try {
      wx.showLoading({ title: '加载用户信息...' });
      const res = await api.getProfile();
      wx.hideLoading();
      
      if (res.result?.success && res.result?.data) {
        const profile = res.result.data;
        this.setData({ profile });
        
        // 根据用户信息设置默认目标
        if (profile.targetWeight && profile.weight) {
          const defaultChange = profile.targetWeight - profile.weight;
          this.setData({ targetWeightChange: defaultChange });
        }
        
        this.calculatePreview();
      } else {
        wx.showModal({
          title: '提示',
          content: '请先完善个人信息',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile/index'
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      wx.hideLoading();
      api.handleError(error, '加载用户信息失败');
    }
  },

  /**
   * 计算预览信息
   * 根据参数计算每日热量目标、完成日期等
   * @private
   */
  calculatePreview() {
    const { targetWeightChange, totalDays, profile } = this.data;
    
    if (!profile) return;
    
    // 1kg脂肪 ≈ 7700kcal
    const totalDeficit = targetWeightChange * 7700;
    const dailyDeficit = Math.round(totalDeficit / totalDays);
    const dailyCalorieGoal = profile.tdee + dailyDeficit;
    
    // 计算完成日期
    const today = new Date();
    const endDate = new Date(today.getTime() + totalDays * 24 * 60 * 60 * 1000);
    const endDateStr = api.formatDate(endDate);
    
    // 每周体重变化
    const weeklyChange = Number((targetWeightChange / totalDays * 7).toFixed(2));
    
    // 评估计划健康性
    const planHealth = calc.assessPlanHealth(targetWeightChange, totalDays);
    
    this.setData({
      dailyDeficit,
      dailyCalorieGoal,
      endDate: endDateStr,
      weeklyChange,
      planHealth
    });
  },

  /**
   * 目标减重滑块变化
   * @param {Object} e - 事件对象
   */
  onWeightChangeSlider(e) {
    const value = e.detail.value;
    this.setData({ targetWeightChange: value });
    this.calculatePreview();
  },

  /**
   * 计划天数滑块变化
   * @param {Object} e - 事件对象
   */
  onDaysSlider(e) {
    const value = e.detail.value;
    this.setData({ totalDays: value });
    this.calculatePreview();
  },

  /**
   * 目标减重手动输入
   * @param {Object} e - 事件对象
   */
  onWeightInput(e) {
    const value = Number(e.detail.value) || -5;
    this.setData({ targetWeightChange: value });
    this.calculatePreview();
  },

  /**
   * 计划天数手动输入
   * @param {Object} e - 事件对象
   */
  onDaysInput(e) {
    const value = Number(e.detail.value) || 90;
    // 限制范围在30-180天之间
    const days = Math.max(30, Math.min(180, value));
    this.setData({ totalDays: days });
    this.calculatePreview();
  },

  /**
   * 生成计划
   * 验证参数后生成健康计划
   */
  async onGeneratePlan() {
    if (this.data.generating) return;
    
    const { targetWeightChange, totalDays, planHealth } = this.data;
    
    // 警告：计划过于激进
    if (planHealth.status === 'danger') {
      const confirmResult = await new Promise((resolve) => {
        wx.showModal({
          title: '健康提示',
          content: planHealth.message + '，确定要继续吗？',
          success: (res) => resolve(res.confirm)
        });
      });
      
      if (!confirmResult) return;
    }
    
    try {
      this.setData({ generating: true });
      wx.showLoading({ title: '生成计划中...' });
      
      const res = await api.generatePlan(targetWeightChange, totalDays);
      
      console.log('云函数返回的完整结果:', res);
      console.log('res.result:', res.result);
      console.log('res.result.success:', res.result?.success);
      console.log('res.result.data:', res.result?.data);
      
      if (res.result?.success) {
        const data = res.result.data;
        console.log('返回的 data 对象:', data);
        console.log('data._id:', data?._id);
        console.log('data.planId:', data?.planId);
        console.log('data 的所有键:', data ? Object.keys(data) : 'data 为空');
        
        // 尝试多种方式获取 planId（优先使用 planId，然后是 _id）
        const planId = data?.planId || data?._id;
        
        if (!planId) {
          console.error('生成计划成功但未返回 planId');
          console.error('res.result:', JSON.stringify(res.result, null, 2));
          console.error('完整响应:', JSON.stringify(res, null, 2));
          throw new Error('计划ID获取失败，请重试');
        }
        
        console.log('计划生成成功，planId:', planId);
        api.showSuccess('计划生成成功');
        
        // 跳转到计划详情页，传递 planId
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/plan/detail/index?planId=${planId}`
          });
        }, 1000);
      } else {
        console.error('生成计划失败:', res.result);
        throw new Error(res.result?.error || '生成失败');
      }
      
      wx.hideLoading();
      this.setData({ generating: false });
    } catch (error) {
      console.error('生成计划失败:', error);
      wx.hideLoading();
      this.setData({ generating: false });
      api.handleError(error, '生成计划失败');
    }
  }
});

