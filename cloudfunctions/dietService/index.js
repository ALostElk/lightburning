/**
 * dietService - 食物识别与个人食品库 云函数
 *
 * 功能模块：
 * 1. 混合搜索策略 - 本地FoodDB + Open Food Facts API
 * 2. 用户自定义菜品管理 (UserDishes)
 * 3. 常用食物统计 (基于DietLog)
 * 4. 饮食记录CRUD (DietLog)
 * 5. 热量计算
 *
 * 数据库集合：
 * - FoodDB: 公共食物数据库（含API缓存）
 * - UserDishes: 用户自定义菜品
 * - DietLog: 饮食流水记录
 */

const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ==================== 工具函数 ====================

/** 成功响应 */
function ok(data) {
  return { success: true, data };
}

/** 失败响应 */
function fail(error, code = 'ERROR') {
  console.error(`[dietService] Error: ${error}`);
  return { success: false, error: String(error), code };
}

/** 获取今日日期字符串 YYYY-MM-DD */
function todayString() {
  const d = new Date();
  d.setHours(d.getHours() + 8); // 转换为北京时间
  return d.toISOString().slice(0, 10);
}

/** 生成唯一ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ==================== Open Food Facts API 集成 ====================

const OFF_API_BASE = 'https://world.openfoodfacts.org';
const OFF_SEARCH_URL = `${OFF_API_BASE}/cgi/search.pl`;

// 常见食物中英文映射表（用于提高搜索命中率）
const FOOD_TRANSLATION_MAP = {
  // 主食
  '燕麦': 'oatmeal', '麦片': 'oatmeal', '米饭': 'rice', '面包': 'bread',
  '馒头': 'steamed bun', '面条': 'noodles', '意面': 'pasta', '饺子': 'dumpling',
  '粥': 'porridge', '玉米': 'corn', '土豆': 'potato', '红薯': 'sweet potato',

  // 肉类
  '鸡肉': 'chicken', '鸡胸肉': 'chicken breast', '鸡腿': 'chicken leg',
  '牛肉': 'beef', '猪肉': 'pork', '羊肉': 'lamb', '鱼': 'fish',
  '虾': 'shrimp', '三文鱼': 'salmon', '金枪鱼': 'tuna',

  // 蛋奶
  '鸡蛋': 'egg', '牛奶': 'milk', '酸奶': 'yogurt', '奶酪': 'cheese',
  '豆浆': 'soy milk', '豆腐': 'tofu',

  // 蔬菜
  '西红柿': 'tomato', '番茄': 'tomato', '黄瓜': 'cucumber', '胡萝卜': 'carrot',
  '西兰花': 'broccoli', '菠菜': 'spinach', '生菜': 'lettuce', '白菜': 'cabbage',
  '洋葱': 'onion', '蘑菇': 'mushroom', '青椒': 'green pepper',

  // 水果
  '苹果': 'apple', '香蕉': 'banana', '橙子': 'orange', '葡萄': 'grape',
  '草莓': 'strawberry', '蓝莓': 'blueberry', '西瓜': 'watermelon', '芒果': 'mango',
  '猕猴桃': 'kiwi', '柠檬': 'lemon', '桃子': 'peach', '梨': 'pear',

  // 坚果
  '核桃': 'walnut', '杏仁': 'almond', '花生': 'peanut', '腰果': 'cashew',

  // 饮品
  '咖啡': 'coffee', '茶': 'tea', '果汁': 'juice', '可乐': 'cola',

  // 零食
  '饼干': 'biscuit', '薯片': 'chips', '巧克力': 'chocolate', '蛋糕': 'cake',
  '冰淇淋': 'ice cream'
};

// 内置基础食物数据（兜底方案，当API不可用时使用）
const BUILTIN_FOODS = [
  // 主食
  { name: '燕麦', nameEN: 'Oatmeal', category: '主食', calories: 367, protein: 13.5, fat: 6.9, carbs: 66.3, fiber: 10.6 },
  { name: '米饭', nameEN: 'Rice', category: '主食', calories: 116, protein: 2.6, fat: 0.3, carbs: 25.6, fiber: 0.3 },
  { name: '面条', nameEN: 'Noodles', category: '主食', calories: 138, protein: 4.5, fat: 0.8, carbs: 28.4, fiber: 1.2 },
  { name: '面包', nameEN: 'Bread', category: '主食', calories: 266, protein: 8.5, fat: 3.5, carbs: 49.0, fiber: 2.4 },
  { name: '馒头', nameEN: 'Steamed Bun', category: '主食', calories: 223, protein: 7.0, fat: 1.1, carbs: 47.0, fiber: 1.3 },
  { name: '玉米', nameEN: 'Corn', category: '主食', calories: 112, protein: 4.0, fat: 1.2, carbs: 22.0, fiber: 2.4 },
  { name: '土豆', nameEN: 'Potato', category: '主食', calories: 77, protein: 2.0, fat: 0.1, carbs: 17.5, fiber: 1.8 },
  { name: '红薯', nameEN: 'Sweet Potato', category: '主食', calories: 86, protein: 1.6, fat: 0.1, carbs: 20.1, fiber: 3.0 },

  // 肉类
  { name: '鸡胸肉', nameEN: 'Chicken Breast', category: '肉类', calories: 133, protein: 31.0, fat: 3.6, carbs: 0, fiber: 0 },
  { name: '鸡腿', nameEN: 'Chicken Leg', category: '肉类', calories: 181, protein: 26.0, fat: 8.4, carbs: 0, fiber: 0 },
  { name: '牛肉', nameEN: 'Beef', category: '肉类', calories: 250, protein: 26.0, fat: 15.0, carbs: 0, fiber: 0 },
  { name: '猪肉', nameEN: 'Pork', category: '肉类', calories: 242, protein: 13.2, fat: 30.0, carbs: 0, fiber: 0 },
  { name: '羊肉', nameEN: 'Lamb', category: '肉类', calories: 294, protein: 19.0, fat: 24.0, carbs: 0, fiber: 0 },
  { name: '三文鱼', nameEN: 'Salmon', category: '肉类', calories: 208, protein: 20.0, fat: 13.0, carbs: 0, fiber: 0 },
  { name: '虾', nameEN: 'Shrimp', category: '肉类', calories: 85, protein: 18.0, fat: 1.0, carbs: 0.9, fiber: 0 },

  // 蛋奶
  { name: '鸡蛋', nameEN: 'Egg', category: '蛋奶', calories: 144, protein: 13.0, fat: 9.5, carbs: 1.5, fiber: 0, unitMap: { '个': 60 } },
  { name: '牛奶', nameEN: 'Milk', category: '蛋奶', calories: 54, protein: 3.0, fat: 3.2, carbs: 3.4, fiber: 0, unitMap: { '杯': 250, '盒': 250 } },
  { name: '酸奶', nameEN: 'Yogurt', category: '蛋奶', calories: 72, protein: 3.5, fat: 2.7, carbs: 9.3, fiber: 0, unitMap: { '杯': 200 } },
  { name: '豆腐', nameEN: 'Tofu', category: '蛋奶', calories: 81, protein: 8.1, fat: 3.7, carbs: 4.2, fiber: 0.4, unitMap: { '块': 100 } },
  { name: '豆浆', nameEN: 'Soy Milk', category: '蛋奶', calories: 31, protein: 2.9, fat: 1.2, carbs: 2.7, fiber: 0, unitMap: { '杯': 300 } },

  // 蔬菜
  { name: '西红柿', nameEN: 'Tomato', category: '蔬菜', calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, unitMap: { '个': 150 } },
  { name: '黄瓜', nameEN: 'Cucumber', category: '蔬菜', calories: 15, protein: 0.7, fat: 0.1, carbs: 2.9, fiber: 0.5, unitMap: { '根': 200 } },
  { name: '西兰花', nameEN: 'Broccoli', category: '蔬菜', calories: 36, protein: 4.1, fat: 0.6, carbs: 4.3, fiber: 3.3 },
  { name: '菠菜', nameEN: 'Spinach', category: '蔬菜', calories: 24, protein: 2.6, fat: 0.3, carbs: 3.6, fiber: 2.1 },
  { name: '胡萝卜', nameEN: 'Carrot', category: '蔬菜', calories: 37, protein: 1.0, fat: 0.2, carbs: 8.8, fiber: 2.8, unitMap: { '根': 120 } },

  // 水果
  { name: '苹果', nameEN: 'Apple', category: '水果', calories: 52, protein: 0.2, fat: 0.1, carbs: 13.6, fiber: 1.7, unitMap: { '个': 200 } },
  { name: '香蕉', nameEN: 'Banana', category: '水果', calories: 93, protein: 1.4, fat: 0.2, carbs: 22.0, fiber: 1.7, unitMap: { '根': 120 } },
  { name: '橙子', nameEN: 'Orange', category: '水果', calories: 47, protein: 0.9, fat: 0.1, carbs: 11.1, fiber: 2.0, unitMap: { '个': 200 } },
  { name: '葡萄', nameEN: 'Grape', category: '水果', calories: 67, protein: 0.6, fat: 0.2, carbs: 17.1, fiber: 0.9 },
  { name: '草莓', nameEN: 'Strawberry', category: '水果', calories: 32, protein: 1.0, fat: 0.2, carbs: 7.1, fiber: 2.0 },
  { name: '西瓜', nameEN: 'Watermelon', category: '水果', calories: 31, protein: 0.5, fat: 0.1, carbs: 7.6, fiber: 0.4 },

  // 坚果
  { name: '核桃', nameEN: 'Walnut', category: '坚果', calories: 654, protein: 15.0, fat: 65.0, carbs: 14.0, fiber: 6.7 },
  { name: '杏仁', nameEN: 'Almond', category: '坚果', calories: 578, protein: 21.0, fat: 50.0, carbs: 20.0, fiber: 11.0 },
  { name: '花生', nameEN: 'Peanut', category: '坚果', calories: 567, protein: 26.0, fat: 49.0, carbs: 16.0, fiber: 8.5 },

  // 饮品零食
  { name: '咖啡', nameEN: 'Coffee', category: '饮品', calories: 2, protein: 0.1, fat: 0, carbs: 0.4, fiber: 0, unitMap: { '杯': 240 } },
  { name: '可乐', nameEN: 'Cola', category: '饮品', calories: 43, protein: 0, fat: 0, carbs: 10.6, fiber: 0, unitMap: { '罐': 330, '瓶': 500 } },
  { name: '巧克力', nameEN: 'Chocolate', category: '零食', calories: 546, protein: 5.0, fat: 31.0, carbs: 60.0, fiber: 3.4 },
  { name: '薯片', nameEN: 'Chips', category: '零食', calories: 536, protein: 7.0, fat: 35.0, carbs: 50.0, fiber: 4.4 },
  { name: '饼干', nameEN: 'Biscuit', category: '零食', calories: 433, protein: 8.0, fat: 14.0, carbs: 71.0, fiber: 2.3 }
];

/**
 * 从内置数据中搜索食物
 */
