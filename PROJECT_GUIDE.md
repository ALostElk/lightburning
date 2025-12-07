# 轻燃前端 - 项目文档

## 📋 项目概述

轻燃是一款基于 Web 的运动计划智能管理系统，帮助用户制定和执行个性化的运动减重计划。

### 核心功能

1. **个人信息管理** - 记录身体数据并自动计算 BMI、BMR、TDEE
2. **计划生成** - 基于个人数据和目标生成科学的减重计划
3. **计划跟踪** - 可视化展示计划进度和体重变化

## 🏗️ 项目结构

```
frontend/
├── src/
│   ├── app.js                          # 应用主入口
│   ├── pages/                          # 页面模块
│   │   ├── profile/
│   │   │   └── index.js               # 个人信息页面 (任务 1.1)
│   │   └── plan/
│   │       ├── generate.js            # 计划生成页面 (任务 1.2)
│   │       └── detail.js              # 计划详情页面 (任务 1.3)
│   ├── services/
│   │   └── healthService.js           # 后端 API 调用服务
│   ├── components/
│   │   └── index.js                   # 可复用组件库
│   ├── utils/
│   │   └── health.js                  # 健康数据计算和验证
│   └── styles/
│       └── main.css                   # 主样式表
├── tests/
│   └── health.test.js                 # 单元测试
├── index-new.html                     # 新的主应用页面
└── README.md                          # 项目说明
```

## 🎯 任务详情

### 任务 1.1: 个人信息页面 ✅

**文件**: `src/pages/profile/index.js`

**功能**:
- ✅ 卡片式布局设计
- ✅ 表单输入（性别、年龄、身高、体重等）
- ✅ 集成 `healthService.updateProfile` API
- ✅ 集成 `healthService.getProfile` API
- ✅ 数据验证（年龄 18-80、身高 100-250cm 等）
- ✅ 实时计算和显示 BMI/BMR/TDEE
- ✅ 活动等级选择器
- ✅ 保存按钮与加载状态
- ✅ 单元测试

**特性**:
- 实时计算健康指标
- 右侧统计数据卡片
- 表单验证和错误提示
- 成功/失败消息提示

**使用方式**:
```javascript
const profilePage = new ProfilePage('app-container');
await profilePage.init();
```

---

### 任务 1.2: 计划生成页面 ✅

**文件**: `src/pages/plan/generate.js`

**功能**:
- ✅ 输入表单（目标减重、周期）
- ✅ 滑块选择器（周期）
- ✅ 集成 `healthService.generatePlan` API
- ✅ 显示计划预览（每日热量目标）
- ✅ 计划可行性评估提示
- ✅ 保存计划到云端
- ✅ 自动跳转到计划详情页
- ✅ 异常处理（目标过大/过小）
- ✅ 单元测试

**特性**:
- 基于用户信息的动态预览
- 健康性检查和警告
- 平衡的减重建议
- 完整的错误处理

**使用方式**:
```javascript
const generatePage = new PlanGeneratePage('app-container');
await generatePage.init();
```

---

### 任务 1.3: 计划详情页面 ✅

**文件**: `src/pages/plan/detail.js`

**功能**:
- ✅ 显示计划概览卡片
- ✅ 显示每日目标（热量、营养素）
- ✅ 进度条组件（天数、体重）
- ✅ 体重变化折线图占位符（可集成 ECharts）
- ✅ 集成 `healthService.adjustPlan` API
- ✅ 计划调整弹窗
- ✅ 终止计划确认弹窗
- ✅ 数据持久化
- ✅ 单元测试

**特性**:
- 实时进度展示
- 营养素建议计算
- 体重记录功能
- 计划管理操作

**使用方式**:
```javascript
const detailPage = new PlanDetailPage('app-container');
await detailPage.init();
```

---

## 🛠️ 核心模块

### 1. HealthValidator（验证器）

**文件**: `src/utils/health.js`

验证用户输入的数据：

```javascript
import { HealthValidator } from './src/utils/health.js';

// 验证个人信息
const validation = HealthValidator.validateProfile({
  age: 25,
  height: 170,
  weight: 70,
  targetWeight: 65,
  gender: 'male',
  activityLevel: 'moderately_active'
});

if (!validation.valid) {
  console.log('验证失败:', validation.errors);
}

// 验证减重目标
const goalCheck = HealthValidator.validateWeightLossGoal(70, 65, 12);
if (goalCheck.isWarning) {
  console.log('警告:', goalCheck.warning);
}
```

**验证规则**:
- 年龄: 18-80 岁
- 身高: 100-250 cm
- 体重: 30-300 kg
- 活动等级: sedentary | lightly_active | moderately_active | very_active | extremely_active
- 减重速度: 0.5-1.5 kg/周（最佳范围）

