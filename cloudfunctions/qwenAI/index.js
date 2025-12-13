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
  const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || 'sk-cbf4265d902f4721ab7d08d7fedad32f';
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
async function callQwen(apiKey, apiUrl, prompt, timeout = 15000) {
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
    // 设置超时定时器
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error('AI请求超时'));
    }, timeout);

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
        clearTimeout(timer);
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

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
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

  // 简化提示词，加快响应速度
  const prompt = `
你是营养师，请简洁分析用户饮食并给出建议。

用户信息：
- 目标：${userData.goal || '减脂'}
- 活动水平：${userData.activityLevel || '中等'}

近${recentRecords.length}天平均营养摄入：
- 热量：${Math.round(avgNutrition.calories)}千卡/天
- 蛋白质：${Math.round(avgNutrition.protein)}克/天
- 碳水：${Math.round(avgNutrition.carbs)}克/天
- 脂肪：${Math.round(avgNutrition.fat)}克/天

营养缺口：
- 蛋白质：${nutritionGap.proteinDeficit > 0 ? '不足' + Math.round(nutritionGap.proteinDeficit) + '克' : '超标' + Math.round(nutritionGap.proteinExcess) + '克'}
- 碳水：${nutritionGap.carbsDeficit > 0 ? '不足' + Math.round(nutritionGap.carbsDeficit) + '克' : '超标' + Math.round(nutritionGap.carbsExcess) + '克'}
- 脂肪：${nutritionGap.fatDeficit > 0 ? '不足' + Math.round(nutritionGap.fatDeficit) + '克' : '超标' + Math.round(nutritionGap.fatExcess) + '克'}

输出JSON格式：
{
  "overall_assessment": "整体评价（30字内）",
  "nutrition_score": 85,
  "suggestions": [
    {
      "type": "protein",
      "severity": "warning",
      "icon": "💪",
      "title": "建议标题",
      "message": "建议内容（50字内）",
      "priority": 1
    }
  ],
  "recommended_food_types": ["食物1", "食物2"],
  "cooking_methods": ["方法1", "方法2"]
}

只输出JSON，不要其他内容。最多3条建议。`;

  const response = await callQwen(apiKey, apiUrl, prompt, 12000); // 12秒超时
  
  if (response.success) {
    try {
      // 尝试提取JSON内容
      let content = response.content.trim();
      // 移除可能的markdown代码块标记
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(content);
      return {
        success: true,
        data: analysis
      };
    } catch (e) {
      console.error('JSON解析失败:', e, '原始内容:', response.content);
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
简短说明推荐理由（30字内）：

用户目标：${userData.goal || '减脂'}
营养缺口：蛋白质${nutritionGap.proteinDeficit > 0 ? '不足' : '充足'}，碳水${nutritionGap.carbsExcess > 0 ? '超标' : '适中'}

食谱：${recipe.name}
热量：${recipe.calories}卡
蛋白质：${recipe.protein}g
特点：${recipe.tags.join('、')}

直接输出推荐理由，不要其他内容。`;

  const response = await callQwen(apiKey, apiUrl, prompt, 8000); // 8秒超时
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

