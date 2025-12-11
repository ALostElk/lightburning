// pages/stats/index.js

import {
  getProfile,
  evaluateDaily,
  getDietLogsByRange
} from '../../../utils/cloudApi.js';


// ======================== 工具函数 ========================

// 计算日期范围
function calcDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const f = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return {
    startDate: f(start),
    endDate: f(end)
  };
}

// 将 YYYY-MM-DD 转 Date
function parseDate(str) {
  const [y, m, d] = str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

// 饮食统计封装（你原来的逻辑保持不变）
function buildStatsFromLogs(logs, rangeDays) {
  const dayMap = {};
  let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;

  let totalEx = 0;
  const exSet = {};

  const weightLogs = [];
  let firstW = null, lastW = null;
  let firstDate = null, lastDate = null;

  logs.forEach(log => {
    const date = log.recordDate;
    if (!date) return;

    if (!dayMap[date]) {
      dayMap[date] = { date, calories: 0, protein: 0, fat: 0, carbs: 0 };
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

    const ex = Number(log.exerciseMinutes) || Number(log.exercise) || 0;
    if (ex > 0) {
      totalEx += ex;
      exSet[date] = true;
    }

    const w = Number(log.weight) || 0;
    if (w > 0) {
      weightLogs.push({ date, weight: w });
      if (firstW === null || date < firstDate) {
        firstW = w;
        firstDate = date;
      }
      if (lastW === null || date > lastDate) {
        lastW = w;
        lastDate = date;
      }
    }
  });

  const dailyList = Object.keys(dayMap).sort().map(k => dayMap[k]);
  const activeDays = dailyList.length;
  const avgCalories = rangeDays > 0 ? Math.round(totalCalories / rangeDays) : 0;

  let maxCalories = 0, minCalories = null;
  dailyList.forEach(d => {
    const val = d.calories || 0;
    maxCalories = Math.max(maxCalories, val);
    if (minCalories === null || val < minCalories) minCalories = val;
  });
  if (minCalories === null) minCalories = 0;

  const macroTotal = totalCarbs + totalProtein + totalFat;
  let cp = 0, pp = 0, fp = 0;
  if (macroTotal > 0) {
    cp = Math.round((totalCarbs * 100) / macroTotal);
    pp = Math.round((totalProtein * 100) / macroTotal);
    fp = 100 - cp - pp;
  }

  const exDays = Object.keys(exSet).length;
  const exAvg = exDays > 0 ? Math.round(totalEx / exDays) : 0;
  const exGoal = 30;

  let exText = '暂无运动记录';
  if (exDays > 0) {
    if (exAvg >= exGoal) exText = '整体达标（≥30min/天）';
    else if (exAvg >= exGoal * 0.5) exText = '接近达标，建议增加时长';
    else exText = '未达标，可以多安排运动时间';
  }

  let weightChange = 0;
  let weightText = '暂无体重记录';
  let trend = [];

  if (weightLogs.length > 0) {
    weightLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
    trend = weightLogs;
    weightChange = Number((lastW - firstW).toFixed(1));
    if (weightChange > 0) weightText = `+${weightChange} kg`;
    else if (weightChange < 0) weightText = `${weightChange} kg`;
    else weightText = '0 kg';
  }

  return {
    totalCaloriesIn: totalCalories,
    avgCaloriesIn: avgCalories,
    totalProtein: Number(totalProtein.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),
    totalDays: rangeDays,
    recordDays: activeDays,
    recordRate: rangeDays > 0 ? Math.round((activeDays * 100) / rangeDays) : 0,

    exerciseMinutesTotal: totalEx,
    exerciseDays: exDays,
    exerciseAvgMinutes: exAvg,
    exerciseGoalPerDay: exGoal,
    exerciseStatusText: exText,

    weightStart: firstW,
    weightEnd: lastW,
    weightChange,
    weightChangeText: weightText,
    weightTrendList: trend,

    minCalories,
    maxCalories,

    macroPercentCarb: cp,
    macroPercentProtein: pp,
    macroPercentFat: fp,

    dailyList
  };
}

// ===============================================================

Page({
  data: {
    rangeDays: 7,
    startDate: '',
    endDate: '',
    rangeText: '',
    loading: false,

    // 饮食统计
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

    // 体重目标进度
    currentWeight: null,
    targetWeight: null,
    weightGoalText: '暂无目标体重',
    weightProgressPercent: 0,

    // 计划完成度
    planProgressPercent: 0,
    planSummaryText: '暂无计划数据',

    minCalories: 0,
    maxCalories: 0,
    macroPercentCarb: 0,
    macroPercentProtein: 0,
    macroPercentFat: 0,

    dailyList: []
  },

  onLoad() {
    const { startDate, endDate } = calcDateRange(7);
    this.setData({
      rangeDays: 7,
      startDate,
      endDate,
      rangeText: `${startDate} ~ ${endDate}`
    });
    this.loadStats();
  },

  onRangeChange(e) {
    const days = Number(e.currentTarget.dataset.days || 7);
    const { startDate, endDate } = calcDateRange(days);
    this.setData({
      rangeDays: days,
      startDate,
      endDate,
      rangeText: `${startDate} ~ ${endDate}`
    });
    this.loadStats();
  },

  // ===================== 主加载函数 =====================

  async loadStats() {
    const { startDate, endDate, rangeDays } = this.data;

    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...', mask: true });

    try {
      const res = await getDietLogsByRange(startDate, endDate);
      const result = res.result || {};

      if (!result.success) {
        wx.showToast({ title: '加载数据失败', icon: 'none' });
        return;
      }

      const logs = result.data || [];
      const stats = buildStatsFromLogs(logs, rangeDays);

      this.setData(stats);

      wx.nextTick(() => this.drawWeightChart());

      await this.updateProfileAndProgress(stats);
      await this.loadPlanProgress();

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  // ===================== 体重档案 & 目标进度 =====================

  async updateProfileAndProgress(stats) {
    try {
      const res = await getProfile();
      const result = res.result || {};
      if (!result.success) return;

      const profile = result.data;
      const targetWeight = Number(profile.targetWeight) || null;
      const currentWeight = Number(profile.weight) || stats.weightEnd;

      const weightStart = stats.weightStart ?? currentWeight;
      const goal = profile.goal || '减脂';

      let totalChange = 0, finished = 0;

      if (goal === '增肌' || currentWeight < targetWeight) {
        totalChange = targetWeight - weightStart;
        finished = currentWeight - weightStart;
      } else {
        totalChange = weightStart - targetWeight;
        finished = weightStart - currentWeight;
      }

      let percent = 0;
      let text = '暂无目标体重';

      if (totalChange > 0) {
        finished = Math.max(0, Math.min(finished, totalChange));
        percent = Math.round((finished * 100) / totalChange);
        text = `已完成 ${finished.toFixed(1)} / ${totalChange.toFixed(1)} kg`;
      }

      this.setData({
        currentWeight,
        targetWeight,
        weightGoalText: text,
        weightProgressPercent: percent
      });

    } catch (e) {
      console.error(e);
    }
  },

  // ===================== 计划完成度（日评） =====================

  async loadPlanProgress() {
    const { startDate, endDate } = this.data;

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const dates = [];

    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }

    let successDays = 0;
    let evaluatedDays = 0;

    await Promise.all(
      dates.map(async d => {
        try {
          const res = await evaluateDaily(d);
          const result = res.result;
          if (result?.success) {
            evaluatedDays++;
            if (result.data?.status === 'success') successDays++;
          }
        } catch {}
      })
    );

    const percent = Math.round((successDays * 100) / dates.length);

    this.setData({
      planProgressPercent: percent,
      planSummaryText:
        `${successDays}/${dates.length} 天达标，${evaluatedDays} 天已生成日评`
    });
  },

  // ===================== 体重折线图 =====================

  drawWeightChart() {
    const list = this.data.weightTrendList;
    const ctx = wx.createCanvasContext('weightChart', this);

    const width = 300, height = 120, p = 10;
    ctx.clearRect(0, 0, width, height);

    if (!list || !list.length) {
      ctx.draw();
      return;
    }

    const weights = list.map(i => i.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const diff = max - min || 1;

    const stepX = (width - p * 2) / (list.length - 1);

    ctx.setStrokeStyle('#1f8cff');
    ctx.setLineWidth(2);
    ctx.beginPath();

    list.forEach((item, idx) => {
      const x = p + idx * stepX;
      const y = height - p - ((item.weight - min) / diff) * (height - p * 2);
      idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });

    ctx.stroke();

    ctx.setFillStyle('#1f8cff');
    list.forEach((item, idx) => {
      const x = p + idx * stepX;
      const y = height - p - ((item.weight - min) / diff) * (height - p * 2);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.draw();
  },

  goWeeklyReport() {
    wx.navigateTo({ url: '/pages/stats/weekly' });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  }
});