function searchBuiltinFoods(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  return BUILTIN_FOODS.filter(food =>
    food.name.includes(keyword) ||
    food.nameEN.toLowerCase().includes(lowerKeyword) ||
    food.category.includes(keyword)
  ).map(food => ({
    ...food,
    source: 'builtin',
    servingSize: '100g',
    gramsPerServing: 100
  }));
}

/**
 * 尝试将中文关键词翻译为英文
 */
function translateKeyword(keyword) {
  // 精确匹配
  if (FOOD_TRANSLATION_MAP[keyword]) {
    return FOOD_TRANSLATION_MAP[keyword];
  }
  // 模糊匹配：检查关键词是否包含映射表中的词
  for (const [cn, en] of Object.entries(FOOD_TRANSLATION_MAP)) {
    if (keyword.includes(cn)) {
      return en;
    }
  }
  return null;
}

/**
 * 调用 Open Food Facts API 搜索食物
 * 策略：先用原始关键词搜索，如果是中文则同时用翻译后的英文搜索
 * @param {string} keyword - 搜索关键词
 * @param {number} pageSize - 返回数量
 * @returns {Promise<Array>} 清洗后的食物数据
 */
async function searchOpenFoodFacts(keyword, pageSize = 20) {
  try {
    // 检测是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(keyword);
    const englishKeyword = hasChinese ? translateKeyword(keyword) : null;

    console.log(`[OFF API] 原始关键词: ${keyword}, 翻译: ${englishKeyword || '无'}`);

    // 构建搜索任务
    const searchTasks = [];

    // 如果有英文翻译，优先用英文搜索（命中率更高）
    if (englishKeyword) {
      searchTasks.push(
        axios.get(OFF_SEARCH_URL, {
          params: {
            search_terms: englishKeyword,
            search_simple: 1,
            action: 'process',
            json: 1,
            page_size: pageSize,
            fields: 'code,product_name,product_name_zh,brands,nutriments,serving_size,image_url'
          },
          timeout: 8000
        }).catch(() => ({ data: { products: [] } }))
      );
    }

    // 同时用原始关键词搜索
    searchTasks.push(
      axios.get(OFF_SEARCH_URL, {
        params: {
          search_terms: keyword,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: pageSize,
          fields: 'code,product_name,product_name_zh,brands,nutriments,serving_size,image_url'
        },
        timeout: 8000
      }).catch(() => ({ data: { products: [] } }))
    );

    // 并行执行搜索
    const results = await Promise.all(searchTasks);

    // 合并结果并去重（基于code）
    const allProducts = [];
    const seenCodes = new Set();

    for (const res of results) {
      const products = res.data?.products || [];
      for (const p of products) {
        const code = p.code || p.product_name;
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          allProducts.push(p);
        }
      }
    }

    console.log(`[OFF API] 合并后返回 ${allProducts.length} 条结果`);

    // 清洗数据，提取需要的字段，保留原始中文关键词作为别名
    return allProducts
      .filter(p => p.product_name || p.product_name_zh)
      .map(p => cleanOffProduct(p, keyword));

  } catch (error) {
    console.error(`[OFF API] 请求失败: ${error.message}`);
    return [];
  }
}

