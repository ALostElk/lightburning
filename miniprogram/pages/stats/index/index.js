// pages/stats/index.js
import * as api from '../../../utils/cloudApi.js';

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

  return { startDate: f(start), endDate: f(end) };
}

// 将 YYYY-MM-DD 转 Date
function parseDate(str) {
  const [y, m, d] = String(str).split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 生成日期数组（包含 end）
function makeDateList(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [];
  const cur = new Date(start);

  while (cur <= end) {
    dates.push(formatDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// 并发限制执行（避免 Promise.all 一口气打爆云函数）
async function mapLimit(list, limit, worker) {
  const ret = [];
  let i = 0;

  async function runOne() {
    while (i < list.length) {
      const idx = i++;
      try {
        ret[idx] = await worker(list[idx], idx);
      } catch (e) {
        ret[idx] = null;
      }
    }
  }

  const runners = Array.from({ length: Math.max(1, limit) }, runOne);
  await Promise.all(runners);
  return ret;
}

// 从 range 接口 data 里取 records（兼容多种实现）
function pickDietRecords(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.logs)) return data.logs;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

// ======================== 饮食统计 ========================

function buildStatsFromDietRecords(records, rangeDays) {
  const dayMap = {};
  let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;

  records.forEach((log) => {
    const date = log.recordDate || log.date;
    if (!date) return;

    if (!dayMap[date]) {
      dayMap[date] = { date, calories: 0, protein: 0, fat: 0, carbs: 0 };
    }

    const c = Number(log.calories || log.totalCalories || 0) || 0;
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

  return {
    totalCaloriesIn: totalCalories,
    avgCaloriesIn: avgCalories,
    totalProtein: Number(totalProtein.toFixed(1)),
    totalFat: Number(totalFat.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),
    totalDays: rangeDays,
    recordDays: activeDays,
    recordRate: rangeDays > 0 ? Math.round((activeDays * 100) / rangeDays) : 0,

    minCalories,
    maxCalories,

    macroPercentCarb: cp,
    macroPercentProtein: pp,
    macroPercentFat: fp,

    dailyList
  };
}

// ======================== Page ========================

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

    // ✅ 体重：只展示目标差距
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
      // 1) 饮食范围记录
      const dietRes = await api.getDietLogsByRange(startDate, endDate);
      const dietResult = dietRes?.result || {};
      if (!dietResult.success) {
        wx.showToast({ title: '加载数据失败', icon: 'none' });
        return;
      }

      const dietRecords = pickDietRecords(dietResult.data);
      const dietStats = buildStatsFromDietRecords(dietRecords, rangeDays);

      // ✅ 只写饮食相关字段，不会覆盖运动/计划
      this.setData(dietStats);

      // 2) 日期列表
      const dates = makeDateList(startDate, endDate);

      // 3) 并行：运动 + 计划完成度 + profile（用于体重目标差距）
      const [exerciseAgg, planAgg, profileRes] = await Promise.all([
        this.loadExerciseByDates(dates),
        this.loadPlanProgressByDates(dates),
        api.getProfile()
      ]);

      // ✅ 运动
      this.setData(exerciseAgg);

      // ✅ 计划：只 set 展示字段（别把 _dailyEvalList 塞进 data）
      this.setData({
        planProgressPercent: planAgg.planProgressPercent,
        planSummaryText: planAgg.planSummaryText
      });

      // ✅ 体重目标差距：只基于 profile（不做折线图）
      const profile = profileRes?.result?.success ? (profileRes.result.data || {}) : {};
      await this.updateGoalDistanceFromProfile(profile);

    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  // ===================== 运动：逐日 getExerciseLogs（保留能显示的版本） =====================

  async loadExerciseByDates(dates) {
    let totalMin = 0;
    const daySet = new Set();

    // 并发限制 3，稳一点
    const results = await mapLimit(dates, 3, async (d) => {
      const res = await api.getExerciseLogs(d);
      const ok = res?.result?.success;
      const data = res?.result?.data;
      return ok ? data : null;
    });

    results.forEach((logs, idx) => {
      if (!logs) return;

      // 你们首页里 exerciseRes.result.data 是数组，这里保持一致
      if (Array.isArray(logs)) {
        logs.forEach(log => {
          // duration(分钟) 常见；也兼容 minutes/exerciseMinutes
          const minutes = Number(log.duration || log.minutes || log.exerciseMinutes || 0) || 0;
          if (minutes > 0) {
            totalMin += minutes;
            daySet.add(dates[idx]);
          }
        });
      }
    });

    const exDays = daySet.size;
    const exAvg = exDays > 0 ? Math.round(totalMin / exDays) : 0;
    const exGoal = 30;

    let exText = '暂无运动记录';
    if (exDays > 0) {
      if (exAvg >= exGoal) exText = '整体达标（≥30min/天）';
      else if (exAvg >= exGoal * 0.5) exText = '接近达标，建议增加时长';
      else exText = '未达标，可以多安排运动时间';
    }

    return {
      exerciseMinutesTotal: totalMin,
      exerciseDays: exDays,
      exerciseAvgMinutes: exAvg,
      exerciseGoalPerDay: exGoal,
      exerciseStatusText: exText
    };
  },

  // ===================== 计划完成度：逐日 evaluateDaily（稳 + 兼容） =====================

  async loadPlanProgressByDates(dates) {
    let successDays = 0;
    let evaluatedDays = 0;

    function isDaySuccess(data) {
      if (!data) return false;
      if (data.status === 'success' || data.status === true) return true;

      const s = String(data.status || data.result || data.state || '').toLowerCase();
      if (['pass', 'passed', 'ok', 'success', 'achieved', 'done', '达标', '完成'].includes(s)) return true;

      const nested =
        data.evaluation?.status ??
        data.report?.status ??
        data.dailyReport?.status ??
        data.data?.status;
      if (nested === 'success' || nested === true) return true;

      if (data.goalMet === true || data.isSuccess === true || data.achieved === true) return true;

      return false;
    }

    // ✅ 串行：最稳（不吃运动，不影响别的模块）
    for (const d of dates) {
      try {
        let res;
        try {
          res = await api.evaluateDaily(d);
        } catch (e1) {
          res = await api.evaluateDaily({ date: d });
        }

        const ok = res?.result?.success;
        const data = ok ? (res.result.data || null) : null;
        if (data) {
          evaluatedDays++;
          if (isDaySuccess(data)) successDays++;
        }
      } catch (e) {}
    }

    const percent = dates.length > 0 ? Math.round((successDays * 100) / dates.length) : 0;

    return {
      planProgressPercent: percent,
      planSummaryText: `${successDays}/${dates.length} 天达标，${evaluatedDays} 天已生成日评`
    };
  },

  // ===================== 体重：显示距离目标还有多远（不做历史） =====================

  async updateGoalDistanceFromProfile(profile) {
    const currentWeight = Number(profile.weight) || null;
    const targetWeight = Number(profile.targetWeight) || null;

    if (!currentWeight || !targetWeight) {
      this.setData({
        currentWeight,
        targetWeight,
        weightGoalText: '暂无目标体重',
        weightProgressPercent: 0
      });
      return;
    }

    const diff = Number((targetWeight - currentWeight).toFixed(1));
    const absDiff = Math.abs(diff);

    const direction = diff < 0 ? '还需减重' : diff > 0 ? '还需增重' : '已达成目标';
    const text = diff === 0 ? '已达成目标 🎉' : `${direction} ${absDiff} kg`;

    // 没有历史时，用“接近度”做进度：<=0.5kg 视作100%，>=10kg 视作0%
    const maxGap = 10;
    let percent = 0;
    if (absDiff <= 0.5) percent = 100;
    else if (absDiff >= maxGap) percent = 0;
    else percent = Math.round((1 - (absDiff - 0.5) / (maxGap - 0.5)) * 100);

    this.setData({
      currentWeight,
      targetWeight,
      weightGoalText: text,
      weightProgressPercent: percent
    });
  },

  goWeeklyReport() {
    wx.navigateTo({ url: '/pages/stats/weekly' });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => wx.stopPullDownRefresh());
  }
});
