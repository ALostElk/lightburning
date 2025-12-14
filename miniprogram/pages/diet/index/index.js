/**
 * 饮食记录主页 - diet/index
 * 设计语言: Daylight Futurism (日光未来主义)
 * 功能: 折叠餐次 + 日历选择 + 云数据库持久化
 */

const app = getApp();

Page({
  data: {
    // 状态栏高度
    statusBarHeight: 44,

    // 用户信息
    userInfo: {},
    greeting: '',

    // 日期
    selectedDate: '',
    dateDisplay: '',

    // 日历相关
    showCalendarModal: false,
    calendarYear: 2024,
    calendarMonth: 12,
    calendarDays: [],
    recordDates: [], // 有记录的日期列表

    // AI 分析
    isAnalyzing: false,
    aiInsight: '',

    // 环形图/液态球计算值
    consumedDegrees: 0,
    liquidProgress: 0,

    // 仪表盘状态（用于动态光晕）
    dashboardStatus: 'status-green', // 默认绿色

    // 餐次数据（含折叠状态）
    meals: [
      {
        id: 'breakfast',
        type: 'breakfast',
        title: '早餐',
        emojiIcon: '🌅',
        totalCalories: 0,
        percentage: 0,
        suggestMin: 300,
        suggestMax: 500,
        emptyText: '美好的一天从早餐开始',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
      },
      {
        id: 'lunch',
        type: 'lunch',
        title: '午餐',
        emojiIcon: '☀️',
        totalCalories: 0,
        percentage: 0,
        suggestMin: 600,
        suggestMax: 800,
        emptyText: '午餐要吃饱，精力才充沛',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
      },
      {
        id: 'dinner',
        type: 'dinner',
        title: '晚餐',
        emojiIcon: '🌙',
        totalCalories: 0,
        percentage: 0,
        suggestMin: 400,
        suggestMax: 600,
        emptyText: '晚餐清淡点，睡眠质量高',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)'
      },
      {
        id: 'snack',
        type: 'snack',
        title: '加餐',
        emojiIcon: '🍩',
        totalCalories: 0,
        percentage: 0,
        suggestMin: 100,
        suggestMax: 300,
        emptyText: '适量加餐，保持代谢活力',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
      }
    ],

    // 统计数据
    stats: {
      totalCalories: 0,
      targetCalories: 2200,
      remainingCalories: 2200,
      burnedCalories: 0,
      caloriePercentage: 100,

      protein: 0,
      proteinTarget: 60,
      proteinPercentage: 0,

      carbs: 0,
      carbsTarget: 250,
      carbsPercentage: 0,

      fat: 0,
      fatTarget: 65,
      fatPercentage: 0
    },

    // 状态
    isLoading: false,

    // 编辑模式
    isEditMode: false,
    selectedCount: 0,
    selectedCalories: 0,
    isAllSelected: false,
    hasAnyMealEditing: false,  // 是否有任何餐次处于编辑模式

    // 左滑相关
    touchStartX: 0,
    touchStartY: 0,

    // 食物编辑弹窗
    showFoodEditModal: false,
    editingFood: {
      id: '',
      name: '',
      emoji: '🍽️',
      grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      // 每100g的营养值（用于重新计算）
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      // 计算后的值
      calculatedCalories: 0,
      calculatedProtein: 0,
      calculatedCarbs: 0,
      calculatedFat: 0,
      mealType: ''
    }
  },

  onLoad() {
    this.initStatusBar();
    this.setGreeting();
    this.setTodayDate();
    this.loadUserInfo();
    this.loadUserGoals();
    this.loadCollapseState();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    this.fetchDietLogs();
    this.fetchRecordDates();
  },

  // 初始化状态栏高度
  initStatusBar() {
    const sysInfo = wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect();
    // 使用胶囊按钮的顶部位置，并额外增加边距确保按钮可点击
    const navPaddingTop = (menuButton.top || sysInfo.statusBarHeight || 44) + 8;
    this.setData({
      statusBarHeight: navPaddingTop
    });
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';

    if (hour >= 5 && hour < 12) {
      greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
      greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好';
    }

    this.setData({ greeting });
  },

  // 设置今日日期
  setTodayDate() {
    const today = this.getTodayString();
    const now = new Date();
    this.setData({
      selectedDate: today,
      dateDisplay: this.formatDateDisplay(today),
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1
    });
  },

  // 获取今日日期字符串
  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // 格式化日期显示
  formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = app.globalData?.userInfo || {};
    this.setData({ userInfo });
  },

  // 加载用户目标
  loadUserGoals() {
    const globalData = app.globalData || {};
    const stats = { ...this.data.stats };

    if (globalData.dailyCalorieGoal) {
      stats.targetCalories = globalData.dailyCalorieGoal;
      stats.remainingCalories = globalData.dailyCalorieGoal;
    }
    if (globalData.dailyProteinGoal) {
      stats.proteinTarget = globalData.dailyProteinGoal;
    }
    if (globalData.dailyCarbGoal) {
      stats.carbsTarget = globalData.dailyCarbGoal;
    }
    if (globalData.dailyFatGoal) {
      stats.fatTarget = globalData.dailyFatGoal;
    }

    this.setData({ stats });
  },

  // 加载折叠状态（从本地存储）
  loadCollapseState() {
    try {
      const collapseState = wx.getStorageSync('mealCollapseState');
      if (collapseState) {
        const meals = this.data.meals.map(meal => ({
          ...meal,
          collapsed: collapseState[meal.type] || false
        }));
        this.setData({ meals });
      }
    } catch (e) {
      console.log('加载折叠状态失败:', e);
    }
  },

  // 保存折叠状态
  saveCollapseState() {
    const collapseState = {};
    this.data.meals.forEach(meal => {
      collapseState[meal.type] = meal.collapsed;
    });
    try {
      wx.setStorageSync('mealCollapseState', collapseState);
    } catch (e) {
      console.log('保存折叠状态失败:', e);
    }
  },

  // 切换折叠状态
  toggleMealCollapse(e) {
    const mealType = e.currentTarget.dataset.mealtype;
    const index = this.data.meals.findIndex(m => m.type === mealType);
    if (index !== -1) {
      const newCollapsed = !this.data.meals[index].collapsed;
      this.setData({
        [`meals[${index}].collapsed`]: newCollapsed
      }, () => {
        this.saveCollapseState();
      });
    }
  },

  // 点击卡片空白区域：折叠时展开，展开时折叠
  onMealCardTap(e) {
    const mealType = e.currentTarget.dataset.mealtype;
    const index = this.data.meals.findIndex(m => m.type === mealType);
    if (index !== -1) {
      const newCollapsed = !this.data.meals[index].collapsed;
      this.setData({
        [`meals[${index}].collapsed`]: newCollapsed
      }, () => {
        this.saveCollapseState();
      });
    }
  },

  // 获取有记录的日期列表
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

  // 生成日历天数
  generateCalendarDays() {
    const year = this.data.calendarYear;
    const month = this.data.calendarMonth;
    const today = this.getTodayString();
    const selectedDate = this.data.selectedDate;
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

  // 显示日历
  showCalendar() {
    const date = new Date(this.data.selectedDate);
    this.setData({
      showCalendarModal: true,
      calendarYear: date.getFullYear(),
      calendarMonth: date.getMonth() + 1
    }, () => {
      this.fetchRecordDates();
    });
  },

  // 隐藏日历
  hideCalendar() {
    this.setData({ showCalendarModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止冒泡
  },

  // 上个月
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

  // 下个月
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

  // 选择日历日期
  selectCalendarDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;

    this.setData({ showCalendarModal: false });
    this.changeDate(date);
  },

  // 快捷选择：今天
  selectToday() {
    this.setData({ showCalendarModal: false });
    this.changeDate(this.getTodayString());
  },

  // 快捷选择：昨天
  selectYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    this.setData({ showCalendarModal: false });
    this.changeDate(d.toISOString().slice(0, 10));
  },

  // 快捷选择：本周开始
  selectThisWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    this.setData({ showCalendarModal: false });
    this.changeDate(d.toISOString().slice(0, 10));
  },

  // 切换到前一天
  goToPrevDay() {
    const [year, month, day] = this.data.selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    currentDate.setDate(currentDate.getDate() - 1);

    const newYear = currentDate.getFullYear();
    const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(currentDate.getDate()).padStart(2, '0');
    this.changeDate(`${newYear}-${newMonth}-${newDay}`);
  },

  // 切换到后一天
  goToNextDay() {
    const [year, month, day] = this.data.selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    currentDate.setDate(currentDate.getDate() + 1);

    const newYear = currentDate.getFullYear();
    const newMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const newDay = String(currentDate.getDate()).padStart(2, '0');
    const nextDateStr = `${newYear}-${newMonth}-${newDay}`;

    const todayStr = this.getTodayString();

    // 不能选择未来日期（字符串比较）
    if (nextDateStr > todayStr) {
      wx.showToast({ title: '美好的未来尚未发生', icon: 'none' });
      return;
    }
    this.changeDate(nextDateStr);
  },

  // 获取饮食记录
  async fetchDietLogs() {
    this.setData({ isLoading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogs',
          payload: { date: this.data.selectedDate }
        }
      });

      if (res.result && res.result.success) {
        const data = res.result.data;
        this.processLogsData(data.logs, data.summary);
      } else {
        throw new Error(res.result?.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取饮食记录失败:', err);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 处理记录数据
  processLogsData(logs, summary) {
    const mealMap = { breakfast: [], lunch: [], dinner: [], snack: [] };
    const mealCalories = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

    logs.forEach(log => {
      const mealType = log.mealType || 'snack';
      if (mealMap[mealType]) {
        const grams = log.grams || 100;
        // 计算每100g的营养值
        const caloriesPer100g = grams > 0 ? Math.round((log.calories || 0) / grams * 100) : 0;
        const proteinPer100g = grams > 0 ? Math.round(((log.protein || 0) / grams * 100) * 10) / 10 : 0;
        const carbsPer100g = grams > 0 ? Math.round(((log.carbs || 0) / grams * 100) * 10) / 10 : 0;
        const fatPer100g = grams > 0 ? Math.round(((log.fat || 0) / grams * 100) * 10) / 10 : 0;

        mealMap[mealType].push({
          id: log._id,
          uniqueId: log._id,
          name: log.name,
          portion: log.grams ? `${log.grams}g` : '1份',
          grams: grams,
          calories: Math.round(log.calories) || 0,
          protein: Math.round((log.protein || 0) * 10) / 10,
          carbs: Math.round((log.carbs || 0) * 10) / 10,
          fat: Math.round((log.fat || 0) * 10) / 10,
          caloriesPer100g: caloriesPer100g,
          proteinPer100g: proteinPer100g,
          carbsPer100g: carbsPer100g,
          fatPer100g: fatPer100g,
          emoji: this.getFoodEmoji(log.name)
        });
        mealCalories[mealType] += (log.calories || 0);
      }
    });

    // 保持现有的折叠状态
    const meals = this.data.meals.map(meal => {
      const currentCal = Math.round(mealCalories[meal.type]) || 0;
      const base = (meal.suggestMax + meal.suggestMin) / 2;
      let percentage = Math.round((currentCal / base) * 100);
      if (percentage > 0 && percentage < 5) percentage = 5;

      return {
        ...meal,
        items: mealMap[meal.type] || [],
        totalCalories: currentCal,
        percentage: percentage
        // 保持 collapsed 状态不变
      };
    });

    // 计算统计数据
    const targetCal = this.data.stats.targetCalories;
    const totalCal = Math.round(summary.totalCalories) || 0;
    const burnedCal = this.data.stats.burnedCalories || 0;
    const remaining = Math.max(0, targetCal + burnedCal - totalCal);

    // 环形图角度计算
    const consumedPercent = Math.min((totalCal / targetCal) * 100, 100);
    const consumedDegrees = Math.round((consumedPercent / 100) * 360);

    const proteinTarget = this.data.stats.proteinTarget;
    const carbsTarget = this.data.stats.carbsTarget;
    const fatTarget = this.data.stats.fatTarget;

    const stats = {
      totalCalories: totalCal,
      targetCalories: targetCal,
      remainingCalories: remaining,
      caloriePercentage: Math.round((remaining / targetCal) * 100),
      burnedCalories: burnedCal,

      protein: Math.round((summary.totalProtein || 0) * 10) / 10,
      proteinTarget: proteinTarget,
      proteinPercentage: Math.min(Math.round(((summary.totalProtein || 0) / proteinTarget) * 100), 100),

      carbs: Math.round((summary.totalCarbs || 0) * 10) / 10,
      carbsTarget: carbsTarget,
      carbsPercentage: Math.min(Math.round(((summary.totalCarbs || 0) / carbsTarget) * 100), 100),

      fat: Math.round((summary.totalFat || 0) * 10) / 10,
      fatTarget: fatTarget,
      fatPercentage: Math.min(Math.round(((summary.totalFat || 0) / fatTarget) * 100), 100)
    };

    // 计算仪表盘状态（根据剩余热量百分比）
    // 绿色（健康）：剩余 >= 50%
    // 黄色（警告）：剩余 20% - 50%
    // 红色（超标）：剩余 < 20% 或已超标
    const remainingPercent = (remaining / targetCal) * 100;
    let dashboardStatus = 'status-green'; // 默认绿色
    if (remainingPercent < 20 || remaining < 0) {
      dashboardStatus = 'status-red'; // 红色：剩余不足或已超标
    } else if (remainingPercent < 50) {
      dashboardStatus = 'status-yellow'; // 黄色：警告
    }

    this.setData({ meals, stats, consumedDegrees, liquidProgress: consumedPercent, dashboardStatus });
  },

  // AI 洞察
  async onAIInsight() {
    if (this.data.isAnalyzing) return;

    this.setData({ isAnalyzing: true });

    try {
      // 获取近7天饮食记录
      const endDate = this.data.selectedDate;
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().slice(0, 10);

      const logsRes = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogsByRange',
          payload: { startDate: startDateStr, endDate }
        }
      });

      const dietRecords = logsRes.result?.data || [];

      // 调用 AI 分析
      const aiRes = await wx.cloud.callFunction({
        name: 'qwenAI',
        data: {
          action: 'analyzeAndRecommend',
          userData: {
            goal: '保持健康',
            ...this.data.userInfo
          },
          dietRecords: dietRecords.map(r => ({
            name: r.name,
            calories: r.calories,
            protein: r.protein,
            carbs: r.carbs,
            fat: r.fat,
            recordDate: r.recordDate
          })),
          nutritionGap: {
            proteinDeficit: Math.max(0, this.data.stats.proteinTarget - this.data.stats.protein),
            carbsDeficit: Math.max(0, this.data.stats.carbsTarget - this.data.stats.carbs),
            fatDeficit: Math.max(0, this.data.stats.fatTarget - this.data.stats.fat),
            caloriesDeficit: this.data.stats.remainingCalories
          }
        }
      });

      if (aiRes.result?.success && aiRes.result.data) {
        const data = aiRes.result.data;
        const insight = data.overall_assessment || data.rawText || '今日饮食整体不错，继续保持！';
        this.setData({ aiInsight: insight });
      } else {
        throw new Error('AI 分析失败');
      }
    } catch (err) {
      console.error('AI 分析失败:', err);
      wx.showToast({ title: 'AI 分析暂不可用', icon: 'none' });
    } finally {
      this.setData({ isAnalyzing: false });
    }
  },

  // 关闭 AI 横幅
  closeAIBanner() {
    this.setData({ aiInsight: '' });
  },

  // 开始挑战
  onStartChallenge() {
    wx.showToast({ title: '挑战功能开发中', icon: 'none' });
  },

  // 切换日期
  changeDate(newDate) {
    this.setData({
      selectedDate: newDate,
      dateDisplay: this.formatDateDisplay(newDate)
    });
    this.fetchDietLogs();
  },

  // 添加食物
  addFood(e) {
    const mealType = e.currentTarget.dataset.mealtype;
    wx.navigateTo({
      url: `/pages/diet/search/index?mealType=${mealType}&date=${this.data.selectedDate}`
    });
  },

  // 显示食物操作
  showFoodOptions(e) {
    const foodId = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['删除记录'],
      itemColor: '#FF4D4F',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteFoodLog(foodId);
        }
      }
    });
  },

  // 删除食物记录
  async deleteFoodLog(logId) {
    wx.showLoading({ title: '删除中' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'deleteDietLog',
          payload: { logId }
        }
      });

      if (res.result && res.result.success) {
        wx.showToast({ title: '已删除', icon: 'success' });
        this.fetchDietLogs();
      } else {
        throw new Error(res.result?.error || '删除失败');
      }
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 跳转到相机
  goToCamera() {
    wx.navigateTo({
      url: `/pages/diet/camera/index?date=${this.data.selectedDate}`
    });
  },

  // 获取食物 Emoji
  getFoodEmoji(name) {
    if (!name) return '🍽️';
    const emojiMap = {
      // 主食类
      '米饭': '🍚', '白饭': '🍚', '糙米': '🍚', '粥': '🍚', '稀饭': '🍚',
      '面条': '🍜', '拉面': '🍜', '米线': '🍜', '粉丝': '🍜', '意面': '🍝', '意大利面': '🍝',
      '面包': '🍞', '吐司': '🍞', '馒头': '🍞', '花卷': '🍞',
      '包子': '🥟', '饺子': '🥟', '馄饨': '🥟', '锅贴': '🥟', '烧麦': '🥟',
      '饼': '🫓', '煎饼': '🫓', '烙饼': '🫓', '葱油饼': '🫓', '手抓饼': '🫓',
      '粽子': '🍙', '饭团': '🍙', '寿司': '🍣',
      '燕麦': '🥣', '麦片': '🥣', '谷物': '🌾', '玉米': '🌽',

      // 肉类
      '鸡肉': '🍗', '鸡腿': '🍗', '鸡翅': '🍗', '鸡胸': '🍗', '炸鸡': '🍗', '烤鸡': '🍗',
      '牛肉': '🥩', '牛排': '🥩', '牛腩': '🥩', '肥牛': '🥩',
      '猪肉': '🥓', '培根': '🥓', '火腿': '🥓', '香肠': '🌭', '热狗': '🌭', '腊肠': '🌭',
      '排骨': '🍖', '骨头': '🍖', '羊肉': '🍖', '烤肉': '🍖', '肉串': '🍢',
      '鸭': '🦆', '鸭肉': '🦆', '烤鸭': '🦆',

      // 海鲜类
      '鱼': '🐟', '三文鱼': '🐟', '鲈鱼': '🐟', '鳕鱼': '🐟', '带鱼': '🐟', '烤鱼': '🐟',
      '虾': '🦐', '虾仁': '🦐', '龙虾': '🦞', '大虾': '🦐', '基围虾': '🦐',
      '蟹': '🦀', '螃蟹': '🦀', '蟹肉': '🦀',
      '贝': '🦪', '蛤蜊': '🦪', '生蚝': '🦪', '扇贝': '🦪', '蚌': '🦪',
      '墨鱼': '🦑', '鱿鱼': '🦑', '章鱼': '🐙',

      // 蛋奶类
      '鸡蛋': '🥚', '蛋': '🥚', '煎蛋': '🍳', '炒蛋': '🍳', '蒸蛋': '🍳', '卤蛋': '🥚',
      '牛奶': '🥛', '奶': '🥛', '酸奶': '🥛', '乳酪': '🧀', '芝士': '🧀', '奶酪': '🧀',
      '黄油': '🧈', '奶油': '🧈',

      // 蔬菜类
      '蔬菜': '🥗', '沙拉': '🥗', '青菜': '🥬', '白菜': '🥬', '生菜': '🥬', '菠菜': '🥬',
      '西蓝花': '🥦', '花菜': '🥦', '花椰菜': '🥦', '西兰花': '🥦',
      '胡萝卜': '🥕', '萝卜': '🥕', '红萝卜': '🥕',
      '番茄': '🍅', '西红柿': '🍅',
      '土豆': '🥔', '马铃薯': '🥔', '红薯': '🍠', '地瓜': '🍠', '紫薯': '🍠',
      '黄瓜': '🥒', '青瓜': '🥒',
      '茄子': '🍆', '辣椒': '🌶️', '青椒': '🫑', '彩椒': '🫑',
      '洋葱': '🧅', '葱': '🧅', '大蒜': '🧄', '蒜': '🧄', '姜': '🫚',
      '蘑菇': '🍄', '香菇': '🍄', '金针菇': '🍄', '平菇': '🍄',
      '豆腐': '🧊', '豆干': '🧊', '豆皮': '🧊',
      '豆': '🫘', '黄豆': '🫘', '绿豆': '🫘', '红豆': '🫘', '豆芽': '🌱',
      '南瓜': '🎃', '冬瓜': '🍈',

      // 水果类
      '苹果': '🍎', '青苹果': '🍏',
      '香蕉': '🍌',
      '橙子': '🍊', '橘子': '🍊', '柑橘': '🍊', '柚子': '🍊',
      '柠檬': '🍋',
      '葡萄': '🍇', '提子': '🍇',
      '草莓': '🍓',
      '樱桃': '🍒', '车厘子': '🍒',
      '桃': '🍑', '桃子': '🍑',
      '梨': '🍐',
      '西瓜': '🍉',
      '芒果': '🥭',
      '菠萝': '🍍', '凤梨': '🍍',
      '猕猴桃': '🥝', '奇异果': '🥝',
      '椰子': '🥥', '椰汁': '🥥',
      '榴莲': '🥑', '牛油果': '🥑', '鳄梨': '🥑',
      '蓝莓': '🫐',
      '瓜': '🍈', '哈密瓜': '🍈', '甜瓜': '🍈',

      // 饮品类
      '咖啡': '☕', '拿铁': '☕', '美式': '☕', '卡布奇诺': '☕',
      '茶': '🍵', '绿茶': '🍵', '红茶': '🍵', '奶茶': '🧋', '珍珠奶茶': '🧋',
      '果汁': '🧃', '橙汁': '🧃', '苹果汁': '🧃',
      '可乐': '🥤', '汽水': '🥤', '饮料': '🥤', '苏打': '🥤',
      '啤酒': '🍺', '白酒': '🍶', '红酒': '🍷', '葡萄酒': '🍷', '香槟': '🥂', '酒': '🍸',
      '水': '💧', '矿泉水': '💧',
      '豆浆': '🥛',

      // 甜点零食类
      '蛋糕': '🍰', '生日蛋糕': '🎂', '芝士蛋糕': '🍰',
      '冰淇淋': '🍦', '雪糕': '🍦', '冰棍': '🍨',
      '甜甜圈': '🍩', '甜点': '🍩',
      '饼干': '🍪', '曲奇': '🍪',
      '巧克力': '🍫',
      '糖果': '🍬', '糖': '🍬',
      '棒棒糖': '🍭',
      '布丁': '🍮', '果冻': '🍮',
      '薯片': '🥔', '薯条': '🍟', '炸薯条': '🍟',
      '爆米花': '🍿',
      '坚果': '🥜', '花生': '🥜', '核桃': '🌰', '栗子': '🌰', '杏仁': '🌰',
      '蜂蜜': '🍯',
      '月饼': '🥮',

      // 快餐类
      '汉堡': '🍔', '汉堡包': '🍔',
      '披萨': '🍕', '比萨': '🍕',
      '三明治': '🥪', '帕尼尼': '🥪',
      '塔可': '🌮', '墨西哥卷': '🌯', '卷饼': '🌯',
      '炸鸡块': '🍗', '鸡块': '🍗',

      // 中餐常见
      '炒饭': '🍚', '蛋炒饭': '🍚', '扬州炒饭': '🍚',
      '炒面': '🍜', '拌面': '🍜',
      '火锅': '🍲', '麻辣烫': '🍲', '麻辣香锅': '🍲', '汤': '🍲', '煲': '🍲',
      '烧烤': '🍢', '串串': '🍢', 'BBQ': '🍢',
      '豆浆油条': '🥛',
      '春卷': '🥟', '炸春卷': '🥟',
      '粉': '🍜', '河粉': '🍜', '肠粉': '🍜',

      // 日韩料理
      '拉面': '🍜', '乌冬面': '🍜', '荞麦面': '🍜',
      '寿司': '🍣', '刺身': '🍣', '生鱼片': '🍣',
      '咖喱': '🍛', '咖喱饭': '🍛',
      '便当': '🍱', '饭盒': '🍱',
      '天妇罗': '🍤', '炸虾': '🍤',
      '泡菜': '🥬', '韩式': '🥢',
      '石锅拌饭': '🍚', '拌饭': '🍚',
      '年糕': '🍡', '糯米糕': '🍡',

      // 西餐
      '牛扒': '🥩', '煎牛排': '🥩',
      '意粉': '🍝', '通心粉': '🍝',
      '沙律': '🥗', '凯撒沙拉': '🥗',
      '浓汤': '🥣', '奶油汤': '🥣',
      '可颂': '🥐', '羊角包': '🥐', '牛角包': '🥐',
      '法棍': '🥖', '长棍面包': '🥖',
      '华夫饼': '🧇', '松饼': '🥞', '薄饼': '🥞', '煎饼果子': '🥞',
      '培根蛋': '🍳', '早餐': '🍳'
    };

    for (const key in emojiMap) {
      if (name.includes(key)) return emojiMap[key];
    }
    return '🍽️';
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.fetchDietLogs().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ============ 编辑模式相关 ============

  // 切换编辑模式（全局）
  toggleEditMode() {
    const isEditMode = !this.data.isEditMode;
    if (!isEditMode) {
      // 退出编辑模式时清除所有选择
      this.clearAllSelections();
    } else {
      // 进入全局编辑模式时，退出所有单餐编辑模式
      const meals = this.data.meals.map(meal => ({
        ...meal,
        isEditing: false
      }));
      this.setData({ meals });
    }
    this.setData({ isEditMode, hasAnyMealEditing: false });
  },

  // 切换单餐编辑模式
  toggleMealEdit(e) {
    const mealType = e.currentTarget.dataset.mealtype;
    const index = this.data.meals.findIndex(m => m.type === mealType);
    if (index === -1) return;

    const meal = this.data.meals[index];
    const newIsEditing = !meal.isEditing;
    const updateData = {};

    if (!newIsEditing) {
      // 退出编辑时清除该餐次的选择
      updateData[`meals[${index}].isEditing`] = false;
      // 清除选中状态
      meal.items.forEach((item, itemIndex) => {
        if (item.selected) {
          updateData[`meals[${index}].items[${itemIndex}].selected`] = false;
        }
      });
    } else {
      // 进入编辑模式时自动展开餐次
      updateData[`meals[${index}].isEditing`] = true;
      updateData[`meals[${index}].collapsed`] = false;
    }

    // 计算是否有任何餐次在编辑模式
    let hasAnyMealEditing = newIsEditing;
    if (!newIsEditing) {
      hasAnyMealEditing = this.data.meals.some((m, i) => i !== index && m.isEditing);
    }

    updateData.hasAnyMealEditing = hasAnyMealEditing;
    updateData.isEditMode = false;

    this.setData(updateData, () => {
      this.updateSelectionStats();
    });
  },

  // 清除所有选择
  clearAllSelections() {
    const meals = this.data.meals.map(meal => ({
      ...meal,
      isEditing: false,
      items: meal.items.map(item => ({ ...item, selected: false, swiped: false }))
    }));
    this.setData({
      meals,
      selectedCount: 0,
      selectedCalories: 0,
      isAllSelected: false,
      hasAnyMealEditing: false
    });
  },

  // 切换单个食物选择
  toggleFoodSelect(e) {
    const foodId = e.currentTarget.dataset.id;
    const mealType = e.currentTarget.dataset.mealtype;

    // 找到对应的餐次和食物索引
    const mealIndex = this.data.meals.findIndex(m => m.type === mealType);
    if (mealIndex === -1) return;

    const itemIndex = this.data.meals[mealIndex].items.findIndex(item => item.id === foodId);
    if (itemIndex === -1) return;

    const newSelected = !this.data.meals[mealIndex].items[itemIndex].selected;

    this.setData({
      [`meals[${mealIndex}].items[${itemIndex}].selected`]: newSelected
    }, () => {
      this.updateSelectionStats();
    });
  },

  // 更新选择统计
  updateSelectionStats() {
    let selectedCount = 0;
    let selectedCalories = 0;
    let totalItems = 0;
    const { isEditMode, hasAnyMealEditing } = this.data;

    this.data.meals.forEach(meal => {
      // 单餐编辑模式下只统计当前编辑的餐次
      const shouldCount = isEditMode || (hasAnyMealEditing && meal.isEditing);
      if (shouldCount) {
        meal.items.forEach(item => {
          totalItems++;
          if (item.selected) {
            selectedCount++;
            selectedCalories += item.calories || 0;
          }
        });
      }
    });

    this.setData({
      selectedCount,
      selectedCalories: Math.round(selectedCalories),
      isAllSelected: totalItems > 0 && selectedCount === totalItems
    });
  },

  // 全选/取消全选
  toggleSelectAll() {
    const shouldSelectAll = !this.data.isAllSelected;
    const { isEditMode, hasAnyMealEditing } = this.data;
    const updateData = {};

    this.data.meals.forEach((meal, mealIndex) => {
      // 单餐编辑模式下只操作当前编辑的餐次
      const shouldOperate = isEditMode || (hasAnyMealEditing && meal.isEditing);
      if (shouldOperate) {
        meal.items.forEach((item, itemIndex) => {
          updateData[`meals[${mealIndex}].items[${itemIndex}].selected`] = shouldSelectAll;
        });
      }
    });

    this.setData(updateData, () => {
      this.updateSelectionStats();
    });
  },

  // 批量删除选中的食物
  async deleteSelectedFoods() {
    const selectedIds = [];
    const { isEditMode, hasAnyMealEditing } = this.data;

    this.data.meals.forEach(meal => {
      // 单餐编辑模式下只操作当前编辑的餐次
      const shouldOperate = isEditMode || (hasAnyMealEditing && meal.isEditing);
      if (shouldOperate) {
        meal.items.forEach(item => {
          if (item.selected) {
            selectedIds.push(item.id);
          }
        });
      }
    });

    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择要删除的记录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedIds.length} 条记录吗？`,
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          await this.batchDeleteFoods(selectedIds);
        }
      }
    });
  },

  // 执行批量删除
  async batchDeleteFoods(ids) {
    wx.showLoading({ title: '删除中...', mask: true });

    try {
      // 逐个删除（可优化为批量删除接口）
      for (const id of ids) {
        await wx.cloud.callFunction({
          name: 'dietService',
          data: {
            action: 'deleteDietLog',
            payload: { logId: id }
          }
        });
      }

      wx.showToast({ title: `已删除 ${ids.length} 条`, icon: 'success' });

      // 清除所有编辑状态
      const meals = this.data.meals.map(meal => ({
        ...meal,
        isEditing: false,
        items: meal.items.map(item => ({ ...item, selected: false }))
      }));

      this.setData({
        isEditMode: false,
        hasAnyMealEditing: false,
        meals,
        selectedCount: 0,
        selectedCalories: 0,
        isAllSelected: false
      });

      this.fetchDietLogs();
    } catch (err) {
      console.error('批量删除失败:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ============ 左滑删除相关 ============

  // 触摸开始
  onFoodTouchStart(e) {
    if (this.data.isEditMode) return;
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  // 触摸移动
  onFoodTouchMove(e) {
    if (this.data.isEditMode) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - this.data.touchStartX;
    const deltaY = touchY - this.data.touchStartY;

    // 判断是否为水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      const foodId = e.currentTarget.dataset.id;
      const mealType = e.currentTarget.dataset.mealtype;
      const shouldSwipe = deltaX < -30;

      // 先重置所有项的滑动状态
      const meals = this.data.meals.map(meal => ({
        ...meal,
        items: meal.items.map(item => ({
          ...item,
          swiped: item.id === foodId ? shouldSwipe : false
        }))
      }));

      this.setData({ meals });
    }
  },

  // 触摸结束
  onFoodTouchEnd(e) {
    // 可以在这里处理额外逻辑
  },

  // 单个删除（左滑删除按钮）
  deleteSingleFood(e) {
    const foodId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteFoodLog(foodId);
        } else {
          // 取消时重置滑动状态
          this.resetSwipeState();
        }
      }
    });
  },

  // 重置滑动状态
  resetSwipeState() {
    const meals = this.data.meals.map(meal => ({
      ...meal,
      items: meal.items.map(item => ({ ...item, swiped: false }))
    }));
    this.setData({ meals });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '轻燃 - AI 智能健康管理',
      path: '/pages/diet/index'
    };
  },

  // ============ 食物编辑相关 ============

  // 打开食物编辑弹窗
  openFoodEdit(e) {
    const food = e.currentTarget.dataset.food;
    const mealType = e.currentTarget.dataset.mealtype;

    if (!food || !food.id) return;

    const grams = food.grams || 100;
    const caloriesPer100g = food.caloriesPer100g || food.calories;
    const proteinPer100g = food.proteinPer100g || 0;
    const carbsPer100g = food.carbsPer100g || 0;
    const fatPer100g = food.fatPer100g || 0;

    this.setData({
      showFoodEditModal: true,
      editingFood: {
        id: food.id,
        name: food.name,
        emoji: food.emoji || '🍽️',
        grams: grams,
        calories: food.calories,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        caloriesPer100g: caloriesPer100g,
        proteinPer100g: proteinPer100g,
        carbsPer100g: carbsPer100g,
        fatPer100g: fatPer100g,
        calculatedCalories: food.calories,
        calculatedProtein: food.protein || 0,
        calculatedCarbs: food.carbs || 0,
        calculatedFat: food.fat || 0,
        mealType: mealType
      }
    });
  },

  // 关闭食物编辑弹窗
  closeFoodEdit() {
    this.setData({ showFoodEditModal: false });
  },

  // 克数输入
  onGramsInput(e) {
    const grams = parseFloat(e.detail.value) || 0;
    this.calculateNutrition(grams);
  },

  // 滑动条变化
  onSliderChange(e) {
    const grams = e.detail.value;
    this.calculateNutrition(grams);
  },

  // 滑动条拖动中
  onSliderChanging(e) {
    const grams = e.detail.value;
    this.calculateNutrition(grams);
  },

  // 快捷设置克数
  setQuickGrams(e) {
    const grams = parseInt(e.currentTarget.dataset.grams) || 100;
    this.calculateNutrition(grams);
  },

  // 计算营养值
  calculateNutrition(grams) {
    const { caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g } = this.data.editingFood;

    const calculatedCalories = Math.round(caloriesPer100g * grams / 100);
    const calculatedProtein = Math.round(proteinPer100g * grams / 100 * 10) / 10;
    const calculatedCarbs = Math.round(carbsPer100g * grams / 100 * 10) / 10;
    const calculatedFat = Math.round(fatPer100g * grams / 100 * 10) / 10;

    this.setData({
      'editingFood.grams': grams,
      'editingFood.calculatedCalories': calculatedCalories,
      'editingFood.calculatedProtein': calculatedProtein,
      'editingFood.calculatedCarbs': calculatedCarbs,
      'editingFood.calculatedFat': calculatedFat
    });
  },

  // 保存食物编辑
  async saveFoodEdit() {
    const { editingFood } = this.data;

    if (!editingFood.id) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    if (!editingFood.grams || editingFood.grams <= 0) {
      wx.showToast({ title: '请输入有效克数', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'updateDietLog',
          payload: {
            logId: editingFood.id,
            updates: {
              grams: editingFood.grams,
              calories: editingFood.calculatedCalories,
              protein: editingFood.calculatedProtein,
              carbs: editingFood.calculatedCarbs,
              fat: editingFood.calculatedFat
            }
          }
        }
      });

      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ showFoodEditModal: false });
        // 刷新数据
        this.fetchDietLogs();
      } else {
        throw new Error(res.result?.error || '保存失败');
      }
    } catch (err) {
      console.error('保存食物编辑失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
