# 模块五：食物识别与个人食品库 - 后端开发文档

> **负责人**：李凯迪
> **最后更新**：2024年12月

---

## 目录

1. [模块概述](#模块概述)
2. [文件清单](#文件清单)
3. [部署指南](#部署指南)
4. [数据库集合](#数据库集合)
5. [API 接口文档](#api-接口文档)
6. [调用示例](#调用示例)
7. [搜索策略说明](#搜索策略说明)
8. [注意事项](#注意事项)

---

## 模块概述

模块五提供完整的饮食管理后端能力，包括：

| 功能 | 说明 |
|------|------|
| AI 拍照识别 | 通义千问 qwen-vl-plus 视觉模型识别食物 |
| 三层搜索架构 | 本地 FoodDB → AI 估算 → Open Food Facts |
| 自动数据积累 | 查询结果自动缓存到 FoodDB，越用越快 |
| 个人食品库 | 用户自定义菜品 (UserDishes) |
| 我的常用 | 基于 DietLog 统计，搜索时自动置顶 |
| 饮食记录 CRUD | 完整的增删改查操作 |

---

## 文件清单

需要提交给队友的文件：

```
cloudfunctions/
├── dietService/                    # 饮食服务云函数（核心）
│   ├── index.js                    # 主逻辑代码（约1650行）
│   ├── package.json                # 依赖：wx-server-sdk, axios
│   └── config.json                 # 运行配置：超时120秒
│
└── foodRecognitionQwen/            # AI食物识别云函数
    ├── index.js                    # AI识别逻辑
    ├── package.json                # 依赖：wx-server-sdk, openai
    └── config.json                 # 运行配置
```

### 云函数依赖关系

```
┌─────────────────────────────────────────────────┐
│                 小程序前端                        │
│                    │                             │
│                    ▼                             │
│  ┌─────────────────────────────────────────┐    │
│  │           dietService                    │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  recognizeAndSearch 接口         │    │    │
│  │  │           │                      │    │    │
│  │  │           ▼                      │    │    │
│  │  │  调用 foodRecognitionQwen  ─────────────── │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**重要**：`dietService` 的拍照识别功能依赖调用 `foodRecognitionQwen`，两个云函数必须一起部署。

---

## 部署指南

### 1. 上传云函数

**方法一：微信开发者工具（推荐）**

1. 打开微信开发者工具，进入项目
2. 右键点击 `cloudfunctions/dietService` → **上传并部署（云端安装依赖）**
3. 右键点击 `cloudfunctions/foodRecognitionQwen` → **上传并部署（云端安装依赖）**

**方法二：命令行**

```bash
./uploadCloudFunction.sh
```

### 2. 配置环境变量

在微信开发者工具 → 云开发控制台 → 云函数 → 对应函数 → 设置 → 环境变量：

| 云函数 | 变量名 | 值 |
|--------|--------|-----|
| `dietService` | `DASHSCOPE_API_KEY` | `sk-你的通义千问密钥` |
| `foodRecognitionQwen` | `DASHSCOPE_API_KEY` | `sk-你的通义千问密钥` |

**API Key 获取地址**：https://dashscope.console.aliyun.com/

### 3. 初始化内置食物数据

首次部署后，调用一次初始化接口，将 40+ 常见食物写入数据库：

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: { action: 'initBuiltinFoods' }
}).then(res => {
  console.log('初始化结果:', res.result);
  // { success: true, data: { added: 40, skipped: 0 } }
});
```

### 4. 超时配置说明

| 云函数 | 超时时间 | 说明 |
|--------|----------|------|
| `dietService` | 120 秒 | AI 估算和外部 API 调用可能较慢 |
| `foodRecognitionQwen` | 60 秒 | 图片识别需要时间 |

---

## 数据库集合

模块五使用以下 3 个数据库集合：

### FoodDB - 公共食物数据库

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | String | 食物中文名 |
| `nameEN` | String | 食物英文名 |
| `aliases` | Array | 别名列表 |
| `category` | String | 分类（主食/肉类/蔬菜等） |
| `calories` | Number | 热量（每100g，千卡） |
| `protein` | Number | 蛋白质（每100g，克） |
| `fat` | Number | 脂肪（每100g，克） |
| `carbs` | Number | 碳水化合物（每100g，克） |
| `fiber` | Number | 膳食纤维（每100g，克） |
| `source` | String | 数据来源：`builtin`/`ai_estimated`/`open_food_facts`/`manual` |
| `unitMap` | Object | 单位映射，如 `{ "个": 60, "杯": 250 }` |
| `createdAt` | Number | 创建时间戳 |

**权限**：所有用户可读，仅管理员可写（系统自动写入）

### UserDishes - 用户自定义菜品

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | String | 用户 OpenID |
| `name` | String | 菜品名称 |
| `description` | String | 描述 |
| `calories` | Number | 热量（每份） |
| `protein` | Number | 蛋白质（每份） |
| `fat` | Number | 脂肪（每份） |
| `carbs` | Number | 碳水化合物（每份） |
| `ingredients` | Array | 食材组成 |
| `servingSize` | String | 份量描述，如 "1份" |
| `gramsPerServing` | Number | 每份克数 |
| `useCount` | Number | 使用次数 |
| `createdAt` | Number | 创建时间戳 |

**权限**：仅创建者可读写

### DietLog - 饮食流水记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | String | 用户 OpenID |
| `foodId` | String | 关联 FoodDB 或 UserDishes 的 ID |
| `foodSource` | String | 来源：`FoodDB`/`UserDishes`/`manual`/`ai_recognition` |
| `name` | String | 食物名称 |
| `amount` | Number | 数量 |
| `unit` | String | 单位 |
| `grams` | Number | 换算后的克数 |
| `calories` | Number | 实际摄入热量 |
| `protein` | Number | 实际摄入蛋白质 |
| `fat` | Number | 实际摄入脂肪 |
| `carbs` | Number | 实际摄入碳水 |
| `mealType` | String | 餐次：`breakfast`/`lunch`/`dinner`/`snack`/`other` |
| `recordDate` | String | 记录日期 YYYY-MM-DD |
| `recordTime` | String | 记录时间 HH:mm |
| `imageUrl` | String | 图片 URL（AI 识别时可能有） |
| `createdAt` | Number | 创建时间戳 |

**权限**：仅创建者可读写

---

## API 接口文档

所有接口统一通过 `dietService` 云函数调用：

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: '操作名',
    payload: { /* 参数 */ }
  }
});
```

### 返回格式

```javascript
// 成功
{ success: true, data: { /* 返回数据 */ } }

// 失败
{ success: false, error: '错误信息', code: 'ERROR_CODE' }
```

---

### 食物搜索类接口

#### 1. quickSearch - 快速搜索

**用途**：用户输入时的实时建议，仅查本地数据库，响应极快（< 100ms）

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'quickSearch',
    payload: {
      keyword: '鸡蛋',    // 搜索关键词
      limit: 10           // 可选，返回数量，默认10
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: {
    results: [          // 本地数据库匹配结果
      { name: '鸡蛋', calories: 144, protein: 13, ... }
    ],
    userDishes: [],     // 用户自定义菜品匹配结果
    total: 5,
    hasMore: false      // 是否建议深度搜索
  }
}
```

#### 2. searchFood - 完整搜索（三层架构）

**用途**：用户点击搜索按钮时调用，依次查询本地 → AI估算 → Open Food Facts

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'searchFood',
    payload: {
      keyword: '燕麦',   // 搜索关键词
      limit: 20,         // 可选，返回数量，默认20
      mode: 'full'       // 可选，'quick'仅本地 / 'full'完整三层
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: {
    local: [...],       // 本地数据库结果
    ai: [...],          // AI估算结果
    api: [...],         // Open Food Facts结果
    userDishes: [...],  // 用户自定义菜品
    merged: [...],      // 合并排序后的结果
    total: 15,
    source: 'local'     // 结果主要来源：local/ai/api/builtin
  }
}
```

#### 3. recognizeAndSearch - 拍照识别 + 搜索

**用途**：用户拍照后，识别图片中的食物并获取营养信息

```javascript
// 方式一：使用云存储 fileID（推荐）
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'recognizeAndSearch',
    payload: {
      fileID: 'cloud://xxx/food.jpg'  // 云存储文件ID
    }
  }
});

// 方式二：使用 Base64
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'recognizeAndSearch',
    payload: {
      imageData: 'data:image/jpeg;base64,/9j/4AAQ...'  // Base64图片
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: {
    foods: [
      {
        name: '番茄炒蛋',
        description: '家常菜',
        confidence: 0.95,
        source: 'ai_recognition',
        calories: 120,
        protein: 8.5,
        fat: 7.2,
        carbs: 5.3,
        category: '',
        servingSize: '100g'
      }
    ],
    summary: {
      totalFoods: 2,
      totalCalories: 250,
      totalProtein: 15.0,
      totalFat: 12.0,
      totalCarbs: 18.0,
      sources: { database: 0, ai: 2, api: 0 }
    }
  }
}
```

#### 4. getFoodDetail - 获取食物详情

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'getFoodDetail',
    payload: {
      foodId: 'xxx',           // 食物ID
      source: 'FoodDB'         // 'FoodDB' 或 'UserDishes'
    }
  }
});
```

---

### 用户自定义菜品接口

#### 5. addCustomDish - 添加自定义菜品

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'addCustomDish',
    payload: {
      name: '妈妈的红烧肉',       // 必填
      description: '家常做法',    // 可选
      calories: 350,             // 每份热量
      protein: 25,
      fat: 20,
      carbs: 10,
      servingSize: '1份',        // 份量描述
      gramsPerServing: 200,      // 每份克数
      ingredients: [             // 可选，食材列表
        { name: '五花肉', amount: 200, unit: 'g' }
      ]
    }
  }
});
```

#### 6. getUserDishes - 获取用户自定义菜品

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'getUserDishes',
    payload: {
      limit: 50    // 可选，默认50
    }
  }
});
```

