# 轻燃前端 - 快速参考卡

## 🚀 快速开始 (3 步)

```bash
# 1. 启动后端
npm install && npm start

# 2. 打开前端
# 方式 A: 直接打开
file:///path/to/frontend/index-new.html

# 方式 B: Live Server (VS Code)
# 右键 index-new.html → Open with Live Server

# 3. 测试应用
# 访问 #profile → #plan/generate → #plan/detail
```

---

## 📁 核心文件速查

| 文件 | 用途 | 行数 |
|------|------|------|
| `src/pages/profile/index.js` | 个人信息页 | 600 |
| `src/pages/plan/generate.js` | 计划生成页 | 500 |
| `src/pages/plan/detail.js` | 计划详情页 | 650 |
| `src/utils/health.js` | 验证和计算 | 400 |
| `src/services/healthService.js` | API 服务 | 150 |
| `src/components/index.js` | UI 组件库 | 800 |
| `tests/health.test.js` | 单元测试 | 300 |

---

## 🎯 三个任务一览

### ✅ 任务 1.1: 个人信息页面

**URL**: `#profile`

**功能**:
- 表单输入: 昵称、年龄、性别、身高、体重、目标体重、活动等级
- 实时计算: BMI、BMR、TDEE
- 数据验证: 范围和业务规则检查
- 操作: 保存、重置

**代码**:
```javascript
import ProfilePage from './src/pages/profile/index.js';
const profile = new ProfilePage('app-container');
await profile.init();
```

---

### ✅ 任务 1.2: 计划生成页面

**URL**: `#plan/generate`

**功能**:
- 调整周期: 滑块选择 4-52 周
- 预览信息: 实时更新热量目标
- 健康检查: 评估减重计划可行性
- 生成计划: API 调用并跳转

**代码**:
```javascript
import PlanGeneratePage from './src/pages/plan/generate.js';
const generate = new PlanGeneratePage('app-container');
await generate.init();
```

---

### ✅ 任务 1.3: 计划详情页面

**URL**: `#plan/detail`

**功能**:
- 概览展示: 身体数据、计划参数
- 进度跟踪: 时间进度、减重进度
- 每日目标: 热量、蛋白质、碳水、脂肪
- 管理操作: 调整、终止、记录体重

**代码**:
```javascript
import PlanDetailPage from './src/pages/plan/detail.js';
const detail = new PlanDetailPage('app-container');
await detail.init();
```

---

## 🧮 关键计算公式

### BMI (体质指数)
```javascript
BMI = 体重(kg) / (身高(m))²
// 例: 70 kg / (1.7 m)² = 24.2
```

### BMR (基础代谢率)
```javascript
// Mifflin-St Jeor 公式
男: BMR = 10×体重 + 6.25×身高 - 5×年龄 + 5
女: BMR = 10×体重 + 6.25×身高 - 5×年龄 - 161
```

### TDEE (每日总热量消耗)
```javascript
TDEE = BMR × 活动因子
// 活动因子: 1.2-1.9
```

### 热量差与体重变化
```javascript
1 kg 体重 ≈ 7700 kcal
每日热量差 = (总体重差 × 7700) / (周期天数)
```

---

## ✔️ 数据验证范围

| 字段 | 最小值 | 最大值 | 单位 |
|------|--------|--------|------|
| 年龄 | 18 | 80 | 岁 |
| 身高 | 100 | 250 | cm |
| 体重 | 30 | 300 | kg |
| 减重速度 | 0.5 | 1.5 | kg/周 |
| 计划周期 | 4 | 52 | 周 |

---

## 🎨 颜色配置

```css
--primary-color: #667eea;      /* 紫蓝 */
--secondary-color: #764ba2;    /* 深紫 */
--success-color: #10b981;      /* 绿 */
--warning-color: #f59e0b;      /* 橙 */
--danger-color: #ef4444;       /* 红 */
```

---

## 💾 数据存储

### LocalStorage 键

```javascript
localStorage.setItem('userId', 'user_xxx');           // 用户 ID
localStorage.setItem('userProfile', JSON.stringify({})); // 个人信息
localStorage.setItem('currentPlan', JSON.stringify({})); // 当前计划
localStorage.setItem('planStartDate', new Date());    // 计划开始日期
```

### 获取数据

```javascript
// 查看用户 ID
console.log(localStorage.getItem('userId'));

// 查看个人信息
console.log(JSON.parse(localStorage.getItem('userProfile')));

// 清除所有数据
localStorage.clear();
```

