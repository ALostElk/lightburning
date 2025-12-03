**我与评委站一队**
---
**组长: 王岩方**
---
**组员: 王岩方、李姝雯、李凯迪、邢沛蕾、彭绎陶、王燃**
---

# 轻燃健康管理系统

> 简化版 - 适合课程使用的小型健康管理小程序

---

## 项目结构

```
lightburning/
├── cloudfunctions/              # 云函数（后端）
│   ├── healthService/          ⭐ 核心功能：用户、计划、评价、运动
│   ├── dietService/            ⭐ 饮食功能：食物识别、记录
│   ├── qwenAI/                 ⭐ AI分析与推荐
│   └── foodRecognitionQwen/     图片识别
│
├── miniprogram/                 # 小程序前端
│   ├── pages/                   # 页面
│   │   ├── home/                主页
│   │   ├── recipe-recommend/    食谱推荐
│   │   ├── recipe-detail/       食谱详情
│   │   └── ai-suggestion/       AI建议
│   │
│   └── utils/                   # 工具类
│       ├── api.js               API封装
│       ├── recipeEngine.js      食谱推荐引擎
│       └── qwenService.js       AI服务
│
├── exercise_db.json             # 运动数据库
└── README_SIMPLE.md             # 本文档
```

---

## 核心功能

### 1. healthService 云函数

整合了用户管理、计划管理、评价算法、运动推荐的核心功能。

**API列表**：

#### 用户信息管理
```javascript
// 更新用户信息
wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'updateProfile',
    payload: {
      gender: 'male',      // 'male' | 'female'
      age: 25,
      height: 175,         // cm
      weight: 70,          // kg
      goal: '减脂',         // '减脂' | '保持体重' | '增肌'
      targetWeight: 65,    // kg
      activityLevel: 1.375 // 1.2-1.9
    }
  }
})

// 获取用户信息
wx.cloud.callFunction({
  name: 'healthService',
  data: { action: 'getProfile' }
})
```

#### 计划管理
```javascript
// 生成减重计划
wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'generatePlan',
    payload: {
      targetWeightChange: -5,  // 减重5kg（负数表示减重）
      totalDays: 90            // 90天内完成
    }
  }
})

// 动态调整计划
wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'adjustPlan',
    payload: {
      date: '2025-12-02',
      actualDeficit: -300      // 今天实际热量差
    }
  }
})
```

#### 每日评价
```javascript
// 评价今日表现（自动分析饮食和运动记录）
wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'evaluate',
    payload: {
      date: '2025-12-02'  // 可选，默认今天
    }
  }
})
// 返回：热量差、红绿灯状态、营养评分、建议
```

#### 运动推荐
```javascript
// 获取运动推荐
wx.cloud.callFunction({
  name: 'healthService',
  data: { action: 'recommendExercise' }
})

// 记录运动
wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'logExercise',
    payload: {
      name: '慢跑',
      duration: 30,    // 分钟
      calories: 300,   // 消耗热量
      date: '2025-12-02'
    }
  }
})
```

### 2. dietService 云函数

食物识别与饮食记录（已完整实现，保持不变）。

**API列表**：
- `searchFood` - 搜索食物（三层搜索：本地→AI→API）
- `recognizeAndSearch` - 拍照识别食物
- `addDietLog` - 添加饮食记录
- `getDietLogs` - 获取饮食记录
- `addCustomDish` - 添加自定义菜品
- `getUserDishes` - 获取用户菜品

详细说明见 `cloudfunctions/dietService/index.js` 代码注释。

### 3. qwenAI 云函数

AI分析与推荐（已完整实现，保持不变）。

**API列表**：
- `analyzeAndRecommend` - 分析饮食习惯并生成建议
- `generateRecipeReason` - 生成食谱推荐理由

---

## 核心算法

### BMR计算（Harris-Benedict公式）
```
男性：BMR = 88.362 + (13.397 × 体重) + (4.799 × 身高) - (5.677 × 年龄)
女性：BMR = 447.593 + (9.247 × 体重) + (3.098 × 身高) - (4.330 × 年龄)
```

### TDEE计算
```
TDEE = BMR × 活动系数
活动系数：1.2(久坐) | 1.375(轻度) | 1.55(中度) | 1.725(高度) | 1.9(极高)
```

