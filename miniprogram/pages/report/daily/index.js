// pages/report/daily/index.js
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    date: '',
    evaluation: null,
    loading: false
  },

  onLoad(options) {
    this.setData({
      date: options.date || api.getTodayString()
    });
    this.loadEvaluation();
  },

  /**
   * 加载每日评价
   */
  async loadEvaluation() {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '分析中...' });
      
      const res = await api.evaluateDaily(this.data.date);
      
      if (res.result?.success && res.result?.data) {
        this.setData({
          evaluation: res.result.data,
          loading: false
        });
      }
      
      wx.hideLoading();
    } catch (error) {
      console.error('加载评价失败:', error);
      wx.hideLoading();
      this.setData({ loading: false });
      api.handleError(error);
    }
  },

  /**
   * 刷新评价
   */
  onRefresh() {
    this.loadEvaluation();
  },

  /**
   * 查看详细建议
   */
  viewSuggestion(e) {
    const { suggestion } = e.currentTarget.dataset;
    wx.showModal({
      title: '健康建议',
      content: suggestion,
      showCancel: false
    });
  },

  /**
   * 切换日期
   */
  changeDate(e) {
    const { delta } = e.currentTarget.dataset;
    const currentDate = new Date(this.data.date);
    currentDate.setDate(currentDate.getDate() + delta);
    
    const newDate = api.formatDate(currentDate);
    this.setData({ date: newDate });
    this.loadEvaluation();
  },

  /**
   * 查看计划调整
   */
  adjustPlan() {
    if (!this.data.evaluation) return;
    
    const { actualDeficit } = this.data.evaluation;
    
    wx.showModal({
      title: '调整计划',
      content: `基于今日实际热量差 ${actualDeficit}kcal，是否要动态调整计划？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '调整中...' });
            await api.adjustPlan(this.data.date, actualDeficit);
            wx.hideLoading();
            api.showSuccess('计划已调整');
          } catch (error) {
            wx.hideLoading();
            api.handleError(error, '调整失败');
          }
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadEvaluation().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});

