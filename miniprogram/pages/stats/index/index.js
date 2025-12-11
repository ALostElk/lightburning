// pages/stats/index.js

// 计算某个范围的起止日期
function calcDateRange(days) {
  const end = new Date(); // 今天
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: format(start),
    endDate: format(end),
  };
}

// 根据 DietLog 数组做聚合，返回首页要显示的统计
function buildStatsFromLogs(logs, rangeDays) {
  const dayMap = {}; // 按日期聚合

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  // 运动相关
  let totalExerciseMinutes = 0;
  const exerciseDaySet = {};

  // 体重相关
  const weightLogs = []; // 用于折线图 [{date, weight}]
  let firstWeight = null;
  let lastWeight = null;
  let firstWeightDate = null;
  let lastWeightDate = null;

  logs.forEach((log) => {
    const date = log.recordDate;
    if (!date) return;

    if (!dayMap[date]) {
      dayMap[date] = {
        date,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
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

    // 运动时长：兼容几种字段名
    const ex =
      Number(log.exerciseMinutes) ||
      Number(log.exercise) ||
      0;
    if (ex > 0) {
      totalExerciseMinutes += ex;
      exerciseDaySet[date] = true;
    }

    // 体重：如果有 weight 字段则使用
    const w = Number(log.weight) || 0;
    if (w > 0) {
      weightLogs.push({ date, weight: w });

      if (firstWeight === null || date < firstWeightDate) {
        firstWeight = w;
        firstWeightDate = date;
      }
      if (lastWeight === null || date > lastWeightDate) {
        lastWeight = w;
        lastWeightDate = date;
      }
    }
  });

  // 按日期排序
  const dailyList = Object.keys(dayMap)
    .sort()
    .map((k) => dayMap[k]);

  const activeDays = dailyList.length; // 有记录的天数
  const avgCalories =
    rangeDays > 0 ? Math.round(totalCalories / rangeDays) : 0;

  // 热量趋势：最高 / 最低
  let maxCalories = 0;
  let minCalories = null;
  dailyList.forEach((d) => {
    const val = d.calories || 0;
    if (val > maxCalories) maxCalories = val;
    if (minCalories === null || val < minCalories) minCalories = val;
  });
  if (minCalories === null) minCalories = 0;

  // 营养素比例
  const macroTotal = totalCarbs + totalProtein + totalFat;
  let macroPercentCarb = 0;
  let macroPercentProtein = 0;
  let macroPercentFat = 0;
  if (macroTotal > 0) {
    macroPercentCarb = Math.round((totalCarbs * 100) / macroTotal);
    macroPercentProtein = Math.round((totalProtein * 100) / macroTotal);
    macroPercentFat = 100 - macroPercentCarb - macroPercentProtein;
  }

  // 运动统计 + 达标描述
  const exerciseDays = Object.keys(exerciseDaySet).length;
  const exerciseAvgMinutes =
    exerciseDays > 0
      ? Math.round(totalExerciseMinutes / exerciseDays)
      : 0;

  const goalPerDay = 30; // 假设目标：每天 30 分钟
  let exerciseStatusText = '暂无运动记录';
  if (exerciseDays > 0) {
    if (exerciseAvgMinutes >= goalPerDay) {
      exerciseStatusText = '整体达标（≥ 30 min/天）';
    } else if (exerciseAvgMinutes >= goalPerDay * 0.5) {
      exerciseStatusText = '接近达标，建议适当增加时长';
    } else {
      exerciseStatusText = '未达标，可以多安排运动时间';
    }
  }

  // 体重变化描述 + 折线数据
  let weightChange = 0;
  let weightChangeText = '暂无体重记录';
  let weightTrendList = [];

  if (weightLogs.length > 0) {
    // 按日期排序
    weightLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
    weightTrendList = weightLogs;

    if (firstWeight !== null && lastWeight !== null) {
      weightChange = Number((lastWeight - firstWeight).toFixed(1));
      if (weightChange > 0) {
        weightChangeText = `+${weightChange} kg`;
      } else if (weightChange < 0) {
        weightChangeText = `${weightChange} kg`;
      } else {
        weightChangeText = '0 kg';
      }
    }
  }

  return {
    // 顶部摘要卡片
    totalCaloriesIn: totalCalories,
    avgCaloriesIn: avgCalories,
    totalProtein: Number(totalProtein.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),

    totalDays: rangeDays,
    recordDays: activeDays,
    recordRate:
      rangeDays > 0
        ? Math.round((activeDays * 100) / rangeDays)
        : 0,

    // 运动卡片
    exerciseMinutesTotal: totalExerciseMinutes,
    exerciseDays,
    exerciseAvgMinutes,
    exerciseGoalPerDay: goalPerDay,
    exerciseStatusText,

    // 体重卡片
    weightStart: firstWeight,
    weightEnd: lastWeight,
    weightChange,
    weightChangeText,
    weightTrendList,

    // 热量趋势卡片
    minCalories,
    maxCalories,

    // 营养素分布卡片
    macroPercentCarb,
    macroPercentProtein,
    macroPercentFat,

    // 每日列表
    dailyList,
  };
}

Page({
  data: {
    rangeDays: 7,
    rangeText: '',
    startDate: '',
    endDate: '',
    loading: false,

    // 顶部摘要
    totalCaloriesIn: 0,
    avgCaloriesIn: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    totalDays: 7,
    recordDays: 0,
    recordRate: 0,

    // 运动
    exerciseMinutesTotal: 0,
    exerciseDays: 0,
    exerciseAvgMinutes: 0,
    exerciseGoalPerDay: 30,
    exerciseStatusText: '',

    // 体重
    weightStart: null,
    weightEnd: null,
    weightChange: 0,
    weightChangeText: '',
    weightTrendList: [],

    // 热量趋势
    minCalories: 0,
    maxCalories: 0,

    // 营养素比例
    macroPercentCarb: 0,
    macroPercentProtein: 0,
    macroPercentFat: 0,

    dailyList: [],
  },

  onLoad() {
    const fakeEvent = { currentTarget: { dataset: { days: 7 } } };
    this.changeRange(fakeEvent);
  },

  changeRange(e) {
    const days = Number(e.currentTarget.dataset.days || 7);
    const { startDate, endDate } = calcDateRange(days);

    this.setData(
      {
        rangeDays: days,
        startDate,
        endDate,
        rangeText: `${startDate} ~ ${endDate}`,
      },
      () => {
        this.loadStats();
      }
    );
  },

  onRangeChange(e) {
    this.changeRange(e);
  },

  async loadStats() {
    const { startDate, endDate, rangeDays } = this.data;
    if (!startDate || !endDate) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...', mask: true });

    try {
      if (!wx.cloud || !wx.cloud.callFunction) {
        console.error('[stats] wx.cloud 未初始化');
        wx.showToast({ title: '云开发未初始化', icon: 'none' });
        return;
      }

      const res = await wx.cloud.callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogsByRange',
          payload: { startDate, endDate },
        },
      });

      const result = res.result || {};
      if (!result.success) {
        console.error('[stats] dietService 返回失败: ', result);
        wx.showToast({ title: '加载数据失败', icon: 'none' });
        return;
      }

      const logs = result.data || [];
      console.log('[stats] 原始日志 logs = ', logs);

      const stats = buildStatsFromLogs(logs, rangeDays);
      this.setData(stats, () => {
        // 统计更新完再画折线图
        wx.nextTick(() => {
          this.drawWeightChart();
        });
      });
    } catch (err) {
      console.error('[stats] 调用 dietService 失败: ', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  // 体重折线图
  drawWeightChart() {
    const list = this.data.weightTrendList || [];
    if (!list.length) {
      // 没有体重记录不画
      const ctx = wx.createCanvasContext('weightChart', this);
      ctx.clearRect(0, 0, 300, 120);
      ctx.draw();
      return;
    }

    const ctx = wx.createCanvasContext('weightChart', this);
    const width = 300;
    const height = 120;
    const padding = 10;

    ctx.clearRect(0, 0, width, height);

    const weights = list.map((d) => d.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const diff = maxW - minW || 1;

    const n = list.length;
    const stepX = (width - padding * 2) / (n - 1 || 1);

    ctx.setStrokeStyle('#1f8cff');
    ctx.setLineWidth(2);
    ctx.beginPath();

    list.forEach((item, idx) => {
      const x = padding + stepX * idx;
      const y =
        height -
        padding -
        ((item.weight - minW) / diff) * (height - padding * 2);

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 画小圆点
    ctx.setFillStyle('#1f8cff');
    list.forEach((item, idx) => {
      const x = padding + stepX * idx;
      const y =
        height -
        padding -
        ((item.weight - minW) / diff) * (height - padding * 2);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.draw();
  },

  goWeeklyReport() {
    wx.navigateTo({
      url: '/pages/stats/weekly',
    });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: '我的健康数据概览',
      path: '/pages/stats/index',
    };
  },
});
