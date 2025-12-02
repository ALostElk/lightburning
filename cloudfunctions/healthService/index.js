/**
 * healthService - 健康管理核心云函数
 * 
 * 整合功能：
 * 1. 用户信息管理（个人资料、BMR/TDEE计算）
 * 2. 热量计划管理（生成计划、动态调整）
 * 3. 每日评价（热量差、营养评分、红绿灯系统）
 * 4. 运动推荐
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ==================== 工具函数 ====================
function ok(data) { return { success: true, data }; }
function fail(error) { return { success: false, error: String(error) }; }
function todayString() {
  const d = new Date();
  d.setHours(d.getHours() + 8);
  return d.toISOString().slice(0, 10);
}

// ==================== BMR/TDEE计算 ====================

/**
 * 计算基础代谢率 (Harris-Benedict公式)
 */
function calculateBMR(weight, height, age, gender) {
  if (gender === 'male') {
    return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
  } else {
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
  }
}

/**
 * 计算每日总能量消耗
 */
function calculateTDEE(bmr, activityLevel) {
  return Math.round(bmr * activityLevel);
}

/**
 * 计算BMI
 */
function calculateBMI(weight, height) {
  const h = height / 100;
  return Number((weight / (h * h)).toFixed(1));
}

// ==================== 用户信息管理 ====================

/**
 * 更新用户信息
 */
async function updateUserProfile(openid, data) {
  const profile = {
    _openid: openid,
    gender: data.gender || 'male',
    age: Number(data.age) || 25,
    height: Number(data.height) || 170,
    weight: Number(data.weight) || 70,
    goal: data.goal || '减脂',
    targetWeight: data.targetWeight ? Number(data.targetWeight) : null,
    activityLevel: Number(data.activityLevel) || 1.375,
    updatedAt: Date.now()
  };

  // 自动计算
  profile.bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  profile.tdee = calculateTDEE(profile.bmr, profile.activityLevel);
  profile.bmi = calculateBMI(profile.weight, profile.height);

  // 查询是否已存在
  const existing = await db.collection('UserProfiles')
    .where({ _openid: openid })
    .get();

  if (existing.data.length > 0) {
    await db.collection('UserProfiles')
      .where({ _openid: openid })
      .update({ data: profile });
  } else {
    profile.createdAt = Date.now();
    await db.collection('UserProfiles').add({ data: profile });
  }

  return profile;
}

/**
 * 获取用户信息
 */
async function getUserProfile(openid) {
  const res = await db.collection('UserProfiles')
    .where({ _openid: openid })
    .get();
  return res.data[0] || null;
}

// ==================== 热量计划 ====================

/**
 * 生成减重计划
 */
async function generatePlan(openid, targetWeightChange, totalDays) {
  const profile = await getUserProfile(openid);
  if (!profile) throw new Error('请先完善个人信息');

  // 1kg脂肪 ≈ 7700kcal
  const totalDeficit = targetWeightChange * 7700;
  const dailyDeficit = Math.round(totalDeficit / totalDays);

  const plan = {
    _openid: openid,
    targetWeightChange,
    totalDays,
    totalDeficit,
    dailyDeficit,
    dailyCalorieGoal: profile.tdee + dailyDeficit,
    startDate: todayString(),
    createdAt: Date.now()
  };

  await db.collection('Plans').add({ data: plan });
  return plan;
}

/**
 * 动态调整计划
 */
async function adjustPlan(openid, date, actualDeficit) {
  const profile = await getUserProfile(openid);
  if (!profile) throw new Error('请先完善个人信息');

  // 获取当前计划
  const planRes = await db.collection('Plans')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (planRes.data.length === 0) {
    throw new Error('未找到活动计划');
  }

  const plan = planRes.data[0];
  const gap = plan.dailyDeficit - actualDeficit;

  // 计算建议调整
  const adjustment = Math.round(gap * 1.2); // 下次多减120%的差额

  return {
    gap,
    adjustment,
    nextDayGoal: profile.tdee + plan.dailyDeficit + adjustment
  };
}

// ==================== 每日评价 ====================

/**
 * 生成红绿灯评价
 */
function generateTrafficLight(deficit, targetDeficit) {
  const diff = Math.abs(deficit - targetDeficit);
  
  if (diff <= 100) {
    return { color: '#51CF66', status: 'green', description: '热量差完美，继续保持！' };
  } else if (diff <= 300) {
    return { color: '#FFB84D', status: 'yellow', description: '接近目标，稍作调整' };
  } else {
    return { color: '#FF6B6B', status: 'red', description: '偏离目标，需要调整' };
  }
}

/**
 * 计算营养评分
 */
function calculateNutritionScore(protein, carbs, fat, tdee) {
  let score = 0;

  // 蛋白质评分 (建议：1.2-2g/kg体重)
  const proteinTarget = tdee * 0.25 / 4; // 25%能量来自蛋白质，4kcal/g
  const proteinRatio = protein / proteinTarget;
  if (proteinRatio >= 0.8 && proteinRatio <= 1.2) score += 40;
  else if (proteinRatio >= 0.6 && proteinRatio <= 1.5) score += 25;
  else score += 10;

  // 碳水评分 (建议：45-65%能量)
  const carbsTarget = tdee * 0.5 / 4;
  const carbsRatio = carbs / carbsTarget;
  if (carbsRatio >= 0.8 && carbsRatio <= 1.2) score += 35;
  else if (carbsRatio >= 0.6 && carbsRatio <= 1.4) score += 20;
  else score += 10;

  // 脂肪评分 (建议：20-35%能量)
  const fatTarget = tdee * 0.25 / 9;
  const fatRatio = fat / fatTarget;
  if (fatRatio >= 0.8 && fatRatio <= 1.2) score += 25;
  else if (fatRatio >= 0.6 && fatRatio <= 1.4) score += 15;
  else score += 5;

  return Math.round(score);
}

