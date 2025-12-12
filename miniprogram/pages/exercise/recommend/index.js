// pages/exercise/recommend/index.js
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    loading: true,
    userProfile: null,
    recommendations: [],
    selectedLevel: 'moderate', // beginner, moderate, advanced
    levels: [
      { value: 'beginner', label: '初级', icon: '🌱' },
      { value: 'moderate', label: '中级', icon: '💪' },
      { value: 'advanced', label: '高级', icon: '🔥' }
    ]
  },

  onLoad() {
    this.loadProfile();
    this.loadRecommendations();
  },

  /**
   * 加载用户信息
   */
  async loadProfile() {
    try {
      const res = await api.getProfile();
      if (res.result?.success && res.result?.data) {
        this.setData({ userProfile: res.result.data });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 加载运动推荐
   */
  async loadRecommendations() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await api.recommendExercise();
      
      if (res.result?.success && res.result?.data) {
        this.setData({
          recommendations: res.result.data.recommended || [],
          loading: false
        });
      } else {
        // 如果云函数没有返回数据，使用本地运动库
        this.loadLocalExercises();
      }
    } catch (error) {
      console.error('加载推荐失败:', error);
      // 降级到本地数据
      this.loadLocalExercises();
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载本地运动库
   */
  async loadLocalExercises() {
    try {
      // 读取本地运动数据库
      const exercises = require('../../../exercise_db.json');
      const { selectedLevel } = this.data;
      
      // 根据等级筛选
      const filtered = exercises.exercises.filter(ex => 
        ex.level === selectedLevel || !ex.level
      );

      this.setData({
        recommendations: filtered.slice(0, 10),
        loading: false
      });
    } catch (error) {
      console.error('加载本地运动库失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 切换难度等级
   */
  selectLevel(e) {
    const { level } = e.currentTarget.dataset;
    this.setData({ selectedLevel: level });
    this.loadLocalExercises();
  },

  /**
   * 快速添加运动
   */
  quickAdd(e) {
    const { exercise } = e.currentTarget.dataset;
    
    wx.showModal({
      title: `记录${exercise.name}`,
      editable: true,
      placeholderText: '请输入时长（分钟）',
      success: async (res) => {
        if (res.confirm && res.content) {
          const duration = Number(res.content);
          if (isNaN(duration) || duration <= 0) {
            wx.showToast({ title: '请输入有效时长', icon: 'none' });
            return;
          }

          const calories = Math.round((exercise.caloriesPerMinute || exercise.calories / exercise.duration) * duration);
          
          try {
            await api.logExercise({
              name: exercise.name,
              duration,
              calories,
              date: api.getTodayString()
            });
            
            api.showSuccess('记录成功');
          } catch (error) {
            api.handleError(error, '记录失败');
          }
        }
      }
    });
  },

  /**
   * 查看运动详情
   */
  viewDetail(e) {
    const { exercise } = e.currentTarget.dataset;
    
    wx.showModal({
      title: exercise.name,
      content: `${exercise.description || '暂无描述'}\n\n消耗: ${exercise.calories}kcal/${exercise.duration}分钟\n强度: ${exercise.intensity || '中等'}`,
      confirmText: '记录',
      success: (res) => {
        if (res.confirm) {
          this.quickAdd(e);
        }
      }
    });
  }
});

