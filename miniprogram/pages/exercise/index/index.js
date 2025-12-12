/**
 * 运动记录主页 - exercise/index
 * 设计语言: Daylight Futurism (日光未来主义)
 * 功能: 折叠运动类型 + 日历选择 + 云数据库持久化
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

    // 运动类型数据（含折叠状态）
    exerciseTypes: [
      {
        id: 'aerobic',
        type: 'aerobic',
        title: '有氧运动',
        emojiIcon: '🏃',
        totalCalories: 0,
        totalDuration: 0,
        percentage: 0,
        suggestMin: 20,
        suggestMax: 60,
        emptyText: '有氧运动，燃烧卡路里',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
      },
      {
        id: 'strength',
        type: 'strength',
        title: '力量训练',
        emojiIcon: '💪',
        totalCalories: 0,
        totalDuration: 0,
        percentage: 0,
        suggestMin: 20,
        suggestMax: 45,
        emptyText: '力量训练，塑造体型',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
      },
      {
        id: 'flexibility',
        type: 'flexibility',
        title: '拉伸放松',
        emojiIcon: '🧘',
        totalCalories: 0,
        totalDuration: 0,
        percentage: 0,
        suggestMin: 10,
        suggestMax: 30,
        emptyText: '拉伸放松，缓解疲劳',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)'
      },
      {
        id: 'sports',
        type: 'sports',
        title: '球类运动',
        emojiIcon: '⚽',
        totalCalories: 0,
        totalDuration: 0,
        percentage: 0,
        suggestMin: 30,
        suggestMax: 60,
        emptyText: '球类运动，享受乐趣',
        items: [],
        collapsed: true,
        bgStyle: 'background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
      }
    ],

    // 统计数据
    stats: {
      totalCalories: 0,
      targetCalories: 500,
      remainingCalories: 500,
      consumedCalories: 0,
      caloriePercentage: 100,

      totalDuration: 0,
      targetDuration: 60,
      durationPercentage: 0
    },

    // 状态
    isLoading: false,

    // 编辑模式
    isEditMode: false,
    selectedCount: 0,
    selectedCalories: 0,
    isAllSelected: false,
    hasAnyTypeEditing: false,  // 是否有任何类型处于编辑模式

    // 左滑相关
    touchStartX: 0,
    touchStartY: 0,

    // 运动编辑弹窗
    showExerciseEditModal: false,
    editingExercise: {
      id: '',
      name: '',
      emoji: '🏃',
      duration: 30,
      calories: 0,
      // 每分钟消耗的热量
      caloriesPerMin: 8,
      // 计算后的值
      calculatedCalories: 0,
      type: ''
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
    this.fetchExerciseLogs();
    this.fetchRecordDates();
  },

  // 初始化状态栏高度
  initStatusBar() {
    const sysInfo = wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect();
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

    // 从全局数据加载运动目标
    if (globalData.dailyExerciseCalorieGoal) {
      stats.targetCalories = globalData.dailyExerciseCalorieGoal;
      stats.remainingCalories = globalData.dailyExerciseCalorieGoal;
    }
    if (globalData.dailyExerciseDurationGoal) {
      stats.targetDuration = globalData.dailyExerciseDurationGoal;
    }

    this.setData({ stats });
  },

  // 加载折叠状态（从本地存储）
  loadCollapseState() {
    try {
      const collapseState = wx.getStorageSync('exerciseCollapseState');
      if (collapseState) {
        const exerciseTypes = this.data.exerciseTypes.map(type => ({
          ...type,
          collapsed: collapseState[type.type] || false
        }));
        this.setData({ exerciseTypes });
      }
    } catch (e) {
      console.log('加载折叠状态失败:', e);
    }
  },

  // 保存折叠状态
  saveCollapseState() {
    const collapseState = {};
    this.data.exerciseTypes.forEach(type => {
      collapseState[type.type] = type.collapsed;
    });
    try {
      wx.setStorageSync('exerciseCollapseState', collapseState);
    } catch (e) {
      console.log('保存折叠状态失败:', e);
    }
  },

  // 切换折叠状态
  toggleTypeCollapse(e) {
    const exerciseType = e.currentTarget.dataset.type;
    const index = this.data.exerciseTypes.findIndex(t => t.type === exerciseType);
    if (index !== -1) {
      const newCollapsed = !this.data.exerciseTypes[index].collapsed;
      this.setData({
        [`exerciseTypes[${index}].collapsed`]: newCollapsed
      }, () => {
        this.saveCollapseState();
      });
    }
  },

  // 点击卡片空白区域：折叠时展开，展开时折叠
  onTypeCardTap(e) {
    const exerciseType = e.currentTarget.dataset.type;
    const index = this.data.exerciseTypes.findIndex(t => t.type === exerciseType);
    if (index !== -1) {
      const newCollapsed = !this.data.exerciseTypes[index].collapsed;
      this.setData({
        [`exerciseTypes[${index}].collapsed`]: newCollapsed
      }, () => {
        this.saveCollapseState();
      });
    }
  },

  // 获取有记录的日期列表
  async fetchRecordDates() {
    try {
      const year = this.data.calendarYear;
      const month = this.data.calendarMonth;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const db = wx.cloud.database();
      const res = await db.collection('exercise_records')
        .where({
          recordDate: db.command.gte(startDate).and(db.command.lte(endDate))
        })
        .field({ recordDate: true })
        .get();

      if (res.data) {
        const recordDates = [...new Set(res.data.map(log => log.recordDate))];
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

    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
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

    if (nextDateStr > todayStr) {
      wx.showToast({ title: '不能选择未来日期', icon: 'none' });
      return;
    }
    this.changeDate(nextDateStr);
  },

  // 获取运动记录
  async fetchExerciseLogs() {
    this.setData({ isLoading: true });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('exercise_records')
        .where({
          recordDate: this.data.selectedDate
        })
        .get();

      if (res.data) {
        this.processLogsData(res.data);
      }
    } catch (err) {
      console.error('获取运动记录失败:', err);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 处理记录数据
  processLogsData(logs) {
    const typeMap = { aerobic: [], strength: [], flexibility: [], sports: [] };
    const typeCalories = { aerobic: 0, strength: 0, flexibility: 0, sports: 0 };
    const typeDuration = { aerobic: 0, strength: 0, flexibility: 0, sports: 0 };

    logs.forEach(log => {
      const exerciseType = log.exerciseType || 'aerobic';
      if (typeMap[exerciseType]) {
        const duration = log.duration || 0;
        const caloriesPerMin = duration > 0 ? Math.round((log.calories || 0) / duration * 10) / 10 : 0;

        typeMap[exerciseType].push({
          id: log._id,
          uniqueId: log._id,
          name: log.name,
          duration: duration,
          calories: Math.round(log.calories) || 0,
          caloriesPerMin: caloriesPerMin,
          emoji: this.getExerciseEmoji(log.name, exerciseType)
        });
        typeCalories[exerciseType] += (log.calories || 0);
        typeDuration[exerciseType] += duration;
      }
    });

    // 保持现有的折叠状态
    const exerciseTypes = this.data.exerciseTypes.map(type => {
      const currentCal = Math.round(typeCalories[type.type]) || 0;
      const currentDur = typeDuration[type.type] || 0;
      const base = (type.suggestMax + type.suggestMin) / 2;
      let percentage = Math.round((currentDur / base) * 100);
      if (percentage > 0 && percentage < 5) percentage = 5;

      return {
        ...type,
        items: typeMap[type.type] || [],
        totalCalories: currentCal,
        totalDuration: currentDur,
        percentage: percentage
      };
    });

    // 计算统计数据
    const targetCal = this.data.stats.targetCalories;
    const totalCal = Math.round(logs.reduce((sum, log) => sum + (log.calories || 0), 0));
    const totalDur = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const remaining = Math.max(0, targetCal - totalCal);

    // 环形图角度计算
    const consumedPercent = Math.min((totalCal / targetCal) * 100, 100);
    const consumedDegrees = Math.round((consumedPercent / 100) * 360);

    const targetDur = this.data.stats.targetDuration;

    const stats = {
      totalCalories: totalCal,
      targetCalories: targetCal,
      remainingCalories: remaining,
      caloriePercentage: Math.round((remaining / targetCal) * 100),
      consumedCalories: totalCal,

      totalDuration: totalDur,
      targetDuration: targetDur,
      durationPercentage: Math.min(Math.round((totalDur / targetDur) * 100), 100)
    };

    this.setData({ exerciseTypes, stats, consumedDegrees, liquidProgress: consumedPercent });
  },

  // AI 洞察
  async onAIInsight() {
    if (this.data.isAnalyzing) return;

    this.setData({ isAnalyzing: true });

    try {
      // 获取近7天运动记录
      const endDate = this.data.selectedDate;
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const startDateStr = startDate.toISOString().slice(0, 10);

      const db = wx.cloud.database();
      const logsRes = await db.collection('exercise_records')
        .where({
          recordDate: db.command.gte(startDateStr).and(db.command.lte(endDate))
        })
        .get();

      const exerciseRecords = logsRes.data || [];

      // 简单的AI分析（如果有AI云函数可以调用）
      let insight = '您近期的运动表现不错，继续保持！';
      
      if (exerciseRecords.length === 0) {
        insight = '本周还未开始运动，让我们动起来吧！';
      } else if (exerciseRecords.length < 3) {
        insight = '运动频率偏低，建议每周至少运动3-4次';
      } else {
        const avgCalories = exerciseRecords.reduce((sum, r) => sum + (r.calories || 0), 0) / exerciseRecords.length;
        if (avgCalories < 200) {
          insight = '运动强度可以适当提升，每次运动建议消耗300卡路里以上';
        } else if (avgCalories > 500) {
          insight = '运动强度很高，注意劳逸结合，避免过度训练';
        }
      }

      this.setData({ aiInsight: insight });
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

  // 切换日期
  changeDate(newDate) {
    this.setData({
      selectedDate: newDate,
      dateDisplay: this.formatDateDisplay(newDate)
    });
    this.fetchExerciseLogs();
  },

  // 添加运动
  addExercise(e) {
    const exerciseType = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/exercise/search/index?type=${exerciseType}&date=${this.data.selectedDate}`
    });
  },

  // 删除运动记录
  async deleteExerciseLog(logId) {
    wx.showLoading({ title: '删除中' });

    try {
      const db = wx.cloud.database();
      await db.collection('exercise_records').doc(logId).remove();
      
      wx.showToast({ title: '已删除', icon: 'success' });
      this.fetchExerciseLogs();
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取运动 Emoji
  getExerciseEmoji(name, type) {
    if (!name) return '🏃';
    
    const emojiMap = {
      // 有氧运动
      '跑步': '🏃', '慢跑': '🏃', '快走': '🚶', '步行': '🚶', '走路': '🚶',
      '骑行': '🚴', '单车': '🚴', '自行车': '🚴',
      '游泳': '🏊', '蛙泳': '🏊', '自由泳': '🏊',
      '跳绳': '🪢', '跳绳运动': '🪢',
      '登山': '🧗', '爬山': '🧗', '徒步': '🥾',
      '跳舞': '💃', '舞蹈': '💃', '广场舞': '💃',

      // 力量训练
      '举重': '🏋️', '哑铃': '🏋️', '杠铃': '🏋️',
      '深蹲': '💪', '卧推': '💪', '引体向上': '💪',
      '俯卧撑': '💪', '仰卧起坐': '💪', '平板支撑': '💪',

      // 拉伸
      '瑜伽': '🧘', 'yoga': '🧘',
      '拉伸': '🤸', '伸展': '🤸',
      '普拉提': '🧘', 'pilates': '🧘',

      // 球类运动
      '篮球': '🏀', '足球': '⚽', '羽毛球': '🏸',
      '网球': '🎾', '乒乓球': '🏓', '排球': '🏐',
      '高尔夫': '⛳', '台球': '🎱',
    };

    for (const key in emojiMap) {
      if (name.includes(key)) return emojiMap[key];
    }

    // 根据类型返回默认emoji
    const typeEmoji = {
      aerobic: '🏃',
      strength: '💪',
      flexibility: '🧘',
      sports: '⚽'
    };
    return typeEmoji[type] || '🏃';
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.fetchExerciseLogs().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ============ 编辑模式相关 ============

  // 切换编辑模式（全局）
  toggleEditMode() {
    const isEditMode = !this.data.isEditMode;
    if (!isEditMode) {
      this.clearAllSelections();
    } else {
      const exerciseTypes = this.data.exerciseTypes.map(type => ({
        ...type,
        isEditing: false
      }));
      this.setData({ exerciseTypes });
    }
    this.setData({ isEditMode, hasAnyTypeEditing: false });
  },

  // 切换单类型编辑模式
  toggleTypeEdit(e) {
    const exerciseType = e.currentTarget.dataset.type;
    const index = this.data.exerciseTypes.findIndex(t => t.type === exerciseType);
    if (index === -1) return;

    const type = this.data.exerciseTypes[index];
    const newIsEditing = !type.isEditing;
    const updateData = {};

    if (!newIsEditing) {
      updateData[`exerciseTypes[${index}].isEditing`] = false;
      type.items.forEach((item, itemIndex) => {
        if (item.selected) {
          updateData[`exerciseTypes[${index}].items[${itemIndex}].selected`] = false;
        }
      });
    } else {
      updateData[`exerciseTypes[${index}].isEditing`] = true;
      updateData[`exerciseTypes[${index}].collapsed`] = false;
    }

    let hasAnyTypeEditing = newIsEditing;
    if (!newIsEditing) {
      hasAnyTypeEditing = this.data.exerciseTypes.some((t, i) => i !== index && t.isEditing);
    }

    updateData.hasAnyTypeEditing = hasAnyTypeEditing;
    updateData.isEditMode = false;

    this.setData(updateData, () => {
      this.updateSelectionStats();
    });
  },

  // 清除所有选择
  clearAllSelections() {
    const exerciseTypes = this.data.exerciseTypes.map(type => ({
      ...type,
      isEditing: false,
      items: type.items.map(item => ({ ...item, selected: false, swiped: false }))
    }));
    this.setData({
      exerciseTypes,
      selectedCount: 0,
      selectedCalories: 0,
      isAllSelected: false,
      hasAnyTypeEditing: false
    });
  },

  // 切换单个运动选择
  toggleExerciseSelect(e) {
    const exerciseId = e.currentTarget.dataset.id;
    const exerciseType = e.currentTarget.dataset.type;

    const typeIndex = this.data.exerciseTypes.findIndex(t => t.type === exerciseType);
    if (typeIndex === -1) return;

    const itemIndex = this.data.exerciseTypes[typeIndex].items.findIndex(item => item.id === exerciseId);
    if (itemIndex === -1) return;

    const newSelected = !this.data.exerciseTypes[typeIndex].items[itemIndex].selected;

    this.setData({
      [`exerciseTypes[${typeIndex}].items[${itemIndex}].selected`]: newSelected
    }, () => {
      this.updateSelectionStats();
    });
  },

  // 更新选择统计
  updateSelectionStats() {
    let selectedCount = 0;
    let selectedCalories = 0;
    let totalItems = 0;
    const { isEditMode, hasAnyTypeEditing } = this.data;

    this.data.exerciseTypes.forEach(type => {
      const shouldCount = isEditMode || (hasAnyTypeEditing && type.isEditing);
      if (shouldCount) {
        type.items.forEach(item => {
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
    const { isEditMode, hasAnyTypeEditing } = this.data;
    const updateData = {};

    this.data.exerciseTypes.forEach((type, typeIndex) => {
      const shouldOperate = isEditMode || (hasAnyTypeEditing && type.isEditing);
      if (shouldOperate) {
        type.items.forEach((item, itemIndex) => {
          updateData[`exerciseTypes[${typeIndex}].items[${itemIndex}].selected`] = shouldSelectAll;
        });
      }
    });

    this.setData(updateData, () => {
      this.updateSelectionStats();
    });
  },

  // 批量删除选中的运动
  async deleteSelectedExercises() {
    const selectedIds = [];
    const { isEditMode, hasAnyTypeEditing } = this.data;

    this.data.exerciseTypes.forEach(type => {
      const shouldOperate = isEditMode || (hasAnyTypeEditing && type.isEditing);
      if (shouldOperate) {
        type.items.forEach(item => {
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
          await this.batchDeleteExercises(selectedIds);
        }
      }
    });
  },

  // 执行批量删除
  async batchDeleteExercises(ids) {
    wx.showLoading({ title: '删除中...', mask: true });

    try {
      const db = wx.cloud.database();
      for (const id of ids) {
        await db.collection('exercise_records').doc(id).remove();
      }

      wx.showToast({ title: `已删除 ${ids.length} 条`, icon: 'success' });

      const exerciseTypes = this.data.exerciseTypes.map(type => ({
        ...type,
        isEditing: false,
        items: type.items.map(item => ({ ...item, selected: false }))
      }));

      this.setData({
        isEditMode: false,
        hasAnyTypeEditing: false,
        exerciseTypes,
        selectedCount: 0,
        selectedCalories: 0,
        isAllSelected: false
      });

      this.fetchExerciseLogs();
    } catch (err) {
      console.error('批量删除失败:', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ============ 左滑删除相关 ============

  // 触摸开始
  onExerciseTouchStart(e) {
    if (this.data.isEditMode) return;
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  // 触摸移动
  onExerciseTouchMove(e) {
    if (this.data.isEditMode) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - this.data.touchStartX;
    const deltaY = touchY - this.data.touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      const exerciseId = e.currentTarget.dataset.id;
      const exerciseType = e.currentTarget.dataset.type;
      const shouldSwipe = deltaX < -30;

      const exerciseTypes = this.data.exerciseTypes.map(type => ({
        ...type,
        items: type.items.map(item => ({
          ...item,
          swiped: item.id === exerciseId ? shouldSwipe : false
        }))
      }));

      this.setData({ exerciseTypes });
    }
  },

  // 触摸结束
  onExerciseTouchEnd(e) {
    // 可以在这里处理额外逻辑
  },

  // 单个删除（左滑删除按钮）
  deleteSingleExercise(e) {
    const exerciseId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteExerciseLog(exerciseId);
        } else {
          this.resetSwipeState();
        }
      }
    });
  },

  // 重置滑动状态
  resetSwipeState() {
    const exerciseTypes = this.data.exerciseTypes.map(type => ({
      ...type,
      items: type.items.map(item => ({ ...item, swiped: false }))
    }));
    this.setData({ exerciseTypes });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '轻燃 - AI 智能健康管理',
      path: '/pages/exercise/index'
    };
  },

  // ============ 运动编辑相关 ============

  // 打开运动编辑弹窗
  openExerciseEdit(e) {
    const exercise = e.currentTarget.dataset.exercise;
    const exerciseType = e.currentTarget.dataset.type;

    if (!exercise || !exercise.id) return;

    const duration = exercise.duration || 30;
    const caloriesPerMin = exercise.caloriesPerMin || 8;

    this.setData({
      showExerciseEditModal: true,
      editingExercise: {
        id: exercise.id,
        name: exercise.name,
        emoji: exercise.emoji || '🏃',
        duration: duration,
        calories: exercise.calories,
        caloriesPerMin: caloriesPerMin,
        calculatedCalories: exercise.calories,
        type: exerciseType
      }
    });
  },

  // 关闭运动编辑弹窗
  closeExerciseEdit() {
    this.setData({ showExerciseEditModal: false });
  },

  // 时长输入
  onDurationInput(e) {
    const duration = parseFloat(e.detail.value) || 0;
    this.calculateExerciseCalories(duration);
  },

  // 滑动条变化
  onSliderChange(e) {
    const duration = e.detail.value;
    this.calculateExerciseCalories(duration);
  },

  // 滑动条拖动中
  onSliderChanging(e) {
    const duration = e.detail.value;
    this.calculateExerciseCalories(duration);
  },

  // 快捷设置时长
  setQuickDuration(e) {
    const duration = parseInt(e.currentTarget.dataset.duration) || 30;
    this.calculateExerciseCalories(duration);
  },

  // 计算消耗热量
  calculateExerciseCalories(duration) {
    const { caloriesPerMin } = this.data.editingExercise;

    const calculatedCalories = Math.round(caloriesPerMin * duration);

    this.setData({
      'editingExercise.duration': duration,
      'editingExercise.calculatedCalories': calculatedCalories
    });
  },

  // 保存运动编辑
  async saveExerciseEdit() {
    const { editingExercise } = this.data;

    if (!editingExercise.id) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    if (!editingExercise.duration || editingExercise.duration <= 0) {
      wx.showToast({ title: '请输入有效时长', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const db = wx.cloud.database();
      await db.collection('exercise_records').doc(editingExercise.id).update({
        data: {
          duration: editingExercise.duration,
          calories: editingExercise.calculatedCalories
        }
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showExerciseEditModal: false });
      this.fetchExerciseLogs();
    } catch (err) {
      console.error('保存运动编辑失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({
      url: `/pages/exercise/search/index?type=${this.data.exerciseTypes[0].type}&date=${this.data.selectedDate}`
    });
  },

  // 跳转到运动库
  goToLibrary() {
    wx.showToast({ title: '运动库功能开发中', icon: 'none' });
  },

  // 跳转到推荐页
  goToRecommend() {
    wx.navigateTo({
      url: '/pages/exercise/recommend/index'
    });
  }
});