/**
 * 清洗 Open Food Facts 返回的产品数据
 * @param {Object} product - OFF原始产品数据
 * @param {string} searchKeyword - 原始搜索关键词（用于添加中文别名）
 * @returns {Object} 清洗后的标准格式
 */
function cleanOffProduct(product, searchKeyword = '') {
  const nutriments = product.nutriments || {};

  // 确定中文名称
  let nameZH = product.product_name_zh || '';
  if (!nameZH && searchKeyword && /[\u4e00-\u9fa5]/.test(searchKeyword)) {
    // 如果没有中文名，用搜索关键词作为中文名参考
    nameZH = searchKeyword;
  }

  return {
    // 基础信息
    name: nameZH || product.product_name || '未知食物',
    nameEN: product.product_name || '',
    brand: product.brands || '',
    aliases: nameZH ? [nameZH] : [],

    // 每100g营养成分
    calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
    protein: Number((nutriments.proteins_100g || 0).toFixed(1)),
    fat: Number((nutriments.fat_100g || 0).toFixed(1)),
    carbs: Number((nutriments.carbohydrates_100g || 0).toFixed(1)),
    fiber: Number((nutriments.fiber_100g || 0).toFixed(1)),
    sodium: Number((nutriments.sodium_100g || 0).toFixed(3)),

    // 份量信息
    servingSize: product.serving_size || '100g',

    // 图片
    imageUrl: product.image_url || '',

    // 元数据
    source: 'open_food_facts',
    sourceId: product.code || '',
    cachedAt: Date.now()
  };
}

// ==================== AI 智能估算热量 ====================

/**
 * 调用 AI（通义千问）估算食物热量
 * @param {string} foodName - 食物名称
 * @returns {Promise<Object|null>} 估算的食物数据，失败返回 null
 */
async function queryFoodByAI(foodName) {
  try {
    console.log(`[AI估算] 查询食物: ${foodName}`);

    // 调用 foodRecognitionQwen 云函数（复用同款 AI）
    const result = await cloud.callFunction({
      name: 'foodRecognitionQwen',
      data: {
        mode: 'query',  // 查询模式（非图片识别）
        foodName: foodName
      }
    });

    // 如果云函数支持查询模式
    if (result.result?.success && result.result?.food) {
      const food = result.result.food;
      console.log(`[AI估算] 成功: ${food.name}, ${food.calories}kcal`);
      return {
        name: food.name || foodName,
        nameEN: food.nameEN || '',
        category: food.category || '',
        calories: food.calories || 0,
        protein: food.protein || 0,
        fat: food.fat || 0,
        carbs: food.carbs || 0,
        fiber: food.fiber || 0,
        source: 'ai_estimated',
        servingSize: '100g',
        gramsPerServing: 100,
        createdAt: Date.now()
      };
    }

    // 备用方案：直接调用通义千问 API 估算
    return await estimateByQwenDirect(foodName);

  } catch (error) {
    console.error(`[AI估算] 失败: ${error.message}`);
    return null;
  }
}

/**
 * 直接调用通义千问 API 估算热量（备用方案）
 */
async function estimateByQwenDirect(foodName) {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
    if (!apiKey) {
      console.log('[AI估算] 未配置 API Key，跳过');
      return null;
    }

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-turbo',
        messages: [
          {
            role: 'system',
            content: '你是营养师，只输出JSON格式的食物营养数据。所有数值基于每100克。'
          },
          {
            role: 'user',
            content: `查询"${foodName}"的营养成分，返回JSON：{"name":"中文名","nameEN":"英文名","category":"分类","calories":数值,"protein":数值,"fat":数值,"carbs":数值,"fiber":数值}`
          }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000  // AI 思考时间可能较长，设置 60 秒
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const data = JSON.parse(match[0]);
      console.log(`[AI估算-直接] 成功: ${data.name}, ${data.calories}kcal`);
      return {
        ...data,
        source: 'ai_estimated',
        servingSize: '100g',
        gramsPerServing: 100,
        createdAt: Date.now()
      };
    }
  } catch (error) {
    console.error(`[AI估算-直接] 失败: ${error.message}`);
  }
  return null;
}

// ==================== 手动输入搜索策略 ====================

/**
 * 获取用户常用食物名称映射（用于搜索置顶）
 * @param {string} openid - 用户ID
 * @returns {Promise<Map>} 食物名称 -> 使用次数
 */
async function getUserFrequentFoodMap(openid) {
  if (!openid) return new Map();

  try {
    const result = await db.collection('DietLog')
      .aggregate()
      .match({ _openid: openid })
      .group({
        _id: '$name',
        count: $.sum(1)
      })
      .sort({ count: -1 })
      .limit(50)
      .end();

    const map = new Map();
    for (const item of result.list || []) {
      map.set(item._id, item.count);
    }
    return map;
  } catch (err) {
    console.error('[常用食物] 查询失败:', err.message);
    return new Map();
  }
}

/**
 * 快速搜索（仅查本地数据库）
 * 用于手动输入时的实时建议，响应极快（< 100ms）
 *
 * 特性：自动将用户常用食物置顶
 *
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @param {string} openid - 用户ID（用于查询个人菜品和常用食物）
 * @returns {Promise<Object>} 搜索结果
 */
