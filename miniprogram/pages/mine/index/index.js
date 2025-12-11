// pages/mine/index/index.js
Page({
  data: {
    userInfo: { // 恢复原默认值
      avatarUrl: '/images/default-avatar.png',
      nickName: '微信用户',
      height: 180,
      weight: 70,
      goal: '减脂'
    },
    userStats: { // 身体指标数据
      bmi: 0,
      bmr: 0,
      tdee: 0
    },
    todayIntake: 0, // 今日摄入热量
    todayConsume: 0, // 今日消耗热量
    recordCount: 0, // 记录次数
    isNicknameModalShow: false, // 昵称编辑弹窗
    newNickname: ''
  },

  onLoad() {
    this.loadUserInfo();
    this.loadHealthData();
  },

  // 新增：页面显示时同步数据（切换页面立即更新）
  onShow() {
    this.syncDataFromOtherModules();
  },

  // 加载用户基础信息
  async loadUserInfo() {
    try {
      const localUser = wx.getStorageSync('userInfo') || {};
      this.setData({ 
        userInfo: { ...this.data.userInfo, ...localUser },
        newNickname: localUser.nickName || '微信用户'
      });

      // 若不需要云函数，可注释此段（恢复原页面不依赖云函数）
      // const res = await wx.cloud.callFunction({
      //   name: 'userService',
      //   data: { action: 'getUserInfo' }
      // });
      // if (res.result.success) {
      //   const userInfo = res.result.data;
      //   this.setData({ userInfo });
      //   wx.setStorageSync('userInfo', userInfo);
      // }
    } catch (err) {
      console.error('加载用户信息失败', err);
    }
  },

  // 改造：加载健康数据改为同步其他模块数据
  async loadHealthData() {
    try {
      this.syncDataFromOtherModules();
    } catch (err) {
      console.error('加载健康数据失败', err);
    }
  },

  // 新增：同步饮食、运动、个人信息模块的数据
  syncDataFromOtherModules() {
    const app = getApp();
    // 1. 读取饮食模块数据（今日摄入、记录次数）
    const dietData = app.globalData.dietData || wx.getStorageSync('dietData') || {};
    // 2. 读取运动模块数据（今日消耗）
    const exerciseData = app.globalData.exerciseData || wx.getStorageSync('exerciseData') || {};
    // 3. 读取个人信息模块数据（BMI、BMR、TDEE）
    const healthData = app.globalData.healthData || wx.getStorageSync('healthData') || {};

    // 更新页面数据
    this.setData({
      todayIntake: dietData.todayIntake || 0,
      todayConsume: exerciseData.todayConsume || 0,
      recordCount: dietData.recordCount || 0,
      userStats: {
        bmi: healthData.bmi || 0,
        bmr: healthData.bmr || 0,
        tdee: healthData.tdee || 0
      }
    });
  },

  formatNumber(num) {
    if (isNaN(num)) return '0.0';
    return num.toFixed(1);
  },

  // 昵称编辑弹窗
  openNicknameModal() {
    this.setData({ 
      isNicknameModalShow: true,
      newNickname: this.data.userInfo.nickName
    });
  },

  onNicknameInput(e) {
    this.setData({ newNickname: e.detail.value });
  },

  // 修复昵称保存失败：移除云函数依赖（若不需要后端同步）
  confirmNicknameEdit() {
    const newNickname = this.data.newNickname.trim();
    if (!newNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    const userInfo = { ...this.data.userInfo, nickName: newNickname };
    this.setData({ 
      userInfo,
      isNicknameModalShow: false 
    });
    wx.setStorageSync('userInfo', userInfo);
    wx.showToast({ title: '昵称保存成功' }); // 本地保存成功直接提示
  },

  cancelNicknameEdit() {
    this.setData({ isNicknameModalShow: false });
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const userInfo = { ...this.data.userInfo, avatarUrl: tempFilePath };
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);
      },
      fail: (err) => {
        console.error('选择头像失败', err);
        wx.showToast({ title: '选择头像失败', icon: 'none' });
      }
    });
  },
  // 页面跳转事件
  goToEdit() {
    wx.navigateTo({ url: '/pages/profile/index' }); // 个人信息编辑页
  },

  goToPlan() {
    wx.navigateTo({ url: '/pages/plan/detail/index' }); // 我的计划页
  },

  goToCustomDishes() {
    wx.navigateTo({ url: '/pages/diet/custom-dishes/index' }); // 自定义菜品列表
  },

  goToFavorites() {
    wx.navigateTo({ url: '/pages/recipe-recommend/index' }); // 收藏食谱页
  },

  goToStats() {
    wx.navigateTo({ url: '/pages/stats/index/index' }); // 数据统计页
  },

  goToHelp() {
    wx.navigateTo({ url: '/pages/help/index' }); // 使用帮助页
  }
});