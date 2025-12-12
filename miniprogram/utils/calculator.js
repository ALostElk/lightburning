/**
 * 健康计算工具库
 * 包含BMI、BMR、TDEE等各种健康指标计算
 */

/**
 * 计算BMI (身体质量指数)
 * @param {number} weight - 体重(kg)
 * @param {number} height - 身高(cm)
 * @returns {number} BMI值
 */
export const calculateBMI = (weight, height) => {
  if (!weight || !height || height === 0) return 0;
  const h = height / 100; // 转换为米
  return Number((weight / (h * h)).toFixed(1));
};

/**
 * 获取BMI分类
 * @param {number} bmi - BMI值
 * @returns {Object} { category, color, description }
 */
export const getBMICategory = (bmi) => {
  if (bmi < 18.5) {
    return {
      category: '偏瘦',
      color: '#FFB84D',
      description: '建议适当增重'
    };
  } else if (bmi < 24) {
    return {
      category: '正常',
      color: '#51CF66',
      description: '保持现状'
    };
  } else if (bmi < 28) {
    return {
      category: '超重',
      color: '#FFB84D',
      description: '建议控制体重'
    };
  } else {
    return {
      category: '肥胖',
      color: '#FF6B6B',
      description: '建议减重'
    };
  }
};

/**
 * 计算BMR (基础代谢率) - Harris-Benedict公式
 * @param {number} weight - 体重(kg)
 * @param {number} height - 身高(cm)
 * @param {number} age - 年龄
 * @param {string} gender - 性别 'male' | 'female'
 * @returns {number} BMR (kcal/day)
 */
export const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  
  if (gender === 'male') {
    return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
  } else {
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
  }
};

/**
 * 计算TDEE (每日总能量消耗)
 * @param {number} bmr - 基础代谢率
 * @param {number} activityLevel - 活动等级系数
 * @returns {number} TDEE (kcal/day)
 */
export const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr || !activityLevel) return 0;
  return Math.round(bmr * activityLevel);
};

/**
 * 获取活动等级选项
 */
export const getActivityLevels = () => {
  return [
    { value: 1.2, label: '久坐', description: '很少或不运动' },
    { value: 1.375, label: '轻度活动', description: '每周运动1-3天' },
    { value: 1.55, label: '中度活动', description: '每周运动3-5天' },
    { value: 1.725, label: '高度活动', description: '每周运动6-7天' },
    { value: 1.9, label: '极高活动', description: '每天高强度训练' }
  ];
};

/**
 * 计算目标心率区间
 * @param {number} age - 年龄
 * @returns {Object} { fat_burning, cardio, peak }
 */
export const calculateTargetHeartRate = (age) => {
  if (!age || age < 18 || age > 80) return null;
  
  const maxHR = 220 - age;
  
  return {
    fat_burning: {
      min: Math.round(maxHR * 0.5),
      max: Math.round(maxHR * 0.7),
      description: '燃脂区间'
    },
    cardio: {
      min: Math.round(maxHR * 0.7),
      max: Math.round(maxHR * 0.85),
      description: '有氧区间'
    },
    peak: {
      min: Math.round(maxHR * 0.85),
      max: maxHR,
      description: '无氧区间'
    }
  };
};

/**
 * 评估减重计划的健康性
 * @param {number} targetWeightChange - 目标体重变化(kg)
 * @param {number} totalDays - 总天数
 * @returns {Object} { status, color, message }
 */
export const assessPlanHealth = (targetWeightChange, totalDays) => {
  if (!totalDays || totalDays === 0) {
    return { status: 'error', color: '#FF6B6B', message: '天数不能为0' };
  }
  
  const weeklyChange = (targetWeightChange / totalDays) * 7;
  
  if (targetWeightChange < 0) {
    // 减重
    if (weeklyChange < -1) {
      return {
        status: 'danger',
        color: '#FF6B6B',
        message: '减重速度过快，可能影响健康'
      };
    } else if (weeklyChange < -0.5) {
      return {
        status: 'good',
        color: '#51CF66',
        message: '减重速度适中，健康安全'
      };
    } else {
      return {
        status: 'slow',
        color: '#FFB84D',
        message: '减重速度较慢，但更容易坚持'
      };
    }
  } else {
    // 增重
    if (weeklyChange > 1) {
      return {
        status: 'danger',
        color: '#FF6B6B',
        message: '增重速度过快'
      };
    } else if (weeklyChange > 0.5) {
      return {
        status: 'good',
        color: '#51CF66',
        message: '增重速度适中'
      };
    } else {
      return {
        status: 'slow',
        color: '#FFB84D',
        message: '增重速度较慢'
      };
    }
  }
};

/**
 * 计算营养素推荐比例
 * @param {number} tdee - 每日总能量消耗
 * @param {string} goal - 目标 '减脂' | '增肌' | '保持'
 * @returns {Object} { protein, carbs, fat } (克)
 */
export const calculateMacroNutrients = (tdee, goal = '减脂') => {
  if (!tdee) return { protein: 0, carbs: 0, fat: 0 };
  
  let proteinRatio, carbsRatio, fatRatio;
  
  switch (goal) {
    case '减脂':
      proteinRatio = 0.30;  // 30%
      carbsRatio = 0.40;    // 40%
      fatRatio = 0.30;      // 30%
      break;
    case '增肌':
      proteinRatio = 0.30;  // 30%
      carbsRatio = 0.50;    // 50%
      fatRatio = 0.20;      // 20%
      break;
    case '保持':
      proteinRatio = 0.25;  // 25%
      carbsRatio = 0.50;    // 50%
      fatRatio = 0.25;      // 25%
      break;
    default:
      proteinRatio = 0.25;
      carbsRatio = 0.50;
      fatRatio = 0.25;
  }
  
  return {
    protein: Math.round((tdee * proteinRatio) / 4),  // 1g蛋白质 = 4kcal
    carbs: Math.round((tdee * carbsRatio) / 4),      // 1g碳水 = 4kcal
    fat: Math.round((tdee * fatRatio) / 9)           // 1g脂肪 = 9kcal
  };
};

/**
 * 计算水分推荐摄入量
 * @param {number} weight - 体重(kg)
 * @returns {number} 推荐水分摄入量(ml)
 */
export const calculateWaterIntake = (weight) => {
  if (!weight) return 2000;
  return Math.round(weight * 30); // 每kg体重30ml
};

/**
 * 验证输入数据
 */
export const validateInput = {
  age: (age) => {
    const num = Number(age);
    return num >= 18 && num <= 80;
  },
  
  height: (height) => {
    const num = Number(height);
    return num >= 100 && num <= 250;
  },
  
  weight: (weight) => {
    const num = Number(weight);
    return num >= 30 && num <= 200;
  },
  
  targetWeight: (targetWeight, currentWeight) => {
    const num = Number(targetWeight);
    const diff = Math.abs(num - currentWeight);
    return num >= 30 && num <= 200 && diff <= 50;
  }
};

