# 后端 API 使用说明（热量差评分）

此后端只包含热量差计算与评分逻辑，不包含任何前端代码。

运行：

```powershell
cd "d:\2025-2026-1\软件工程\团队\减脂小程序"
npm install
npm start
```

默认监听 `http://localhost:3000`。

示例请求：

POST /api/score
Content-Type: application/json

请求体示例：

```json
{
  "profile": { "weight":70, "height":175, "age":30, "gender":"male", "activityLevel":1.55 },
  "exerciseCalories": 300,
  "dietCalories": 2000,
  "protein": 80,
  "carbs": 200,
  "fat": 60,
  "selectedFoods": ["蔬菜","水果","肉类"],
  "weeklyDeficits": [-400, -500, -450, -300, -600, -200, -350]
}
```

响应示例（简要）：

```json
{
  "calorieData": { "bmr":..., "tdee":..., "deficit":... },
  "trafficLight": { "color":"#51cf66", "status":"green", "description":"..." },
  "nutritionData": { "score":..., "protein":{...}, ... },
  "diversityData": { "score":..., "count":..., "total":6 },
  "finalScores": { "final":..., "deficit":..., "nutrition":..., "diversity":... },
  "suggestions": ["..."],
  "weeklyProgress": { "total":..., "targetMax":7000, "progress":... }
}
```

说明：
- 热量差计算核心为 (TDEE + 运动消耗) - 饮食摄入。
- 红绿灯系统与前端保持一致：返回 `color` / `status` / `description`。
- 如果不提供 `weeklyDeficits`，`weeklyProgress` 字段将为 `null`。
