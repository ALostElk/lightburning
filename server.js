// -*- coding: utf-8 -*-
// 这一份就是你要交的后端：
// - /api/user/profile      保存个人信息 + 生成长期运动计划
// - /api/plan/longterm     获取长期运动计划
// - /api/plan/daily        根据热量差生成每日运动计划
// - /api/agent/advise      调用阿里云百炼大模型的“智能体”建议

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // v2 版本，支持 require

const app = express();
const PORT = 3000;

// ==== 可选：从环境变量读取大模型 key（没有就用下面这一串）====
const DASHSCOPE_API_KEY =
  process.env.DASHSCOPE_API_KEY || 'sk-d3e65a82f95047f6a1e67b368d1a9a20';

// 中间件：跨域 + JSON 解析
app.use(cors());
app.use(bodyParser.json());

// ========================= “内存数据库” =========================
// 实际项目这里可以换成真正的数据库（MySQL / MongoDB）
// 课程项目用内存结构就够了
//
// 数据结构：
//
// users = {
//   userId1: {
//     profile: { ... },        // 个人信息
//     longTermPlan: { ... },   // 长期计划
//     history: [               // 历史运动数据（示意）
//       { date: '2025-12-02', finishedExercises: [...] }
//     ],
//     customExercises: [       // 用户自己添加的偏好运动
//       { name: '跑步', defaultDuration: 30 }
//     ]
//   },
//   ...
// }
const users = {};

// 工具：确保 user 存在
function ensureUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      profile: null,
      longTermPlan: null,
      history: [],
      customExercises: []
    };
  }
  return users[userId];
}

// ========================= 长期运动计划生成逻辑 =========================

// 基于用户目标 + 简单习惯，生成 12 周长期计划
function generateLongTermPlan(profile) {
  const goal = profile.goal || '减脂';
  const weeks = 12;

  let template;
  if (goal === '增肌') {
    template = [
      '力量训练（上肢）+ 10 分钟有氧',
      '力量训练（下肢）+ 10 分钟有氧',
      '核心训练 + 拉伸',
      '中等强度有氧 30-40 分钟',
      '力量训练（全身）',
      '轻度活动 + 拉伸',
      '完全休息或散步'
    ];
  } else {
    // 默认视为减脂
    template = [
      '中高强度间歇有氧 20-30 分钟',
      '力量训练（全身循环）+ 10 分钟有氧',
      '中等强度有氧 30 分钟',
      '核心训练 + 轻度有氧',
      '中等强度有氧 30-40 分钟',
      '轻度活动（快走/骑车）',
      '完全休息或散步'
    ];
  }

  const weeklyPlan = template.map((item, idx) => ({
    day: idx + 1, // 第几天（1~7）
    content: item
  }));

  return {
    goal,
    weeks,
    weeklyPlan,
    note:
      '根据你的目标和运动习惯生成的 12 周长期运动计划，可通过每日计划模块进行动态调整。'
  };
}

// ========================= 每日计划生成逻辑 =========================

// 根据长期计划 + 当日热量差 + 用户自定义喜欢的运动，生成今日建议
function generateDailyPlan(userData, calorieDiff, dateStr, clientCustomExercises) {
  const longTermPlan = userData.longTermPlan;

  if (!longTermPlan) {
    return {
      date: dateStr,
      summary: '尚未生成长期运动计划，请先完善个人信息并生成长期计划。',
      intensityNote: '',
      recommendedExercises: []
    };
  }

  // 每周循环：根据星期几选长期计划里对应的一天
  const baseDayIndex = new Date(dateStr).getDay(); // 0=周日,...6=周六
  const dayIndex = baseDayIndex === 0 ? 6 : baseDayIndex - 1; // 转成 0~6 对应 “第1~7天”
  const weekDayPlan = longTermPlan.weeklyPlan[dayIndex];

  // 根据热量差给一个强度提示
  let intensityNote;
  if (calorieDiff > 400) {
    intensityNote =
      '今日热量差偏大，建议适度增加运动时长或强度，同时注意补充能量，避免低血糖。';
  } else if (calorieDiff < 150) {
    intensityNote =
      '今日热量差偏小，可以适当减轻运动强度，更多关注动作质量和身体恢复。';
  } else {
    intensityNote = '今日热量差适中，维持当前计划强度即可。';
  }

  const recommendedExercises = [];

  // 1）来自长期计划的基础安排
  recommendedExercises.push({
    name: weekDayPlan.content,
    duration: 30,
    type: '系统推荐',
    note: '来自长期运动计划的基础安排，可根据实际情况微调。'
  });

  // 2）合并“用户历史喜欢的运动”和“今天临时输入的偏好”
  const allCustom = [
    ...(userData.customExercises || []),
    ...(clientCustomExercises || [])
  ];

  allCustom.forEach((ex) => {
    if (!ex || !ex.name) return;
    recommendedExercises.push({
      name: ex.name,
      duration: ex.defaultDuration || 20,
      type: '用户喜好',
      note: '可以作为替换或补充动作，根据同等时间或略高时间来安排。'
    });
  });

  return {
    date: dateStr,
    summary: `基于长期计划 + 今日热量差 ${calorieDiff} kcal 的每日运动安排。`,
    intensityNote,
    recommendedExercises
  };
}