#### 7. updateCustomDish - 更新自定义菜品

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'updateCustomDish',
    payload: {
      dishId: 'xxx',
      updates: {
        name: '新名称',
        calories: 400
      }
    }
  }
});
```

#### 8. deleteCustomDish - 删除自定义菜品

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'deleteCustomDish',
    payload: {
      dishId: 'xxx'
    }
  }
});
```

---

### 饮食记录接口

#### 9. addDietLog - 添加饮食记录

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'addDietLog',
    payload: {
      name: '鸡蛋',              // 食物名称
      foodId: 'xxx',             // 可选，关联ID
      foodSource: 'FoodDB',      // 可选，来源
      amount: 2,                 // 数量
      unit: '个',                // 单位
      grams: 120,                // 换算后克数
      calories: 173,             // 实际摄入热量
      protein: 15.6,
      fat: 11.4,
      carbs: 1.8,
      mealType: 'breakfast',     // 餐次
      recordDate: '2024-12-02',  // 可选，默认今天
      recordTime: '08:30'        // 可选，默认当前时间
    }
  }
});
```

#### 10. getDietLogs - 获取某日饮食记录

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'getDietLogs',
    payload: {
      date: '2024-12-02'    // 可选，默认今天
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: {
    date: '2024-12-02',
    logs: [...],           // 记录列表
    summary: {             // 当日汇总
      totalCalories: 1850,
      totalProtein: 85.5,
      totalFat: 60.2,
      totalCarbs: 210.0
    },
    byMeal: {              // 按餐次分组
      breakfast: [...],
      lunch: [...],
      dinner: [...]
    },
    count: 8
  }
}
```