async function quickSearch(keyword, limit = 10, openid = '') {
  const trimmedKeyword = (keyword || '').trim();
  if (!trimmedKeyword) {
    return { results: [], userDishes: [], frequent: [], total: 0, hasMore: false };
  }

  console.log(`[快速搜索] 关键词: ${trimmedKeyword}, 用户: ${openid?.slice(-6) || '无'}`);

  const regex = db.RegExp({ regexp: trimmedKeyword, options: 'i' });

  // 并行查询：本地数据库 + 用户菜品 + 用户常用食物
  const [localResult, userDishesResult, frequentMap] = await Promise.all([
    db.collection('FoodDB')
      .where(_.or([
        { name: regex },
        { nameEN: regex },
        { aliases: regex }
      ]))
      .limit(limit * 2)  // 多取一些，排序后再截取
      .get()
      .catch(() => ({ data: [] })),

    openid ? db.collection('UserDishes')
      .where({ _openid: openid, name: regex })
      .limit(5)
      .get()
      .catch(() => ({ data: [] })) : { data: [] },

    // 获取用户常用食物映射
    getUserFrequentFoodMap(openid)
  ]);

  const localItems = localResult.data || [];
  const userDishes = userDishesResult.data || [];

  // 智能排序：常用食物 > 精准匹配 > 内置数据 > 其他
  const results = [...localItems]
    .sort((a, b) => {
      // 1. 用户常用食物优先（使用次数越多越靠前）
      const aFreq = frequentMap.get(a.name) || 0;
      const bFreq = frequentMap.get(b.name) || 0;
      if (aFreq !== bFreq) return bFreq - aFreq;

      // 2. 精准匹配优先
      const aExact = a.name === trimmedKeyword ? 2 : (a.name.startsWith(trimmedKeyword) ? 1 : 0);
      const bExact = b.name === trimmedKeyword ? 2 : (b.name.startsWith(trimmedKeyword) ? 1 : 0);
      if (aExact !== bExact) return bExact - aExact;

      // 3. 内置/手动数据优先
      const prioritySources = ['builtin', 'manual'];
      const aPriority = prioritySources.includes(a.source) ? 1 : 0;
      const bPriority = prioritySources.includes(b.source) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;

      return 0;
    })
    .slice(0, limit)
    .map(item => ({
      _id: item._id,
      name: item.name,
      calories: item.calories || 0,
      protein: item.protein || 0,
      fat: item.fat || 0,
      carbs: item.carbs || 0,
      category: item.category || '',
      source: item.source || 'unknown',
      servingSize: item.servingSize || '100g',
      useCount: frequentMap.get(item.name) || 0  // 返回使用次数
    }));

  // 用户菜品也标记使用次数
  const userDishesWithCount = userDishes.map(d => ({
    _id: d._id,
    name: d.name,
    calories: d.calories || 0,
    protein: d.protein || 0,
    fat: d.fat || 0,
    carbs: d.carbs || 0,
    source: 'user_dish',
    useCount: d.useCount || 0
  })).sort((a, b) => (b.useCount || 0) - (a.useCount || 0));

  console.log(`[快速搜索] 本地: ${results.length}, 用户菜品: ${userDishes.length}, 常用食物数: ${frequentMap.size}`);

  return {
    results,
    userDishes: userDishesWithCount,
    total: results.length + userDishesWithCount.length,
    hasMore: localItems.length === 0  // 如果本地没结果，提示可以深度搜索
  };
}

// ==================== 三层搜索策略 ====================

/**
 * 三层搜索食物（核心功能）
 *
 * 流程（手动输入场景）：
 * 1. 用户输入关键词 → quickSearch（实时建议）
 * 2. 用户点击搜索/未找到 → searchFood（完整搜索）
 *
 * 第一层（极速）：本地 FoodDB 数据库
 * 第二层（智能）：AI 估算热量，结果写入 FoodDB
 * 第三层（兜底）：Open Food Facts API + 内置数据
 *
 * @param {string} keyword - 搜索关键词
 * @param {number} limit - 返回数量限制
 * @param {string} openid - 用户ID（用于查询个人菜品）
 * @param {string} mode - 搜索模式 'quick'(仅本地) | 'full'(完整三层)
 * @returns {Promise<Object>} 搜索结果
 */
async function searchFood(keyword, limit = 20, openid = '', mode = 'full') {
  // 快速模式：直接调用 quickSearch
  if (mode === 'quick') {
    return await quickSearch(keyword, limit, openid);
  }
  const trimmedKeyword = (keyword || '').trim();
  if (!trimmedKeyword) {
    return { local: [], ai: [], api: [], userDishes: [], merged: [], total: 0 };
  }

  const regex = db.RegExp({ regexp: trimmedKeyword, options: 'i' });

  // ========== 第一层：本地 FoodDB（极速） ==========
  console.log(`[搜索] 第一层：查询本地 FoodDB`);

  // 并行查询：本地数据库 + 用户菜品 + 用户常用食物
  const [localResult, userDishesResult, frequentMap] = await Promise.all([
    db.collection('FoodDB')
      .where(_.or([
        { name: regex },
        { nameEN: regex },
        { aliases: regex },
        { category: regex }
      ]))
      .limit(limit * 2)
      .get()
      .catch(() => ({ data: [] })),

    openid ? db.collection('UserDishes')
      .where({ _openid: openid, name: regex })
      .limit(10)
      .get()
      .catch(() => ({ data: [] })) : { data: [] },

    // 获取用户常用食物映射
    getUserFrequentFoodMap(openid)
  ]);

  const localItems = localResult.data || [];
  const userDishes = userDishesResult.data || [];

  console.log(`[搜索] 本地结果: ${localItems.length}, 用户菜品: ${userDishes.length}, 常用: ${frequentMap.size}`);

  // 如果本地有结果，直接返回（极速响应）
  if (localItems.length > 0) {
    // 智能排序：常用食物 > 精准匹配 > 内置/手动数据 > 热量高的
    const merged = [...localItems]
      .sort((a, b) => {
        // 1. 用户常用食物优先
        const aFreq = frequentMap.get(a.name) || 0;
        const bFreq = frequentMap.get(b.name) || 0;
        if (aFreq !== bFreq) return bFreq - aFreq;

        // 2. 精准匹配优先（名称完全相同）
        const aExact = a.name === trimmedKeyword ? 1 : 0;
        const bExact = b.name === trimmedKeyword ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        // 3. 内置/手动数据优先（更准确）
        const prioritySources = ['builtin', 'manual', 'ai_estimated'];
        const aPriority = prioritySources.includes(a.source) ? 1 : 0;
        const bPriority = prioritySources.includes(b.source) ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;

        // 4. 按热量降序
        return (b.calories || 0) - (a.calories || 0);
      })
      .slice(0, limit)
      .map(item => ({
        ...item,
        useCount: frequentMap.get(item.name) || 0
      }));

    return {
      local: localItems,
      ai: [],
      api: [],
      userDishes,
      merged,
      total: merged.length,
      source: 'local'
    };
  }

  // ========== 第二层：AI 估算（智能） ==========
  console.log(`[搜索] 第二层：调用 AI 估算热量`);

  const aiResult = await queryFoodByAI(trimmedKeyword);
  let aiItems = [];

  if (aiResult) {
    aiItems = [aiResult];

    // 异步写入 FoodDB（让下次搜索变快）
    cacheToFoodDB(aiItems).catch(err => {
      console.error(`[缓存] AI结果写入失败: ${err.message}`);
    });

    const merged = aiItems
      .sort((a, b) => (b.calories || 0) - (a.calories || 0))
      .slice(0, limit);

    return {
      local: [],
      ai: aiItems,
      api: [],
      userDishes,
      merged,
      total: merged.length,
      source: 'ai'
    };
  }

  // ========== 第三层：Open Food Facts（兜底） ==========
  console.log(`[搜索] 第三层：调用 Open Food Facts API`);

  const apiItems = await searchOpenFoodFacts(trimmedKeyword, limit);

  if (apiItems.length > 0) {
    // 异步缓存到本地
    cacheToFoodDB(apiItems).catch(err => {
      console.error(`[缓存] API结果写入失败: ${err.message}`);
    });
  }

  // 如果 API 也没有结果，使用内置数据
  let builtinItems = [];
  if (apiItems.length === 0) {
    console.log(`[搜索] 所有层级无结果，使用内置数据`);
    builtinItems = searchBuiltinFoods(trimmedKeyword);
  }

  const merged = [...apiItems, ...builtinItems]
    .sort((a, b) => (b.calories || 0) - (a.calories || 0))
    .slice(0, limit);

  return {
    local: [],
    ai: [],
    api: apiItems,
    builtin: builtinItems,
    userDishes,
    merged,
    total: merged.length,
    source: apiItems.length > 0 ? 'api' : 'builtin'
  };
}

