/**
 * 通义千问AI建议生成测试脚本
 * 运行方式：node test-ai-suggestion.js
 */

const https = require('https');

// ==================== 配置 ====================
const CONFIG = {
  apiKey: 'sk-cbf4265d902f4721ab7d08d7fedad32f', // 替换为你的API Key
  apiUrl: 'dashscope.aliyuncs.com',
  apiPath: '/api/v1/services/aigc/text-generation/generation',
  model: 'qwen-turbo'
};

// ==================== 模拟数据 ====================

// 模拟用户信息
const mockUserData = {
  gender: '男',
  age: 28,
  height: 175,
  weight: 75,
  goal: '减脂',
  activityLevel: '轻度活动',
  dietaryPreferences: ['不吃辣', '少油'],
  allergens: []
};

// 模拟近7天饮食记录
const mockDietRecords = [
  { date: '2025-11-30', calories: 1600, protein: 70, carbs: 220, fat: 50 },
  { date: '2025-11-29', calories: 1800, protein: 85, carbs: 200, fat: 55 },
  { date: '2025-11-28', calories: 1700, protein: 75, carbs: 210, fat: 52 },
  { date: '2025-11-27', calories: 1650, protein: 80, carbs: 205, fat: 48 },
  { date: '2025-11-26', calories: 1900, protein: 90, carbs: 230, fat: 58 },
  { date: '2025-11-25', calories: 1750, protein: 78, carbs: 215, fat: 54 },
  { date: '2025-11-24', calories: 1680, protein: 82, carbs: 208, fat: 51 }
];

// 营养目标
const nutritionGoals = {
  calories: 1800,
  protein: 120,
  carbs: 180,
  fat: 50
};

// ==================== 工具函数 ====================

/**
 * 计算平均营养摄入
 */
