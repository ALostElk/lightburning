// pages/exercise/index/index.js
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    logs: [],
    todayTotal: {
      duration: 0,
      calories: 0
    },
    recommended: [],
    loading: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadData();
  },

  /**
   * 加载所有数据
   */
  async loadData() {
    await Promise.all([
      this.loadTodayLogs(),
      this.loadRecommended()
    ]);
  },

  /**
   * 加载今日运动记录
   */
  async loadTodayLogs() {
    try {
      const db = wx.cloud.database();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await db.collection('exercise_records')
        .where({
          _openid: '{openid}',
          recordDate: db.command.gte(today).and(db.command.lt(tomorrow))
        })
        .orderBy('recordDate', 'desc')
        .get();

      if (res.data) {
        const logs = res.data;
        const todayTotal = {
          duration: logs.reduce((sum, log) => sum + (log.duration || 0), 0),
          calories: logs.reduce((sum, log) => sum + (log.calories || 0), 0)
        };

        this.setData({
          logs,
          todayTotal
        });
      }
    } catch (error) {
      console.error('加载运动记录失败:', error);
    }
  },

  /**
   * 加载推荐运动
   */
  async loadRecommended() {
    try {
      this.setData({ loading: true });
      
      const res = await api.recommendExercise();
      
      if (res.result?.success && res.result?.data) {
        this.setData({
          recommended: res.result.data.recommended || [],
          loading: false
        });
      }
    } catch (error) {
      console.error('加载推荐失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 添加运动记录
   */
  onAddExercise(e) {
    const { exercise } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '记录运动',
      editable: true,
      placeholderText: '请输入时长（分钟）',
      success: async (res) => {
        if (res.confirm && res.content) {
          const duration = Number(res.content);
          const calories = Math.round((exercise.calories / exercise.duration) * duration);
          
          try {
            await api.logExercise({
              name: exercise.name,
              duration,
              calories,
              date: api.getTodayString()
            });
            
            api.showSuccess('记录成功');
            this.loadData();  // 刷新数据
          } catch (error) {
            api.handleError(error);
          }
        }
      }
    });
  },

  /**
   * 删除运动记录
   */
  deleteLog(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条运动记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            await db.collection('exercise_records').doc(id).remove();
            api.showSuccess('删除成功');
            this.loadData();
          } catch (error) {
            api.handleError(error, '删除失败');
          }
        }
      }
    });
  },

  /**
   * 查看运动库
   */
  goToLibrary() {
    wx.navigateTo({
      url: '/pages/exercise/library/index'
    });
  },

  /**
   * 查看推荐
   */
  goToRecommend() {
    wx.navigateTo({
      url: '/pages/exercise/recommend/index'
    });
  }
});