// ==================== 拍照识别 + 搜索一体化 ====================

/**
 * 拍照识别食物并搜索营养信息（一体化接口）
 *
 * 流程：
 * 1. 调用通义千问视觉模型识别图片中的食物
 * 2. 对每个识别出的食物，查本地数据库
 * 3. 数据库没有 → AI估算营养信息 → 写入数据库
 * 4. AI失败 → Open Food Facts查询
 *
 * @param {Object} imageInput - 图片输入 { fileID: '云存储ID' } 或 { imageData: 'base64' }
 * @param {string} openid - 用户ID
 * @returns {Promise<Object>} 识别和搜索结果
 */
async function recognizeAndSearch(imageInput, openid = '') {
  console.log('[识别+搜索] 开始处理图片');

  // ========== 第一步：调用 AI 识别图片中的食物 ==========
  let recognizedFoods = [];

  try {
    // 构建请求参数，支持 fileID 和 imageData 两种方式
    const requestData = {};
    if (imageInput.fileID) {
      requestData.fileID = imageInput.fileID;
      console.log('[识别+搜索] 使用云存储方式:', imageInput.fileID);
    } else if (imageInput.imageData || imageInput.image) {
      requestData.imageData = imageInput.imageData || imageInput.image;
      console.log('[识别+搜索] 使用 Base64 方式');
    } else {
      return {
        success: false,
        error: '请提供 fileID 或 imageData',
        stage: 'input'
      };
    }

    // 调用 foodRecognitionQwen 云函数
    const recognizeResult = await cloud.callFunction({
      name: 'foodRecognitionQwen',
      data: requestData
    });

    if (recognizeResult.result?.success && recognizeResult.result?.foods) {
      recognizedFoods = recognizeResult.result.foods;
      console.log(`[识别+搜索] AI识别到 ${recognizedFoods.length} 种食物`);
    } else {
      console.error('[识别+搜索] AI识别失败:', recognizeResult.result?.error);
      return {
        success: false,
        error: recognizeResult.result?.error || 'AI识别失败',
        stage: 'recognition'
      };
    }
  } catch (error) {
    console.error('[识别+搜索] 调用识别服务失败:', error.message);
    return {
      success: false,
      error: error.message,
      stage: 'recognition'
    };
  }

  if (recognizedFoods.length === 0) {
    return {
      success: false,
      error: '未识别到任何食物',
      stage: 'recognition'
    };
  }

  // ========== 第二步：对每个食物进行搜索/估算 ==========
  const results = [];

  for (const recognized of recognizedFoods) {
    const foodName = recognized.name;
    console.log(`[识别+搜索] 处理食物: ${foodName}`);

    // 查本地数据库
    const regex = db.RegExp({ regexp: foodName, options: 'i' });
    const localResult = await db.collection('FoodDB')
      .where(_.or([
        { name: regex },
        { nameEN: regex },
        { aliases: regex }
      ]))
      .limit(1)
      .get()
      .catch(() => ({ data: [] }));

    if (localResult.data && localResult.data.length > 0) {
      // 数据库有记录，直接使用
      const dbFood = localResult.data[0];
      console.log(`[识别+搜索] 数据库命中: ${dbFood.name}`);
      results.push({
        recognized,
        food: dbFood,
        source: 'database',
        confidence: recognized.confidence || 0.9
      });
      continue;
    }

    // 数据库没有，尝试 AI 估算
    console.log(`[识别+搜索] 数据库未命中，尝试AI估算`);

    // 先检查 AI 识别结果中是否已有营养数据
    if (recognized.calories && recognized.calories > 0) {
      // AI 识别时已经返回了营养数据，直接使用并写入数据库
      const aiFood = {
        name: foodName,
        nameEN: '',
        category: '',
        calories: recognized.calories || 0,
        protein: recognized.macros?.protein || 0,
        fat: recognized.macros?.fat || 0,
        carbs: recognized.macros?.carbs || 0,
        fiber: 0,
        source: 'ai_recognition',
        servingSize: '100g',
        gramsPerServing: 100,
        description: recognized.description || '',
        createdAt: Date.now()
      };

      // 异步写入数据库
      cacheToFoodDB([aiFood]).catch(err => {
        console.error(`[识别+搜索] 缓存失败: ${err.message}`);
      });

      results.push({
        recognized,
        food: aiFood,
        source: 'ai_recognition',
        confidence: recognized.confidence || 0.8
      });
      continue;
    }

    // AI 识别没有营养数据，调用 AI 单独估算
    const aiEstimate = await queryFoodByAI(foodName);
    if (aiEstimate) {
      // 异步写入数据库
      cacheToFoodDB([aiEstimate]).catch(err => {
        console.error(`[识别+搜索] 缓存失败: ${err.message}`);
      });

      results.push({
        recognized,
        food: aiEstimate,
        source: 'ai_estimated',
        confidence: recognized.confidence || 0.7
      });
      continue;
    }

    // AI 估算也失败，尝试 Open Food Facts
    console.log(`[识别+搜索] AI估算失败，尝试OFF API`);
    const offResults = await searchOpenFoodFacts(foodName, 1);

    if (offResults.length > 0) {
      const offFood = offResults[0];

      // 异步写入数据库
      cacheToFoodDB([offFood]).catch(err => {
        console.error(`[识别+搜索] 缓存失败: ${err.message}`);
      });

      results.push({
        recognized,
        food: offFood,
        source: 'open_food_facts',
        confidence: recognized.confidence || 0.6
      });
      continue;
    }

    // 所有方式都失败，使用 AI 识别的原始数据（可能不准确）
    results.push({
      recognized,
      food: {
        name: foodName,
        calories: recognized.calories || 0,
        protein: recognized.macros?.protein || 0,
        fat: recognized.macros?.fat || 0,
        carbs: recognized.macros?.carbs || 0,
        source: 'ai_recognition_only',
        servingSize: '100g',
        gramsPerServing: 100
      },
      source: 'ai_recognition_only',
      confidence: recognized.confidence || 0.5,
      warning: '营养数据可能不准确'
    });
  }

  console.log(`[识别+搜索] 完成，共处理 ${results.length} 种食物`);

  // 简化返回结构，合并冗余字段
  const simplifiedResults = results.map(r => ({
    // 基础信息
    name: r.food?.name || r.recognized?.name,
    description: r.recognized?.description || '',
    confidence: r.confidence,
    source: r.source,

    // AI估计的份量（克数）
    amount: r.recognized?.amount || 100,

    // 营养数据（每100g）
    calories: r.food?.calories || 0,
    protein: r.food?.protein || 0,
    fat: r.food?.fat || 0,
    carbs: r.food?.carbs || 0,

    // 可选字段
    category: r.food?.category || '',
    servingSize: r.food?.servingSize || '100g',
    foodId: r.food?._id || null,

    // 警告信息（如有）
    ...(r.warning ? { warning: r.warning } : {})
  }));

  return {
    success: true,
    foods: simplifiedResults,
    summary: {
      totalFoods: results.length,
      totalCalories: results.reduce((sum, r) => sum + (r.food?.calories || 0), 0),
      totalProtein: Number(results.reduce((sum, r) => sum + (r.food?.protein || 0), 0).toFixed(1)),
      totalFat: Number(results.reduce((sum, r) => sum + (r.food?.fat || 0), 0).toFixed(1)),
      totalCarbs: Number(results.reduce((sum, r) => sum + (r.food?.carbs || 0), 0).toFixed(1)),
      sources: {
        database: results.filter(r => r.source === 'database').length,
        ai: results.filter(r => r.source.startsWith('ai_')).length,
        api: results.filter(r => r.source === 'open_food_facts').length
      }
    }
  };
}

