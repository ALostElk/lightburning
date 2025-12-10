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
    if (options.planId) {
      this.setData({ planId: options.planId });
      this.loadPlan();
    } else {
      // 加载最新的活跃计划
      this.loadActivePlan();
    }
  },

  /**
   * 加载计划详情
   * @private
   */
  async loadPlan() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('health_plans')
        .doc(this.data.planId)
        .get();
      
      if (res.data) {
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
      const res = await db.collection('health_plans')
        .where({
          _openid: '{openid}',
          status: 'active'
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (res.data && res.data.length > 0) {
        this.setData({ 
          plan: res.data[0],
          planId: res.data[0]._id
        });
        this.calculateProgress();
        wx.hideLoading();
      } else {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '暂无活跃计划，是否创建新计划？',
          success: (res) => {
            if (res.confirm) {
              wx.redirectTo({
                url: '/pages/plan/generate/index'
              });
            } else {
              wx.navigateBack();
            }
          }
        });
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
   * 计算计划进度
   * 根据开始日期、结束日期计算当前进度
   * @private
   */
  calculateProgress() {
    const { plan } = this.data;
    if (!plan) return;

    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const now = new Date();

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

    this.setData({
      progress,
      daysElapsed: Math.max(0, daysElapsed),
      daysRemaining
    });
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