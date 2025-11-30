/**
 * 通义千问 API 服务模块
 * 用于调用阿里云通义千问模型进行智能分析
 */

class QwenAIService {
  constructor() {
    // API配置 - 实际使用时建议从配置文件或环境变量读取
    this.apiKey = 'sk-cbf4265d902f4721ab7d08d7fedad32f';
    this.apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    this.model = 'qwen-turbo';
  }

  /**
   * 调用通义千问API
   * @param {string} prompt - 提示词
   * @returns {Promise<object>} - AI响应结果
   */
  async callQwen(prompt) {
    try {
      const response = await this.request({
        url: this.apiUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: {
          model: this.model,
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
        }
      });

      if (response.statusCode === 200) {
        const result = response.data;
        if (result.output && result.output.choices && result.output.choices.length > 0) {
          return {
            success: true,
            content: result.output.choices[0].message.content
          };
        }
      }

      return {
        success: false,
        error: '调用失败'
      };
    } catch (error) {
      console.error('通义千问API调用失败:', error);
      return {
        success: false,
        error: error.message || '网络错误'
      };
    }
  }

  /**
   * 分析用户饮食习惯并生成推荐
   * @param {object} userData - 用户数据
   * @param {array} dietRecords - 饮食记录
   * @param {object} nutritionGap - 营养缺口
   * @returns {Promise<object>} - AI分析结果
   */
  async analyzeAndRecommend(userData, dietRecords, nutritionGap) {
    const prompt = this.buildAnalysisPrompt(userData, dietRecords, nutritionGap);
    const response = await this.callQwen(prompt);

    if (response.success) {
      try {
        // 尝试解析JSON响应
        const analysis = JSON.parse(response.content);
        return {
          success: true,
          data: analysis
        };
      } catch (e) {
        // 如果不是JSON格式，返回原始文本
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
   * 构建营养分析提示词
   */
  buildAnalysisPrompt(userData, dietRecords, nutritionGap) {
    const recentRecords = dietRecords.slice(0, 7);
    const avgNutrition = this.calculateAverage(recentRecords);

    return `
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
  "nutrition_score": 85,  // 营养评分（0-100）
  "suggestions": [
    {
      "type": "protein|carbs|fat|calories|general",  // 建议类型
      "severity": "success|info|warning|error",      // 严重程度
      "icon": "emoji图标",
      "title": "建议标题",
      "message": "详细建议内容",
      "priority": 1  // 优先级（1-5）
    }
  ],
  "recommended_food_types": ["食物类型1", "食物类型2"],
  "cooking_methods": ["烹饪方式1", "烹饪方式2"],
  "food_tags_priority": ["高蛋白", "低卡", "低脂", "素食"]  // 推荐食谱标签优先级
}

注意：输出纯JSON格式，不要添加任何其他文字说明。
`;
  }

  /**
   * 智能生成食谱推荐理由
   * @param {object} recipe - 食谱信息
   * @param {object} userData - 用户数据
   * @param {object} nutritionGap - 营养缺口
   */
  async generateRecipeReason(recipe, userData, nutritionGap) {
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

    const response = await this.callQwen(prompt);
    if (response.success) {
      return response.content.trim();
    }
    return '这道菜营养均衡，适合您的健康目标';
  }

  /**
   * 计算平均营养摄入
   */
  calculateAverage(records) {
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

  /**
   * 封装请求方法（兼容微信小程序和云函数）
   */
  request(options) {
    // 如果在小程序环境
    if (typeof wx !== 'undefined' && wx.request) {
      return new Promise((resolve, reject) => {
        wx.request({
          ...options,
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });
    }
    
    // 如果在云函数环境（Node.js）
    if (typeof require !== 'undefined') {
      const https = require('https');
      return new Promise((resolve, reject) => {
        const url = new URL(options.url);
        const postData = JSON.stringify(options.data);

        const req = https.request({
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: options.method,
          headers: {
            ...options.header,
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    }

    return Promise.reject(new Error('不支持的运行环境'));
  }
}

module.exports = {
  QwenAIService
};

