// pages/stats/index/index.js
import * as api from '../../../utils/cloudApi.js';

Page({
  data: {
    timeRange: 7, // 7天、30天、90天
    
    // 饮食数据
    dietLogs: [],
    dietSummary: {
      totalCalories: 0,
      avgCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    },
    
    // 运动数据
    exerciseLogs: [],
    exerciseSummary: {
      totalDuration: 0,
      totalCalories: 0,
      avgCalories: 0,
      count: 0
    },
    
    // 体重数据
    weightRecords: [],
    weightChange: 0,
    
    loading: false,
    activeTab: 'overview' // overview, diet, exercise, weight
  },

  onLoad() {
    this.loadStats();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadDietStats(),
        this.loadExerciseStats(),
        this.loadWeightRecords()
      ]);
    } catch (error) {
      console.error('加载统计失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载饮食统计
   */
  async loadDietStats() {
    try {
      const endDate = api.getTodayString();
      const startDate = this.getStartDate(this.data.timeRange);
      
      const res = await api.getDietLogsByRange(startDate, endDate);
      
      if (res.result?.success && res.result?.data) {
        const dietLogs = res.result.data;
        this.calculateDietSummary(dietLogs);
        this.setData({ dietLogs });
      }
    } catch (error) {
      console.error('加载饮食统计失败:', error);
    }
  },

  /**
   * 加载运动统计
   */
  async loadExerciseStats() {
    try {
      const db = wx.cloud.database();
      const endDate = new Date(api.getTodayString());
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(this.getStartDate(this.data.timeRange));
      startDate.setHours(0, 0, 0, 0);

      const res = await db.collection('exercise_records')
        .where({
          _openid: '{openid}',
          recordDate: db.command.gte(startDate).and(db.command.lte(endDate))
        })
        .get();

      if (res.data) {
        const exerciseLogs = res.data;
        this.calculateExerciseSummary(exerciseLogs);
        this.setData({ exerciseLogs });
      }
    } catch (error) {
      console.error('加载运动统计失败:', error);
    }
  },

  /**
   * 加载体重记录
   */
  async loadWeightRecords() {
    try {
      const db = wx.cloud.database();
      const endDate = new Date(api.getTodayString());
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(this.getStartDate(this.data.timeRange));
      startDate.setHours(0, 0, 0, 0);

      const res = await db.collection('weight_records')
        .where({
          _openid: '{openid}',
          recordDate: db.command.gte(startDate).and(db.command.lte(endDate))
        })
        .orderBy('recordDate', 'asc')
        .get();

      if (res.data && res.data.length > 0) {
        const records = res.data;
        const weightChange = records[records.length - 1].weight - records[0].weight;
        this.setData({ 
          weightRecords: records,
          weightChange: Number(weightChange.toFixed(1))
        });
      }
    } catch (error) {
      console.error('加载体重记录失败:', error);
    }
  },

  /**
   * 计算饮食汇总
   */
  calculateDietSummary(logs) {
    const summary = logs.reduce((acc, log) => {
      acc.totalCalories += log.calories || log.totalCalories || 0;
      acc.totalProtein += log.protein || 0;
      acc.totalCarbs += log.carbs || 0;
      acc.totalFat += log.fat || 0;
      return acc;
    }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });

    summary.avgCalories = logs.length > 0 ? Math.round(summary.totalCalories / this.data.timeRange) : 0;
    summary.totalCalories = Math.round(summary.totalCalories);
    summary.totalProtein = Math.round(summary.totalProtein);
    summary.totalCarbs = Math.round(summary.totalCarbs);
    summary.totalFat = Math.round(summary.totalFat);

    this.setData({ dietSummary: summary });
  },

  /**
   * 计算运动汇总
   */
  calculateExerciseSummary(logs) {
    const summary = logs.reduce((acc, log) => {
      acc.totalDuration += log.duration || 0;
      acc.totalCalories += log.calories || 0;
      acc.count += 1;
      return acc;
    }, { totalDuration: 0, totalCalories: 0, count: 0 });

    summary.avgCalories = summary.count > 0 ? Math.round(summary.totalCalories / summary.count) : 0;

    this.setData({ exerciseSummary: summary });
  },

  /**
   * 获取开始日期
   */
  getStartDate(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return api.formatDate(date);
  },

  /**
   * 切换时间范围
   */
  onTimeRangeChange(e) {
    const range = Number(e.currentTarget.dataset.range);
    this.setData({ timeRange: range });
    this.loadStats();
  },

  /**
   * 切换标签
   */
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});

