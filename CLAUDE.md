# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

轻燃（LightBurning）是一个基于微信小程序云开发的智能健康管理系统，集成 AI 食物识别、个性化计划生成、营养分析和运动推荐功能。

## 项目全景（请在每次动手前先快速复习）

- 前端：微信小程序，入口 `miniprogram/app.*`，页面按 `pages/<module>/index.*` 组织，组件与图片在 `miniprogram/components`、`miniprogram/images`。
- 统一调用：所有云函数必须经 `miniprogram/utils/cloudApi.js`，提供健康、饮食、AI、食谱、通用错误/提示与日期工具。
- 计算/策略：`utils/calculator.js` 负责 BMI/BMR/TDEE 与输入校验；`utils/recipeEngine.js` 结合偏好/历史/AI 做食谱打分并可降级；`recipeData.js` 存本地食谱与 mock。
- 云函数：
  - `healthService`：用户资料、计划生成/调整、每日评价（热量差+营养评分+红绿灯）、运动推荐与记录。
  - `dietService`：三层食物搜索（FoodDB → AI 估算 → Open Food Facts）、饮食 CRUD、自定义菜品、常用食物、热量计算、食谱推荐/收藏。
  - `foodRecognitionQwen`：通义千问视觉识图，返回食物营养 JSON（fileID/base64）。
  - `qwenAI`：文本模型做营养分析、推荐理由、自定义问答，API Key 需走环境变量。
- 数据库（云开发 NoSQL）：`UserProfiles`, `health_plans`, `DietLog`, `ExerciseLog`, `FoodDB`, `UserDishes`, `DailyEvaluations`（FoodDB 只读可写，其余仅创建者可读写）。
- 部署要点：微信开发者工具选择云环境，云端安装依赖上传四个云函数；环境变量设置 `DASHSCOPE_API_KEY`；执行 `dietService` 的 `initBuiltinFoods` 初始化。
- 安全提醒：前端严禁直接 `wx.cloud.callFunction` 或暴露 Key；`qwenAI/index.js` 中的硬编码 Key 应改为仅取环境变量。

## 工作流程约定

1) 每次开始任务前先阅读本文件，确保对架构/安全要点有全局记忆。  
2) 每次完成或修改功能后，在此文件追加一条变更日志，简述改动和风险点（无需冗长）。

## 前端页面职责与数据流速览（进入页面前快速对照）

- 首页 `pages/home/index.js`：展示当日概览（热量摄入/消耗、红绿灯、快捷入口）。数据：`getProfile`、当日 `getDietLogs`、`recommendExercise`。状态：`profile`、`dietSummary`、`exerciseRecommendations`、`loading`。
- 个人信息 `pages/profile/index.js`：编辑画像，实时算 BMI/BMR/TDEE。数据：`getProfile`，本地 `calculator` 计算；校验用 `calc.validateInput`。状态：`profile`、`bmi/bmr/tdee`、`loading`。
- 计划生成 `pages/plan/generate/index.js`：表单采集目标与周期 → `generatePlan`。状态：表单、`saving`。
- 计划详情 `pages/plan/detail/index.js`：展示当前计划、每日目标、调整建议 → `adjustPlan`。状态：`plan`、`adjustment`、`loading`。
- 每日报告 `pages/report/daily/index.js`：当天热量差、营养评分、红绿灯、建议。数据：`evaluateDaily(date?)`。状态：`evaluation`、`loading`。
- 饮食列表 `pages/diet/index/index.js`：当日饮食记录与汇总。数据：`getDietLogs(today)`。状态：`records`、`summary`、`loading`；删改后刷新。
- 食物搜索 `pages/diet/search/index.js`：三层搜索入口。数据：`searchFood(keyword, limit, 'full')` / `quickSearchFood`（节流）。状态：`keyword`、`results`、`loading`、`history/commonList`。
- 拍照识食 `pages/diet/camera/index.js`：上传→`recognizeFood`。状态：`recognizedFoods`、`searchResults`、`uploading/loading`。
- 手动录入 `pages/diet/manual/index.js`：表单录入，份量→`calculateCalories`，提交 `addDietLog`。状态：表单、`calcResult`、`saving`。
- 自定义菜品 `pages/diet/custom-dishes/index.js`：CRUD。数据：`getUserDishes`、`add/update/deleteCustomDish`。状态：`dishes`、`editing`、`loading`。
- 常用食物 `pages/diet/favorites/index.js`：数据：`getFrequentFoods(limit)`。状态：`list`、`loading`。
- 运动记录 `pages/exercise/index/index.js`：展示/新增运动记录（获取接口如有）。状态：`records`、`loading`。
- 运动推荐 `pages/exercise/recommend/index.js`：`recommendExercise` + 一键 `logExercise`。状态：`recommendations`、`loading`。
- 运动搜索 `pages/exercise/search/index.js`（若启用）：状态：`keyword`、`results`、`loading`。
- AI 建议 `pages/ai-suggestion/index.js`：聚合 profile + 近期饮食 + `analyzeNutritionGap` + `analyzeAndRecommend`。状态：`suggestion`（overall/suggestions/tags）、`gap`、`loading`，失败降级。
- 食谱推荐 `pages/recipe-recommend/index.js`：按 `type` (goal/preference/ai) 调 `getRecommendedRecipes`，可补 `generateRecipeReason`。状态：`recipes`、`type`、`filters`、`loading`。
- 食谱详情 `pages/recipe-detail/index.js`：`getRecipeDetail`，收藏/取消 `favoriteRecipe`/`unfavoriteRecipe`，可显示推荐理由。状态：`recipe`、`reason`、`isFavorite`、`loading`。
- 统计 `pages/stats/index/index.js`、`pages/stats/weekly.*`：范围内 `getDietLogsByRange` 后本地汇总绘图。状态：`chartsData`、`range`、`loading`。
- 个人中心 `pages/mine/index/index.js`：个人信息、快捷入口、偏好设置。数据：`getProfile`（可缓存优先）。状态：`profile`、`loading`。
- 示例/落地页 `pages/example/index.js`、`pages/index/index.js`：多为静态或演示，保持调用经 `cloudApi`。

