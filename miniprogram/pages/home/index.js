// pages/home/index.js
import * as api from '../../utils/cloudApi.js';
import * as calc from '../../utils/calculator.js';

Page({
  data: {
    profile: null,

    // 格式化后的日期显示
    formattedDate: '',

    // 当前显示的日期
    currentDate: '',

    // ========== 计划相关数据 ==========
    activePlan: null,
    planProgress: {
      completionRate: 0,      // 总体完成率
      daysElapsed: 0,         // 已进行天数
      daysRemaining: 0,       // 剩余天数
      weightChange: 0,        // 体重变化
      weeklyTarget: 0,        // 周目标体重变化
      status: 'active'        // 计划状态
    },

    // ========== 今日综合数据 ==========
    todayData: {
      dietCalories: 0,
      exerciseCalories: 0,
      targetCalories: 2000,
      netCalories: 0,
      waterIntake: 0,
      targetWater: 2000,
      // 新增智能目标
      exerciseTargetCalories: 0,  // 智能运动目标
      calorieBalance: 0         // 热量平衡度
    },

    // ========== 进度百分比（优化计算）==========
    progressMetrics: {
      dietProgress: 0,         // 饮食进度
      exerciseProgress: 0,     // 运动进度
      overallProgress: 0,      // 综合进度
      balanceScore: 0          // 平衡得分
    },

    // ========== 双环形图数据 ==========
    dualRingData: {
      dietAngle: 0,            // 饮食环角度
      exerciseAngle: 0,        // 运动环角度
      dietPercentage: 0,       // 饮食百分比
      exercisePercentage: 0    // 运动百分比
    },

    // ========== 营养素数据（增强版）==========
    macros: {
      protein: { current: 0, target: 0, status: 'normal' },
      carbs: { current: 0, target: 0, status: 'normal' },
      fat: { current: 0, target: 0, status: 'normal' }
    },

    // ========== 运动细分数据 ==========
    exerciseBreakdown: {
      aerobic: { calories: 0, target: 0, progress: 0 },
      strength: { calories: 0, target: 0, progress: 0 },
      flexibility: { calories: 0, target: 0, progress: 0 },
      sports: { calories: 0, target: 0, progress: 0 }
    },

    // ========== 周度概览数据 ==========
    weeklyOverview: {
      weekCalories: [],        // 本周每日热量
      weekExercise: [],        // 本周每日运动
      weekBalance: [],         // 本周每日平衡
      dates: [],               // 日期标签
      adherenceRate: 0,        // 遵守率
      bestDay: '',             // 表现最好的一天
      trend: 'stable',         // 趋势：up/down/stable
      avgCalories: 0,          // 平均热量
      avgExercise: 0,          // 平均运动
      totalCalories: 0,        // 总热量
      totalExercise: 0,        // 总运动
      maxValue: 2000,          // 最大值（用于图表）
      targetCalories: 2000      // 目标热量
    },

    // ========== AI 分析洞察（增强版）==========
    aiInsight: {
      message: '建议多摄入蛋白质，保持运动习惯！',
      priority: 'normal',      // high/medium/normal
      type: 'general'          // diet/exercise/balance/general
    },

    // 快捷操作 - 优化后的设计
    quickActions: [
      { icon: '🍽️', title: '记录饮食', url: '/pages/diet/index/index', color: '#FF6B6B' },
      { icon: '💪', title: '记录运动', url: '/pages/exercise/index/index', color: '#4ECDC4' },
      { icon: '📊', title: '每日报告', url: '/pages/report/daily/index', color: '#FFD93D' },
      { icon: '📝', title: '我的计划', url: '/pages/plan/detail/index', color: '#A78BFA' }
    ],

    // 推荐内容
    recommendations: [],

    loading: false
  },

  onLoad() {
    // 初始化格式化日期
    this.setFormattedDate();
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  /**
   * 设置格式化日期
   */
  setFormattedDate(date) {
    const targetDate = date || new Date();
    const formatted = targetDate.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric'
    });
    // 使用 formatDate 函数确保日期格式正确，避免时区问题
    const dateString = api.formatDate(targetDate);

    this.setData({
      formattedDate: formatted,
      currentDate: dateString
    });
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      await Promise.all([
        this.loadProfile(),
        this.loadActivePlan(),
        this.loadTodayData(),
        this.loadWeeklyOverview(),
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
        const tdee = profile.tdee || 2000;
        const goal = profile.goal || '减脂';
        
        this.setData({ 
          profile,
          'todayData.targetCalories': tdee,
          'todayData.targetWater': profile.waterIntake || 2000
        });
        
        // 设置营养素目标：优先使用 profile.macros，否则根据 TDEE 和 goal 计算
        let macrosTarget = { protein: 0, carbs: 0, fat: 0 };
        
        if (profile.macros && profile.macros.protein && profile.macros.carbs && profile.macros.fat) {
          // 使用已有的 macros 数据
          macrosTarget = {
            protein: profile.macros.protein || 0,
            carbs: profile.macros.carbs || 0,
            fat: profile.macros.fat || 0
          };
        } else {
          // 根据 TDEE 和 goal 计算营养素目标值
          macrosTarget = calc.calculateMacroNutrients(tdee, goal);
        }
        
        this.setData({
          'macros.protein.target': macrosTarget.protein,
          'macros.carbs.target': macrosTarget.carbs,
          'macros.fat.target': macrosTarget.fat
        });
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
      // 使用当前选择的日期，如果没有则使用今天
      const targetDate = this.data.currentDate || api.getTodayString();

      // 加载饮食记录
      const dietRes = await api.getDietLogs(targetDate);
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

      // 加载运动记录及细分数据
      const exerciseRes = await api.getExerciseLogs(targetDate);
      let exerciseCalories = 0;
      let exerciseBreakdown = {
        aerobic: { calories: 0, target: 0, progress: 0 },
        strength: { calories: 0, target: 0, progress: 0 },
        flexibility: { calories: 0, target: 0, progress: 0 },
        sports: { calories: 0, target: 0, progress: 0 }
      };

      if (exerciseRes.result?.success && exerciseRes.result?.data) {
        const logs = Array.isArray(exerciseRes.result.data) ? exerciseRes.result.data : [];
        logs.forEach(log => {
          exerciseCalories += log.calories || 0;
          // 按类型统计，确保类型字段正确
          const type = log.exerciseType || log.type || 'aerobic';
          if (exerciseBreakdown[type]) {
            exerciseBreakdown[type].calories += log.calories || 0;
          }
        });
      }

      // 获取智能目标
      const targetCalories = this.data.todayData.targetCalories;
      const exerciseTargetCalories = this.calculateExerciseTarget();

      // 计算各种进度指标
      const progressMetrics = this.calculateProgressMetrics(dietCalories, exerciseCalories, targetCalories, exerciseTargetCalories);

      // 计算双环形图数据
      const dualRingData = this.calculateDualRingData(dietCalories, exerciseCalories, targetCalories, exerciseTargetCalories);

      // 计算热量平衡度
      const calorieBalance = this.calculateCalorieBalance(dietCalories, exerciseCalories, targetCalories);

      // 更新运动细分进度（会通过 setData 更新 exerciseBreakdown）
      this.updateExerciseBreakdown(exerciseBreakdown, exerciseTargetCalories);

      // 计算营养素状态（会通过 setData 更新 macros.status）
      this.updateMacrosStatus(protein, carbs, fat);

      // 生成AI洞察
      this.generateAIInsight(progressMetrics, calorieBalance);

      // 注意：exerciseBreakdown 和 macros.status 已经在各自的更新函数中通过 setData 设置了
      // 这里只需要设置其他数据，避免覆盖已更新的数据
      this.setData({
        'todayData.dietCalories': Math.round(dietCalories),
        'todayData.exerciseCalories': Math.round(exerciseCalories),
        'todayData.netCalories': Math.round(dietCalories - exerciseCalories),
        'todayData.exerciseTargetCalories': exerciseTargetCalories,
        'todayData.calorieBalance': calorieBalance,
        progressMetrics,
        dualRingData,
        'macros.protein.current': Math.round(protein),
        'macros.carbs.current': Math.round(carbs),
        'macros.fat.current': Math.round(fat)
      });
    } catch (error) {
      console.error('加载今日数据失败:', error);
    }
  },

  /**
   * 计算智能运动目标
   */
  calculateExerciseTarget() {
    const profile = this.data.profile;
    const activePlan = this.data.activePlan;

    // 基础目标：TDEE的30%
    let baseTarget = 300; // 默认值

    if (profile && profile.tdee) {
      baseTarget = Math.round(profile.tdee * 0.3); // 30% 的TDEE作为运动目标
    }

    // 根据计划调整
    if (activePlan && activePlan.type === 'weight_loss') {
      baseTarget = Math.max(baseTarget, 500); // 减重计划提高目标
    } else if (activePlan && activePlan.type === 'muscle_gain') {
      baseTarget = Math.max(baseTarget, 400); // 增肌计划适中目标
    }

    return baseTarget;
  },

  /**
   * 计算各种进度指标
   */
  calculateProgressMetrics(dietCalories, exerciseCalories, targetCalories, exerciseTarget) {
    const dietProgress = Math.min(100, Math.round((dietCalories / targetCalories) * 100));
    const exerciseProgress = Math.min(100, Math.round((exerciseCalories / exerciseTarget) * 100));

    // 综合进度：饮食和运动的加权平均
    const overallProgress = Math.min(100, Math.round((dietProgress * 0.6) + (exerciseProgress * 0.4)));

    // 平衡得分：基于饮食和运动的平衡程度
    const balanceScore = this.calculateBalanceScore(dietCalories, exerciseCalories, targetCalories, exerciseTarget);

    return {
      dietProgress,
      exerciseProgress,
      overallProgress,
      balanceScore
    };
  },

  /**
   * 计算平衡得分
   */
  calculateBalanceScore(dietCalories, exerciseCalories, targetCalories, exerciseTarget) {
    // 理想的饮食:运动比为 7:3
    const idealDietRatio = 0.7;
    const idealExerciseRatio = 0.3;

    const totalTarget = targetCalories + exerciseTarget;
    const currentTotal = dietCalories + exerciseCalories;

    if (currentTotal === 0) return 0;

    const dietRatio = dietCalories / currentTotal;
    const exerciseRatio = exerciseCalories / currentTotal;

    // 计算与理想比例的偏差
    const dietDeviation = Math.abs(dietRatio - idealDietRatio);
    const exerciseDeviation = Math.abs(exerciseRatio - idealExerciseRatio);

    // 平衡得分 = (1 - 平均偏差) * 100，范围0-100
    const balanceScore = Math.max(0, Math.round((1 - (dietDeviation + exerciseDeviation) / 2) * 100));

    return balanceScore;
  },

  /**
   * 计算双环形图数据
   */
  calculateDualRingData(dietCalories, exerciseCalories, targetCalories, exerciseTarget) {
    const dietAngle = Math.min(360, (dietCalories / targetCalories) * 360);
    const exerciseAngle = Math.min(360, (exerciseCalories / exerciseTarget) * 360);

    return {
      dietAngle: Math.round(dietAngle),
      exerciseAngle: Math.round(exerciseAngle),
      dietPercentage: Math.min(100, Math.round((dietCalories / targetCalories) * 100)),
      exercisePercentage: Math.min(100, Math.round((exerciseCalories / exerciseTarget) * 100))
    };
  },

  /**
   * 计算热量平衡度
   */
  calculateCalorieBalance(dietCalories, exerciseCalories, targetCalories) {
    const netCalories = dietCalories - exerciseCalories;
    const deficit = targetCalories - netCalories;

    // 平衡度：负值表示赤字，正值表示盈余，0最平衡
    return Math.round(deficit);
  },

  /**
   * 更新运动细分进度
   */
  updateExerciseBreakdown(breakdown, totalTarget) {
    // 为不同类型分配目标（有氧60%，力量25%，柔韧10%，球类5%）
    const targets = {
      aerobic: Math.round(totalTarget * 0.6),
      strength: Math.round(totalTarget * 0.25),
      flexibility: Math.round(totalTarget * 0.1),
      sports: Math.round(totalTarget * 0.05)
    };

    const updatedBreakdown = {};
    Object.keys(breakdown).forEach(type => {
      const target = targets[type] || 1; // 避免除以0
      const calories = breakdown[type].calories || 0;
      updatedBreakdown[type] = {
        calories: calories,
        target: target,
        progress: target > 0 ? Math.min(100, Math.round((calories / target) * 100)) : 0
      };
    });

    this.setData({ exerciseBreakdown: updatedBreakdown });
  },

  /**
   * 更新营养素状态
   */
  updateMacrosStatus(protein, carbs, fat) {
    const macros = this.data.macros;
    const updatedMacros = {};

    Object.keys(macros).forEach(key => {
      const current = key === 'protein' ? protein : key === 'carbs' ? carbs : fat;
      const target = macros[key].target;
      let status = 'normal';

      if (target > 0) {
        const percentage = (current / target) * 100;
        if (percentage < 70) status = 'low';
        else if (percentage > 130) status = 'high';
      }

      updatedMacros[`macros.${key}.status`] = status;
    });

    this.setData(updatedMacros);
  },

  /**
   * 生成AI洞察
   */
  generateAIInsight(progressMetrics, calorieBalance) {
    let message = '今日表现不错，继续保持！';
    let priority = 'normal';
    let type = 'general';

    // 基于进度和平衡度生成洞察
    if (progressMetrics.dietProgress < 50) {
      message = '今日饮食摄入不足，建议适当增加健康食物';
      priority = 'high';
      type = 'diet';
    } else if (progressMetrics.exerciseProgress < 30) {
      message = '今日运动量偏少，适量运动有助于保持健康';
      priority = 'medium';
      type = 'exercise';
    } else if (Math.abs(calorieBalance) > 500) {
      message = `热量${calorieBalance > 0 ? '盈余' : '赤字'}较大，建议调整饮食和运动平衡`;
      priority = 'medium';
      type = 'balance';
    } else if (progressMetrics.balanceScore > 80) {
      message = '饮食和运动搭配很均衡，保持这个好习惯！';
      priority = 'normal';
      type = 'general';
    }

    this.setData({
      aiInsight: {
        message,
        priority,
        type
      }
    });
  },

  /**
   * 加载活跃计划
   */
  async loadActivePlan() {
    try {
      const res = await api.getActivePlan();
      if (res.result?.success && res.result?.data) {
        const plan = res.result.data;
        this.setData({ activePlan: plan });
        this.calculatePlanProgress(plan);
      }
    } catch (error) {
      console.log('加载活跃计划失败:', error);
    }
  },

  /**
   * 计算计划进度
   */
  calculatePlanProgress(plan) {
    if (!plan) return;

    const startDate = new Date(plan.startDate);
    const today = new Date();
    const endDate = new Date(plan.endDate || plan.calculatedEndDate);

    const daysElapsed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // 计算完成率（基于时间进度和体重变化）
    const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100);
    const weightProgress = plan.targetWeightChange ?
      Math.abs(plan.currentWeight - plan.startWeight) / Math.abs(plan.targetWeightChange) * 100 : 0;

    const completionRate = Math.min(100, Math.max(timeProgress, weightProgress));

    // 计算每周目标体重变化
    const weeklyTarget = plan.weeklyChange || (plan.targetWeightChange / totalDays * 7);

    this.setData({
      'planProgress.completionRate': Math.round(completionRate),
      'planProgress.daysElapsed': daysElapsed,
      'planProgress.daysRemaining': daysRemaining,
      'planProgress.weightChange': plan.currentWeight - plan.startWeight,
      'planProgress.weeklyTarget': weeklyTarget,
      'planProgress.status': plan.status || 'active'
    });
  },

  /**
   * 加载周度概览数据
   */
  async loadWeeklyOverview() {
    try {
      const res = await api.getWeeklyOverview();
      if (res.result?.success && res.result?.data) {
        const data = res.result.data;
        
        // 计算统计数据
        const avgCalories = data.calories && data.calories.length > 0 
          ? Math.round(data.calories.reduce((a, b) => a + b, 0) / data.calories.length) 
          : 0;
        const avgExercise = data.exercise && data.exercise.length > 0
          ? Math.round(data.exercise.reduce((a, b) => a + b, 0) / data.exercise.length)
          : 0;
        const totalCalories = data.calories ? data.calories.reduce((a, b) => a + b, 0) : 0;
        const totalExercise = data.exercise ? data.exercise.reduce((a, b) => a + b, 0) : 0;
        
        // 找出最高和最低值（用于图表显示）
        const maxCalories = data.calories && data.calories.length > 0 
          ? Math.max(...data.calories) 
          : 0;
        const maxExercise = data.exercise && data.exercise.length > 0
          ? Math.max(...data.exercise)
          : 0;
        const maxValue = Math.max(maxCalories, maxExercise, data.targetCalories || 2000);
        
        // 预处理平衡度数据，计算宽度百分比
        const weekBalanceWithWidth = (data.balance || []).map(balance => {
          const absBalance = Math.abs(balance);
          const width = absBalance > 500 ? 100 : (absBalance / 500 * 100);
          return {
            value: balance,
            width: width
          };
        });
        
        this.setData({
          weeklyOverview: {
            weekCalories: data.calories || [],
            weekExercise: data.exercise || [],
            weekBalance: data.balance || [],
            weekBalanceWithWidth: weekBalanceWithWidth,
            dates: data.dates || [],
            adherenceRate: data.adherenceRate || 0,
            bestDay: data.bestDay || '',
            trend: data.trend || 'stable',
            avgCalories,
            avgExercise,
            totalCalories,
            totalExercise,
            maxValue,
            targetCalories: data.targetCalories || 2000
          }
        });
      } else {
        // 如果没有数据，设置默认值
        const defaultDates = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const month = date.getMonth() + 1;
          const day = date.getDate();
          defaultDates.push(`${month}/${day}`);
        }
        
        const defaultBalanceWithWidth = Array(7).fill(0).map(() => ({ value: 0, width: 0 }));
        
        this.setData({
          weeklyOverview: {
            weekCalories: Array(7).fill(0),
            weekExercise: Array(7).fill(0),
            weekBalance: Array(7).fill(0),
            weekBalanceWithWidth: defaultBalanceWithWidth,
            dates: defaultDates,
            adherenceRate: 0,
            bestDay: '',
            trend: 'stable',
            avgCalories: 0,
            avgExercise: 0,
            totalCalories: 0,
            totalExercise: 0,
            maxValue: 2000,
            targetCalories: this.data.todayData.targetCalories || 2000
          }
        });
      }
    } catch (error) {
      console.error('加载周度概览失败:', error);
      // 设置默认值
      const defaultDates = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        defaultDates.push(`${month}/${day}`);
      }
      
      const defaultBalanceWithWidth = Array(7).fill(0).map(() => ({ value: 0, width: 0 }));
      
      this.setData({
        weeklyOverview: {
          weekCalories: Array(7).fill(0),
          weekExercise: Array(7).fill(0),
          weekBalance: Array(7).fill(0),
          weekBalanceWithWidth: defaultBalanceWithWidth,
          dates: defaultDates,
          adherenceRate: 0,
          bestDay: '',
          trend: 'stable',
          avgCalories: 0,
          avgExercise: 0,
          totalCalories: 0,
          totalExercise: 0,
          maxValue: 2000,
          targetCalories: this.data.todayData.targetCalories || 2000
        }
      });
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

  /**
   * 日期导航 - 前一天
   */
  goToPrevDay() {
    // 确保 currentDate 存在，如果不存在则使用今天
    const dateStr = this.data.currentDate || api.getTodayString();
    const currentDate = new Date(dateStr);
    currentDate.setDate(currentDate.getDate() - 1);

    this.setFormattedDate(currentDate);
    this.loadTodayData();
  },

  /**
   * 日期导航 - 后一天
   */
  goToNextDay() {
    // 确保 currentDate 存在，如果不存在则使用今天
    const dateStr = this.data.currentDate || api.getTodayString();
    const todayString = api.getTodayString();

    // 如果已经是今天或未来，继续点击下一天显示提示
    if (dateStr >= todayString) {
      wx.showToast({
        title: '美好的未来尚未发生',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const currentDate = new Date(dateStr);
    const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

    this.setFormattedDate(nextDate);
    this.loadTodayData();
  },

  /**
   * 显示日历选择器
   */
  showCalendar() {
    wx.showToast({
      title: '日历功能',
      icon: 'none',
      duration: 1000
    });
  },

  /**
   * 关闭AI横幅
   */
  closeAIBanner() {
    this.setData({
      'aiInsight.message': null
    });
  },

  /**
   * 查看营养素详情
   */
  onViewNutritionDetail() {
    wx.navigateTo({
      url: '/pages/diet/index/index'
    });
  },

  /**
   * 查看运动详情
   */
  onViewExerciseDetail() {
    wx.navigateTo({
      url: '/pages/exercise/index/index'
    });
  },

  /**
   * 查看计划详情
   */
  onViewPlanDetail() {
    wx.navigateTo({
      url: '/pages/plan/detail/index'
    });
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
