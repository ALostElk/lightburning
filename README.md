# 轻燃 - 模块六：推荐食谱与智能体联动

## 项目简介

轻燃健康管理应用的**模块六**前端实现，基于微信小程序开发，集成通义千问AI实现智能食谱推荐与营养分析。

## 核心功能

### 1. 基于目标的食谱推荐 🎯
根据用户健康目标（减脂/保持体重）推荐合适食谱，智能评分排序。

### 2. 基于偏好的食谱推荐 ❤️
结合饮食偏好（不吃辣、少油、素食等）和过敏源，推荐常吃食材的菜品。

### 3. AI智能推荐 🤖
- 通义千问AI驱动的专业营养分析
- 分析近7天饮食记录，检测营养缺口
- 生成3-5条个性化饮食建议
- 为推荐食谱生成AI理由

### 4. 食谱详情展示
完整的食材清单、营养成分、烹饪步骤，支持收藏、分享和保存。

## 项目结构

```
lightburning/
├── miniprogram/                    # 小程序主目录
│   ├── app.js                     # 应用入口
│   ├── app.json                   # 应用配置
│   ├── app.wxss                   # 全局样式
│   ├── utils/                     # 工具类
│   │   ├── recipeEngine.js       # 推荐引擎（AI增强）
│   │   ├── recipeData.js         # 食谱数据（12道精选）
│   │   └── qwenService.js        # 通义千问AI服务
│   └── pages/                     # 页面
│       ├── recipe-recommend/      # 食谱推荐页（三种模式）
│       ├── recipe-detail/         # 食谱详情页
│       └── ai-suggestion/         # AI智能推荐页
├── cloudfunctions/                 # 云函数
│   └── qwenAI/                    # 通义千问云函数（代理API）
├── README.md                      # 项目文档
└── CHANGELOG.md                   # 版本说明
```

## 快速开始

### 1. 基础运行（无需配置）

```bash
1. 下载项目
2. 用微信开发者工具打开
3. 编译运行
```

**不配置AI也可正常使用**，系统会自动降级到规则推荐。

### 2. 启用AI功能（可选）

#### 步骤一：获取API Key
访问 [阿里云灵积平台](https://dashscope.console.aliyun.com/) 获取通义千问API Key

#### 步骤二：配置云函数
```bash
1. 在微信开发者工具中开通云开发
2. 云开发控制台 → 环境变量 → 添加：
   - 变量名：QWEN_API_KEY
   - 变量值：你的API Key
3. 右键 cloudfunctions/qwenAI → 上传并部署
```

#### 步骤三：初始化云开发
在 `miniprogram/app.js` 中配置：
```javascript
wx.cloud.init({
  env: 'your-env-id',  // 替换为你的云环境ID
  traceUser: true
});
```

## 核心算法

### 食谱推荐评分系统
- **目标评分**（0-50分）：减脂优先低热量高蛋白，保持体重优先营养均衡
- **偏好评分**（0-50分）：匹配偏好+15-20分，匹配常吃食材+10分，过敏源-100分
- **营养缺口评分**（0-40分）：针对性补充不足营养素

### AI增强功能

#### 1. 营养分析
```javascript
// AI分析返回结构
{
  overall_assessment: "整体评价",
  nutrition_score: 85,
  suggestions: [
    {
      type: "protein",
      severity: "warning",
      icon: "💪",
      message: "建议增加高蛋白食物摄入"
    }
  ],
  recommended_food_types: ["鸡胸肉", "鱼类"],
  food_tags_priority: ["高蛋白", "低脂"]
}
```

#### 2. 推荐理由
AI为每个食谱生成30字内的个性化推荐理由，结合用户目标和营养缺口。

#### 3. 降级策略
AI调用失败时自动切换到规则推荐，保证功能可用。

## 数据结构

### 用户信息
```javascript
{
  gender: '男',
  age: 28,
  height: 175,
  weight: 75,
  goal: '减脂',           // 减脂/保持体重
  activityLevel: '轻度活动',
  dietaryPreferences: ['不吃辣', '少油'],
  allergens: []
}
```

### 食谱数据
```javascript
{
  id: 1,
  name: '虾仁蒸蛋',
  calories: 180,
  protein: 28,
  carbs: 8,
  fat: 5,
  cookingTime: 15,
  difficulty: '简单',
  tags: ['高蛋白', '低脂', '少油'],
  ingredients: [...],
  steps: [...]
}
```

## 技术栈

- **平台**：微信小程序
- **语言**：JavaScript ES6+
- **UI**：WXML + WXSS
- **存储**：localStorage
- **AI**：阿里云通义千问（qwen-turbo）
- **云服务**：微信云开发

## AI成本说明

- **单次分析**：约 ¥0.0012
- **100用户/天，每人2次**：约 ¥0.24/天，¥7.2/月
- 非常经济实惠

## 功能开关

在 `miniprogram/utils/recipeEngine.js` 中控制：
```javascript
constructor() {
  this.useAI = true;              // 是否启用AI
  this.useCloudFunction = true;   // 是否使用云函数
}
```

## 常见问题

**Q: 如何修改用户信息？**  
A: 在 `miniprogram/app.js` 的 `initGlobalData()` 方法中修改。

**Q: AI功能不工作怎么办？**  
A: 检查云函数是否部署成功、环境变量是否配置、API Key是否有效。不配置AI也可正常使用。

**Q: 如何添加新食谱？**  
A: 在 `miniprogram/utils/recipeData.js` 的 `recipes` 数组中添加。

**Q: 如何清除数据？**  
A: 微信开发者工具 → 工具 → 清除缓存 → 清除数据缓存。

## 扩展方向

- AI对话问答功能
- 智能饮食计划生成
- 食物识别AI增强
- 社交分享功能
- 营养师在线咨询

## 相关文档

- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [通义千问API](https://help.aliyun.com/zh/dashscope/)
- [微信云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [版本说明](./CHANGELOG.md)

## 开源协议

MIT License

---

**祝您使用愉快！** 🎉