统一交互原则：所有接口走 `cloudApi.js` + `handleError/showSuccess`；页面级 `loading` + `wx.showLoading`；表单先校验（`calculator.validateInput`），搜索输入防抖；AI 失败提供规则/本地数据降级；可用 `wx.getStorageSync` 预渲染再后台刷新。

## 技术栈

- **前端**: 微信小程序 (WXML/WXSS/ES6+)
- **后端**: 微信云开发 (Node.js 18.15 云函数)
- **数据库**: 云开发数据库 (NoSQL)
- **AI**: 通义千问 API (DashScope) - 视觉模型 qwen-vl-max, 文本模型 qwen-turbo

## 常用命令

### 云函数部署

在微信开发者工具中，右键云函数文件夹 → "上传并部署：云端安装依赖"

需部署的云函数：
- `cloudfunctions/healthService` - 用户信息、计划、评价、运动
- `cloudfunctions/dietService` - 食物搜索、识别、记录
- `cloudfunctions/qwenAI` - AI 分析、建议生成
- `cloudfunctions/foodRecognitionQwen` - 图片识别

### 初始化食物数据库

在微信开发者工具 Console 中执行：
```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: { action: 'initBuiltinFoods' }
})
```

## 架构设计

### 前端调用层

**核心原则**: 所有云函数调用必须通过 `miniprogram/utils/cloudApi.js`，禁止直接调用 `wx.cloud.callFunction()`

```javascript
// 正确用法
import * as api from '../../utils/cloudApi.js';
await api.getProfile();

// 错误用法 - 禁止
wx.cloud.callFunction({ name: 'healthService', ... })
```

### 工具模块

| 模块 | 职责 |
|------|------|
| `cloudApi.js` | 云函数统一调用接口 |
| `calculator.js` | 健康计算 (BMI/BMR/TDEE) 和输入验证 |
| `recipeEngine.js` | 食谱推荐引擎 |
| `recipeData.js` | 食谱数据 |

### 云函数职责划分

| 云函数 | 职责 | 主要 action |
|--------|------|-------------|
| `healthService` | 用户管理、计划、评价、运动 | getProfile, updateProfile, generatePlan, evaluate, logExercise |
| `dietService` | 饮食记录、食物搜索 | searchFood, addDietLog, getDietLogs, recognizeAndSearch |
| `qwenAI` | AI 分析建议 | analyzeAndRecommend, generateRecipeReason, customPrompt |
| `foodRecognitionQwen` | 图片识别 | 通义千问视觉模型调用 |

### 数据库集合

| 集合名 | 说明 | 权限 |
|--------|------|------|
| `UserProfiles` | 用户信息 | 仅创建者可读写 |
| `health_plans` | 减重计划 | 仅创建者可读写 |
| `DietLog` | 饮食记录 | 仅创建者可读写 |
| `ExerciseLog` | 运动记录 | 仅创建者可读写 |
| `FoodDB` | 食物数据库 | 所有用户可读，仅创建者可写 |
| `UserDishes` | 自定义菜品 | 仅创建者可读写 |
| `DailyEvaluations` | 每日评价 | 仅创建者可读写 |

### 食物搜索三层架构

```
第一层：本地数据库 FoodDB（极速响应 < 100ms）
   ↓ 未找到
第二层：AI 智能估算（通义千问）
   ↓ 失败
第三层：Open Food Facts API（兜底）
```

## 代码规范

### 错误处理

```javascript
try {
  const res = await api.updateProfile(data);
  api.showSuccess('保存成功');
} catch (error) {
  api.handleError(error, '保存失败');
}
```

### 健康计算

```javascript
import * as calc from '../../utils/calculator.js';

const bmi = calc.calculateBMI(weight, height);
const bmr = calc.calculateBMR(weight, height, age, gender);
const tdee = calc.calculateTDEE(bmr, activityLevel);
const macros = calc.calculateMacroNutrients(tdee, goal);

// 输入验证
if (!calc.validateInput.age(age)) { /* 处理无效年龄 */ }
```

### 页面文件命名

```
pages/module-name/
├── index.js
├── index.wxml
├── index.wxss
└── index.json
```

## 安全要求

- API Key 只存储在云函数环境变量 `DASHSCOPE_API_KEY` 中
- 前端代码禁止直接使用 API Key
- 所有 AI 调用必须通过云函数中转

## Hooks 和 Skills（开发辅助）

**配置状态**：✅ Git Hook 已安装 | ✅ fswatch 已安装 | ✅ npm scripts 已配置

**快速使用**：
- Git Hook（自动）：`git commit` 时自动追踪暂存文件
- 文件监听：`npm run track:watch` 实时追踪文件变更
- 技能提示：`echo '{"prompt":"..."}' | npm run skill`
- 手动追踪：`cat <<EOF | npm run track {...} EOF`

**追踪日志**：`.claude/tsc-cache/<session-id>/`（edited-files.log, affected-repos.txt）

**技能规则**：`.claude/skills/skill-rules.json`（wechat-miniprogram, wechat-cloud-function, diet-module, ai-integration, database-operations）

**注意**：在 Claude Code 中自动触发，Cursor 中需手动调用或使用 Git Hook/文件监听。

## 变更日志

- 2025-12-12: 配置 Git Hook/文件监听自动追踪，添加 npm scripts，更新 tracker 支持 miniprogram/cloudfunctions
