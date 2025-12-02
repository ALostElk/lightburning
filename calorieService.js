/**
 * Calorie calculation and scoring module
 * 提供 BMR、TDEE、热量差、营养评分、食物多样性、综合得分、红绿灯与进度条计算
 */

function calculateBMR({ weight, height, age, gender }) {
  weight = Number(weight) || 0;
  height = Number(height) || 0;
  age = Number(age) || 0;
  gender = (gender || 'female');

  if (weight <= 0 || height <= 0 || age <= 0) return 0;

  let bmr = 0;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return Math.round(bmr);
}

function calculateTDEE(bmr, activityLevel = 1.55) {
  activityLevel = Number(activityLevel) || 1.55;
  return Math.round(bmr * activityLevel);
}

function calculateCalorieDifference({ profile = {}, exerciseCalories = 0, dietCalories = 0 }) {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  exerciseCalories = Number(exerciseCalories) || 0;
  dietCalories = Number(dietCalories) || 0;

  const totalConsume = tdee + exerciseCalories;
  const deficit = totalConsume - dietCalories;

  return {
    bmr,
    tdee,
    exerciseCalories,
    totalConsume,
    dietCalories,
    deficit: Math.round(deficit)
  };
}

function getTrafficLightStatus(deficit) {
  let color, status, description;

  if (deficit >= -500 && deficit <= 0) {
    color = '#51cf66';
    status = 'green';
    description = '热量赤字在健康范围';
  } else if (deficit > 0 && deficit <= 300) {
    color = '#ffd43b';
    status = 'yellow';
    description = '轻度盈余，建议增加运动或减少摄入';
  } else if (deficit > 300 && deficit <= 800) {
    color = '#ff922b';
    status = 'yellow';
    description = '中度盈余，建议调整计划';
  } else if (deficit > 800) {
    color = '#ff6b6b';
    status = 'red';
    description = '过度盈余，容易增脂';
  } else if (deficit < -500 && deficit >= -800) {
    color = '#ffd43b';
    status = 'yellow';
    description = '赤字偏大，注意营养';
  } else if (deficit < -800 && deficit >= -1200) {
    color = '#ff922b';
    status = 'yellow';
    description = '中度赤字，注意恢复';
  } else {
    color = '#ff6b6b';
    status = 'red';
    description = '过度赤字，风险较高';
  }

  return { color, status, description };
}

function calculateNutritionScore({ protein = 0, carbs = 0, fat = 0 }) {
  protein = Number(protein) || 0;
  carbs = Number(carbs) || 0;
  fat = Number(fat) || 0;

  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const totalCal = proteinCal + carbsCal + fatCal;

  if (totalCal === 0) return { score: 0, protein: { grams: protein, percent: 0 }, carbs: { grams: carbs, percent: 0 }, fat: { grams: fat, percent: 0 } };

  const proteinPercent = (proteinCal / totalCal) * 100;
  const carbsPercent = (carbsCal / totalCal) * 100;
  const fatPercent = (fatCal / totalCal) * 100;

  let score = 100;
  const proteinIdeal = 25;
  const proteinDeviation = Math.abs(proteinPercent - proteinIdeal);
  score -= Math.max(0, proteinDeviation - 5) * 1.5;

  const carbsIdeal = 55;
  const carbsDeviation = Math.abs(carbsPercent - carbsIdeal);
  score -= Math.max(0, carbsDeviation - 10) * 0.8;

  const fatIdeal = 25;
  const fatDeviation = Math.abs(fatPercent - fatIdeal);
  score -= Math.max(0, fatDeviation - 7) * 1.2;

  score = Math.max(0, Math.round(score));

  return {
    score,
    protein: { grams: protein, percent: Number(proteinPercent.toFixed(1)) },
    carbs: { grams: carbs, percent: Number(carbsPercent.toFixed(1)) },
    fat: { grams: fat, percent: Number(fatPercent.toFixed(1)) }
  };
}

function calculateDiversityScore(selectedFoods = []) {
  const count = Array.isArray(selectedFoods) ? selectedFoods.length : 0;
  const total = 6;
  const scoreMap = { 0: 0, 1: 20, 2: 40, 3: 60, 4: 75, 5: 90, 6: 100 };
  const score = scoreMap[Math.min(count, total)] || 0;
  return { score, count, total, foods: selectedFoods };
}

function calculateFinalScore(calorieData, nutritionData, diversityData) {
  const deficit = calorieData.deficit;
  let deficitScore = 0;
  if (deficit >= -500 && deficit <= 0) deficitScore = 100;
  else if (Math.abs(deficit) <= 300) deficitScore = 90;
  else if (Math.abs(deficit) <= 600) deficitScore = 75;
  else if (Math.abs(deficit) <= 1000) deficitScore = 50;
  else deficitScore = Math.max(20, 80 - Math.abs(deficit) / 100);

  const nutritionScore = nutritionData.score;
  const diversityScore = diversityData.score;

  const final = Math.round(deficitScore * 0.4 + nutritionScore * 0.35 + diversityScore * 0.25);
  return { final: Math.min(100, final), deficit: Math.round(deficitScore), nutrition: Math.round(nutritionScore), diversity: Math.round(diversityScore) };
}

function generateSuggestions(calorieData, nutritionData, diversityData, finalScores) {
  const suggestions = [];
  if (calorieData.deficit > 300) suggestions.push('热量摄入偏多，建议加强运动或减少饮食');
  else if (calorieData.deficit < -600) suggestions.push('热量赤字过大，建议适当增加摄入以保护肌肉');
  else if (calorieData.deficit >= -500 && calorieData.deficit <= 0) suggestions.push('热量差控制良好，保持当前计划');

  if (nutritionData.protein.percent < 20) suggestions.push('蛋白质摄入偏低，考虑增加优质蛋白');
  if (nutritionData.carbs.percent < 40) suggestions.push('碳水摄入偏低，注意能量补给');
  if (nutritionData.fat.percent < 15) suggestions.push('脂肪偏低，适量增加健康脂肪');

  if (diversityData.count < 3) suggestions.push('食物种类单一，建议多样化');
  if (finalScores.final >= 85) suggestions.push('今日表现很好，继续保持');
  if (finalScores.final < 60) suggestions.push('综合评分偏低，建议调整计划并持续监控');

  return suggestions;
}

function computeWeeklyProgressFromArray(deficitArray = []) {
  // deficitArray 期望为过去7天的每日热量差（可正/负），返回累计与进度百分比
  const total = deficitArray.reduce((s, v) => s + (Number(v) || 0), 0);
  const targetMax = 7000;
  const progress = Math.min(100, Math.max(0, (total / targetMax) * 100));
  return { total: Math.round(total), targetMax, progress: Number(progress.toFixed(1)) };
}

module.exports = {
  calculateBMR,
  calculateTDEE,
  calculateCalorieDifference,
  getTrafficLightStatus,
  calculateNutritionScore,
  calculateDiversityScore,
  calculateFinalScore,
  generateSuggestions,
  computeWeeklyProgressFromArray
};
