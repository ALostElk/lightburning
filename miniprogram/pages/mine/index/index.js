// pages/mine/index/index.js
import * as api from '../../../utils/cloudApi.js';

// 自定义获取运动记录的方法，适配健康服务模块接口
const getExerciseRecords = (date) => {
  return wx.cloud.callFunction({
    name: 'healthService', // 运动记录属于健康服务模块
    data: {
      action: 'getExerciseLogs', // 假设后端用这个action获取运动记录
      payload: { date }
    }
  });
};

Page({
  data: {
    // 时间状态
    currentTime: '16:00',

    // 导航
    currentTab: 3, // 默认选中"我的"页面

    // 问候语
    greeting: '下午好',

    // 用户信息
    userInfo: {
      avatarUrl: '/images/default-avatar.png',
      nickName: '微信用户',
      height: 180,
      weight: 70,
      goal: '减脂',
      age: 0,
      gender: 'male'
    },

    // 今日数据
    todayIntake: 0,
    todayConsume: 0,
    recordCount: 0,

    // 热量结余数据
    calorieBalance: 0,
    ringColor: '#FF6B35', // 默认橙色（盈余）
    ringDegrees: 0,
    balanceLabel: '热量盈余',

    // 加载状态
    isLoading: false,
    loadError: false, // 新增：数据加载错误状态

    // UI状态
    isNicknameModalShow: false,
    newNickname: '',
    showTooltip: false
  },

  onLoad() {
    this.updateTime();
    this.setGreeting();
    // 先尝试加载缓存数据，提升用户体验
    this.loadCachedUserInfo();
    this.loadCachedTodayData();
    // 再从网络加载最新数据
    this.loadAllData();
    // 设置定时器，每分钟更新一次时间
    this.timeInterval = setInterval(() => this.updateTime(), 60000);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
    // 页面显示时恢复定时器
    if (!this.timeInterval) {
      this.updateTime();
      this.timeInterval = setInterval(() => this.updateTime(), 60000);
    }
    this.loadAllData();
  },

  onHide() {
    // 页面隐藏时暂停定时器
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  },

  onUnload() {
    // 清除定时器
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  },

  onPullDownRefresh() {
    this.loadAllData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 更新时间
  updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.setData({ currentTime: `${hours}:${minutes}` });
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

  // 切换底部导航
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });

    const tabUrls = [
      '/pages/index/index',
      '/pages/diet/index',
      '/pages/exercise/index',
      '/pages/mine/index/index'
    ];

    if (tab !== 3) { // 如果不是"我的"页面
      wx.switchTab({ url: tabUrls[tab] });
    }
  },

  // 加载所有数据
  async loadAllData() {
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true,
      loadError: false // 重置错误状态
    });
    wx.showLoading({ title: '加载中...' });

    try {
      // 增加超时控制
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), 15000)
      );

      // 使用Promise.race确保请求不会无限等待
      await Promise.race([
        Promise.all([
          this.loadUserInfo(),
          this.loadTodayData()
        ]),
        timeoutPromise
      ]);

      this.calculateCalorieBalance();

    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({ loadError: true });
      api.handleError(error, '加载失败，请稍后重试');

      // 确保有默认数据显示
      if (!this.data.userInfo.nickName) {
        this.setData({
          userInfo: {
            avatarUrl: '/images/default-avatar.png',
            nickName: '微信用户',
            height: 180,
            weight: 70,
            goal: '减脂',
            age: 30,
            gender: 'male'
          },
          todayIntake: 0,
          todayConsume: 0,
          recordCount: 0
        });
      }

      this.calculateCalorieBalance();
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  /**
   * 加载用户信息 - 整合基础代谢和BMI数据
   */
  async loadUserInfo() {
    try {
      console.log('开始调用用户信息接口');
      const res = await api.getProfile();
      console.log('用户信息接口返回完整数据:', res);

      if (res.result?.success) {
        const userData = res.result.data || {};

        // 确保关键数据有默认值
        const height = userData.height || 170;
        const weight = userData.weight || 60;
        const age = userData.age || 25;
        const gender = userData.gender || 'male';

        const userInfo = {
          avatarUrl: userData.avatarUrl || '/images/default-avatar.png',
          nickName: userData.nickName || '微信用户',
          height,
          weight,
          goal: userData.goal || '减脂',
          age,
          gender
        };

        this.setData({ userInfo });
        // 缓存数据
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('userInfoUpdateTime', new Date().getTime());

      } else {
        console.log('用户信息接口返回失败，错误信息:', res.result?.error);
        throw new Error(res.result?.error || '获取个人信息失败');
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      // 尝试加载缓存数据
      this.loadCachedUserInfo();
      throw error; // 继续抛出错误，让上层处理
    }
  },

  /**
   * 加载今日数据 - 整合摄入和消耗数据
   */
  async loadTodayData() {
    try {
      const today = api.getTodayString ? api.getTodayString() : this.getTodayString();
      console.log('开始调用今日数据接口，请求日期:', today);

      // 并行调用饮食接口和运动接口
      const [dietRes, exerciseRes] = await Promise.all([
        api.getDietLogs(today),
        getExerciseRecords(today)
      ]);

      console.log('饮食接口返回:', dietRes);
      console.log('运动接口返回:', exerciseRes);

      // 处理饮食摄入数据
      const todayIntake = dietRes.result?.success
        ? (dietRes.result.data.summary?.totalCalories || 0)
        : 0;

      // 处理运动消耗数据
      const todayConsume = exerciseRes.result?.success
        ? (exerciseRes.result.data.summary?.totalCalories || 0)
        : 0;

      // 计算记录总数
      const dietRecords = dietRes.result?.success ? (dietRes.result.data.records?.length || 0) : 0;
      const exerciseRecords = exerciseRes.result?.success ? (exerciseRes.result.data.records?.length || 0) : 0;
      const recordCount = dietRecords + exerciseRecords;

      this.setData({ todayIntake, todayConsume, recordCount });

      // 缓存今日数据
      wx.setStorageSync('todayData', {
        todayIntake,
        todayConsume,
        recordCount,
        date: today,
        updateTime: new Date().getTime()
      });

    } catch (error) {
      console.error('加载今日数据失败:', error);
      // 尝试加载缓存数据
      this.loadCachedTodayData();
      throw error; // 继续抛出错误，让上层处理
    }
  },

  // 计算热量结余
  calculateCalorieBalance() {
    const { todayConsume, todayIntake, userInfo } = this.data;

    // 热量结余 = 运动消耗 - 今日摄入（不再包含基础代谢）
    const balance = todayConsume - todayIntake;

    // 根据目标调整显示逻辑（减脂需要热量赤字，增肌需要热量盈余）
    let ringColor, balanceLabel;
    if (userInfo.goal === '减脂') {
      // 减脂目标：负数是理想状态（赤字）
      ringColor = balance <= 0 ? '#52C41A' : '#FF6B35';
      balanceLabel = balance <= 0 ? '热量赤字' : '热量盈余';
    } else {
      // 增肌目标：正数是理想状态（盈余）
      ringColor = balance >= 0 ? '#52C41A' : '#FF6B35';
      balanceLabel = balance >= 0 ? '热量盈余' : '热量赤字';
    }

    // 计算环形图角度（最大360度）
    const maxDisplayValue = 1000; // 最大显示值设置为1000卡路里
    const displayValue = Math.min(Math.abs(balance), maxDisplayValue);
    const ringDegrees = (displayValue / maxDisplayValue) * 360;

    this.setData({
      calorieBalance: balance,
      ringColor,
      ringDegrees,
      balanceLabel
    });
  },

  // 获取今日日期字符串
  getTodayString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 加载缓存的用户信息
  loadCachedUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    const updateTime = wx.getStorageSync('userInfoUpdateTime');

    // 检查缓存是否存在且在24小时内
    if (userInfo && updateTime && (new Date().getTime() - updateTime < 86400000)) {
      this.setData({ userInfo });
    }
  },

  // 加载缓存的今日数据
  loadCachedTodayData() {
    const todayData = wx.getStorageSync('todayData');
    const today = this.getTodayString();

    // 检查缓存是否存在且是今日数据
    if (todayData && todayData.date === today) {
      this.setData({
        todayIntake: todayData.todayIntake,
        todayConsume: todayData.todayConsume,
        recordCount: todayData.recordCount
      });
    }
  },

  // 格式化数字显示
  formatNumber(num) {
    return num.toFixed(1);
  },

  // 打开昵称编辑弹窗
  openNicknameModal() {
    this.setData({
      isNicknameModalShow: true,
      newNickname: this.data.userInfo.nickName
    });
  },

  // 关闭昵称编辑弹窗
  cancelNicknameEdit() {
    this.setData({ isNicknameModalShow: false });
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({ newNickname: e.detail.value });
  },

  // 确认修改昵称
  async confirmNicknameEdit() {
    const newNickname = this.data.newNickname.trim();
    if (!newNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    try {
      const res = await api.updateProfile({ nickName: newNickname });
      if (res.result?.success) {
        const updatedUserInfo = { ...this.data.userInfo, nickName: newNickname };
        this.setData({ userInfo: updatedUserInfo });
        wx.setStorageSync('userInfo', updatedUserInfo);
        wx.showToast({ title: '修改成功' });
      } else {
        throw new Error(res.result?.error || '修改失败');
      }
    } catch (error) {
      console.error('修改昵称失败:', error);
      wx.showToast({ title: '修改失败', icon: 'none' });
    } finally {
      this.setData({ isNicknameModalShow: false });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseAvatar({
      success: (res) => {
        const avatarUrl = res.tempFilePath;
        const updatedUserInfo = { ...this.data.userInfo, avatarUrl };
        this.setData({ userInfo: updatedUserInfo });
        // 调用API更新头像
        api.updateProfile({ avatarUrl })
          .then(res => {
            if (res.result?.success) {
              wx.setStorageSync('userInfo', updatedUserInfo);
              wx.showToast({ title: '头像更新成功' });
            }
          })
          .catch(error => {
            console.error('更新头像失败:', error);
          });
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
