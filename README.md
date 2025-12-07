# 轻燃 - 前端应用

## 📋 项目说明

这是一个结合饮食记录与运动记录的微信小程序的前端部分，包含以下三个主要模块：

### 1. 个人信息页面 (Profile)
- 管理用户基本信息：昵称、年龄、性别、身高、体重等
- 设置健身目标：目标体重、健身水平、每日卡路里目标差
- 选择偏好运动项目
- 实时计算 BMI 和减重目标
- 数据本地存储和后端同步

### 2. 计划生成页面 (Generate)
- 基于个人信息智能生成长期运动计划
- 调用后端 AI 模型生成个性化计划
- 展示计划预览
- 一键跳转到计划详情

### 3. 计划详情页面 (Details)
- 展示完整的运动计划
- 包含周计划和具体运动安排
- 支持查看个人概览和计划信息

## 🛠️ 技术栈

- **前端框架**: 原生 HTML5 + CSS3 + JavaScript (ES6+)
- **数据存储**: LocalStorage（本地存储）
- **API 通信**: Fetch API
- **样式**: 现代化设计，响应式布局
- **兼容性**: 支持 PC 和移动端

## 📂 文件结构

```
frontend/
├── index.html      # 主页面 HTML
├── styles.css      # 样式表
├── api.js         # API 请求和数据管理
├── app.js         # 应用逻辑和交互
└── README.md      # 本文件
```

## 🚀 快速开始

### 1. 安装和运行

需要先启动后端服务器 (server.js)：

```bash
npm install
npm start
```

后端服务器会运行在 `http://localhost:3000`

### 2. 打开前端应用

在浏览器中打开：
```
file:///path/to/frontend/index.html
```

或者使用 VS Code 的 Live Server 扩展：
- 右键点击 `index.html`
- 选择 "Open with Live Server"

### 3. 使用应用

1. **填写个人信息**
   - 进入"个人信息"页面
   - 填写所有必填项
   - 点击"保存个人信息"

2. **生成运动计划**
   - 进入"生成计划"页面
   - 点击"🚀 生成我的计划"按钮
   - 等待 AI 生成您的个性化计划

3. **查看计划详情**
   - 进入"计划详情"页面
   - 查看您的长期运动计划
   - 了解每周的具体安排

## 📱 功能特性

### 个人信息管理
- ✅ 完整的用户档案
- ✅ BMI 自动计算
- ✅ 体重目标追踪
- ✅ 运动偏好选择
- ✅ 健康状况记录

### 计划生成
- ✅ AI 智能计划生成
- ✅ 基于健身水平的难度调整
- ✅ 个性化卡路里目标
- ✅ 实时加载反馈

### 数据管理
- ✅ 本地数据持久化
- ✅ 后端数据同步
- ✅ 用户隐私保护
- ✅ 自动备份

## 🔌 API 接口

应用使用以下后端 API：

### 1. 保存个人信息 + 生成长期计划
```
POST /api/user/profile
Content-Type: application/json

{
  "userId": "user_123",
  "username": "张三",
  "age": 25,
  "gender": "male",
  "height": 180,
  "weight": 75,
  "targetWeight": 70,
  "fitness_level": "intermediate",
  "daily_calorie_target": -500,
  "exercises": ["running", "gym"],
  "health_conditions": ""
}
```

### 2. 获取长期运动计划
```
POST /api/plan/longterm
Content-Type: application/json

{
  "userId": "user_123"
}
```

### 3. 生成每日运动计划
```
POST /api/plan/daily
Content-Type: application/json

{
  "userId": "user_123",
  "calorieDeficit": -500,
  "date": "2025-12-07"
}
```

### 4. 获取 AI 建议
```
POST /api/agent/advise
Content-Type: application/json

{
  "userId": "user_123",
  "prompt": "我应该怎样增加运动强度？"
}
```

## 🎨 UI 设计特点

- **现代化设计**: 渐变色背景和卡片式布局
- **响应式布局**: 完美适配 PC、平板和手机
- **用户友好**: 清晰的导航和直观的交互
- **视觉反馈**: 加载动画、成功/错误提示
- **无障碍设计**: 适当的颜色对比度和字体大小

## 💾 数据存储

应用使用浏览器的 LocalStorage 保存：
- 用户ID
- 个人信息
- 长期计划
- 每日计划

```javascript
// 示例：访问本地存储
const userInfo = Storage.getUserInfo();
const plan = Storage.getLongTermPlan();
```

## 🔐 数据验证

所有用户输入都经过验证：
- 年龄范围：10-100 岁
- 身高范围：100-250 cm
- 体重范围：20-300 kg
- 必填项检查
- 业务逻辑验证

## 🐛 常见问题

### Q: 数据保存失败？
A: 检查后端服务器是否运行在 `http://localhost:3000`

### Q: 计划生成超时？
A: AI 模型生成计划可能需要几秒钟，请耐心等待

### Q: 如何清除所有数据？
A: 在浏览器控制台执行 `Storage.clearAll()`

### Q: 支持跨设备同步吗？
A: 目前版本使用本地存储，不支持跨设备同步。可以扩展后端添加云同步功能。

## 🚧 未来改进方向

- [ ] 添加每日计划管理功能
- [ ] 集成运动历史记录
- [ ] 支持云端数据同步
- [ ] 添加运动数据可视化图表
- [ ] 实时通知和提醒功能
- [ ] 社交分享功能
- [ ] 深色模式支持

## 📞 技术支持

如有问题，请参考后端 API 文档或联系开发团队。

## 📄 许可证

MIT License
