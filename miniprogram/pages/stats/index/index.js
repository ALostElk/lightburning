// pages/stats/index.js

// 计算某个范围的起止日期
function calcDateRange(days) {
  const end = new Date();           // 今天
  const start = new Date();
  // 近7天：包含今天，一共7天
  start.setDate(end.getDate() - (days - 1));

  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: format(start),
    endDate: format(end)
  };
}

// 根据 DietLog 数组做聚合，返回首页要显示的统计
function buildStatsFromLogs(logs, rangeDays) {
  // logs 结构来自云函数 DietLog：
  // { calories, protein, fat, carbs, recordDate, mealType, ... }

  const dayMap = {};      // 按日期聚合
  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  logs.forEach((log) => {
    const date = log.recordDate;
    if (!dayMap[date]) {
      dayMap[date] = {
        date,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0
      };
    }

    const c = Number(log.calories) || 0;
    const p = Number(log.protein) || 0;
    const f = Number(log.fat) || 0;
    const cb = Number(log.carbs) || 0;

    dayMap[date].calories += c;
    dayMap[date].protein += p;
    dayMap[date].fat += f;
    dayMap[date].carbs += cb;

    totalCalories += c;
    totalProtein += p;
    totalFat += f;
    totalCarbs += cb;
  });

  // 按日期排序，生成折线图/列表用的数据
  const dailyList = Object.keys(dayMap)
    .sort()
    .map((k) => dayMap[k]);

  const activeDays = dailyList.length; // 有记录的天数
  const avgCalories = rangeDays > 0 ? Math.round(totalCalories / rangeDays) : 0;

  return {
    // 顶部摘要卡片
    totalCaloriesIn: totalCalories,      // 总摄入
    avgCaloriesIn: avgCalories,          // 平均每日摄入
    totalProtein: Number(totalProtein.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),

    // 「记录天数 / 达标天数」之类可以先简单用 activeDays 占位
    totalDays: rangeDays,
    recordDays: activeDays,
    recordRate: rangeDays > 0 ? Math.round((activeDays * 100) / rangeDays) : 0,

    // 雷达图 / 进度条用的几个维度（可以随便先占位，保证不报错）
    completionItems: [
      {
        key: 'diet',
        label: '饮食记录天数',
        score: rangeDays > 0 ? Math.round((activeDays * 100) / rangeDays) : 0
      },
      {
        key: 'calorie',
        label: '平均热量记录',
        score: avgCalories > 0 ? 80 : 0 // 简单给个常数占位，后面你可以按目标热量算
      },
      {
        key: 'protein',
        label: '蛋白质记录',
        score: totalProtein > 0 ? 80 : 0
      }
    ],

    // 折线图/列表
    dailyList
  };
}

Page({
  data: {
    // 当前选择的时间范围，天数
    rangeDays: 7,
    // 展示的日期区间，比如 "2025-11-28 ~ 2025-12-04"
    rangeText: '',
    startDate: '',
    endDate: '',
    loading: false,

    // ↓↓↓ 这些字段对应首页「数据概览」要用到的绑定字段
    totalCaloriesIn: 0,
    avgCaloriesIn: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    totalDays: 7,
    recordDays: 0,
    recordRate: 0,
    completionItems: [],
    dailyList: []
  },

  onLoad() {
    // 默认近7天
    const fakeEvent = { currentTarget: { dataset: { days: 7 } } };
    this.changeRange(fakeEvent);
  },

  /**
   * 点击「近7天 / 近30天 / 近90天」按钮
   * wxml: bindtap="changeRange" data-days="7"
   */
  changeRange(e) {
    const days = Number(e.currentTarget.dataset.days || 7);
    const { startDate, endDate } = calcDateRange(days);

    this.setData(
      {
        rangeDays: days,
        startDate,
        endDate,
        rangeText: `${startDate} ~ ${endDate}`
      },
      () => {
        this.loadStats();
      }
    );
  },

  // 如果你 wxml 里绑定的是 onRangeChange，这里做个转发也行
  onRangeChange(e) {
    this.changeRange(e);
  },

  /**
   * 调用后端 dietService.getDietLogsByRange
   * 拉取这个时间段内的 DietLog，然后做聚合
   */
  async loadStats() {
    const { startDate, endDate, rangeDays } = this.data;

    if (!startDate || !endDate) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...', mask: true });

    try {
      if (!wx.cloud || !wx.cloud.callFunction) {
        console.error('[stats] wx.cloud 未初始化，请检查 app.js 中是否有 wx.cloud.init');
        wx.showToast({ title: '云开发未初始化', icon: 'none' });
        return;
      }

      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogsByRange',
          payload: {
            startDate,
            endDate
          }
        }
      });

      console.log('[stats] dietService.getDietLogsByRange result:', res);

      const result = res.result || {};
      if (!result.success) {
        console.error('[stats] dietService 返回失败: ', result);
        wx.showToast({ title: '加载数据失败', icon: 'none' });
        return;
      }

      const logs = result.data || [];
      // 计算统计值
      const stats = buildStatsFromLogs(logs, rangeDays);

      this.setData(stats);
    } catch (err) {
      console.error('[stats] 调用 dietService 失败: ', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  /**
   * 跳转到周报页面
   * wxml: bindtap="goWeeklyReport"
   */
  goWeeklyReport() {
    wx.navigateTo({
      url: '/pages/stats/weekly'
    });
  },

  // 下拉刷新：重新拉一次
  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的健康数据概览',
      path: '/pages/stats/index'
    };
  }
});
