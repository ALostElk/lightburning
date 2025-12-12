/**
 * 运动搜索页面 - exercise-search/index
 * 功能：搜索运动 + 常用运动
 */

Page({
  data: {
    keyword: '',
    isSearching: false,
    results: [],
    hasMore: false,
    error: null,
    recentSearches: [],
    targetDate: '',
    selectedExerciseType: 'aerobic',
    exerciseTypeLabels: {
      aerobic: '有氧运动',
      strength: '力量训练',
      flexibility: '拉伸放松',
      sports: '球类运动'
    },

    // 标签相关
    activeTab: 'search', // 'search' | 'favorites'

    // 常用运动
    frequentExercises: [],
    isLoadingFavorites: false,
    favoriteTypeFilter: 'all',  // 'all' | 'aerobic' | 'strength' | 'flexibility' | 'sports'

    // 预设运动列表
    presetExercises: [
      // 有氧运动
      { id: 'run', name: '跑步', type: 'aerobic', emoji: '🏃', caloriesPerMin: 10, duration: 30 },
      { id: 'walk', name: '快走', type: 'aerobic', emoji: '🚶', caloriesPerMin: 5, duration: 30 },
      { id: 'bike', name: '骑行', type: 'aerobic', emoji: '🚴', caloriesPerMin: 8, duration: 30 },
      { id: 'swim', name: '游泳', type: 'aerobic', emoji: '🏊', caloriesPerMin: 12, duration: 30 },
      { id: 'jump_rope', name: '跳绳', type: 'aerobic', emoji: '🪢', caloriesPerMin: 11, duration: 15 },
      { id: 'climb', name: '登山', type: 'aerobic', emoji: '🧗', caloriesPerMin: 9, duration: 60 },
      { id: 'dance', name: '跳舞', type: 'aerobic', emoji: '💃', caloriesPerMin: 6, duration: 45 },
      
      // 力量训练
      { id: 'weightlift', name: '举重', type: 'strength', emoji: '🏋️', caloriesPerMin: 7, duration: 30 },
      { id: 'pushup', name: '俯卧撑', type: 'strength', emoji: '💪', caloriesPerMin: 6, duration: 15 },
      { id: 'squat', name: '深蹲', type: 'strength', emoji: '💪', caloriesPerMin: 6, duration: 15 },
      { id: 'plank', name: '平板支撑', type: 'strength', emoji: '💪', caloriesPerMin: 5, duration: 10 },
      { id: 'situp', name: '仰卧起坐', type: 'strength', emoji: '💪', caloriesPerMin: 5, duration: 15 },
      
      // 拉伸放松
      { id: 'yoga', name: '瑜伽', type: 'flexibility', emoji: '🧘', caloriesPerMin: 3, duration: 30 },
      { id: 'stretch', name: '拉伸', type: 'flexibility', emoji: '🤸', caloriesPerMin: 2, duration: 15 },
      { id: 'pilates', name: '普拉提', type: 'flexibility', emoji: '🧘', caloriesPerMin: 4, duration: 30 },
      
      // 球类运动
      { id: 'basketball', name: '篮球', type: 'sports', emoji: '🏀', caloriesPerMin: 9, duration: 60 },
      { id: 'football', name: '足球', type: 'sports', emoji: '⚽', caloriesPerMin: 9, duration: 60 },
      { id: 'badminton', name: '羽毛球', type: 'sports', emoji: '🏸', caloriesPerMin: 7, duration: 45 },
      { id: 'tennis', name: '网球', type: 'sports', emoji: '🎾', caloriesPerMin: 8, duration: 45 },
      { id: 'pingpong', name: '乒乓球', type: 'sports', emoji: '🏓', caloriesPerMin: 6, duration: 45 },
      { id: 'volleyball', name: '排球', type: 'sports', emoji: '🏐', caloriesPerMin: 7, duration: 60 }
    ]
  },

  debounceTimer: null,

  onLoad(options) {
    const exerciseType = options.type || 'aerobic';
    this.setData({
      targetDate: options.date || this.getTodayString(),
      selectedExerciseType: exerciseType,
      favoriteTypeFilter: exerciseType
    });
    this.loadRecentSearches();
    this.loadFrequentExercises();
  },

  onShow() {
    this.loadFrequentExercises();
  },

  getTodayString() {
    return new Date().toISOString().slice(0, 10);
  },

  // ============ 标签切换 ============
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });

    if (tab === 'favorites' && this.data.frequentExercises.length === 0) {
      this.loadFrequentExercises();
    }
  },

  switchToSearch() {
    this.setData({ activeTab: 'search' });
  },

  // 切换常用运动类型筛选
  switchFavoriteType(e) {
    const type = e.currentTarget.dataset.type;
    if (type !== this.data.favoriteTypeFilter) {
      this.setData({ favoriteTypeFilter: type });
      this.loadFrequentExercises();
    }
  },

  onSearchFocus() {
    if (this.data.activeTab !== 'search') {
      this.setData({ activeTab: 'search' });
    }
  },

  // ============ 常用运动 ============
  async loadFrequentExercises() {
    this.setData({ isLoadingFavorites: true });

    try {
      const exerciseType = this.data.favoriteTypeFilter === 'all' ? '' : this.data.favoriteTypeFilter;

      const db = wx.cloud.database();
      const $ = db.command.aggregate;
      
      let matchCondition = {};
      if (exerciseType) {
        matchCondition.exerciseType = exerciseType;
      }

      // 查询最近30天的记录并按运动名称分组统计
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

      matchCondition.recordDate = $.gte(thirtyDaysAgoStr);

      const res = await db.collection('exercise_records')
        .aggregate()
        .match(matchCondition)
        .group({
          _id: {
            name: '$name',
            exerciseType: '$exerciseType'
          },
          count: $.sum(1),
          avgDuration: $.avg('$duration'),
          avgCalories: $.avg('$calories')
        })
        .sort({ count: -1 })
        .limit(10)
        .end();

      if (res.list) {
        const exercises = res.list.map(item => {
          const avgDuration = Math.round(item.avgDuration || 30);
          const avgCalories = Math.round(item.avgCalories || 0);
          const caloriesPerMin = avgDuration > 0 ? Math.round(avgCalories / avgDuration) : 8;
          
          return {
            name: item._id.name,
            exerciseType: item._id.exerciseType || 'aerobic',
            count: item.count,
            duration: avgDuration,
            calories: avgCalories,
            caloriesPerMin: caloriesPerMin,
            emoji: this.getExerciseEmoji(item._id.name, item._id.exerciseType)
          };
        });

        this.setData({
          frequentExercises: exercises,
          isLoadingFavorites: false
        });
      } else {
        this.setData({ frequentExercises: [], isLoadingFavorites: false });
      }
    } catch (err) {
      console.error('加载常用运动失败:', err);
      this.setData({ frequentExercises: [], isLoadingFavorites: false });
    }
  },

  // ============ 搜索相关 ============
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (keyword) {
        this.performSearch(keyword);
      } else {
        this.setData({ results: [], error: null });
      }
    }, 300);
  },

  performSearch(keyword) {
    this.setData({ isSearching: true, error: null });

    try {
      // 从预设列表中搜索
      const results = this.data.presetExercises.filter(exercise => {
        return exercise.name.includes(keyword);
      });

      this.setData({
        results,
        isSearching: false,
        error: results.length === 0 ? '未找到相关运动' : null
      });

      // 保存搜索记录
      if (results.length > 0) {
        this.saveRecentSearch(keyword);
      }
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({
        isSearching: false,
        error: '搜索失败，请重试'
      });
    }
  },

  // 保存最近搜索
  saveRecentSearch(keyword) {
    try {
      let recentSearches = wx.getStorageSync('recentExerciseSearches') || [];
      recentSearches = recentSearches.filter(k => k !== keyword);
      recentSearches.unshift(keyword);
      recentSearches = recentSearches.slice(0, 10);
      wx.setStorageSync('recentExerciseSearches', recentSearches);
      this.setData({ recentSearches });
    } catch (e) {
      console.log('保存搜索记录失败:', e);
    }
  },

  // 加载最近搜索
  loadRecentSearches() {
    try {
      const recentSearches = wx.getStorageSync('recentExerciseSearches') || [];
      this.setData({ recentSearches });
    } catch (e) {
      console.log('加载搜索记录失败:', e);
    }
  },

  // 点击最近搜索
  onRecentSearchTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.performSearch(keyword);
  },

  // 清除最近搜索
  clearRecentSearches() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有搜索记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('recentExerciseSearches');
            this.setData({ recentSearches: [] });
            wx.showToast({ title: '已清除', icon: 'success' });
          } catch (e) {
            console.log('清除失败:', e);
          }
        }
      }
    });
  },

  // ============ 添加运动 ============
  async addExercise(e) {
    const { exercise } = e.currentTarget.dataset;
    
    if (!exercise) return;

    wx.showModal({
      title: `记录${exercise.name}`,
      editable: true,
      placeholderText: `请输入时长（分钟），建议${exercise.duration}分钟`,
      success: async (res) => {
        if (res.confirm && res.content) {
          const duration = Number(res.content);
          if (duration <= 0 || duration > 300) {
            wx.showToast({ title: '请输入有效时长', icon: 'none' });
            return;
          }

          const caloriesPerMin = exercise.caloriesPerMin || 8;
          const calories = Math.round(duration * caloriesPerMin);
          
          try {
            wx.showLoading({ title: '添加中...' });

            const db = wx.cloud.database();
            await db.collection('exercise_records').add({
              data: {
                name: exercise.name,
                exerciseType: exercise.type || this.data.selectedExerciseType,
                duration: duration,
                calories: calories,
                caloriesPerMin: caloriesPerMin,
                recordDate: this.data.targetDate,
                createTime: new Date()
              }
            });

            wx.hideLoading();
            wx.showToast({ title: '添加成功', icon: 'success' });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            wx.hideLoading();
            console.error('添加运动记录失败:', error);
            wx.showToast({ title: '添加失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 从常用列表添加
  addFromFavorite(e) {
    const { exercise } = e.currentTarget.dataset;
    this.addExercise({ currentTarget: { dataset: { exercise } } });
  },

  // 获取运动 Emoji
  getExerciseEmoji(name, type) {
    if (!name) return '🏃';
    
    const emojiMap = {
      '跑步': '🏃', '慢跑': '🏃', '快走': '🚶', '步行': '🚶', '走路': '🚶',
      '骑行': '🚴', '单车': '🚴', '自行车': '🚴',
      '游泳': '🏊', '蛙泳': '🏊', '自由泳': '🏊',
      '跳绳': '🪢', '跳绳运动': '🪢',
      '登山': '🧗', '爬山': '🧗', '徒步': '🥾',
      '跳舞': '💃', '舞蹈': '💃', '广场舞': '💃',
      '举重': '🏋️', '哑铃': '🏋️', '杠铃': '🏋️',
      '深蹲': '💪', '卧推': '💪', '引体向上': '💪',
      '俯卧撑': '💪', '仰卧起坐': '💪', '平板支撑': '💪',
      '瑜伽': '🧘', 'yoga': '🧘',
      '拉伸': '🤸', '伸展': '🤸',
      '普拉提': '🧘', 'pilates': '🧘',
      '篮球': '🏀', '足球': '⚽', '羽毛球': '🏸',
      '网球': '🎾', '乒乓球': '🏓', '排球': '🏐',
      '高尔夫': '⛳', '台球': '🎱',
    };

    for (const key in emojiMap) {
      if (name.includes(key)) return emojiMap[key];
    }

    const typeEmoji = {
      aerobic: '🏃',
      strength: '💪',
      flexibility: '🧘',
      sports: '⚽'
    };
    return typeEmoji[type] || '🏃';
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      keyword: '',
      results: []
    });
  },

  // 切换运动类型
  switchExerciseType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ selectedExerciseType: type });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});

