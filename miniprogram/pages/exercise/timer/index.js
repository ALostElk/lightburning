/**
 * 沉浸式运动计时页面
 * 设计语言: Daylight Futurism - Kinetic Aqua
 */

Page({
  data: {
    statusBarHeight: 44,
    exerciseName: '',
    exerciseEmoji: '',
    caloriesPerMin: 0,
    seconds: 0,
    isPaused: false,
    currentCalories: 0,
    formattedTime: '00:00:00',
    timerInterval: null
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44
    });

    // 接收参数
    const name = decodeURIComponent(options.name || '');
    const emoji = decodeURIComponent(options.emoji || '');
    const cal = parseFloat(options.cal || 0);

    this.setData({
      exerciseName: name,
      exerciseEmoji: emoji,
      caloriesPerMin: cal
    });

    // 自动开始计时
    this.startTimer();
    
    // [新增] 启用返回拦截
    if (wx.enableAlertBeforeUnload) {
      wx.enableAlertBeforeUnload({
        message: '运动正在进行中，确定要退出吗？',
      });
    }
  },

  onUnload() {
    // 页面卸载时清除定时器
    this.clearTimer();
  },

  // 开始计时
  startTimer() {
    if (this.data.timerInterval) {
      return; // 已经在运行
    }

    const interval = setInterval(() => {
      if (!this.data.isPaused) {
        const newSeconds = this.data.seconds + 1;
        const formatted = this.formatTime(newSeconds);
        const calories = this.calculateCalories(newSeconds);

        this.setData({
          seconds: newSeconds,
          formattedTime: formatted,
          currentCalories: calories
        });
      }
    }, 1000);

    this.setData({
      timerInterval: interval
    });
  },

  // 清除定时器
  clearTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({
        timerInterval: null
      });
    }
  },

  // 格式化时间 HH:MM:SS
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // 计算消耗热量
  calculateCalories(seconds) {
    const minutes = seconds / 60;
    return Math.round(minutes * this.data.caloriesPerMin);
  },

  // 切换暂停/继续
  togglePause() {
    const newPaused = !this.data.isPaused;
    this.setData({
      isPaused: newPaused
    });

    if (newPaused) {
      // 暂停：定时器继续运行，但不会更新数据
      // 实际上我们通过 isPaused 标志来控制是否更新
    } else {
      // 继续：确保定时器在运行
      if (!this.data.timerInterval) {
        this.startTimer();
      }
    }
  },

  // 结束运动
  finishExercise() {
    // 先暂停计时，防止弹窗时时间继续走
    const wasRunning = !!this.data.timerInterval;
    this.clearTimer();
    this.setData({ isPaused: true });

    const minutes = this.data.seconds / 60;

    // 场景 A: 运动时间太短 (< 1分钟)
    if (minutes < 1) {
      wx.showModal({
        title: '放弃本次运动?',
        content: '运动时长不足 1 分钟，无法保存记录。是否确认退出？',
        confirmText: '退出',
        confirmColor: '#FF6B35', // 警示色
        cancelText: '继续',
        success: (res) => {
          if (res.confirm) {
            // 用户选择放弃，直接返回上一页 (不保存)
            wx.navigateBack(); 
          } else {
            // 用户选择继续，恢复计时
            if (wasRunning) this.startTimer();
            this.setData({ isPaused: false });
          }
        }
      });
      return;
    }

    // 场景 B: 正常结束
    wx.showModal({
      title: '结束运动',
      content: `确定要结束吗？\n时长：${this.data.formattedTime}\n消耗：${this.data.currentCalories} kcal`,
      confirmText: '完成',
      confirmColor: '#2DD4BF', // 品牌色
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) {
          this.saveExerciseRecord();
        } else {
          // 恢复计时
          if (wasRunning) this.startTimer();
          this.setData({ isPaused: false });
        }
      }
    });
  },

  // 保存运动记录
  async saveExerciseRecord() {
    wx.showLoading({ title: '保存中...' });

    try {
      this.clearTimer();

      // 确保至少记录为 1 分钟
      const duration = Math.max(1, Math.round(this.data.seconds / 60)); 
      const calories = this.data.currentCalories;
      const today = new Date().toISOString().slice(0, 10);

      const db = wx.cloud.database();
      await db.collection('exercise_records').add({
        data: {
          name: this.data.exerciseName,
          exerciseType: 'aerobic',
          duration: duration,
          calories: calories,
          caloriesPerMin: this.data.caloriesPerMin,
          recordDate: today,
          createTime: new Date(),
          // 记录精确的开始结束时间
          startTime: new Date(Date.now() - this.data.seconds * 1000).toISOString(),
          endTime: new Date().toISOString()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '已完成', icon: 'success', duration: 1500 });

      // 延迟跳转到运动主界面
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/exercise/index/index'
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('[Timer] 保存失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});

