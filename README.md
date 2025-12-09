# 轻燃 - 健康管理小程序

一个基于微信小程序云开发的智能健康管理系统，整合AI食物识别、个性化计划生成、营养分析等功能。

> ⚠️ **重要更新**（2025-12-09）：已完成接口整合优化，统一使用 `cloudApi.js` 调用云函数，移除了前端的 API Key 暴露风险。详见 [接口整合文档.md](接口整合文档.md)

## 项目结构

```
lightburning/
├── cloudfunctions/          # 云函数
│   ├── healthService/       # 健康管理服务（用户信息、计划、评价、运动）
│   ├── dietService/         # 饮食管理服务（食物搜索、识别、记录）
│   ├── qwenAI/             # AI建议生成
│   └── foodRecognitionQwen/ # 食物图片识别
│
├── miniprogram/            # 小程序前端
│   ├── pages/             # 页面
│   │   ├── home/         # 首页
│   │   ├── profile/      # 个人信息
│   │   ├── plan/         # 计划管理
│   │   ├── diet/         # 饮食管理
│   │   ├── exercise/     # 运动管理
│   │   ├── report/       # 每日评价
│   │   ├── stats/        # 数据统计
│   │   ├── ai-suggestion/ # AI建议
│   │   ├── recipe-recommend/ # 食谱推荐
│   │   └── mine/         # 个人中心
│   │
│   ├── utils/            # 工具函数
│   │   ├── cloudApi.js   # ⭐ 云函数统一调用接口
│   │   ├── calculator.js # 健康计算工具
│   │   ├── recipeEngine.js # 食谱推荐引擎
│   │   └── recipeData.js # 食谱数据
│   │
│   ├── components/       # 组件
│   ├── images/          # 图片资源
│   ├── app.js           # 小程序入口
│   └── app.json         # 小程序配置
│
├── 接口整合文档.md            # ⭐ 完整接口文档（必读）
├── 前端功能设计与任务分组.md  # 详细功能设计文档
└── 重构说明.md                # 代码重构说明
```

## 核心功能

### 1. 用户管理
- 个人信息管理（性别、年龄、身高、体重等）
- 自动计算BMI、BMR、TDEE等健康指标
- 目标设置与活动等级配置

### 2. 计划管理
- 智能生成减重/增重计划
- 动态调整每日热量目标
- 计划健康性评估

### 3. 饮食管理
- **AI拍照识别食物**（基于通义千问视觉模型）
- 三层食物搜索（本地数据库 + AI估算 + Open Food Facts API）
- 饮食记录按餐次管理
- 用户自定义菜品
- 常用食物智能推荐

### 4. 运动管理
- 运动记录与推荐
- 运动消耗计算
- 运动库浏览

### 5. 每日评价
- 热量差分析（红绿灯系统）
- 营养评分（0-100分）
- AI生成个性化建议

### 6. 数据统计
- 体重变化趋势图
- 营养素摄入统计
- 达标率分析

### 7. AI智能建议
- 基于历史数据的营养分析
- 个性化饮食建议
- 食谱智能推荐

## 技术栈

### 前端
- 微信小程序原生开发
- 云开发能力（云函数、云数据库、云存储）

### 后端（云函数）
- Node.js
- 微信云开发SDK
- 通义千问 API（AI能力）
- Open Food Facts API（食物数据）

### 数据库
- 云数据库
  - UserProfiles：用户信息
  - Plans：减重计划
  - DietLog：饮食记录
  - FoodDB：食物数据库
  - UserDishes：用户自定义菜品
  - ExerciseLog：运动记录
  - DailyEvaluations：每日评价

## 快速开始

### 1. 环境准备
- 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号并开通云开发

### 2. 配置云开发
1. 在`miniprogram/app.js`中配置云开发环境ID
2. 在云函数中配置通义千问API Key（环境变量）

### 3. 部署云函数
```bash
# 在微信开发者工具中右键云函数文件夹，选择"上传并部署"
```

### 4. 初始化数据库
调用云函数初始化内置食物数据：
```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'initBuiltinFoods'
  }
})
```

## 📚 开发文档

- [⭐ 接口整合文档](接口整合文档.md) - **必读**！所有API接口的详细使用说明
- [工具模块说明](miniprogram/utils/README.md) - Utils 工具函数使用指南
- [前端功能设计与任务分组](前端功能设计与任务分组.md) - 详细的功能设计和任务划分
- [重构说明](重构说明.md) - 代码重构的背景和原则

## API 快速参考

详见 [接口整合文档.md](接口整合文档.md)

主要API包括：

### 健康服务
- `api.updateProfile(data)` - 更新用户信息
- `api.getProfile()` - 获取用户信息
- `api.generatePlan(targetWeightChange, totalDays)` - 生成减重计划
- `api.evaluateDaily(date)` - 每日评价
- `api.recommendExercise()` - 推荐运动
- `api.logExercise(data)` - 记录运动

### 饮食服务
- `api.searchFood(keyword)` - 搜索食物
- `api.recognizeFood(input)` - 拍照识别食物
- `api.addDietLog(record)` - 添加饮食记录
- `api.getDietLogs(date)` - 获取饮食记录
- `api.addCustomDish(dish)` - 添加自定义菜品

### AI 服务
- `api.analyzeAndRecommend(...)` - AI分析并生成建议
- `api.generateRecipeReason(...)` - 生成食谱推荐理由

### 食谱推荐
- `api.getRecommendedRecipes(options)` - 获取推荐食谱
- `api.analyzeNutritionGap(days)` - 分析营养缺口

## 开发说明

### 目录规范
- 页面文件：每个页面包含 `.js`, `.wxml`, `.wxss`, `.json` 四个文件
- 云函数：每个云函数包含 `index.js`, `package.json`, `config.json`
- 工具函数：放在 `utils/` 目录下

### 代码规范
- 使用ES6+语法
- ⭐ **所有云函数调用必须通过 `utils/cloudApi.js`**，禁止直接调用 `wx.cloud.callFunction()`
- 健康计算统一使用 `utils/calculator.js` 中的方法
- 错误处理使用统一的 `api.handleError()` 方法
- 成功提示使用统一的 `api.showSuccess()` 方法

### 安全注意事项
- ❌ 不要在前端代码中直接使用 API Key
- ✅ 所有 AI 调用必须通过云函数进行
- ✅ 已移除前端的 `qwenService.js`，避免 API Key 泄露

## 许可

MIT License