function calculateAverage(records) {
  const total = records.reduce((acc, record) => {
    acc.calories += record.calories;
    acc.protein += record.protein;
    acc.carbs += record.carbs;
    acc.fat += record.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: Math.round(total.calories / records.length),
    protein: Math.round(total.protein / records.length),
    carbs: Math.round(total.carbs / records.length),
    fat: Math.round(total.fat / records.length)
  };
}

/**
 * 计算营养缺口
 */
function calculateNutritionGap(records, goals) {
  const avg = calculateAverage(records);
  
  return {
    days: records.length,
    avg: avg,
    goals: goals,
    proteinDeficit: Math.max(0, goals.protein - avg.protein),
    proteinExcess: Math.max(0, avg.protein - goals.protein),
    carbsDeficit: Math.max(0, goals.carbs - avg.carbs),
    carbsExcess: Math.max(0, avg.carbs - goals.carbs),
    fatDeficit: Math.max(0, goals.fat - avg.fat),
    fatExcess: Math.max(0, avg.fat - goals.fat),
    caloriesDeficit: Math.max(0, goals.calories - avg.calories),
    caloriesExcess: Math.max(0, avg.calories - goals.calories)
  };
}

/**
 * 构建AI分析提示词
 */
function buildPrompt(userData, dietRecords, nutritionGap) {
  const avgNutrition = nutritionGap.avg;

  return `
你是一名专业的营养师和健康顾问，请根据用户的基本信息和近期饮食数据，提供专业的营养分析和建议。

用户基本信息：
- 性别：${userData.gender}
- 年龄：${userData.age}岁
- 身高：${userData.height}cm
- 体重：${userData.weight}kg
- 健康目标：${userData.goal}
- 活动水平：${userData.activityLevel}
- 饮食偏好：${userData.dietaryPreferences.join('、')}

近${nutritionGap.days}天平均营养摄入：
- 热量：${avgNutrition.calories}千卡/天
- 蛋白质：${avgNutrition.protein}克/天
- 碳水化合物：${avgNutrition.carbs}克/天
- 脂肪：${avgNutrition.fat}克/天

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
}

/**
 * 调用通义千问API
 */
function callQwenAPI(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: CONFIG.model,
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

    const options = {
      hostname: CONFIG.apiUrl,
      path: CONFIG.apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            if (result.output && result.output.choices && result.output.choices.length > 0) {
              const content = result.output.choices[0].message.content;
              resolve({
                success: true,
                content: content,
                usage: result.usage
              });
            } else {
              reject(new Error('响应格式错误'));
            }
          } else {
            reject(new Error(`API错误 (${res.statusCode}): ${result.message || '未知错误'}`));
          }
        } catch (e) {
          reject(new Error('解析响应失败: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error('网络请求失败: ' + e.message));
    });

    req.write(postData);
    req.end();
  });
}

// ==================== 主测试函数 ====================

async function testAISuggestion() {
  console.log('\n========================================');
  console.log('🧪 通义千问AI建议生成测试');
  console.log('========================================\n');

  try {
    // 步骤1：计算营养缺口
    console.log('📊 步骤1：计算营养缺口...\n');
    const nutritionGap = calculateNutritionGap(mockDietRecords, nutritionGoals);
    
    console.log('近7天平均营养摄入：');
    console.log(`  热量：${nutritionGap.avg.calories} / ${nutritionGoals.calories} 千卡 (${nutritionGap.caloriesDeficit > 0 ? '-' : '+'}${Math.abs(nutritionGap.caloriesDeficit || nutritionGap.caloriesExcess)})`);
    console.log(`  蛋白质：${nutritionGap.avg.protein} / ${nutritionGoals.protein} 克 (${nutritionGap.proteinDeficit > 0 ? '-' : '+'}${Math.abs(nutritionGap.proteinDeficit || nutritionGap.proteinExcess)})`);
    console.log(`  碳水：${nutritionGap.avg.carbs} / ${nutritionGoals.carbs} 克 (${nutritionGap.carbsDeficit > 0 ? '-' : '+'}${Math.abs(nutritionGap.carbsDeficit || nutritionGap.carbsExcess)})`);
    console.log(`  脂肪：${nutritionGap.avg.fat} / ${nutritionGoals.fat} 克 (${nutritionGap.fatDeficit > 0 ? '-' : '+'}${Math.abs(nutritionGap.fatDeficit || nutritionGap.fatExcess)})`);

    // 步骤2：构建提示词
    console.log('\n📝 步骤2：构建AI提示词...\n');
    const prompt = buildPrompt(mockUserData, mockDietRecords, nutritionGap);
    console.log('提示词长度:', prompt.length, '字符');
    console.log('预估tokens:', Math.round(prompt.length / 2));

    // 步骤3：调用AI API
    console.log('\n🤖 步骤3：调用通义千问API...\n');
    console.log('正在请求API，请稍候...');
    
    const startTime = Date.now();
    const response = await callQwenAPI(prompt);
    const duration = Date.now() - startTime;

    console.log(`✅ API调用成功！(耗时: ${duration}ms)\n`);

    // 步骤4：解析结果
    console.log('📋 步骤4：解析AI响应...\n');
    
    let analysis;
    try {
      // 尝试解析JSON
      analysis = JSON.parse(response.content);
      console.log('✅ JSON解析成功！\n');
    } catch (e) {
      console.log('⚠️  响应不是纯JSON格式，原始内容：\n');
      console.log(response.content);
      console.log('\n');
      return;
    }

    // 步骤5：展示结果
    console.log('========================================');
    console.log('📊 AI分析结果');
    console.log('========================================\n');

    console.log('🎯 综合评价：');
    console.log(`   ${analysis.overall_assessment}\n`);

    console.log('📈 营养评分：');
    console.log(`   ${analysis.nutrition_score} / 100\n`);

    console.log('💡 建议列表：');
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      analysis.suggestions.forEach((suggestion, index) => {
        console.log(`\n   ${index + 1}. ${suggestion.icon} ${suggestion.title}`);
        console.log(`      类型：${suggestion.type}`);
        console.log(`      级别：${suggestion.severity}`);
        console.log(`      优先级：${suggestion.priority}`);
        console.log(`      内容：${suggestion.message}`);
      });
    } else {
      console.log('   (无建议)');
    }

    console.log('\n\n🍽️  推荐食物类型：');
    console.log(`   ${(analysis.recommended_food_types || []).join('、')}\n`);

    console.log('👨‍🍳 推荐烹饪方式：');
    console.log(`   ${(analysis.cooking_methods || []).join('、')}\n`);

    console.log('🏷️  推荐食谱标签优先级：');
    console.log(`   ${(analysis.food_tags_priority || []).join(' > ')}\n`);

    // Token使用情况
    if (response.usage) {
      console.log('========================================');
      console.log('💰 Token使用情况');
      console.log('========================================\n');
      console.log(`输入 tokens: ${response.usage.input_tokens}`);
      console.log(`输出 tokens: ${response.usage.output_tokens}`);
      console.log(`总计 tokens: ${response.usage.total_tokens}`);
      
      const cost = (response.usage.total_tokens / 1000) * 0.003;
      console.log(`预估成本: ¥${cost.toFixed(6)}\n`);
    }

    console.log('========================================');
    console.log('✅ 测试完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 测试失败：', error.message);
    console.error('\n请检查：');
    console.error('1. API Key是否正确');
    console.error('2. 网络连接是否正常');
    console.error('3. 账户余额是否充足');
    console.error('4. API服务是否正常\n');
  }
}

// ==================== 运行测试 ====================

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
使用方法：
  node test-ai-suggestion.js                测试AI建议生成
  node test-ai-suggestion.js --help         显示帮助信息

配置：
  在脚本开头修改 CONFIG.apiKey 为你的通义千问API Key

注意：
  - 需要Node.js环境
  - 需要网络连接
  - 会产生少量API调用费用（约¥0.001）
`);
  process.exit(0);
}

// 运行测试
testAISuggestion();