### 热量差计算
```
每日热量差 = (TDEE + 运动消耗) - 饮食摄入
1kg脂肪 ≈ 7700kcal
```

### 红绿灯系统
```
差异 ≤ 100kcal  → 绿色（完美）
差异 ≤ 300kcal  → 黄色（接近）
差异 > 300kcal  → 红色（需调整）
```

### 营养评分（0-100分）
- 蛋白质评分（40分）：建议占总热量25%
- 碳水评分（35分）：建议占总热量50%
- 脂肪评分（25分）：建议占总热量25%

---

## 数据库集合

| 集合名 | 说明 | 主要字段 |
|--------|------|---------|
| `UserProfiles` | 用户信息 | gender, age, height, weight, bmr, tdee |
| `Plans` | 减重计划 | targetWeightChange, totalDays, dailyDeficit |
| `DietLog` | 饮食记录 | name, calories, protein, carbs, fat |
| `ExerciseLog` | 运动记录 | name, duration, calories |
| `DailyEvaluations` | 每日评价 | actualDeficit, trafficLight, nutritionScore |
| `FoodDB` | 食物数据库 | name, calories, protein, carbs, fat |
| `UserDishes` | 用户自定义菜品 | name, ingredients, calories |

---

## 快速开始

### 1. 安装依赖
```bash
cd cloudfunctions/healthService && npm install
cd ../dietService && npm install
cd ../qwenAI && npm install
```

### 2. 部署云函数
在微信开发者工具中：
- 右键点击云函数文件夹
- 选择"上传并部署：云端安装依赖"

### 3. 创建数据库集合
在云开发控制台创建以下集合：
- UserProfiles
- Plans
- DietLog
- ExerciseLog
- DailyEvaluations
- FoodDB
- UserDishes

### 4. 初始化食物数据
```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: { action: 'initBuiltinFoods' }
})
```

---

## 使用示例

### 完整流程示例

```javascript
// 1. 用户填写信息
await wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'updateProfile',
    payload: {
      gender: 'male',
      age: 25,
      height: 175,
      weight: 70,
      goal: '减脂',
      targetWeight: 65,
      activityLevel: 1.375
    }
  }
});

// 2. 生成减重计划
const planRes = await wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'generatePlan',
    payload: {
      targetWeightChange: -5,
      totalDays: 90
    }
  }
});
console.log('每日建议摄入:', planRes.result.data.dailyCalorieGoal);

// 3. 记录饮食
await wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'addDietLog',
    payload: {
      name: '鸡胸肉',
      grams: 150,
      calories: 200,
      protein: 46,
      carbs: 0,
      fat: 5,
      mealType: 'lunch'
    }
  }
});

// 4. 记录运动
await wx.cloud.callFunction({
  name: 'healthService',
  data: {
    action: 'logExercise',
    payload: {
      name: '慢跑',
      duration: 30,
      calories: 300
    }
  }
});

// 5. 查看每日评价
const evalRes = await wx.cloud.callFunction({
  name: 'healthService',
  data: { action: 'evaluate' }
});
console.log('红绿灯:', evalRes.result.data.trafficLight.status);
console.log('营养评分:', evalRes.result.data.nutritionScore);
console.log('建议:', evalRes.result.data.suggestions);
```

---

## 项目特点

✅ **简化架构**：只有3个核心云函数，易于维护  
✅ **功能整合**：相关功能集成在一起，减少云函数调用  
✅ **代码清晰**：每个函数都有详细注释  
✅ **易于扩展**：模块化设计，方便添加新功能  
✅ **适合教学**：代码量适中，逻辑清晰，适合学习

---

## 技术栈

- **前端**：微信小程序原生框架
- **后端**：微信云开发 + Node.js云函数
- **数据库**：云数据库（MongoDB）
- **AI**：阿里云通义千问

---

## 版本说明

- **v2.0** (2025-12-02): 简化整合版
  - 合并核心功能到 healthService
  - 保留已完成的 dietService 和 qwenAI
  - 删除冗余的Java后端代码
  - 简化项目结构

---

## 许可证

MIT License

---

**项目状态**：✅ 可用于课程教学和演示

