# Utils 工具模块说明

本目录包含所有工具函数和服务模块，用于支持小程序的核心功能。

---

## 📂 文件结构

```
utils/
├── cloudApi.js         # 云函数统一调用接口 ⭐
├── calculator.js       # 健康计算工具库
├── recipeEngine.js     # 食谱推荐引擎（本地）
└── recipeData.js       # 食谱数据
```

---

## 🌟 核心模块

### cloudApi.js - 云函数统一接口

**作用**：统一管理所有云函数调用，提供一致的API接口。

**使用方法**：

```javascript
import * as api from '../../utils/cloudApi.js';

// 获取用户信息
const res = await api.getProfile();

// 添加饮食记录
await api.addDietLog({ foodName: '鸡胸肉', calories: 200, ... });

// 生成计划
await api.generatePlan(-5, 90);
```

**包含的服务**：
- HealthService（健康服务）
- DietService（饮食服务）
- QwenAI（AI服务）
- 食谱推荐相关接口

**详细文档**：请查看根目录的 `接口整合文档.md`

---

### calculator.js - 健康计算工具

**作用**：提供各种健康指标的计算和验证功能。

**主要功能**：

```javascript
import * as calc from '../../utils/calculator.js';

// 计算 BMI
const bmi = calc.calculateBMI(70, 170);

// 计算 BMR（基础代谢率）
const bmr = calc.calculateBMR(70, 170, 25, 'male');

// 计算 TDEE（总消耗）
const tdee = calc.calculateTDEE(bmr, 1.375);

// 计算营养素推荐
const macros = calc.calculateMacroNutrients(tdee, '减脂');

// 输入验证
const isValid = calc.validateInput.age(25);
```

**适用场景**：
- 个人信息页面的实时计算
- 计划生成页面的可行性评估
- 任何需要健康指标计算的地方

---

### recipeEngine.js - 食谱推荐引擎

**作用**：本地食谱推荐算法，协调云端数据和本地计算。

**注意**：已优化为统一通过 `cloudApi.js` 调用云函数。

**使用方法**：

```javascript
const { RecipeRecommendEngine } = require('../../utils/recipeEngine.js');

const engine = new RecipeRecommendEngine();

// 分析营养缺口
const gap = engine.analyzeNutritionGap(7);

// 生成AI建议
const suggestions = await engine.generateAISuggestion(gap);

// 获取推荐食谱
const recipes = engine.getRecommendedRecipes({ type: 'ai', limit: 6 });

// 为食谱生成推荐理由
const reason = await engine.generateRecipeReason(recipe);
```

**适用场景**：
- AI建议页面
- 食谱推荐页面

---

### recipeData.js - 食谱数据

**作用**：提供本地食谱数据和模拟数据生成。

**使用方法**：

```javascript
const { recipes, generateMockDietRecords } = require('../../utils/recipeData.js');

// 获取所有食谱
const allRecipes = recipes;

// 生成模拟数据（仅用于开发测试）
const mockRecords = generateMockDietRecords();
```

---

## 🎯 使用原则

### 1. 接口调用 - 必须通过 cloudApi.js

❌ **错误做法**：

```javascript
// 不要直接调用云函数
wx.cloud.callFunction({
  name: 'healthService',
  data: { action: 'getProfile' }
})
```

✅ **正确做法**：

```javascript
// 使用 cloudApi.js 提供的接口
import * as api from '../../utils/cloudApi.js';
await api.getProfile();
```

---

### 2. 健康计算 - 使用 calculator.js

❌ **错误做法**：

```javascript
// 不要在页面中直接写计算公式
const bmi = (weight / (height/100) ** 2);
```

✅ **正确做法**：

```javascript
import * as calc from '../../utils/calculator.js';
const bmi = calc.calculateBMI(weight, height);
```

---

### 3. 错误处理 - 统一使用 handleError

❌ **错误做法**：

```javascript
catch (error) {
  console.error(error);
  wx.showToast({ title: '操作失败', icon: 'none' });
}
```

✅ **正确做法**：

```javascript
import * as api from '../../utils/cloudApi.js';

catch (error) {
  api.handleError(error, '操作失败');
}
```

---

### 4. 成功提示 - 统一使用 showSuccess

❌ **错误做法**：

```javascript
wx.showToast({ title: '保存成功', icon: 'success' });
```

✅ **正确做法**：

```javascript
import * as api from '../../utils/cloudApi.js';
api.showSuccess('保存成功');
```

---

## 📋 快速参考

### 常用接口速查

| 功能 | 接口 | 示例 |
|------|------|------|
| 获取用户信息 | `api.getProfile()` | `const res = await api.getProfile()` |
| 更新用户信息 | `api.updateProfile(data)` | `await api.updateProfile({ age: 25 })` |
| 获取饮食记录 | `api.getDietLogs(date)` | `await api.getDietLogs('2025-12-09')` |
| 添加饮食记录 | `api.addDietLog(record)` | `await api.addDietLog({ foodName: '鸡胸肉', ... })` |
| 搜索食物 | `api.searchFood(keyword)` | `await api.searchFood('鸡胸肉')` |
| 拍照识别 | `api.recognizeFood(input)` | `await api.recognizeFood({ fileID: 'xxx' })` |
| 记录运动 | `api.logExercise(data)` | `await api.logExercise({ name: '慢跑', ... })` |
| 每日评价 | `api.evaluateDaily(date)` | `await api.evaluateDaily()` |
| AI分析 | `api.analyzeAndRecommend(...)` | `await api.analyzeAndRecommend(user, diet, gap)` |

### 常用计算函数速查

| 功能 | 函数 | 示例 |
|------|------|------|
| 计算BMI | `calc.calculateBMI(w, h)` | `const bmi = calc.calculateBMI(70, 170)` |
| 计算BMR | `calc.calculateBMR(w, h, a, g)` | `const bmr = calc.calculateBMR(70, 170, 25, 'male')` |
| 计算TDEE | `calc.calculateTDEE(bmr, level)` | `const tdee = calc.calculateTDEE(1500, 1.375)` |
| 验证年龄 | `calc.validateInput.age(age)` | `if (calc.validateInput.age(25))` |
| 验证身高 | `calc.validateInput.height(h)` | `if (calc.validateInput.height(170))` |
| 验证体重 | `calc.validateInput.weight(w)` | `if (calc.validateInput.weight(70))` |

---

## 🔗 相关文档

- 📖 [完整接口文档](../../接口整合文档.md) - 所有接口的详细说明
- 📝 [重构说明](../../重构说明.md) - 代码重构的背景和原则
- 📋 [功能设计](../../前端功能设计与任务分组.md) - 前端功能详细设计

---

## ⚠️ 重要提示

1. **安全性**：
   - 不要在前端代码中直接使用 API Key
   - 所有 AI 调用必须通过云函数进行
   - `qwenService.js` 已从前端移除，只应在云函数中使用

2. **一致性**：
   - 统一使用 `cloudApi.js` 进行接口调用
   - 统一使用 `calculator.js` 进行计算
   - 保持代码风格一致

3. **可维护性**：
   - 新增接口先在 `cloudApi.js` 中定义
   - 新增计算先在 `calculator.js` 中实现
   - 保持职责清晰，避免耦合

---

**最后更新**：2025-12-09

