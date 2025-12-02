// agentCore.js
// 超简版：直接用 fetch 调百炼接口 + 本地 JSON 知识库 + 简单记忆

const DASH_API_KEY = "sk-d3e65a82f95047f6a1e67b368d1a9a20";

const fs = require('fs');
const path = require('path');


// if (!global.fetch) {
//   global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// }

async function callLLM(promptText) {
  const url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

  const payload = {
    model: "qwen-plus",   // 如果你在百炼用的是别的模型名，这里改一下
    input: {
      prompt: promptText
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DASH_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("LLM 调用失败：", resp.status, text);
    throw new Error("LLM 调用失败");
  }

  const data = await resp.json();
  // 百炼文档里：output.text 是生成内容
  const text = data.output && data.output.text ? data.output.text : "";
  return text;
}

// 2. 用大模型分析用户输入 -> 输出结构化 JSON
async function analyzeByLLM(userMessage) {
  const prompt = `
你是一个专业运动教练，请根据用户今天的描述，分析今天应该怎么选运动。
只输出 JSON，不要输出多余文字。

用户输入：
${userMessage}

请返回一个 JSON，格式如下（只要这些字段）：
{
  "goal": "fat_loss | maintain | muscle_gain | relax",
  "energy": "low | normal | high",
  "focus": "cardio | strength | stretch | mix",
  "notes": "用一两句话说明今天的建议，比如“很累，所以低强度+拉伸为主”"
}
如果用户没说清楚，就按你最合理的判断填，但不要写和健康冲突的内容。
必须是合法 JSON（双引号，不要注释）。
`;

  let raw = "";
  try {
    raw = await callLLM(prompt);
  } catch (e) {
    console.error("调用大模型失败：", e);
    return {
      goal: "fat_loss",
      energy: "normal",
      focus: "cardio",
      notes: "大模型调用失败，使用默认的减脂+有氧方案。"
    };
  }

  try {
    const obj = JSON.parse(raw);
    // 防御一下字段
    const result = {
      goal: obj.goal || "fat_loss",
      energy: obj.energy || "normal",
      focus: obj.focus || "cardio",
      notes: obj.notes || "大模型未给出说明。"
    };
    return result;
  } catch (e) {
    console.error("解析大模型 JSON 失败，原始内容：", raw);
    return {
      goal: "fat_loss",
      energy: "normal",
      focus: "cardio",
      notes: "大模型输出不是 JSON，使用默认的减脂+有氧方案。"
    };
  }
}

// 3. 加载运动知识库（本地 JSON 文件）
const KB_PATH = path.join(__dirname, 'kb', 'exercise_db.json');
let exerciseDB = [];

try {
  const raw = fs.readFileSync(KB_PATH, 'utf8');
  exerciseDB = JSON.parse(raw);
  console.log(`加载运动知识库成功，共 ${exerciseDB.length} 条运动方案`);
} catch (e) {
  console.error('加载运动知识库失败：', e);
  exerciseDB = [];
}

// 4. 简单“记忆”存储（内存版，按 userId 区分）
const memoryStore = {}; // { userId: { history: [], recentExercises: [] } }

function getMemory(userId) {
  if (!memoryStore[userId]) {
    memoryStore[userId] = {
      history: [],
      recentExercises: []
    };
  }
  return memoryStore[userId];
}

function updateMemory(userId, updater) {
  const mem = getMemory(userId);
  updater(mem);
}

// 5. 从用户消息里解析简单症状标签（关键词匹配）
function parseSymptoms(message) {
  const text = message || '';
  const symptoms = new Set();

  if (/膝|膝盖|knee/i.test(text)) symptoms.add('knee_pain');
  if (/腰|下背|腰痛|back/i.test(text)) symptoms.add('back_pain');
  if (/肩|颈|脖子|neck|shoulder/i.test(text)) symptoms.add('neck_pain');
  if (/心脏|心慌|胸闷|心率|胸痛/i.test(text)) symptoms.add('heart_issue');
  if (/生理期|大姨妈|月经|经期/.test(text)) symptoms.add('period');

  return Array.from(symptoms);
}

// 6. 活动水平 -> 训练等级
function estimateUserLevel(activityLevel) {
  switch (activityLevel) {
    case 'light':
    case 'lightly_active':
      return 'beginner';
    case 'moderate':
    case 'moderately_active':
      return 'middle';
    case 'very_active':
      return 'advanced';
    default:
      return 'beginner';
  }
}

// 7. 从知识库检索适合该用户、该日目标的运动方案（你原来的逻辑略微改造）
function selectFromKnowledgeBase(input, mem) {
  const {
    sceneKey = 'normal',
    targetDiff = 300,
    completedKcal = 0,
    remainKcal = 300,
    message = '',
    userProfile = {},
    goal = 'fat_loss' // 'fat_loss' / 'maintain' / 'muscle_gain' / 'relax'
  } = input || {};

  const safeRemain = Math.max(remainKcal, 60);
  const userLevel = estimateUserLevel(userProfile.activityLevel || 'light');
  const symptoms = parseSymptoms(message);

  // --- 初步筛选 ---
  let candidates = exerciseDB.filter(ex => {
    // 目标匹配（知识库里如果没有 relax，就兼容 fat_loss/maintain）
    if (goal && ex.goals && Array.isArray(ex.goals)) {
      if (goal !== 'relax' && !ex.goals.includes(goal)) return false;
    }

    // 训练等级匹配
    if (ex.levels && Array.isArray(ex.levels) && !ex.levels.includes(userLevel)) return false;

    // 场景匹配（如果设置了 scenes）
    if (ex.scenes && ex.scenes.length > 0 && !ex.scenes.includes(sceneKey)) {
      // 不强制过滤，在打分里处理
    }

    // 症状禁忌
    if (symptoms.length > 0 && ex.symptomAvoid && ex.symptomAvoid.length > 0) {
      for (const s of symptoms) {
        if (ex.symptomAvoid.includes(s)) return false;
      }
    }

    return true;
  });

  if (candidates.length === 0) {
    candidates = exerciseDB.slice();
  }

  const targetEach = safeRemain / 2; // 期望 2 个运动平分热量

  const scored = candidates.map(ex => {
    const dMin = ex.durationMin || 10;
    const dMax = ex.durationMax || 30;
    const kcalPerMin = ex.kcalPerMin || 4;

    let duration = Math.round((targetEach / kcalPerMin) / 5) * 5;
    if (isNaN(duration) || duration <= 0) duration = dMin;
    duration = Math.max(dMin, Math.min(dMax, duration));
    const kcal = Math.round(duration * kcalPerMin);

    let score = 0;

    // 目标匹配
    if (goal && ex.goals && Array.isArray(ex.goals) && ex.goals.includes(goal)) score += 3;

    // 等级匹配
    if (ex.levels && Array.isArray(ex.levels) && ex.levels.includes(userLevel)) score += 2;

    // 场景匹配
    if (ex.scenes && Array.isArray(ex.scenes) && ex.scenes.includes(sceneKey)) score += 1.5;

    // 热量贴近程度
    const diff = Math.abs(kcal - targetEach);
    score -= diff / 50.0;

    // 多样性：避免总是同一个部位
    const recent = mem.history.slice(-3);
    const recentBodyParts = new Set(
      recent.flatMap(h => (h.chosenBodyParts || []))
    );
    if (recentBodyParts.has(ex.bodyPart)) {
      score -= 0.5;
    }

    return {
      ...ex,
      duration,
      kcal,
      _score: score
    };
  });

  scored.sort((a, b) => b._score - a._score);
  const selected = scored.slice(0, 3);

  const lines = selected.map((ex, idx) => {
    return `${idx + 1}. ${ex.name}（${ex.type}，${ex.bodyPart}，约 ${ex.duration} 分钟，约 ${ex.kcal} kcal）`;
  });

  const reply =
    `根据你今天的状态，我从知识库中为你挑选了 ${selected.length} 个适合的运动方案：\n` +
    (lines.length > 0 ? lines.join('\n') : '（当前知识库中没有匹配到合适的运动，可以先选择散步或简单拉伸。）') +
    `\n\n今日目标热量差约为 ${targetDiff} kcal，` +
    `已通过运动消耗约 ${completedKcal} kcal，本次建议通过以上运动再消耗约 ${safeRemain} kcal（可根据实际情况略微增减）。` +
    `\n如果某一项你做不了，可以用同类型、相似时长的运动替换。`;

  const meta = {
    symptoms,
    userLevel,
    safeRemain
  };

  return { reply, exercises: selected, meta };
}

// 8. 对外暴露主函数：先调大模型分析，再用知识库选动作
async function getExercisePlan(input) {
  const userId = input.userId || 'demo_user';
  const mem = getMemory(userId);

  // 8.1 调大模型分析
  const llmAnalysis = await analyzeByLLM(input.message || '');

  // 8.2 确定目标 goal
  const finalGoal = llmAnalysis.goal || input.goal || 'fat_loss';

  // 8.3 知识库检索
  const { reply, exercises, meta } = selectFromKnowledgeBase(
    {
      ...input,
      goal: finalGoal
    },
    mem
  );

  // 8.4 更新记忆
  updateMemory(userId, m => {
    m.history.push({
      time: Date.now(),
      sceneKey: input.sceneKey || 'normal',
      message: input.message || '',
      chosenExerciseIds: exercises.map(e => e.id),
      chosenBodyParts: exercises.map(e => e.bodyPart),
      symptoms: meta.symptoms,
      llmAnalysis
    });
  });

  // 8.5 在前面加上大模型分析说明
  const explain =
    `👉 今日大模型分析结果：\n` +
    `- 目标：${llmAnalysis.goal}\n` +
    `- 精力：${llmAnalysis.energy}\n` +
    `- 训练类型：${llmAnalysis.focus}\n` +
    `- 说明：${llmAnalysis.notes}\n\n`;

  return {
    reply: explain + reply,
    exercises
  };
}

module.exports = { getExercisePlan };
