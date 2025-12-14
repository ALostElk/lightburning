Page({
  data: {
    statusBarHeight: 44,
    keyword: '',
    isSearching: false,
    results: [],
    recentSearches: [],
    
    // 推荐相关
    selectedExerciseType: 'aerobic',
    presetExercises: [
      // 有氧运动
      { id: 'run', name: '跑步', type: 'aerobic', emoji: '🏃', caloriesPerMin: 10 },
      { id: 'walk', name: '快走', type: 'aerobic', emoji: '🚶', caloriesPerMin: 5 },
      { id: 'bike', name: '骑行', type: 'aerobic', emoji: '🚴', caloriesPerMin: 8 },
      { id: 'swim', name: '游泳', type: 'aerobic', emoji: '🏊', caloriesPerMin: 12 },
      { id: 'jump_rope', name: '跳绳', type: 'aerobic', emoji: '🪢', caloriesPerMin: 11 },
      { id: 'climb', name: '登山', type: 'aerobic', emoji: '🧗', caloriesPerMin: 9 },
      { id: 'dance', name: '跳舞', type: 'aerobic', emoji: '💃', caloriesPerMin: 6 },

      // 力量训练
      { id: 'weightlift', name: '举重', type: 'strength', emoji: '🏋️', caloriesPerMin: 7 },
      { id: 'pushup', name: '俯卧撑', type: 'strength', emoji: '💪', caloriesPerMin: 6 },
      { id: 'squat', name: '深蹲', type: 'strength', emoji: '💪', caloriesPerMin: 6 },
      { id: 'plank', name: '平板支撑', type: 'strength', emoji: '💪', caloriesPerMin: 5 },
      { id: 'situp', name: '仰卧起坐', type: 'strength', emoji: '💪', caloriesPerMin: 5 },

      // 拉伸放松
      { id: 'yoga', name: '瑜伽', type: 'flexibility', emoji: '🧘', caloriesPerMin: 3 },
      { id: 'stretch', name: '拉伸', type: 'flexibility', emoji: '🤸', caloriesPerMin: 2 },
      { id: 'pilates', name: '普拉提', type: 'flexibility', emoji: '🧘', caloriesPerMin: 4 },

      // 球类运动
      { id: 'basketball', name: '篮球', type: 'sports', emoji: '🏀', caloriesPerMin: 9 },
      { id: 'football', name: '足球', type: 'sports', emoji: '⚽', caloriesPerMin: 9 },
      { id: 'badminton', name: '羽毛球', type: 'sports', emoji: '🏸', caloriesPerMin: 7 },
      { id: 'tennis', name: '网球', type: 'sports', emoji: '🎾', caloriesPerMin: 8 },
      { id: 'pingpong', name: '乒乓球', type: 'sports', emoji: '🏓', caloriesPerMin: 6 },
      { id: 'volleyball', name: '排球', type: 'sports', emoji: '🏐', caloriesPerMin: 7 }
    ],

    // 录入弹窗
    showDurationModal: false,
    durationInput: 30, // 默认30分钟
    estimatedCalories: 0,
    currentExercise: {},
    targetDate: ''
  },

  onLoad(options) {
    const sys = wx.getSystemInfoSync();
    
    // 接收运动类型参数，如果传入了则自动选择对应的类型
    const exerciseType = options.type || 'aerobic';
    
    this.setData({ 
      statusBarHeight: sys.statusBarHeight || 44,
      targetDate: options.date || this.getTodayString(),
      selectedExerciseType: exerciseType // 自动匹配到对应的运动类型
    });
    this.loadRecentSearches();
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // === 搜索逻辑 ===
  onSearchInput(e) {
    const val = e.detail.value.trim();
    this.setData({ keyword: val });
    if (!val) {
      this.setData({ results: [], isSearching: false });
      return;
    }
    
    // 简单本地搜索模拟
    this.setData({ isSearching: true });
    setTimeout(() => {
      const hits = this.data.presetExercises.filter(item => 
        item.name.includes(val)
      );
      this.setData({ results: hits, isSearching: false });
    }, 300);
  },

  clearSearch() {
    this.setData({ keyword: '', results: [] });
  },

  onSearchFocus() {
    // 搜索聚焦时的处理
  },

  // === 推荐筛选 ===
  switchExerciseType(e) {
    this.setData({ selectedExerciseType: e.currentTarget.dataset.type });
  },

  // === 最近搜索 ===
  loadRecentSearches() {
    try {
      const history = wx.getStorageSync('exercise_history') || [];
      this.setData({ recentSearches: history });
    } catch (e) {
      console.log('加载搜索记录失败:', e);
    }
  },
  
  onRecentSearchTap(e) {
    const val = e.currentTarget.dataset.keyword;
    this.setData({ keyword: val });
    this.onSearchInput({ detail: { value: val } });
  },

  clearRecentSearches() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有搜索记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('exercise_history');
            this.setData({ recentSearches: [] });
            wx.showToast({ title: '已清除', icon: 'success' });
          } catch (e) {
            console.log('清除失败:', e);
          }
        }
      }
    });
  },

  // === 录入弹窗逻辑 ===
  addExercise(e) {
    const item = e.currentTarget.dataset.exercise;
    if (!item) return;

    this.setData({
      showDurationModal: true,
      currentExercise: item,
      durationInput: 30
    });
    this.calcBurn();
  },

  closeDurationModal() {
    this.setData({ showDurationModal: false });
  },

  // 滑块变化
  onDurationChange(e) {
    this.setData({ durationInput: e.detail.value });
    this.calcBurn();
  },

  // 快捷标签
  setDuration(e) {
    this.setData({ durationInput: parseInt(e.currentTarget.dataset.val) });
    this.calcBurn();
  },

  // 计算热量
  calcBurn() {
    const burn = Math.round(this.data.currentExercise.caloriesPerMin * this.data.durationInput);
    this.setData({ estimatedCalories: burn });
  },

  // 确认记录
  async confirmAddExercise() {
    const exercise = this.data.currentExercise;
    if (!exercise) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    const duration = Number(this.data.durationInput);
    if (!duration || duration <= 0 || duration > 300) {
      wx.showToast({ title: '请输入有效时长(1-300分钟)', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '添加中...' });
      this.setData({ showDurationModal: false });

      // 保存搜索历史
      if (this.data.keyword) {
        let history = this.data.recentSearches.filter(h => h !== this.data.keyword);
        history.unshift(this.data.keyword);
        wx.setStorageSync('exercise_history', history.slice(0, 10));
      }

      const db = wx.cloud.database();
      const result = await db.collection('exercise_records').add({
        data: {
          name: exercise.name,
          exerciseType: exercise.type || this.data.selectedExerciseType,
          duration: duration,
          calories: this.data.estimatedCalories,
          caloriesPerMin: exercise.caloriesPerMin,
          recordDate: this.data.targetDate,
          createTime: new Date()
        }
      });

      console.log('[Exercise Search] 添加成功, ID:', result._id);

      wx.hideLoading();
      wx.showToast({ title: '已记录', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (error) {
      wx.hideLoading();
      console.error('添加运动记录失败:', error);
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },
  
  stopPropagation() {},

  // 跳转到计时页面
  goToTimer() {
    const exercise = this.data.currentExercise;
    if (!exercise) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }
    
    // 关闭弹窗
    this.closeDurationModal();
    
    // 跳转到计时页面
    wx.navigateTo({
      url: `/pages/exercise/timer/index?name=${encodeURIComponent(exercise.name)}&emoji=${encodeURIComponent(exercise.emoji || '')}&cal=${exercise.caloriesPerMin || 0}`
    });
  }
});
