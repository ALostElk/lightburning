// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 通义千问 API 云函数
 * 用于代理小程序调用通义千问API，避免暴露API Key
 */
exports.main = async (event, context) => {
  const { action, prompt, userData, dietRecords, nutritionGap, recipe } = event;

  // API配置 - 从云函数环境变量读取
  const API_KEY = cloud.env.QWEN_API_KEY || 'sk-cbf4265d902f4721ab7d08d7fedad32f';
  const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  try {
    switch (action) {
      case 'analyzeAndRecommend':
        return await analyzeAndRecommend(API_KEY, API_URL, userData, dietRecords, nutritionGap);
      
      case 'generateRecipeReason':
        return await generateRecipeReason(API_KEY, API_URL, recipe, userData, nutritionGap);
      
      case 'customPrompt':
        return await callQwen(API_KEY, API_URL, prompt);
      
      default:
        return {
          success: false,
          error: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 调用通义千问API
 */
async function callQwen(apiKey, apiUrl, prompt) {
  const https = require('https');
  const url = new URL(apiUrl);

  const postData = JSON.stringify({
    model: 'qwen-turbo',
    input: {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    },
    parameters: {
      result_format: 'message'
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.output && result.output.choices && result.output.choices.length > 0) {
            resolve({
              success: true,
              content: result.output.choices[0].message.content
            });
          } else {
            resolve({
              success: false,
              error: '响应格式错误'
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 分析用户饮食习惯并生成推荐
 */
async function analyzeAndRecommend(apiKey, apiUrl, userData, dietRecords, nutritionGap) {
  const recentRecords = dietRecords.slice(0, 7);
  const avgNutrition = calculateAverage(recentRecords);

  const prompt = `
你是一名专业的营养师和健康顾问，请根据用户的基本信息和近期饮食数据，提供专业的营养分析和建议。

用户基本信息：
- 性别：${userData.gender || '未知'}
- 年龄：${userData.age || '未知'}岁
- 身高：${userData.height || '未知'}cm
- 体重：${userData.weight || '未知'}kg
- 健康目标：${userData.goal || '未知'}
- 活动水平：${userData.activityLevel || '未知'}
- 饮食偏好：${(userData.dietaryPreferences || []).join('、') || '无'}

近${recentRecords.length}天平均营养摄入：
- 热量：${Math.round(avgNutrition.calories)}千卡/天
- 蛋白质：${Math.round(avgNutrition.protein)}克/天
- 碳水化合物：${Math.round(avgNutrition.carbs)}克/天
- 脂肪：${Math.round(avgNutrition.fat)}克/天

营养缺口分析：
- 蛋白质缺口：${Math.round(nutritionGap.proteinDeficit)}克（不足）/ ${Math.round(nutritionGap.proteinExcess)}克（超标）
- 碳水缺口：${Math.round(nutritionGap.carbsDeficit)}克（不足）/ ${Math.round(nutritionGap.carbsExcess)}克（超标）
- 脂肪缺口：${Math.round(nutritionGap.fatDeficit)}克（不足）/ ${Math.round(nutritionGap.fatExcess)}克（超标）
- 热量缺口：${Math.round(nutritionGap.caloriesDeficit)}千卡（不足）/ ${Math.round(nutritionGap.caloriesExcess)}千卡（超标）

请提供：
1. 营养状况综合评价
2. 3-5条具体的饮食建议
3. 推荐的食物类型和烹饪方式
4. 需要注意的营养素补充

输出格式必须为 JSON 对象，包含以下字段：
{
  "overall_assessment": "整体评价（50字内）",
  "nutrition_score": 85,
  "suggestions": [
    {
      "type": "protein",
      "severity": "warning",
      "icon": "💪",
      "title": "蛋白质摄入建议",
      "message": "建议内容",
      "priority": 1
    }
  ],
  "recommended_food_types": ["鸡胸肉", "鱼类", "豆制品"],
  "cooking_methods": ["清蒸", "水煮", "少油炒"],
  "food_tags_priority": ["高蛋白", "低卡", "低脂"]
}

注意：输出纯JSON格式，不要添加任何其他文字说明。
`;

  const response = await callQwen(apiKey, apiUrl, prompt);
  
  if (response.success) {
    try {
      const analysis = JSON.parse(response.content);
      return {
        success: true,
        data: analysis
      };
    } catch (e) {
      return {
        success: true,
        data: {
          rawText: response.content
        }
      };
    }
  }

  return response;
}

/**
 * 智能生成食谱推荐理由
 */
async function generateRecipeReason(apiKey, apiUrl, recipe, userData, nutritionGap) {
  const prompt = `
你是一名营养师，请为用户推荐这道食谱生成简短的推荐理由。

用户信息：
- 健康目标：${userData.goal || '减脂'}
- 营养缺口：蛋白质${nutritionGap.proteinDeficit > 0 ? '不足' : '充足'}，碳水${nutritionGap.carbsExcess > 0 ? '超标' : '适中'}

食谱信息：
- 名称：${recipe.name}
- 热量：${recipe.calories}卡
- 蛋白质：${recipe.protein}g
- 碳水：${recipe.carbs}g
- 脂肪：${recipe.fat}g
- 特点：${recipe.tags.join('、')}

请用一句话（30字内）说明为什么推荐这道菜，要结合用户的目标和营养缺口。
直接输出推荐理由，不要其他内容。
`;

  const response = await callQwen(apiKey, apiUrl, prompt);
  if (response.success) {
    return {
      success: true,
      reason: response.content.trim()
    };
  }
  return response;
}

/**
 * 计算平均营养摄入
 */
function calculateAverage(records) {
  if (records.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const total = records.reduce((acc, record) => {
    acc.calories += record.calories || 0;
    acc.protein += record.protein || 0;
    acc.carbs += record.carbs || 0;
    acc.fat += record.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: total.calories / records.length,
    protein: total.protein / records.length,
    carbs: total.carbs / records.length,
    fat: total.fat / records.length
  };
}

