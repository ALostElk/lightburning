// 工具：格式化日期 yyyy-MM-dd
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 工具：获取本周一和今天的日期区间
function getCurrentWeekRange() {
  const today = new Date();
  const day = today.getDay() || 7; // 周一=1, 周日=7
  const start = new Date(today);
  start.setDate(today.getDate() - (day - 1));
  return {
    startDate: formatDate(start),
    endDate: formatDate(today)
  };
}

// 中文星期标签
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

Page({
  data: {
    weekRangeText: '',
    startDate: '',
    endDate: '',
    // 顶部本周总结
    summary: {
      weightChangeText: '--',
      currentWeight: null,
      avgNetCalories: null,
      netCaloriesHint: '本周暂仅统计饮食数据',
      totalDuration: 0,    // 先占位，未来接运动数据
      totalCount: 0,
      goalRate: 0,
      goalDays: 0,
      totalDays: 7,
      avgTotalCalories: null
    },
    // 每日完成度列表
    dailyScores: [],
    // 文案
    highlights: '',
    improvements: '',
    suggestions: ''
  },

  onLoad() {
    const range = getCurrentWeekRange();
    this.setData(
      {
        startDate: range.startDate,
        endDate: range.endDate,
        weekRangeText: `${range.startDate} ~ ${range.endDate}`
      },
      () => {
        this.loadWeeklyReport();
      }
    );
  },

  // ====== 调用 dietService 的 getDietLogsByRange ======
  loadWeeklyReport() {
    const { startDate, endDate } = this.data;

    wx.showLoading({ title: '加载周报中...', mask: true });

    wx.cloud
      .callFunction({
        name: 'dietService',
        data: {
          action: 'getDietLogsByRange',
          payload: { startDate, endDate }
        }
      })
      .then(res => {
        wx.hideLoading();
        const result = res.result || {};
        if (!result.success) {
          console.error('[weekly] dietService error:', result);
          wx.showToast({ title: '周报加载失败', icon: 'none' });
          return;
        }

        const logs = result.data || [];
        console.log('[weekly] diet logs range:', logs);
        this.processLogs(logs);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[weekly] 调用 dietService 失败', err);
        wx.showToast({ title: '周报加载失败', icon: 'none' });
      });
  },

  // ====== 把一周的 DietLog 聚合成周报数据 ======
  processLogs(logs) {
    if (!logs || logs.length === 0) {
      this.setData({
        dailyScores: [],
        summary: {
          weightChangeText: '--',
          currentWeight: null,
          avgNetCalories: null,
          netCaloriesHint: '本周暂无饮食记录，建议先坚持记录~',
          totalDuration: 0,
          totalCount: 0,
          goalRate: 0,
          goalDays: 0,
          totalDays: 7,
          avgTotalCalories: null
        },
        highlights: '本周没有记录到饮食数据，可以从每天简单记录一两条开始，逐步建立习惯。',
        improvements: '持续记录是所有分析的基础，建议下周优先保证每天有饮食记录。',
        suggestions: '可以选一个固定时间（睡前/午休），快速回顾并记录当天饮食，让记录变得不费劲。'
      });
      return;
    }

    const { startDate } = this.data;
    const start = new Date(startDate);

    // 1. 按日期聚合：DietLog 结构里有 recordDate、calories、mealType…
    const dayMap = {}; // key: yyyy-MM-dd
    logs.forEach(item => {
      const dateStr = item.recordDate;     // ✅ 真实字段
      if (!dateStr) return;

      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          totalCalories: 0,
          totalProtein: 0,
          totalFat: 0,
          totalCarbs: 0,
          meals: new Set(),
          logCount: 0
        };
      }
      const d = dayMap[dateStr];
      d.totalCalories += item.calories || 0;
      d.totalProtein += item.protein || 0;
      d.totalFat += item.fat || 0;
      d.totalCarbs += item.carbs || 0;
      if (item.mealType) d.meals.add(item.mealType); // breakfast/lunch/dinner/snack...
      d.logCount += 1;
    });

    // 2. 构造完整 7 天数组
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(formatDate(d));
    }

    let sumTotalCalories = 0;
    let validCalorieDays = 0;
    let goalDays = 0;

    const dailyScores = days.map((ds, idx) => {
      const info = dayMap[ds];
      const weekLabel = WEEK_LABELS[idx];

      if (!info) {
        return {
          date: ds,
          label: `周${weekLabel}`,
          score: 0,
          scoreWidth: '0%'
        };
      }

      const cals = info.totalCalories;
      if (cals > 0) {
        sumTotalCalories += cals;
        validCalorieDays += 1;
      }

      // === 计算当天“饮食完成度” 分数（0~100） ===
      let score = 30;

      // 记录条数越多，分越高
      if (info.logCount >= 5) score += 25;
      else if (info.logCount >= 3) score += 18;
      else if (info.logCount >= 1) score += 8;

      // 覆盖早餐/午餐/晚餐
      if (info.meals.has('breakfast')) score += 8;
      if (info.meals.has('lunch')) score += 8;
      if (info.meals.has('dinner')) score += 8;

      // 总热量区间（可以根据你们的目标再微调）
      if (cals >= 1200 && cals <= 2200) {
        score += 20;
        goalDays += 1; // 认为这天“达标”
      } else if (cals >= 900 && cals <= 2500) {
        score += 10;
      } else {
        // 明显过低或过高，扣一点
        score -= 5;
      }

      if (score > 100) score = 100;
      if (score < 0) score = 0;

      return {
        date: ds,
        label: `周${weekLabel}`,
        score,
        scoreWidth: score + '%',
        totalCalories: cals
      };
    });

    const avgTotalCalories =
      validCalorieDays > 0
        ? Math.round(sumTotalCalories / validCalorieDays)
        : null;

    const totalDays = 7;
    const goalRate =
      totalDays > 0 ? Math.round((goalDays / totalDays) * 100) : 0;

    const summary = {
      weightChangeText: '--',      // 目前没有体重数据，先占位
      currentWeight: null,
      avgNetCalories: null,        // 纯饮食，不算净热量
      netCaloriesHint: avgTotalCalories
        ? `本周日均摄入约 ${avgTotalCalories} kcal`
        : '本周饮食记录较少，暂无法估算日均摄入',
      totalDuration: 0,            // 运动数据后面接 healthService / exerciseService
      totalCount: 0,
      goalRate,
      goalDays,
      totalDays,
      avgTotalCalories
    };

    const { highlights, improvements, suggestions } =
      this.buildTextSummary({ summary, dailyScores });

    this.setData({
      summary,
      dailyScores,
      highlights,
      improvements,
      suggestions
    });
  },

  // ====== 根据统计结果生成文案 ======
  buildTextSummary({ summary, dailyScores }) {
    const partsGood = [];
    const partsImprove = [];
    const partsSuggest = [];

    if (summary.goalRate >= 70) {
      partsGood.push(
        `本周有 ${summary.goalDays} 天的整体摄入在目标区间，记录习惯不错，执行度较高。`
      );
    } else if (summary.goalRate >= 40) {
      partsGood.push(
        `本周已有 ${summary.goalDays} 天摄入较为合理，说明你已经开始建立节奏。`
      );
      partsImprove.push(
        `可以尝试将“合理摄入”的天数提高到每周 4~5 天，让节奏更加稳定。`
      );
    } else {
      partsImprove.push(
        `本周摄入明显在合理区间的天数偏少，建议先保证每天都有基本饮食记录。`
      );
    }

    if (summary.avgTotalCalories != null) {
      const c = summary.avgTotalCalories;
      if (c > 2400) {
        partsImprove.push(
          `本周日均摄入约 ${c} kcal，整体偏高，减脂进展可能会比较慢。`
        );
        partsSuggest.push(
          `可以从减少含糖饮料/高油零食开始，优先控制“最容易超量”的部分。`
        );
      } else if (c < 1100) {
        partsImprove.push(
          `本周日均摄入约 ${c} kcal，可能偏低，需要注意营养和能量摄入是否充足。`
        );
        partsSuggest.push(
          `建议保证足够的主食和优质蛋白，避免过度节食带来的疲劳感。`
        );
      } else {
        partsGood.push(
          `日均摄入大致处于合理区间，可以在这个基础上微调结构（蛋白质/蔬菜等比例）。`
        );
      }
    }

    // 目前没有接运动数据，这里用温和的提示
    partsSuggest.push(
      '后续接入运动记录后，周报会同时给出“摄入 - 消耗”的净差分析。'
    );

    const highlightsText =
      partsGood.length > 0
        ? partsGood.join(' ')
        : '本周已经有了记录行为，这是最关键的一步，继续保持，下周我们可以在数据更完整的基础上做更细的分析。';

    const improvementsText =
      partsImprove.length > 0
        ? partsImprove.join(' ')
        : '整体饮食记录情况不错，可以继续保持当前节奏。';

    const suggestionsText =
      partsSuggest.length > 0
        ? partsSuggest.join(' ')
        : '建议继续保持记录习惯，并适当关注蛋白质、蔬菜等营养结构，下周会更容易看出趋势。';

    return {
      highlights: highlightsText,
      improvements: improvementsText,
      suggestions: suggestionsText
    };
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的一周饮食报告',
      path: '/pages/stats/weekly'
    };
  }
});
