// pages/mine/index/index.js
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    profile: null,
    userInfo: null,
    todayStats: {
      dietCalories: 0,
      exerciseCalories: 0,
      records: 0
    },
    menuItems: [
      {
        icon: '📝',
        title: '我的计划',
        url: '/pages/plan/detail/index',
        desc: '查看健康计划'
      },
      {
        icon: '🍳',
        title: '自定义菜品',
        url: '/pages/diet/custom-dishes/index',
        desc: '管理我的菜品'
      },
      {
        icon: '⭐',
        title: '收藏食谱',
        url: '/pages/diet/favorites/index',
        desc: '我的收藏'
      },
      {
        icon: '📊',
        title: '数据统计',
        url: '/pages/stats/index/index',
        desc: '查看数据趋势'
      },
      {
        icon: '📖',
        title: '使用帮助',
        action: 'showHelp',
        desc: '了解如何使用'
      },
      {
        icon: 'ℹ️',
        title: '关于我们',
        action: 'showAbout',
        desc: '应用信息'
      }
    ]
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载所有数据
   */
  async loadData() {
    await Promise.all([
      this.loadProfile(),
      this.loadTodayStats(),
      this.getUserInfo()
    ]);
  },

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    try {
      const res = await wx.getUserInfo();
      this.setData({ userInfo: res.userInfo });
    } catch (error) {
      console.log('未授权用户信息');
    }
  },

  /**
   * 加载今日统计
   */
  async loadTodayStats() {
    try {
      const today = api.getTodayString();
      
      // 加载饮食记录
      const dietRes = await api.getDietLogs(today);
      let dietCalories = 0;
      let records = 0;
      
      if (dietRes.result?.success && dietRes.result?.data) {
        const logs = dietRes.result.data.logs || [];
        dietCalories = logs.reduce((sum, log) => sum + (log.calories || log.totalCalories || 0), 0);
        records = logs.length;
      }

      // 加载运动记录
      const db = wx.cloud.database();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const exerciseRes = await db.collection('exercise_records')
        .where({
          _openid: '{openid}',
          recordDate: db.command.gte(todayStart).and(db.command.lte(todayEnd))
        })
        .get();

      let exerciseCalories = 0;
      if (exerciseRes.data) {
        exerciseCalories = exerciseRes.data.reduce((sum, log) => sum + (log.calories || 0), 0);
      }

      this.setData({
        todayStats: {
          dietCalories: Math.round(dietCalories),
          exerciseCalories: Math.round(exerciseCalories),
          records
        }
      });
    } catch (error) {
      console.error('加载今日统计失败:', error);
    }
  },

  /**
   * 加载用户信息
   */
  async loadProfile() {
    try {
      const res = await api.getProfile();
      
      if (res.result?.success && res.result?.data) {
        this.setData({
          profile: res.result.data
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 编辑个人信息
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/profile/index'
    });
  },

  /**
   * 点击菜单项
   */
  onMenuItemClick(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({ url });
  }
});