// ========================= 路由：用户信息 & 长期计划 =========================

// 保存/更新个人信息，并同时生成长期计划
app.post('/api/user/profile', (req, res) => {
  const { userId, profile } = req.body;

  if (!userId || !profile) {
    return res.status(400).json({ success: false, error: 'userId 和 profile 必填' });
  }

  const userData = ensureUser(userId);

  // 保存个人信息
  userData.profile = profile;

  // 更新“用户喜欢的运动”列表，方便每日计划和智能体使用
  if (profile.preferSports && typeof profile.preferSports === 'string') {
    const sportsArr = profile.preferSports
      .split(/[,，;；、]/)
      .map((s) => s.trim())
      .filter((s) => !!s)
      .map((name) => ({ name, defaultDuration: 20 }));
    userData.customExercises = sportsArr;
  }

  // 生成长期计划
  userData.longTermPlan = generateLongTermPlan(profile);

  return res.json({
    success: true,
    profile: userData.profile,
    longTermPlan: userData.longTermPlan
  });
});

// 获取长期计划
app.get('/api/plan/longterm', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: '缺少 userId' });
  }
  const userData = ensureUser(userId);
  return res.json({
    success: true,
    longTermPlan: userData.longTermPlan
  });
});

// ========================= 路由：每日运动计划 =========================

// 根据热量差生成今日运动计划（热量差由其他模块计算；本后端只接收数值）
app.post('/api/plan/daily', (req, res) => {
  const { userId, calorieDiff, date, customExercises } = req.body;

  if (!userId || typeof calorieDiff !== 'number') {
    return res
      .status(400)
      .json({ success: false, error: 'userId 和 calorieDiff 必填' });
  }

  const dateStr = date || new Date().toISOString().slice(0, 10); // 默认今天
  const userData = ensureUser(userId);

  // 生成每日计划
  const dailyPlan = generateDailyPlan(
    userData,
    calorieDiff,
    dateStr,
    customExercises || []
  );

  // 记录历史（示例，实际可以存更多字段）
  userData.history.push({
    date: dateStr,
    finishedExercises: [] // 未来可以由前端补充“已完成动作”信息
  });

  return res.json({
    success: true,
    dailyPlan
  });
});

// ========================= 路由：智能体（阿里云百炼） =========================

// 调用大模型：分析用户当天状态 + 已有计划，给出文字建议
app.post('/api/agent/advise', async (req, res) => {
  const { userId, userMessage, todayPlan } = req.body;

  if (!userId || !userMessage) {
    return res
      .status(400)
      .json({ success: false, error: 'userId 和 userMessage 必填' });
  }

  const userData = ensureUser(userId);

  const profileText = JSON.stringify(userData.profile || {});
  const longTermPlanText = JSON.stringify(userData.longTermPlan || {});
  const todayPlanText = JSON.stringify(todayPlan || {});
  const customText = JSON.stringify(userData.customExercises || []);

  // system 部分：告诉大模型自己的角色和输出要求
  const systemPrompt = `
你是一个专业的私人健身教练和运动顾问，只根据用户提供的长期计划、每日计划和运动偏好给出建议。
要求：
1. 先用 1-2 句话理解和安抚用户当前状态。
2. 给出清晰的今日运动建议（可以是调整、替换、减量或休息），用有序列表说明。
3. 明确告诉用户：哪些动作可以替换成他喜欢的运动，如何替换（时间/强度）。
4. 控制在 300 中文字左右，不要输出代码，不要提及你是大模型。`;

  // user 部分：把具体数据拼进去
  const promptText = `
【用户基本信息】：
${profileText}

【用户常用/喜欢的运动】：
${customText}

【长期计划】：
${longTermPlanText}

【今日计划（系统生成）】：
${todayPlanText}

【用户当前描述】：
${userMessage}

请根据以上信息，输出一段中文建议。`;

  try {
    const resp = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 百炼 HTTP Bearer 鉴权
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen-plus', // 你申请的模型，这里直接用 qwen-plus
          input: {
            prompt: `${systemPrompt}\n\n${promptText}`
          }
        })
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      console.error('DashScope error:', data);
      return res.status(500).json({
        success: false,
        error: '调用大模型失败',
        detail: data
      });
    }

    // 兼容不同返回格式
    let replyText = '抱歉，暂时无法生成建议，请稍后再试。';

    if (data && data.output) {
      if (typeof data.output.text === 'string') {
        replyText = data.output.text;
      } else if (
        Array.isArray(data.output.choices) &&
        data.output.choices[0] &&
        data.output.choices[0].text
      ) {
        replyText = data.output.choices[0].text;
      }
    }

    return res.json({
      success: true,
      reply: replyText
    });
  } catch (err) {
    console.error('Agent error:', err);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// ========================= 启动服务 =========================

app.listen(PORT, () => {
  console.log(
    `Agent / Fitness backend server running at http://localhost:${PORT}`
  );
});