/**
 * 异步缓存API数据到FoodDB
 * @param {Array} items - 要缓存的食物数据
 */
async function cacheToFoodDB(items) {
  if (!items || items.length === 0) return;

  console.log(`[缓存] 准备写入 ${items.length} 条数据到 FoodDB`);

  // 批量检查已存在的记录（避免重复）
  const names = items.map(i => i.name);
  const existing = await db.collection('FoodDB')
    .where({ name: _.in(names) })
    .field({ name: true })
    .get()
    .catch(() => ({ data: [] }));

  const existingNames = new Set((existing.data || []).map(d => d.name));
  const newItems = items.filter(i => !existingNames.has(i.name));

  if (newItems.length === 0) {
    console.log('[缓存] 所有数据已存在，跳过写入');
    return;
  }

  // 逐条写入（云数据库不支持批量insert）
  let successCount = 0;
  for (const item of newItems) {
    try {
      await db.collection('FoodDB').add({
        data: {
          ...item,
          createdAt: Date.now()
        }
      });
      successCount++;
    } catch (err) {
      console.error(`[缓存] 写入失败: ${item.name} - ${err.message}`);
    }
  }

  console.log(`[缓存] 成功写入 ${successCount}/${newItems.length} 条数据`);
}

// ==================== 用户自定义菜品 (UserDishes) ====================

/**
 * 添加自定义菜品
 * @param {string} openid - 用户ID
 * @param {Object} dish - 菜品数据
 */
async function addCustomDish(openid, dish) {
  if (!dish.name) {
    throw new Error('菜品名称不能为空');
  }

  const data = {
    _openid: openid,
    name: dish.name,
    description: dish.description || '',

    // 营养信息（每份）
    calories: Number(dish.calories) || 0,
    protein: Number(dish.protein) || 0,
    fat: Number(dish.fat) || 0,
    carbs: Number(dish.carbs) || 0,

    // 食材组成（可选）
    ingredients: dish.ingredients || [],

    // 份量信息
    servingSize: dish.servingSize || '1份',
    gramsPerServing: Number(dish.gramsPerServing) || 100,

    // 自定义单位映射
    unitMap: dish.unitMap || {},

    // 图片
    imageUrl: dish.imageUrl || '',

    // 元数据
    createdAt: Date.now(),
    updatedAt: Date.now(),
    useCount: 0
  };

  const result = await db.collection('UserDishes').add({ data });
  return { _id: result._id, ...data };
}

/**
 * 获取用户自定义菜品列表
 * @param {string} openid - 用户ID
 * @param {number} limit - 返回数量
 */
async function getUserDishes(openid, limit = 50) {
  const result = await db.collection('UserDishes')
    .where({ _openid: openid })
    .orderBy('useCount', 'desc')
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();

  return result.data || [];
}

/**
 * 更新自定义菜品
 * @param {string} openid - 用户ID
 * @param {string} dishId - 菜品ID
 * @param {Object} updates - 更新数据
 */
async function updateCustomDish(openid, dishId, updates) {
  // 移除不允许更新的字段
  delete updates._id;
  delete updates._openid;
  delete updates.createdAt;

  updates.updatedAt = Date.now();

  const result = await db.collection('UserDishes')
    .where({ _id: dishId, _openid: openid })
    .update({ data: updates });

  return { updated: result.stats?.updated || 0 };
}

/**
 * 删除自定义菜品
 * @param {string} openid - 用户ID
 * @param {string} dishId - 菜品ID
 */
async function deleteCustomDish(openid, dishId) {
  const result = await db.collection('UserDishes')
    .where({ _id: dishId, _openid: openid })
    .remove();

  return { deleted: result.stats?.removed || 0 };
}

// ==================== 饮食记录 (DietLog) ====================

/**
 * 添加饮食记录
 * @param {string} openid - 用户ID
 * @param {Object} record - 记录数据
 */
async function addDietLog(openid, record) {
  const data = {
    _openid: openid,

    // 食物信息
    foodId: record.foodId || '',          // 关联FoodDB或UserDishes
    foodSource: record.foodSource || 'manual', // 'FoodDB' | 'UserDishes' | 'manual' | 'ai_recognition'
    name: record.name || '未知食物',

    // 份量
    amount: Number(record.amount) || 100,
    unit: record.unit || 'g',
    grams: Number(record.grams) || Number(record.amount) || 100,

    // 营养数据（实际摄入量）
    calories: Number(record.calories) || 0,
    protein: Number(record.protein) || 0,
    fat: Number(record.fat) || 0,
    carbs: Number(record.carbs) || 0,

    // 餐次
    mealType: record.mealType || 'other', // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'

    // 时间
    recordDate: record.recordDate || todayString(),
    recordTime: record.recordTime || new Date().toTimeString().slice(0, 5),

    // 图片（AI识别来源时可能有）
    imageUrl: record.imageUrl || '',

    // 元数据
    createdAt: Date.now()
  };

  const result = await db.collection('DietLog').add({ data });

  // 如果是来自UserDishes，更新使用次数
  if (record.foodSource === 'UserDishes' && record.foodId) {
    db.collection('UserDishes')
      .doc(record.foodId)
      .update({ data: { useCount: _.inc(1) } })
      .catch(() => {});
  }

  return { _id: result._id, ...data };
}

/**
 * 获取某日饮食记录
 * @param {string} openid - 用户ID
 * @param {string} date - 日期 YYYY-MM-DD
 */
async function getDietLogs(openid, date) {
  const targetDate = date || todayString();

  const result = await db.collection('DietLog')
    .where({
      _openid: openid,
      recordDate: targetDate
    })
    .orderBy('createdAt', 'desc')
    .get();

  const logs = result.data || [];

  // 计算当日汇总
  const summary = logs.reduce((acc, log) => {
    acc.totalCalories += log.calories || 0;
    acc.totalProtein += log.protein || 0;
    acc.totalFat += log.fat || 0;
    acc.totalCarbs += log.carbs || 0;
    return acc;
  }, { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 });

  // 按餐次分组
  const byMeal = {};
  for (const log of logs) {
    const meal = log.mealType || 'other';
    if (!byMeal[meal]) byMeal[meal] = [];
    byMeal[meal].push(log);
  }

  return {
    date: targetDate,
    logs,
    summary: {
      ...summary,
      totalProtein: Number(summary.totalProtein.toFixed(1)),
      totalFat: Number(summary.totalFat.toFixed(1)),
      totalCarbs: Number(summary.totalCarbs.toFixed(1))
    },
    byMeal,
    count: logs.length
  };
}