---

## 🔌 API 端点

### /api/user/profile
```javascript
POST {userId, username, age, gender, height, weight, targetWeight, activityLevel}
GET 返回: {profile: {...}}
```

### /api/plan/longterm
```javascript
POST {userId, targetWeight, weekCount, currentWeight, dailyCalorieDeficit}
GET 返回: {plan: {...}}
```

### /api/plan/adjust
```javascript
POST {userId, planId, targetWeight, weekCount}
返回: {plan: {...}}
```

### /api/plan/progress
```javascript
POST {userId, planId, date, weight}
返回: {progress: {...}}
```

---

## 🧪 运行测试

### 在浏览器控制台

```javascript
// 运行所有测试
runAllTests();

// 预期输出
// 测试 HealthValidator
// ✓ 应该接受有效的年龄
// ...
// 测试结果: 18 通过, 0 失败
```

---

## 🛠️ 调试技巧

### 打开开发者工具
```
F12 或 Ctrl+Shift+I
```

### 查看网络请求
```
F12 → Network 选项卡 → 刷新页面
```

### 查看错误
```
F12 → Console 选项卡
```

### 查看本地存储
```
F12 → Application → LocalStorage
```

---

## 📊 应用架构

```
App (路由管理)
  ├─ ProfilePage (个人信息)
  │   ├─ HealthValidator (验证)
  │   ├─ HealthCalculator (计算)
  │   └─ healthService (API)
  │
  ├─ PlanGeneratePage (计划生成)
  │   ├─ HealthValidator
  │   ├─ HealthCalculator
  │   └─ healthService
  │
  └─ PlanDetailPage (计划详情)
      ├─ HealthCalculator
      ├─ healthService
      └─ 组件库 (Modal, Toast)
```

---

## 📱 响应式断点

```css
/* 桌面 */
@media (min-width: 1024px) { /* 多列布局 */ }

/* 平板 */
@media (max-width: 1024px) { /* 2 列 */ }

/* 手机 */
@media (max-width: 768px) { /* 单列 */ }
```

---

## ❌ 常见错误及解决

| 错误 | 原因 | 解决 |
|------|------|------|
| API 连接失败 | 后端未运行 | `npm start` |
| 数据不保存 | 隐私模式 | 关闭隐私模式 |
| 样式不显示 | 缓存问题 | Ctrl+Shift+Delete |
| 组件不显示 | JS 错误 | F12 查看控制台 |

---

## 📚 文档

| 文档 | 内容 |
|------|------|
| PROJECT_GUIDE.md | 详细项目文档 |
| TESTING_GUIDE.md | 测试指南 |
| DELIVERABLE.md | 交付总结 |
| 本文件 | 快速参考 |

---

## 🎓 学习路径

1. **理解架构** → 阅读 `PROJECT_GUIDE.md`
2. **查看代码** → 打开 `src/pages/` 目录
3. **运行应用** → 按照快速开始步骤
4. **测试功能** → 参考 `TESTING_GUIDE.md`
5. **修改代码** → 学习现有实现

---

## 💡 代码示例

### 创建并使用页面

```javascript
import ProfilePage from './src/pages/profile/index.js';

// 创建实例
const page = new ProfilePage('container-id');

// 初始化
await page.init();

// 页面现在可使用
```

### 调用健康计算

```javascript
import { HealthCalculator } from './src/utils/health.js';

const bmi = HealthCalculator.calculateBMI(170, 70);
const bmr = HealthCalculator.calculateBMR(170, 70, 25, 'male');
const tdee = HealthCalculator.calculateTDEE(bmr, 'moderately_active');
```

### 调用 API 服务

```javascript
import { healthService } from './src/services/healthService.js';

const profile = await healthService.getProfile();
await healthService.updateProfile({age: 25, weight: 70});
const plan = await healthService.generatePlan({...});
```

---

## 📞 快速帮助

**问题**: 页面不显示
**步骤**: F12 → Console → 查看错误 → 查看文档 → 联系技术支持

**问题**: 数据未保存
**步骤**: F12 → Application → LocalStorage → 检查键值

**问题**: API 失败
**步骤**: F12 → Network → 查看请求 → 检查后端日志

---

**版本**: 1.0.0
**最后更新**: 2025-12-07
**状态**: ✅ 生产就绪
