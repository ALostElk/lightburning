// pages/home/index.js
import * as api from '../../utils/cloudApi.js';

Page({
  data: {
    profile: null,

    // 格式化后的日期显示
    formattedDate: '',

    // 当前显示的日期
    currentDate: '',

    // 日历相关
    showCalendarModal: false,
    calendarYear: 2024,
    calendarMonth: 12,
    calendarDays: [],
    recordDates: [], // 有记录的日期列表

    // ========== 体重数据 ==========
    weightData: {
      current: null,      // 当前体重
      previous: null,     // 上次体重
      change: 0,          // 变化量
      changeText: '--',   // 变化文本
      trend: 'stable',    // 趋势: up/down/stable
      history: []         // 近期历史数据（用于绘图）
    },
    showWeightModal: false,
    inputWeight: 60.0,
    weightNote: '',

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

    // ========== 新增：红绿灯状态 ==========
    heroStatus: 'green',       // green/yellow/red
    heroStatusText: '能量平衡', // 对应状态文字

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
      adherenceRate: 0,        // 遵守率
      bestDay: '',             // 表现最好的一天
      trend: 'stable'          // 趋势：up/down/stable
    },

    // ========== AI 分析洞察（增强版）==========
    aiInsight: {
      message: '',  // 初始为空，由 generateAIInsight 动态生成
      priority: 'normal',      // high/medium/normal
      type: 'general',         // diet/exercise/balance/general
      closed: false            // 是否已被用户关闭
    },

    // 快捷操作 - 优化后的设计
    quickActions: [
      { icon: '🍽️', title: '记录饮食', url: '/pages/diet/index/index', color: '#FF6B6B' },
      { icon: '💪', title: '记录运动', url: '/pages/exercise/index/index', color: '#4ECDC4' },
      { icon: '📊', title: '每日报告', url: '/pages/report/daily/index', color: '#FFD93D' },
      { icon: '📝', title: '我的计划', url: '/pages/plan/detail/index', color: '#A78BFA', tabBar: false }
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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
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
    const dateString = targetDate.toISOString().slice(0, 10);

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
        this.loadRecommendations(),
        this.loadWeightData()  // 添加体重数据加载
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
      const today = this.data.currentDate || api.getTodayString();

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

      // 加载运动记录及细分数据
      const exerciseRes = await api.getExerciseLogs(today);
      let exerciseCalories = 0;
      let exerciseBreakdown = {
        aerobic: { calories: 0, target: 0, progress: 0 },
        strength: { calories: 0, target: 0, progress: 0 },
        flexibility: { calories: 0, target: 0, progress: 0 },
        sports: { calories: 0, target: 0, progress: 0 }
      };

      if (exerciseRes.result?.success && exerciseRes.result?.data) {
        const logs = exerciseRes.result.data;
        logs.forEach(log => {
          exerciseCalories += log.calories || 0;
          // 按类型统计
          const type = log.exerciseType || 'aerobic';
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

      // 更新运动细分进度
      this.updateExerciseBreakdown(exerciseBreakdown, exerciseTargetCalories);

      // 计算营养素状态
      this.updateMacrosStatus(protein, carbs, fat);

      // 生成AI洞察
      this.generateAIInsight(progressMetrics, calorieBalance);

      // 更新红绿灯状态
      this.updateHeroStatus(calorieBalance);

      console.log('今日数据加载完成:', {
        dietCalories,
        exerciseCalories,
        calorieBalance,
        progressMetrics
      });

      this.setData({
        'todayData.dietCalories': Math.round(dietCalories),
        'todayData.exerciseCalories': Math.round(exerciseCalories),
        'todayData.netCalories': Math.round(dietCalories - exerciseCalories),
        'todayData.exerciseTargetCalories': exerciseTargetCalories,
        'todayData.calorieBalance': calorieBalance,
        progressMetrics,
        dualRingData,
        exerciseBreakdown,
        'macros.protein.current': Math.round(protein),
        'macros.carbs.current': Math.round(carbs),
        'macros.fat.current': Math.round(fat)
      });
    } catch (error) {
      console.error('加载今日数据失败:', error);
      // 即使数据加载失败，也尝试生成一个通用的AI建议
      if (!this.data.aiInsight.closed) {
        this.setData({
          'aiInsight.message': '开始记录今天的饮食和运动吧！',
          'aiInsight.priority': 'normal',
          'aiInsight.type': 'general'
        });
      }
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
      updatedBreakdown[type] = {
        calories: breakdown[type].calories,
        target: targets[type],
        progress: Math.min(100, Math.round((breakdown[type].calories / targets[type]) * 100))
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
   * 更新红绿灯状态
   */
  updateHeroStatus(balance) {
    let status = 'green';
    let text = '能量完美'; // Perfect

    // 逻辑：
    // -100 ~ +100: 绿色 (完美)
    // -300 ~ +300: 黄色 (注意)
    // 其他: 红色 (警示)

    // 注意：balance = Target - Net. 
    // 其实这里 balance 直接用 net - target 更直观吗？
    // 上面 calculateCalorieBalance 是: deficit = target - net.
    // 所以 input balance 是 "差额"。
    // 如果 balance > 0, 说明 target > net, 即 亏空 (defict), 还在吃
    // 如果 balance < 0, 说明 net > target, 即 盈余 (surplus), 吃多了

    const absBalance = Math.abs(balance);

    if (absBalance <= 150) {
      status = 'green';
      text = '能量完美';
    } else if (absBalance <= 400) {
      status = 'yellow';
      text = balance > 0 ? '能量严重不足' : '能量超标警示';
    } else {
      status = 'red';
      text = balance > 0 ? '需补充能量' : '注意控制';
    }

    this.setData({
      heroStatus: status,
      heroStatusText: text
    });
  },

  /**
   * 生成AI洞察
   */
  generateAIInsight(progressMetrics, calorieBalance) {
    // 如果用户已关闭建议，本次会话不再显示
    if (this.data.aiInsight.closed) {
      console.log('用户已关闭AI建议，跳过生成');
      return;
    }

    let message = '';
    let priority = 'normal';
    let type = 'general';

    console.log('生成AI建议，输入参数:', { progressMetrics, calorieBalance });

    // 基于进度和平衡度生成洞察（按优先级排序）
    if (progressMetrics.dietProgress < 50) {
      message = '今日饮食摄入不足，建议适当增加健康食物';
      priority = 'high';
      type = 'diet';
    } else if (progressMetrics.exerciseProgress < 30) {
      message = '今日运动量偏少，适量运动有助于保持健康';
      priority = 'medium';
      type = 'exercise';
    } else if (Math.abs(calorieBalance) > 500) {
      message = `热量${calorieBalance > 0 ? '赤字' : '盈余'}较大，建议调整饮食和运动平衡`;
      priority = 'medium';
      type = 'balance';
    } else if (progressMetrics.dietProgress > 120) {
      message = '饮食摄入超标，注意控制热量摄入';
      priority = 'medium';
      type = 'diet';
    } else if (progressMetrics.balanceScore > 80) {
      message = '饮食和运动搭配很均衡，保持这个好习惯！';
      priority = 'normal';
      type = 'general';
    } else {
      // 默认情况：给出通用的积极建议
      message = '今日表现不错，继续保持健康的生活方式！';
      priority = 'normal';
      type = 'general';
    }

    console.log('生成的AI建议:', { message, priority, type });

    this.setData({
      'aiInsight.message': message,
      'aiInsight.priority': priority,
      'aiInsight.type': type
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
        this.setData({
          weeklyOverview: {
            weekCalories: data.calories || [],
            weekExercise: data.exercise || [],
            weekBalance: data.balance || [],
            adherenceRate: data.adherenceRate || 0,
            bestDay: data.bestDay || '',
            trend: data.trend || 'stable'
          }
        });
      }
    } catch (error) {
      console.log('加载周度概览失败:', error);
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
   * 关闭AI建议条
   */
  closeAISuggestion() {
    this.setData({
      'aiInsight.message': '',
      'aiInsight.closed': true  // 标记用户已关闭，本次会话不再显示
    });
  },

  // ============ 体重记录相关方法 ============

  /**
   * 打开体重记录弹窗
   */
  openWeightModal() {
    // 获取当前体重作为初始值
    const currentWeight = this.data.weightData.current || this.data.profile?.weight || 60.0;
    const initialWeight = currentWeight ? parseFloat(currentWeight) : 60.0;
    
    console.log('打开体重弹窗，初始体重:', initialWeight);
    
    this.setData({
      showWeightModal: true,
      inputWeight: initialWeight,
      weightNote: ''
    });
  },

  /**
   * 关闭体重记录弹窗
   */
  closeWeightModal() {
    this.setData({
      showWeightModal: false
    });
  },

  /**
   * 体重滑动条改变（实时）
   */
  onWeightSliderChanging(e) {
    this.setData({
      inputWeight: parseFloat(e.detail.value.toFixed(1))
    });
  },

  /**
   * 体重滑动条改变（完成）
   */
  onWeightSliderChange(e) {
    this.setData({
      inputWeight: parseFloat(e.detail.value.toFixed(1))
    });
  },

  /**
   * 直接输入体重
   */
  onWeightDirectInput(e) {
    const value = parseFloat(e.detail.value);
    if (!isNaN(value) && value >= 30 && value <= 150) {
      this.setData({
        inputWeight: value
      });
    }
  },

  /**
   * 调整体重（快捷按钮）
   */
  adjustWeight(e) {
    const delta = parseFloat(e.currentTarget.dataset.delta);
    let newWeight = this.data.inputWeight + delta;
    newWeight = Math.max(30, Math.min(150, newWeight));
    newWeight = parseFloat(newWeight.toFixed(1));
    this.setData({
      inputWeight: newWeight
    });
  },

  /**
   * 输入备注
   */
  onNoteInput(e) {
    this.setData({
      weightNote: e.detail.value
    });
  },

  /**
   * 保存体重记录
   */
  async saveWeight() {
    const { inputWeight, weightNote } = this.data;

    if (!inputWeight || inputWeight < 30 || inputWeight > 150) {
      wx.showToast({
        title: '请输入有效体重',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      console.log('保存体重:', inputWeight);
      
      // 调用云函数保存体重记录
      const res = await api.updateProfile({
        weight: inputWeight
      });

      console.log('保存体重返回:', res);

      wx.hideLoading();
      
      // 检查保存结果
      if (res && res.result && res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        // 重新加载数据
        await this.loadWeightData();
        
        this.closeWeightModal();
      } else {
        const errorMsg = res?.result?.error || '保存失败';
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存体重失败:', error);
      wx.hideLoading();
      api.handleError(error, '保存失败');
    }
  },

  /**
   * 加载体重数据
   */
  async loadWeightData() {
    try {
      // 获取用户资料（包含最新体重）
      const profileRes = await api.getProfile();
      
      console.log('获取用户资料返回:', profileRes);
      
      // 正确解析返回数据结构
      if (!profileRes || !profileRes.result) {
        console.log('返回数据格式错误');
        return;
      }

      const result = profileRes.result;
      
      // 检查是否成功
      if (!result.success) {
        console.log('获取用户资料失败:', result.error);
        return;
      }

      const profile = result.data;
      
      // 检查是否有profile数据
      if (!profile) {
        console.log('用户资料为空');
        this.setData({
          'weightData.current': null,
          'weightData.changeText': '暂无数据',
          'weightData.trend': 'stable',
          'weightData.history': []
        });
        return;
      }

      const currentWeight = profile.weight || null;
      
      console.log('当前体重:', currentWeight);
      
      // 如果没有体重数据，显示空状态
      if (!currentWeight) {
        this.setData({
          'weightData.current': null,
          'weightData.changeText': '暂无记录',
          'weightData.trend': 'stable',
          'weightData.history': []
        });
        return;
      }
      
      // 生成模拟历史数据用于展示趋势
      const weightHistory = this.generateMockWeightHistory(currentWeight);
      
      // 计算变化（使用模拟数据的前一个值）
      const previous = weightHistory.length > 1 ? weightHistory[weightHistory.length - 2].weight : null;
      const change = currentWeight && previous ? parseFloat((currentWeight - previous).toFixed(1)) : 0;
      
      let trend = 'stable';
      let changeText = '无变化';
      
      if (Math.abs(change) < 0.1) {
        trend = 'stable';
        changeText = '无变化';
      } else if (change > 0) {
        trend = 'up';
        changeText = `+${change} kg`;
      } else if (change < 0) {
        trend = 'down';
        changeText = `${change} kg`;
      }

      console.log('体重数据:', {
        current: currentWeight,
        previous,
        change,
        trend,
        changeText,
        historyLength: weightHistory.length
      });

      this.setData({
        'weightData.current': currentWeight,
        'weightData.previous': previous,
        'weightData.change': change,
        'weightData.changeText': changeText,
        'weightData.trend': trend,
        'weightData.history': weightHistory
      });

      // 绘制折线图（延迟确保DOM渲染完成）
      setTimeout(() => {
        this.drawWeightChart();
      }, 500);
    } catch (error) {
      console.error('加载体重数据失败:', error);
      // 设置默认空状态
      this.setData({
        'weightData.current': null,
        'weightData.changeText': '加载失败',
        'weightData.trend': 'stable',
        'weightData.history': []
      });
    }
  },

  /**
   * 生成模拟体重历史数据
   * TODO: 后续替换为真实数据库查询
   */
  generateMockWeightHistory(currentWeight) {
    if (!currentWeight) {
      return [];
    }

    const mockData = [];
    const days = 7; // 减少到7天，显示最近一周数据
    
    // 生成一个平滑的趋势曲线
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // 使用正弦函数生成平滑的波动
      const progress = (days - i) / days;
      const baseChange = (Math.random() - 0.5) * 0.3; // 每天随机 ±0.15kg
      const trendChange = -progress * 2; // 整体下降趋势 -2kg
      
      const weight = parseFloat((currentWeight - trendChange + baseChange).toFixed(1));
      
      mockData.push({
        date: date.toISOString().slice(0, 10),
        weight: weight
      });
    }
    
    // 确保最后一个数据点是当前体重
    if (mockData.length > 0) {
      mockData[mockData.length - 1].weight = currentWeight;
    }
    
    return mockData;
  },

  /**
   * 获取体重历史记录（从数据库）
   * TODO: 需要云函数支持
   */
  async fetchWeightHistory(startDate, endDate) {
    try {
      // 这里应该调用云函数获取历史记录
      // const res = await api.getWeightHistory(startDate, endDate);
      // return res.result?.data || [];
      
      // 临时返回空数组，使用 generateMockWeightHistory 代替
      return [];
    } catch (error) {
      console.error('获取体重历史失败:', error);
      return [];
    }
  },

  /**
   * 绘制体重折线图 (使用 Canvas 2D API)
   */
  drawWeightChart() {
    const { history } = this.data.weightData;
    
    if (!history || history.length === 0) {
      console.log('没有体重历史数据，跳过绘图');
      return;
    }

    const query = wx.createSelectorQuery().in(this);
    
    query.select('#weightChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas 节点获取失败');
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;
        
        // 设置 Canvas 实际渲染尺寸
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        const leftPadding = 35;
        const rightPadding = 10;
        const topPadding = 15;
        const bottomPadding = 10;
        const chartWidth = width - leftPadding - rightPadding;
        const chartHeight = height - topPadding - bottomPadding;
        
        // 获取数据范围
        const weights = history.map(item => item.weight);
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;
        const weightRange = maxWeight - minWeight;
        
        // 计算Y轴刻度（3条稀疏线）
        const yAxisValues = [
          maxWeight,
          (maxWeight + minWeight) / 2,
          minWeight
        ];
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制Y轴网格线和标签
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 0.5;
        ctx.fillStyle = '#94A3B8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        yAxisValues.forEach((value, index) => {
          const y = topPadding + (chartHeight / 2) * index;
          
          // 绘制网格线
          ctx.beginPath();
          ctx.moveTo(leftPadding, y);
          ctx.lineTo(width - rightPadding, y);
          ctx.stroke();
          
          // 绘制Y轴数值标签
          ctx.fillText(value.toFixed(1), leftPadding - 5, y);
        });
        
        // 绘制折线
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        history.forEach((point, index) => {
          const x = leftPadding + (chartWidth / (history.length - 1)) * index;
          const y = topPadding + chartHeight - ((point.weight - minWeight) / weightRange) * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // 绘制数据点
        ctx.fillStyle = '#10B981';
        history.forEach((point, index) => {
          const x = leftPadding + (chartWidth / (history.length - 1)) * index;
          const y = topPadding + chartHeight - ((point.weight - minWeight) / weightRange) * chartHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        // 绘制数据点上的数值标签
        ctx.fillStyle = '#334155';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        history.forEach((point, index) => {
          const x = leftPadding + (chartWidth / (history.length - 1)) * index;
          const y = topPadding + chartHeight - ((point.weight - minWeight) / weightRange) * chartHeight;
          
          // 在点上方显示体重数值
          ctx.fillText(point.weight.toFixed(1), x, y - 6);
        });
        
        // 高亮最后一个点
        if (history.length > 0) {
          const lastPoint = history[history.length - 1];
          const x = leftPadding + chartWidth;
          const y = topPadding + chartHeight - ((lastPoint.weight - minWeight) / weightRange) * chartHeight;
          
          // 白色填充
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
          
          // 绿色边框
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.stroke();
        }
        
        console.log('体重图表绘制完成');
      });
  },

  /**
   * 日期导航 - 前一天
   */
  goToPrevDay() {
    const currentDate = new Date(this.data.currentDate);
    currentDate.setDate(currentDate.getDate() - 1);

    this.setFormattedDate(currentDate);
    this.loadData();
  },

  /**
   * 日期导航 - 后一天
   */
  goToNextDay() {
    const currentDate = new Date(this.data.currentDate);
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    const nextDateString = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 如果已经是今天，继续点击下一天显示提示
    if (this.data.currentDate >= todayString) {
      wx.showToast({
        title: '美好的未来尚未发生',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setFormattedDate(new Date(nextDateString));
    this.loadData();
  },

  /**
   * 显示日历选择器
   */
  showCalendar() {
    const date = new Date(this.data.currentDate);
    this.setData({
      showCalendarModal: true,
      calendarYear: date.getFullYear(),
      calendarMonth: date.getMonth() + 1
    }, () => {
      this.fetchRecordDates();
    });
  },

  /**
   * 隐藏日历
   */
  hideCalendar() {
    this.setData({ showCalendarModal: false });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止冒泡
  },

  /**
   * 上个月
   */
  prevMonth() {
    let { calendarYear, calendarMonth } = this.data;
    if (calendarMonth === 1) {
      calendarYear--;
      calendarMonth = 12;
    } else {
      calendarMonth--;
    }
    this.setData({ calendarYear, calendarMonth }, () => {
      this.fetchRecordDates();
    });
  },

  /**
   * 下个月
   */
  nextMonth() {
    let { calendarYear, calendarMonth } = this.data;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 不允许查看未来月份
    if (calendarYear === currentYear && calendarMonth >= currentMonth) {
      return;
    }

    if (calendarMonth === 12) {
      calendarYear++;
      calendarMonth = 1;
    } else {
      calendarMonth++;
    }
    this.setData({ calendarYear, calendarMonth }, () => {
      this.fetchRecordDates();
    });
  },

  /**
   * 选择日历日期
   */
  selectCalendarDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;

    this.setData({ showCalendarModal: false });
    this.setFormattedDate(new Date(date));
    this.loadData();
  },

  /**
   * 快捷选择：今天
   */
  selectToday() {
    this.setData({ showCalendarModal: false });
    this.setFormattedDate(new Date());
    this.loadData();
  },

  /**
   * 快捷选择：昨天
   */
  selectYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    this.setData({ showCalendarModal: false });
    this.setFormattedDate(d);
    this.loadData();
  },

  /**
   * 快捷选择：本周开始
   */
  selectThisWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    this.setData({ showCalendarModal: false });
    this.setFormattedDate(d);
    this.loadData();
  },

  /**
   * 获取有记录的日期列表
   */
  async fetchRecordDates() {
    try {
      // 获取当前月份的记录日期
      const year = this.data.calendarYear;
      const month = this.data.calendarMonth;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogsByRange',
          payload: { startDate, endDate }
        }
      });

      if (res.result?.success) {
        const logs = res.result.data || [];
        const recordDates = [...new Set(logs.map(log => log.recordDate))];
        this.setData({ recordDates }, () => {
          this.generateCalendarDays();
        });
      }
    } catch (err) {
      console.log('获取记录日期失败:', err);
      this.generateCalendarDays();
    }
  },

  /**
   * 生成日历天数
   */
  generateCalendarDays() {
    const year = this.data.calendarYear;
    const month = this.data.calendarMonth;
    const today = api.getTodayString();
    const selectedDate = this.data.currentDate;
    const recordDates = this.data.recordDates;

    // 本月第一天是周几
    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDay.getDay();

    // 本月天数
    const daysInMonth = new Date(year, month, 0).getDate();

    // 上月天数
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const days = [];

    // 填充上月日期
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasRecord: recordDates.includes(date),
        isFuture: date > today
      });
    }

    // 填充本月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        date,
        isCurrentMonth: true,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasRecord: recordDates.includes(date),
        isFuture: date > today
      });
    }

    // 填充下月日期（补满6行）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        date,
        isCurrentMonth: false,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasRecord: recordDates.includes(date),
        isFuture: date > today
      });
    }

    this.setData({ calendarDays: days });
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
    wx.switchTab({
      url: '/pages/diet/index/index'
    });
  },

  /**
   * 查看运动详情
   */
  onViewExerciseDetail() {
    wx.switchTab({
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