#### 11. getDietLogsByRange - 获取日期范围记录

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'getDietLogsByRange',
    payload: {
      startDate: '2024-11-25',
      endDate: '2024-12-02'
    }
  }
});
```

#### 12. updateDietLog - 更新饮食记录

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'updateDietLog',
    payload: {
      logId: 'xxx',
      updates: {
        amount: 3,
        calories: 260
      }
    }
  }
});
```

#### 13. deleteDietLog - 删除饮食记录

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'deleteDietLog',
    payload: {
      logId: 'xxx'
    }
  }
});
```

---

### 其他接口

#### 14. getFrequentFoods - 获取常用食物

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'getFrequentFoods',
    payload: {
      limit: 20    // 可选，默认20
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: [
    { name: '鸡蛋', count: 25, lastUsed: 1701504000000, avgCalories: 144 },
    { name: '牛奶', count: 18, lastUsed: 1701417600000, avgCalories: 135 }
  ]
}
```

#### 15. calculateCalories - 计算热量

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: {
    action: 'calculateCalories',
    payload: {
      foodId: 'xxx',
      source: 'FoodDB',
      amount: 2,
      unit: '个'
    }
  }
});
```

**返回**：
```javascript
{
  success: true,
  data: {
    food: { id: 'xxx', name: '鸡蛋', source: 'FoodDB' },
    input: { amount: 2, unit: '个' },
    grams: 120,
    nutrition: {
      calories: 173,
      protein: 15.6,
      fat: 11.4,
      carbs: 1.8
    }
  }
}
```

#### 16. initBuiltinFoods - 初始化内置食物

```javascript
wx.cloud.callFunction({
  name: 'dietService',
  data: { action: 'initBuiltinFoods' }
});
```

---

## 调用示例

### 完整的拍照识别流程

```javascript
// 1. 用户选择图片
wx.chooseMedia({
  count: 1,
  mediaType: ['image'],
  sourceType: ['album', 'camera'],
  success: async (res) => {
    const tempFilePath = res.tempFiles[0].tempFilePath;

    // 2. 上传到云存储
    wx.showLoading({ title: '识别中...' });

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: `food-images/${Date.now()}.jpg`,
      filePath: tempFilePath
    });

    // 3. 调用识别接口
    const recognizeRes = await wx.cloud.callFunction({
      name: 'dietService',
      data: {
        action: 'recognizeAndSearch',
        payload: { fileID: uploadRes.fileID }
      }
    });

    wx.hideLoading();

    if (recognizeRes.result.success) {
      const foods = recognizeRes.result.data.foods;
      console.log('识别到的食物:', foods);
      // 展示结果，让用户确认后添加到饮食记录
    } else {
      wx.showToast({ title: recognizeRes.result.error, icon: 'none' });
    }
  }
});
```

### 手动输入搜索流程

```javascript
// 1. 用户输入时 - 快速搜索（实时建议）
async function onInputChange(keyword) {
  if (!keyword.trim()) return;

  const res = await wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'quickSearch',
      payload: { keyword, limit: 5 }
    }
  });

  if (res.result.success) {
    this.setData({ suggestions: res.result.data.results });
  }
}

