const express = require('express');
const cors = require('cors');
const {
  calculateCalorieDifference,
  getTrafficLightStatus,
  calculateNutritionScore,
  calculateDiversityScore,
  calculateFinalScore,
  generateSuggestions,
  computeWeeklyProgressFromArray
} = require('./calorieService');

const app = express();
app.use(cors());
app.use(express.json());

// POST /api/score
// 接收：{ profile, exerciseCalories, dietCalories, protein, carbs, fat, selectedFoods, weeklyDeficits }
app.post('/api/score', (req, res) => {
  try {
    const body = req.body || {};
    const profile = body.profile || {};
    const exerciseCalories = body.exerciseCalories || 0;
    const dietCalories = body.dietCalories || 0;
    const protein = body.protein || 0;
    const carbs = body.carbs || 0;
    const fat = body.fat || 0;
    const selectedFoods = body.selectedFoods || [];
    const weeklyDeficits = Array.isArray(body.weeklyDeficits) ? body.weeklyDeficits : undefined;

    const calorieData = calculateCalorieDifference({ profile, exerciseCalories, dietCalories });
    const trafficLight = getTrafficLightStatus(calorieData.deficit);
    const nutritionData = calculateNutritionScore({ protein, carbs, fat });
    const diversityData = calculateDiversityScore(selectedFoods);
    const finalScores = calculateFinalScore(calorieData, nutritionData, diversityData);
    const suggestions = generateSuggestions(calorieData, nutritionData, diversityData, finalScores);
    const weeklyProgress = weeklyDeficits ? computeWeeklyProgressFromArray(weeklyDeficits) : null;

    res.json({
      calorieData,
      trafficLight,
      nutritionData,
      diversityData,
      finalScores,
      suggestions,
      weeklyProgress
    });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Calorie backend listening on port ${PORT}`);
});
