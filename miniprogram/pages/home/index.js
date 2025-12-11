// pages/home/index.js
import * as api from '../../utils/cloudApi.js';

Page({
  data: {
    profile: null,
    
    // 今日数据
    todayData: {
      dietCalories: 0,
      exerciseCalories: 0,
      targetCalories: 2000,
      netCalories: 0,
      waterIntake: 0,
      targetWater: 2000
    },
    
    // 进度百分比
    calorieProgress: 0,
    waterProgress: 0,
    
    // 营养素数据
    macros: {
      protein: { current: 0, target: 0 },
      carbs: { current: 0, target: 0 },
      fat: { current: 0, target: 0 }
    },
    
    // 快捷操作
    quickActions: [
      { icon: '🍽️', title: '记录饮食', url: '/pages/diet/index/index', color: '#FF6B6B' },
      { icon: '💪', title: '记录运动', url: '/pages/exercise/index/index', color: '#4ECDC4' },
      { icon: '📊', title: '每日报告', url: '/pages/report/daily/index', color: '#FFD93D' },
      { icon: '📝', title: '我的计划', url: '/pages/plan/detail/index', color: '#A78BFA' }
    ],
    
    // 推荐卡片
    recommendations: [],
    
    loading: false
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadProfile(),
        this.loadTodayData(),
        this.loadRecommendations()
      ]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载用户信息
   */
  async loadProfile() {
    try {
      const res = await api.getProfile();
      if (res.result?.success && res.result?.data) {
        const profile = res.result.data;
        this.setData({ 
          profile,
          'todayData.targetCalories': profile.tdee || 2000,
          'todayData.targetWater': profile.waterIntake || 2000
        });
        
        // 设置营养素目标
        if (profile.macros) {
          this.setData({
            'macros.protein.target': profile.macros.protein || 0,
            'macros.carbs.target': profile.macros.carbs || 0,
            'macros.fat.target': profile.macros.fat || 0
          });
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  /**
   * 加载今日数据
   */
  async loadTodayData() {
    try {
      const today = api.getTodayString();
      
      // 加载饮食记录
      const dietRes = await api.getDietLogs(today);
      let dietCalories = 0;
      let protein = 0, carbs = 0, fat = 0;
      
      if (dietRes.result?.success && dietRes.result?.data) {
        const logs = dietRes.result.data.logs || [];
        logs.forEach(log => {
          dietCalories += log.calories || log.totalCalories || 0;
          protein += log.protein || 0;
          carbs += log.carbs || 0;
          fat += log.fat || 0;
        });
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

      // 计算净热量和进度
      const targetCalories = this.data.todayData.targetCalories;
      const netCalories = dietCalories - exerciseCalories;
      const calorieProgress = Math.min(100, Math.round((dietCalories / targetCalories) * 100));

      this.setData({
        'todayData.dietCalories': Math.round(dietCalories),
        'todayData.exerciseCalories': Math.round(exerciseCalories),
        'todayData.netCalories': Math.round(netCalories),
        calorieProgress,
        'macros.protein.current': Math.round(protein),
        'macros.carbs.current': Math.round(carbs),
        'macros.fat.current': Math.round(fat)
      });
    } catch (error) {
      console.error('加载今日数据失败:', error);
    }
  },

  /**
   * 加载推荐内容
   */
  async loadRecommendations() {
    try {
      const res = await api.getRecommendedRecipes({ type: 'goal', limit: 3 });
      if (res.result?.success && res.result?.data) {
        this.setData({ recommendations: res.result.data });
      }
    } catch (error) {
      console.log('加载推荐失败:', error);
    }
  },

  /**
   * 快捷操作
   */
  onQuickAction(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({ url });
  },

  /**
   * 编辑个人信息
   */
  onEditProfile() {
    wx.navigateTo({ url: '/pages/profile/index' });
  },

  /**
   * 跳转到食谱推荐
   */
  onRecipeRecommend() {
    wx.navigateTo({ url: '/pages/recipe-recommend/index' });
  },

  /**
   * 跳转到AI建议
   */
  onAISuggestion() {
  wx.navigateTo({ url: '/pages/ai-suggestion/index' });
},
// pages/home/index.js

onQuickAction(e) {
  const { url } = e.currentTarget.dataset;
  if (!url) return;

  // 这里写你的 tabBar 页面路径（和 app.json 里保持一致）
  const tabBarPages = [
    '/pages/home/index',
    '/pages/diet/index/index',
    '/pages/exercise/index/index',
    '/pages/profile/index'
  ];

  if (tabBarPages.includes(url)) {
    // tabBar 页面用 switchTab
    wx.switchTab({ url });
  } else {
    // 非 tabBar 页面用 navigateTo
    wx.navigateTo({ url });
  }
},


  /**
   * 查看食谱详情
   */
  viewRecipe(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recipe-detail/index?id=${id}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