---

### 2. HealthCalculator（计算器）

**文件**: `src/utils/health.js`

计算健康相关指标：

```javascript
import { HealthCalculator } from './src/utils/health.js';

// 计算 BMI
const bmi = HealthCalculator.calculateBMI(170, 70);
console.log('BMI:', bmi); // 24.2

// 获取 BMI 等级
const category = HealthCalculator.getBMICategory(bmi);
console.log('分类:', category.label); // '正常'

// 计算基础代谢率 (BMR)
const bmr = HealthCalculator.calculateBMR(170, 70, 25, 'male');
console.log('BMR:', bmr); // 1723.75 kcal/天

// 计算每日总热量消耗 (TDEE)
const tdee = HealthCalculator.calculateTDEE(bmr, 'moderately_active');
console.log('TDEE:', tdee); // 2671 kcal/天

// 计算减重所需热量差
const deficit = HealthCalculator.calculateCalorieDeficit(70, 65, 12);
console.log('每日热量差:', deficit); // 457 kcal

// 预测体重变化
const weightLoss = HealthCalculator.calculateWeightLoss(-500, 12);
console.log('预期减重:', weightLoss); // 5.45 kg
```

---

### 3. HealthService（服务层）

**文件**: `src/services/healthService.js`

与后端 API 通信：

```javascript
import { healthService } from './src/services/healthService.js';

// 获取用户信息
const profile = await healthService.getProfile();

// 更新个人信息
const response = await healthService.updateProfile({
  username: '张三',
  age: 25,
  height: 170,
  weight: 70,
  targetWeight: 65,
  gender: 'male',
  activityLevel: 'moderately_active'
});

// 生成运动计划
const plan = await healthService.generatePlan({
  targetWeight: 65,
  weekCount: 12,
  currentWeight: 70
});

// 调整计划
const adjusted = await healthService.adjustPlan({
  planId: plan.id,
  targetWeight: 63,
  weekCount: 16
});

// 记录进度
const progress = await healthService.savePlanProgress({
  planId: plan.id,
  date: '2025-12-07',
  weight: 69.5
});
```

---

### 4. 组件库

**文件**: `src/components/index.js`

可复用的 UI 组件：

```javascript
import {
  Card,
  FormInput,
  Select,
  Slider,
  Button,
  ProgressBar,
  Modal,
  Toast
} from './src/components/index.js';

// 创建卡片
const card = new Card({
  title: '个人信息',
  subtitle: '管理您的数据',
  className: 'custom-card'
});
document.body.appendChild(card.render());

// 创建表单输入
const input = new FormInput({
  name: 'age',
  label: '年龄',
  type: 'number',
  value: 25,
  min: 18,
  max: 80
});
document.body.appendChild(input.render());

// 创建滑块
const slider = new Slider({
  name: 'weekCount',
  label: '计划周期',
  min: 4,
  max: 52,
  value: 12
});
document.body.appendChild(slider.render());

// 显示提示
new Toast({
  message: '保存成功！',
  type: 'success',
  duration: 3000
}).show();

// 显示模态框
const modal = new Modal({
  title: '确认',
  content: '确定保存吗？',
  buttons: [
    { text: '确定', onClick: () => console.log('已确定') },
    { text: '取消' }
  ]
});
modal.show();
```

---

## 🧪 单元测试

**文件**: `tests/health.test.js`

运行测试：

```bash
# 在浏览器控制台运行
runAllTests();
```

测试覆盖范围：
- ✅ 年龄验证
- ✅ 身高验证
- ✅ 体重验证
- ✅ 减重目标验证
- ✅ BMI 计算
- ✅ BMR 计算
- ✅ TDEE 计算
- ✅ 热量差计算
- ✅ 体重变化预测
- ✅ 目标心率计算

---

## 🚀 使用指南

### 安装和运行

1. **启动后端服务**:
```bash
npm install
npm start
```

后端服务运行在 `http://localhost:3000`

2. **打开前端应用**:

方式 A: 直接打开 HTML
```
file:///path/to/frontend/index-new.html
```

方式 B: 使用 Live Server（推荐）
- 在 VS Code 中右键 `index-new.html`
- 选择 "Open with Live Server"

方式 C: 使用本地服务器
```bash
python -m http.server 8000
# 访问 http://localhost:8000/frontend/
```

### 应用流程

1. **个人信息页面** (`#profile`)
   - 填写基本信息
   - 选择健身目标
   - 系统自动计算健康指标
   - 保存个人信息

