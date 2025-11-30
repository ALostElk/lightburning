// app.js
App({
  onLaunch() {
    console.log('轻燃应用启动');
    
    // 初始化全局数据
    this.initGlobalData();
  },

  initGlobalData() {
    // 初始化用户信息（后续应从本地存储或云端获取）
    if (!wx.getStorageSync('userInfo')) {
      wx.setStorageSync('userInfo', {
        gender: '男',
        age: 28,
        height: 175,
        weight: 75,
        goal: '减脂',
        targetPeriod: 90, // 天
        targetWeight: 70,
        activityLevel: '轻度活动',
        dietaryPreferences: ['不吃辣', '少油'],
        allergens: []
      });
    }

    // 初始化饮食记录
    if (!wx.getStorageSync('dietRecords')) {
      wx.setStorageSync('dietRecords', []);
    }
  },

  globalData: {
    userInfo: null,
    dailyCalorieGoal: 1800, // 每日热量目标
    dailyProteinGoal: 120,  // 每日蛋白质目标(克)
    dailyCarbGoal: 180,     // 每日碳水目标(克)
    dailyFatGoal: 50        // 每日脂肪目标(克)
  }
});