/**
 * 获取日期范围内的饮食记录
 * @param {string} openid - 用户ID
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 */
async function getDietLogsByRange(openid, startDate, endDate) {
  const result = await db.collection('DietLog')
    .where({
      _openid: openid,
      recordDate: _.gte(startDate).and(_.lte(endDate))
    })
    .orderBy('recordDate', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();

  return result.data || [];
}

/**
 * 删除饮食记录
 * @param {string} openid - 用户ID
 * @param {string} logId - 记录ID
 */
async function deleteDietLog(openid, logId) {
  const result = await db.collection('DietLog')
    .where({ _id: logId, _openid: openid })
    .remove();

  return { deleted: result.stats?.removed || 0 };
}

/**
 * 更新饮食记录
 * @param {string} openid - 用户ID
 * @param {string} logId - 记录ID
 * @param {Object} updates - 更新数据
 */
async function updateDietLog(openid, logId, updates) {
  delete updates._id;
  delete updates._openid;
  delete updates.createdAt;

  updates.updatedAt = Date.now();

  const result = await db.collection('DietLog')
    .where({ _id: logId, _openid: openid })
    .update({ data: updates });

  return { updated: result.stats?.updated || 0 };
}

// ==================== 常用食物统计 ====================

/**
 * 获取用户常用食物（基于DietLog统计）
 * @param {string} openid - 用户ID
 * @param {number} limit - 返回数量
 * @param {string} mealType - 餐次类型（可选）：breakfast/lunch/dinner/snack
 */
async function getFrequentFoods(openid, limit = 20, mealType = '') {
  // 构建查询条件
  const matchCondition = { _openid: openid };

  // 如果指定了餐次类型，添加筛选条件
  if (mealType && mealType !== 'all') {
    matchCondition.mealType = mealType;
  }

  // 方案：使用聚合查询统计食物出现频次
  const result = await db.collection('DietLog')
    .aggregate()
    .match(matchCondition)
    .group({
      _id: '$name',
      count: $.sum(1),
      lastUsed: $.max('$createdAt'),
      avgCalories: $.avg('$calories'),
      avgProtein: $.avg('$protein'),
      avgCarbs: $.avg('$carbs'),
      avgFat: $.avg('$fat'),
      avgGrams: $.avg('$grams'),
      foodId: $.first('$foodId'),
      foodSource: $.first('$foodSource'),
      category: $.first('$category')
    })
    .sort({ count: -1, lastUsed: -1 })
    .limit(limit)
    .end();

  return (result.list || []).map(item => ({
    name: item._id,
    count: item.count,
    lastUsed: item.lastUsed,
    avgCalories: Math.round(item.avgCalories || 0),
    avgProtein: Math.round((item.avgProtein || 0) * 10) / 10,
    avgCarbs: Math.round((item.avgCarbs || 0) * 10) / 10,
    avgFat: Math.round((item.avgFat || 0) * 10) / 10,
    avgGrams: Math.round(item.avgGrams || 100),
    foodId: item.foodId,
    foodSource: item.foodSource,
    category: item.category
  }));
}

// ==================== 热量计算 ====================

/**
 * 计算食物热量（支持多种单位）
 * @param {string} foodId - 食物ID
 * @param {string} source - 数据来源 'FoodDB' | 'UserDishes'
 * @param {number} amount - 数量
 * @param {string} unit - 单位
 */
async function calculateCalories(foodId, source, amount, unit = 'g') {
  let food;

  // 根据来源获取食物数据
  if (source === 'UserDishes') {
    const result = await db.collection('UserDishes').doc(foodId).get();
    food = result.data;
  } else {
    const result = await db.collection('FoodDB').doc(foodId).get();
    food = result.data;
  }

  if (!food) {
    throw new Error('食物不存在');
  }

  // 单位转换为克
  let grams;
  if (unit === 'g' || unit === '克') {
    grams = Number(amount);
  } else if (unit === 'serving' || unit === '份') {
    grams = Number(amount) * (food.gramsPerServing || 100);
  } else if (food.unitMap && food.unitMap[unit]) {
    // 使用自定义单位映射
    grams = Number(amount) * food.unitMap[unit];
  } else {
    // 尝试从通用单位映射表查询
    const unitMapResult = await db.collection('UnitMap')
      .where({
        unit: unit,
        category: food.category || ''
      })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }));

    if (unitMapResult.data?.[0]?.grams) {
      grams = Number(amount) * unitMapResult.data[0].grams;
    } else {
      throw new Error(`无法识别的单位: ${unit}`);
    }
  }

  // 计算实际营养值（基于100g数据）
  const factor = grams / 100;

  return {
    food: {
      id: foodId,
      name: food.name,
      source
    },
    input: { amount, unit },
    grams,
    nutrition: {
      calories: Math.round((food.calories || 0) * factor),
      protein: Number(((food.protein || 0) * factor).toFixed(1)),
      fat: Number(((food.fat || 0) * factor).toFixed(1)),
      carbs: Number(((food.carbs || 0) * factor).toFixed(1))
    }
  };
}

// ==================== FoodDB 管理 ====================

/**
 * 获取食物详情
 * @param {string} foodId - 食物ID
 * @param {string} source - 来源 'FoodDB' | 'UserDishes'
 */
async function getFoodDetail(foodId, source = 'FoodDB') {
  const collection = source === 'UserDishes' ? 'UserDishes' : 'FoodDB';
  const result = await db.collection(collection).doc(foodId).get();
  return result.data || null;
}

/**
 * 手动添加食物到FoodDB（管理员功能）
 * @param {Object} food - 食物数据
 */
async function addFoodToDatabase(food) {
  const data = {
    name: food.name,
    nameEN: food.nameEN || '',
    aliases: food.aliases || [],
    category: food.category || '',
    brand: food.brand || '',

    // 每100g营养成分
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    fat: Number(food.fat) || 0,
    carbs: Number(food.carbs) || 0,
    fiber: Number(food.fiber) || 0,
    sodium: Number(food.sodium) || 0,

    // 份量
    servingSize: food.servingSize || '100g',
    gramsPerServing: Number(food.gramsPerServing) || 100,

    // 单位映射
    unitMap: food.unitMap || {},

    // 图片
    imageUrl: food.imageUrl || '',

    // 元数据
    source: 'manual',
    createdAt: Date.now()
  };

  const result = await db.collection('FoodDB').add({ data });
  return { _id: result._id, ...data };
}

// ==================== 聚合引用 ====================
const $ = db.command.aggregate;

// ==================== 初始化内置数据 ====================

/**
 * 将内置食物数据批量写入 FoodDB
 * 只需调用一次，用于初始化数据库
 */
