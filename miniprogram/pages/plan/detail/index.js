// pages/plan/detail/index.js
import * as api from '../../../utils/cloudApi.js';

/**
 * 计划详情页面
 * 负责展示健康计划的详细信息、进度和建议
 */
Page({
  data: {
    planId: '',           // 计划ID
    plan: null,           // 计划数据
    loading: true,        // 加载状态
    
    // 计划进度
    progress: 0,          // 完成百分比 (0-100)
    daysElapsed: 0,       // 已完成天数
    daysRemaining: 0,     // 剩余天数
    calculatedEndDate: '', // 计算得出的结束日期
    
    // 统计数据
    totalWeightChange: 0,
    averageDailyDeficit: 0,
    adherenceRate: 0
  },

  /**
   * 页面加载
   * @param {Object} options - 页面参数
   */
  onLoad(options) {
    console.log('详情页 onLoad，options:', options);
    const planId = options.planId;
    
    // 检查 planId 是否有效（不能是 undefined、null、空字符串或字符串 "undefined"）
    if (planId && planId !== 'undefined' && planId !== 'null') {
      // 直接使用 planId，不依赖 setData 的异步更新
      this.setData({ planId });
      this.loadPlan(planId);
    } else {
      console.warn('planId 无效，尝试加载活跃计划');
      // 加载最新的活跃计划
      this.loadActivePlan();
    }
  },

  /**
   * 加载计划详情
   * @param {string} planId - 计划ID（可选，默认使用 this.data.planId）
   * @private
   */
  async loadPlan(planId) {
    const id = planId || this.data.planId;
    console.log('loadPlan 调用，planId:', id);
    
    if (!id) {
      console.error('planId 为空');
      wx.showToast({
        title: '计划ID不存在',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      console.log('查询计划，_id:', id);
      const res = await db.collection('health_plans')
        .doc(id)
        .get();
      
      if (res.data) {
        // 如果计划中没有 weeklyChange，根据 targetWeightChange 和 totalDays 计算
        if (!res.data.weeklyChange && res.data.targetWeightChange && res.data.totalDays) {
          res.data.weeklyChange = Number((res.data.targetWeightChange / res.data.totalDays * 7).toFixed(2));
        }
        this.setData({ plan: res.data });
        this.calculateProgress();
        wx.hideLoading();
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '计划不存在',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (error) {
      console.error('加载计划失败:', error);
      wx.hideLoading();
      api.handleError(error, '加载计划失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载活跃计划
   * @private
   */
  async loadActivePlan() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      // 移除错误的 _openid 条件，云数据库会自动过滤当前用户的记录
      const res = await db.collection('health_plans')
        .where({
          status: 'active'
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (res.data && res.data.length > 0) {
        const planData = res.data[0];
        // 如果计划中没有 weeklyChange，根据 targetWeightChange 和 totalDays 计算
        if (!planData.weeklyChange && planData.targetWeightChange && planData.totalDays) {
          planData.weeklyChange = Number((planData.targetWeightChange / planData.totalDays * 7).toFixed(2));
        }
        this.setData({ 
          plan: planData,
          planId: planData._id
        });
        this.calculateProgress();
        wx.hideLoading();
      } else {
        wx.hideLoading();
        // 避免死循环：如果是从生成页跳转过来的，直接返回上一页
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.route === 'pages/plan/generate/index') {
          wx.showToast({
            title: '计划加载失败',
            icon: 'none'
          });
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          wx.showModal({
            title: '提示',
            content: '暂无活跃计划，是否创建新计划？',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: '/pages/plan/generate/index'
                });
              } else {
                wx.navigateBack();
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('加载计划失败:', error);
      wx.hideLoading();
      api.handleError(error, '加载计划失败');
      // 避免死循环：查询失败时返回上一页，而不是跳转到生成页
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.redirectTo({
            url: '/pages/home/index'
          });
        }
      }, 1500);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 计算计划进度
   * 根据开始日期、结束日期计算当前进度
   * @private
   */
  calculateProgress() {
    const { plan } = this.data;
    if (!plan) return;

    const startDate = new Date(plan.startDate);
    const now = new Date();
    
    // 如果计划中没有 endDate，根据 startDate 和 totalDays 计算
    let endDate;
    if (plan.endDate) {
      endDate = new Date(plan.endDate);
    } else if (plan.startDate && plan.totalDays) {
      // 容错：根据开始日期和总天数计算结束日期
      endDate = new Date(startDate.getTime() + plan.totalDays * 24 * 60 * 60 * 1000);
    } else {
      console.warn('计划数据缺少日期信息，无法计算进度');
      return;
    }

    // 验证日期有效性
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('计划日期格式无效，无法计算进度');
      return;
    }

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progress = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

    // 格式化结束日期为 YYYY-MM-DD 格式
    const endDateStr = plan.endDate || endDate.toISOString().slice(0, 10);

    this.setData({
      progress,
      daysElapsed: Math.max(0, daysElapsed),
      daysRemaining: Math.max(0, daysRemaining),
      calculatedEndDate: endDateStr
    });

    // 如果原计划数据中没有 endDate，更新到 plan 对象中（用于显示）
    if (!plan.endDate) {
      const updatedPlan = { ...plan, endDate: endDateStr };
      this.setData({ plan: updatedPlan });
    }
  },

  /**
   * 编辑计划
   * 跳转到计划生成页面进行编辑
   */
  editPlan() {
    wx.navigateTo({
      url: `/pages/plan/generate/index?planId=${this.data.planId}&mode=edit`
    });
  },

  /**
   * 完成计划
   * 更新计划状态为完成
   */
  completePlan() {
    wx.showModal({
      title: '确认',
      content: '确定要结束当前计划吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            const db = wx.cloud.database();
            await db.collection('health_plans')
              .doc(this.data.planId)
              .update({
                data: {
                  status: 'completed',
                  completedAt: new Date()
                }
              });
            
            wx.hideLoading();
            api.showSuccess('计划已完成');
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (error) {
            wx.hideLoading();
            console.error('完成计划失败:', error);
            api.handleError(error, '操作失败');
          }
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadPlan().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  }
})