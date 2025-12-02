// pages/home/index.js
import { generatePlan, adjustPlan } from '../../utils/api';

Page({
  data: {
    dailyGoal: null,
    adjustment: null,
    loading: false,
    adjustLoading: false
  },

  async onLoad() {
    // 生成初始计划
    try {
      this.setData({ loading: true })
      wx.showLoading({ title: '生成计划中...' })
      
      const res = await generatePlan(-5, '2023-11-01', '2024-02-01');
      console.log('云函数返回:', res);
      
      this.setData({ 
        dailyGoal: res.result.dailyGoal,
        loading: false
      });
      
      wx.hideLoading()
      wx.showToast({ title: '计划生成成功', icon: 'success' })
      
    } catch (err) {
      console.error('生成计划失败:', err);
      this.setData({ loading: false })
      wx.hideLoading()
      wx.showToast({ 
        title: '生成失败: ' + (err.errMsg || '网络错误'), 
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 调整计划的方法
  async onAdjustPlan() {
    if (this.data.adjustLoading) return; // 防止重复点击
    
    try {
      this.setData({ adjustLoading: true })
      wx.showLoading({ title: '智能调整中...' })
      
      const res = await adjustPlan(this.data.dailyGoal, [
        { date: '2023-11-01', goal: -500, actual: -300 }
      ]);
      
      console.log('调整结果:', res);
      this.setData({ 
        adjustment: res.result.adjustment,
        adjustLoading: false
      });
      
      wx.hideLoading()
      wx.showToast({ 
        title: `建议调整: ${res.result.adjustment}大卡`, 
        icon: 'none',
        duration: 2000
      })
      
    } catch (err) {
      console.error('调整计划失败:', err);
      this.setData({ adjustLoading: false })
      wx.hideLoading()
      wx.showToast({ 
        title: '调整失败', 
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 新增：重新生成计划方法
  async onRegeneratePlan() {
    try {
      wx.showLoading({ title: '重新计算中...' })
      const res = await generatePlan(-3, '2023-11-01', '2024-01-01'); // 示例参数
      this.setData({ 
        dailyGoal: res.result.dailyGoal,
        adjustment: null // 清空调整值
      });
      wx.hideLoading()
      wx.showToast({ title: '已更新计划', icon: 'success' })
    } catch (err) {
      console.error('重新生成失败:', err);
      wx.hideLoading()
    }
  }
});