async function initBuiltinFoods() {
  console.log(`[初始化] 开始写入 ${BUILTIN_FOODS.length} 条内置数据`);

  // 检查已存在的数据
  const existingNames = new Set();
  const existingResult = await db.collection('FoodDB')
    .where({ source: _.in(['builtin', 'manual']) })
    .field({ name: true })
    .limit(200)
    .get()
    .catch(() => ({ data: [] }));

  for (const item of existingResult.data || []) {
    existingNames.add(item.name);
  }

  console.log(`[初始化] 数据库已有 ${existingNames.size} 条数据`);

  // 过滤出需要新增的数据
  const newFoods = BUILTIN_FOODS.filter(f => !existingNames.has(f.name));

  if (newFoods.length === 0) {
    console.log('[初始化] 所有内置数据已存在，无需写入');
    return { added: 0, skipped: BUILTIN_FOODS.length };
  }

  // 批量写入
  let successCount = 0;
  for (const food of newFoods) {
    try {
      await db.collection('FoodDB').add({
        data: {
          name: food.name,
          nameEN: food.nameEN || '',
          aliases: [food.name],
          category: food.category || '',
          brand: '',
          calories: food.calories || 0,
          protein: food.protein || 0,
          fat: food.fat || 0,
          carbs: food.carbs || 0,
          fiber: food.fiber || 0,
          sodium: 0,
          servingSize: '100g',
          gramsPerServing: 100,
          unitMap: food.unitMap || {},
          imageUrl: '',
          source: 'builtin',
          createdAt: Date.now()
        }
      });
      successCount++;
    } catch (err) {
      console.error(`[初始化] 写入失败: ${food.name} - ${err.message}`);
    }
  }

  console.log(`[初始化] 成功写入 ${successCount}/${newFoods.length} 条数据`);
  return { added: successCount, skipped: BUILTIN_FOODS.length - newFoods.length };
}

/**
 * 清理 FoodDB 中的缓存数据
 * @param {string} source - 要清理的数据来源，默认 'open_food_facts'
 * @param {string} keyword - 可选，只清理包含该关键词的数据
 */
async function cleanFoodCache(source = 'open_food_facts', keyword = '') {
  console.log(`[清理] 开始清理 source=${source}, keyword=${keyword || '全部'}`);

  let query = { source };

  // 如果指定了关键词，只清理匹配的数据
  if (keyword) {
    const regex = db.RegExp({ regexp: keyword, options: 'i' });
    query = _.and([
      { source },
      _.or([{ name: regex }, { nameEN: regex }, { aliases: regex }])
    ]);
  }

  // 云数据库单次最多删除 100 条，需要循环删除
  let totalDeleted = 0;
  let batchCount = 0;
  const maxBatches = 10; // 最多执行 10 轮，防止无限循环

  while (batchCount < maxBatches) {
    const result = await db.collection('FoodDB')
      .where(query)
      .limit(100)
      .remove();

    const deleted = result.stats?.removed || 0;
    totalDeleted += deleted;
    batchCount++;

    console.log(`[清理] 第 ${batchCount} 轮删除 ${deleted} 条`);

    if (deleted < 100) break; // 没有更多数据了
  }

  console.log(`[清理] 完成，共删除 ${totalDeleted} 条数据`);
  return { deleted: totalDeleted, batches: batchCount };
}

// ==================== 主入口 ====================

exports.main = async (event) => {
  const { action, payload = {} } = event || {};
  const { OPENID } = cloud.getWXContext();

  console.log(`[dietService] action=${action}, openid=${OPENID?.slice(-6)}`);

  try {
    switch (action) {
      // ========== 食物搜索 ==========

      // 快速搜索（仅本地，用于实时输入建议）
      case 'quickSearch':
        return ok(await quickSearch(
          payload.keyword,
          payload.limit || 10,
          OPENID
        ));

      // 完整搜索（三层架构）
      case 'searchFood':
        return ok(await searchFood(
          payload.keyword,
          payload.limit || 20,
          OPENID,
          payload.mode || 'full'  // 支持 'quick' | 'full'
        ));

      case 'getFoodDetail':
        return ok(await getFoodDetail(
          payload.foodId,
          payload.source || 'FoodDB'
        ));

      case 'recognizeAndSearch':
        // 拍照识别 + 搜索一体化接口（支持 fileID 和 imageData）
        const recognizeResult = await recognizeAndSearch(payload, OPENID);
        return recognizeResult.success ? ok(recognizeResult) : fail(recognizeResult.error);

      // ========== 用户自定义菜品 ==========
      case 'addCustomDish':
        return ok(await addCustomDish(OPENID, payload));

      case 'getUserDishes':
        return ok(await getUserDishes(OPENID, payload.limit || 50));

      case 'updateCustomDish':
        return ok(await updateCustomDish(
          OPENID,
          payload.dishId,
          payload.updates || {}
        ));

      case 'deleteCustomDish':
        return ok(await deleteCustomDish(OPENID, payload.dishId));

      // ========== 饮食记录 ==========
      case 'addDietLog':
        return ok(await addDietLog(OPENID, payload));

      case 'getDietLogs':
        return ok(await getDietLogs(OPENID, payload.date));

      case 'getDietLogsByRange':
        return ok(await getDietLogsByRange(
          OPENID,
          payload.startDate,
          payload.endDate
        ));

      case 'updateDietLog':
        return ok(await updateDietLog(
          OPENID,
          payload.logId,
          payload.updates || {}
        ));

      case 'deleteDietLog':
        return ok(await deleteDietLog(OPENID, payload.logId));

      // ========== 常用食物 ==========
      case 'getFrequentFoods':
        return ok(await getFrequentFoods(OPENID, payload.limit || 20, payload.mealType || ''));

      // ========== 热量计算 ==========
      case 'calculateCalories':
        return ok(await calculateCalories(
          payload.foodId,
          payload.source || 'FoodDB',
          payload.amount,
          payload.unit || 'g'
        ));

      // ========== FoodDB管理 ==========
      case 'addFoodToDatabase':
        return ok(await addFoodToDatabase(payload));

      case 'initBuiltinFoods':
        // 初始化内置数据到数据库（只需调用一次）
        return ok(await initBuiltinFoods());

      case 'cleanFoodCache':
        // 清理缓存数据（可选指定来源和关键词）
        return ok(await cleanFoodCache(
          payload.source || 'open_food_facts',
          payload.keyword || ''
        ));

      // ========== 兼容旧接口 ==========
      case 'addDietRecord':
        return ok(await addDietLog(OPENID, payload.record || payload));

      case 'getDietRecords':
        return ok((await getDietLogs(OPENID, payload.date)).logs);

      case 'deleteDietRecord':
        return ok(await deleteDietLog(OPENID, payload.recordId));

      case 'searchFoodDatabase':
        const result = await searchFood(payload.keyword, payload.limit || 20, OPENID);
        return ok(result.merged);

      default:
        return fail(`未知操作: ${action}`, 'UNKNOWN_ACTION');
    }
  } catch (error) {
    return fail(error.message || error);
  }
};