2. **计划生成页面** (`#plan/generate`)
   - 系统基于个人信息显示建议
   - 调整计划周期
   - 查看预览信息
   - 生成最终计划

3. **计划详情页面** (`#plan/detail`)
   - 查看计划概览
   - 跟踪进度
   - 查看每日目标
   - 记录体重变化
   - 调整或终止计划

---

## 📊 数据持久化

应用支持两种数据存储方式：

1. **本地存储** (LocalStorage)
   - 用户 ID
   - 个人信息
   - 当前计划
   - 计划进度

2. **后端存储** (云端)
   - 所有用户数据
   - 计划历史
   - 体重记录

---

## 🔌 API 接口

### 1. 个人信息

```
POST /api/user/profile
请求体:
{
  "userId": "user_123",
  "username": "张三",
  "age": 25,
  "gender": "male",
  "height": 170,
  "weight": 70,
  "targetWeight": 65,
  "activityLevel": "moderately_active"
}

响应:
{
  "success": true,
  "profile": { ... }
}
```

### 2. 生成计划

```
POST /api/plan/longterm
请求体:
{
  "userId": "user_123",
  "targetWeight": 65,
  "weekCount": 12,
  "currentWeight": 70,
  "dailyCalorieDeficit": -500,
  "activityLevel": "moderately_active"
}

响应:
{
  "success": true,
  "plan": {
    "id": "plan_123",
    "weekCount": 12,
    "dailyCalorieTarget": 2200,
    "content": "..."
  }
}
```

### 3. 调整计划

```
POST /api/plan/adjust
请求体:
{
  "userId": "user_123",
  "planId": "plan_123",
  "targetWeight": 63,
  "weekCount": 16
}

响应:
{
  "success": true,
  "plan": { ... }
}
```

### 4. 保存进度

```
POST /api/plan/progress
请求体:
{
  "userId": "user_123",
  "planId": "plan_123",
  "date": "2025-12-07",
  "weight": 69.5
}

响应:
{
  "success": true,
  "progress": { ... }
}
```

---

## 🎨 样式指南

主要颜色：
- 主色: `#667eea` (紫蓝色)
- 副色: `#764ba2` (深紫色)
- 成功: `#10b981` (绿色)
- 警告: `#f59e0b` (橙色)
- 危险: `#ef4444` (红色)

样式特点：
- 渐变背景
- 圆角卡片
- 响应式布局
- 平滑动画

---

## 🔒 数据验证

所有用户输入都经过验证：

```javascript
// 范围验证
- 年龄: 18-80 岁
- 身高: 100-250 cm
- 体重: 30-300 kg

// 业务验证
- 目标体重 < 当前体重（减重）或 > 当前体重（增肌）
- 减重速度 0.5-1.5 kg/周
- 计划周期 4-52 周

// 必填项检查
- 所有个人信息字段必填
- 计划参数必填
```

---

## 🐛 常见问题

### Q: 如何运行测试？
A: 在浏览器控制台执行 `runAllTests()`

### Q: 如何清除本地数据？
A: 
```javascript
localStorage.clear();
location.reload();
```

### Q: 如何调试 API 调用？
A: 打开浏览器开发者工具 (F12)，查看 Network 选项卡

### Q: 支持哪些浏览器？
A: Chrome, Firefox, Safari, Edge（现代浏览器）

### Q: 如何集成 ECharts？
A: 在 `plan/detail.js` 中引入 ECharts 库，使用 `renderWeightChart()` 方法

---

## 📈 扩展功能建议

- [ ] 集成 ECharts 图表库
- [ ] 添加社交分享功能
- [ ] 实现深色模式
- [ ] 多语言支持
- [ ] 离线访问支持 (PWA)
- [ ] 手机应用 (React Native)
- [ ] AI 私人教练建议
- [ ] 社群功能和排行榜

---

## 📝 开发规范

### 代码风格
- 使用 ES6+ 标准
- 类名: PascalCase
- 函数名: camelCase
- 常量: UPPER_SNAKE_CASE

### 注释规范
- 文件头部包含用途说明
- 复杂逻辑加详细注释
- 公开 API 包含 JSDoc

### 命名规范
- 文件名: kebab-case (例: `health-service.js`)
- 类名: PascalCase (例: `HealthValidator`)
- ID: 使用语义化名称 (例: `#profileForm`)
- Class: 使用 BEM 命名 (例: `.card-header`)

---

## 📞 联系方式

- 项目主页: [GitHub](https://github.com)
- 问题反馈: [Issues](https://github.com/issues)
- 讨论区: [Discussions](https://github.com/discussions)

---

**最后更新**: 2025-12-07
**版本**: 1.0.0