// 2. 用户点击搜索 - 完整搜索
async function onSearchClick(keyword) {
  wx.showLoading({ title: '搜索中...' });

  const res = await wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'searchFood',
      payload: { keyword, limit: 20 }
    }
  });

  wx.hideLoading();

  if (res.result.success) {
    this.setData({ searchResults: res.result.data.merged });
  }
}
```

### 添加饮食记录

```javascript
async function addFoodToLog(food, amount, unit, mealType) {
  // 先计算热量
  const calcRes = await wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'calculateCalories',
      payload: {
        foodId: food._id,
        source: 'FoodDB',
        amount: amount,
        unit: unit
      }
    }
  });

  if (!calcRes.result.success) {
    wx.showToast({ title: '计算失败', icon: 'none' });
    return;
  }

  const nutrition = calcRes.result.data.nutrition;

  // 添加记录
  const addRes = await wx.cloud.callFunction({
    name: 'dietService',
    data: {
      action: 'addDietLog',
      payload: {
        name: food.name,
        foodId: food._id,
        foodSource: 'FoodDB',
        amount: amount,
        unit: unit,
        grams: calcRes.result.data.grams,
        calories: nutrition.calories,
        protein: nutrition.protein,
        fat: nutrition.fat,
        carbs: nutrition.carbs,
        mealType: mealType
      }
    }
  });

  if (addRes.result.success) {
    wx.showToast({ title: '添加成功' });
  }
}
```

---

## 搜索策略说明

```
用户输入
    │
    ├── 实时输入 ──────► quickSearch（仅本地，< 100ms）
    │                        │
    │                        ▼
    │                   返回建议列表
    │
    └── 点击搜索 ──────► searchFood（三层架构）
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           第一层        第二层       第三层
          本地 FoodDB   AI 估算   Open Food Facts
           (极速)       (智能)       (兜底)
                │           │           │
                └───────────┴───────────┘
                            │
                            ▼
                     合并 + 智能排序
                     (常用食物置顶)
                            │
                            ▼
                     自动缓存到 FoodDB
                     (下次搜索更快)
```

**排序优先级**：
1. 用户常用食物（使用次数越多越靠前）
2. 精准匹配（名称完全相同）
3. 内置/手动数据（更准确）
4. 按热量降序

---

## 注意事项

### 图片上传

- **必须**先上传到云存储，再传 fileID
- 直接传 Base64 可能因请求体过大而失败
- 推荐图片大小 < 2MB

### 超时配置

| 云函数 | 推荐超时 | 原因 |
|--------|----------|------|
| `dietService` | 120 秒 | AI估算 + 外部API调用 |
| `foodRecognitionQwen` | 60 秒 | 视觉模型识别耗时 |

### API 费用估算

- 通义千问视觉模型：约 0.008 元/次
- 日均 100 次识别：约 0.8 元/天
- 月费用预估：约 25 元

### 数据自动积累

- 所有 AI 估算和 API 查询结果会自动写入 FoodDB
- 下次搜索相同食物时，直接从本地读取，速度极快
- 用得越多，数据越丰富，搜索越快

### AI 降级策略

当 AI 调用失败时，系统会自动降级：

1. AI 识别失败 → 返回错误信息
2. AI 估算失败 → 尝试 Open Food Facts API
3. API 也失败 → 使用内置食物数据（40+ 常见食物）

---

## 联系方式

- **模块开发者**：李凯迪
- **问题反馈**：请在项目群中 @李凯迪

---

**文档版本**：v1.0
**最后更新**：2024年12月