/**
 * 评价每日表现
 */
async function evaluateDaily(openid, date) {
  date = date || todayString();

  // 获取用户信息和计划
  const profile = await getUserProfile(openid);
  if (!profile) throw new Error('请先完善个人信息');

  const planRes = await db.collection('Plans')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const targetDeficit = planRes.data[0]?.dailyDeficit || -500;

  // 获取当日饮食记录（从dietService）
  const dietRes = await db.collection('DietLog')
    .where({ _openid: openid, recordDate: date })
    .get();

  const dietLogs = dietRes.data || [];
  const dietCalories = dietLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const protein = dietLogs.reduce((sum, log) => sum + (log.protein || 0), 0);
  const carbs = dietLogs.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const fat = dietLogs.reduce((sum, log) => sum + (log.fat || 0), 0);

  // 获取当日运动记录
  const exerciseRes = await db.collection('ExerciseLog')
    .where({ _openid: openid, date })
    .get();

  const exerciseCalories = (exerciseRes.data || [])
    .reduce((sum, log) => sum + (log.calories || 0), 0);

  // 计算实际热量差
  const actualDeficit = (profile.tdee + exerciseCalories) - dietCalories;

  // 生成评价
  const trafficLight = generateTrafficLight(actualDeficit, targetDeficit);
  const nutritionScore = calculateNutritionScore(protein, carbs, fat, profile.tdee);

  // 生成建议
  const suggestions = [];
  if (actualDeficit > targetDeficit + 200) {
    suggestions.push('热量缺口过大，可适当增加主食摄入');
  } else if (actualDeficit < targetDeficit - 200) {
    suggestions.push('热量缺口不足，建议增加运动或减少饮食');
  }
  if (protein < profile.tdee * 0.2 / 4) {
    suggestions.push('蛋白质摄入不足，多吃鸡胸肉、鱼肉、豆制品');
  }
  if (nutritionScore < 60) {
    suggestions.push('营养不够均衡，注意三大营养素比例');
  }

  const evaluation = {
    _openid: openid,
    date,
    tdee: profile.tdee,
    dietCalories,
    exerciseCalories,
    actualDeficit,
    targetDeficit,
    trafficLight,
    nutrition: { protein, carbs, fat },
    nutritionScore,
    suggestions,
    createdAt: Date.now()
  };

  // 保存评价
  await db.collection('DailyEvaluations').add({ data: evaluation });

  return evaluation;
}

// ==================== 运动推荐 ====================

/**
 * 推荐运动
 */
async function recommendExercise(openid) {
  const profile = await getUserProfile(openid);
  if (!profile) throw new Error('请先完善个人信息');

  // 获取当前计划
  const planRes = await db.collection('Plans')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const targetDeficit = planRes.data[0]?.dailyDeficit || -500;

  // 获取今日饮食
  const dietRes = await db.collection('DietLog')
    .where({ _openid: openid, recordDate: todayString() })
    .get();

  const dietCalories = (dietRes.data || [])
    .reduce((sum, log) => sum + (log.calories || 0), 0);

  // 计算需要的运动消耗
  const neededCalories = Math.max(0, profile.tdee + targetDeficit - dietCalories);

  // 从运动库推荐
  const exercises = [
    { id: 'walk', name: '快走30分钟', calories: 150, duration: 30 },
    { id: 'jog', name: '慢跑30分钟', calories: 300, duration: 30 },
    { id: 'hiit', name: 'HIIT训练20分钟', calories: 250, duration: 20 },
    { id: 'swim', name: '游泳30分钟', calories: 350, duration: 30 },
    { id: 'bike', name: '骑车40分钟', calories: 280, duration: 40 }
  ];

  // 筛选适合的运动
  const recommended = exercises
    .filter(ex => Math.abs(ex.calories - neededCalories) < 150)
    .slice(0, 3);

  return {
    neededCalories,
    recommended: recommended.length > 0 ? recommended : [exercises[0]]
  };
}

/**
 * 记录运动
 */
async function logExercise(openid, data) {
  const log = {
    _openid: openid,
    name: data.name,
    duration: Number(data.duration),
    calories: Number(data.calories),
    date: data.date || todayString(),
    createdAt: Date.now()
  };

  await db.collection('ExerciseLog').add({ data: log });
  return log;
}

// ==================== 主入口 ====================

exports.main = async (event) => {
  const { action, payload = {} } = event || {};
  const { OPENID } = cloud.getWXContext();

  try {
    switch (action) {
      // 用户信息
      case 'updateProfile':
        return ok(await updateUserProfile(OPENID, payload));
      case 'getProfile':
        return ok(await getUserProfile(OPENID));

      // 计划管理
      case 'generatePlan':
        return ok(await generatePlan(OPENID, payload.targetWeightChange, payload.totalDays));
      case 'adjustPlan':
        return ok(await adjustPlan(OPENID, payload.date, payload.actualDeficit));

      // 每日评价
      case 'evaluate':
        return ok(await evaluateDaily(OPENID, payload.date));

      // 运动
      case 'recommendExercise':
        return ok(await recommendExercise(OPENID));
      case 'logExercise':
        return ok(await logExercise(OPENID, payload));

      default:
        return fail(`未知操作: ${action}`);
    }
  } catch (error) {
    return fail(error.message || error);
  }
};

