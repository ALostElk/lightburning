const cloud = require('wx-server-sdk');
const OpenAI = require('openai');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MODEL = 'qwen-vl-plus';  // 使用更稳定的模型
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const SYSTEM_PROMPT = '你是小程序"轻燃"的AI营养师，只能输出严格的 JSON 数据。';
const USER_PROMPT = '请识别图片中的所有食物，并返回 JSON：{"foods":[{"name":"食物中文名","confidence":0.95,"description":"简短描述","calories":每100克热量,"macros":{"protein":蛋白质克数,"fat":脂肪克数,"carbs":碳水克数}}]}，所有营养数据基于每100克。禁止输出除 JSON 以外的任何文字。';

/**
 * 获取 API Key
 */
const ensureApiKey = () => {
  const key = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (!key) {
    throw new Error('未配置 DASHSCOPE_API_KEY 环境变量');
  }
  return key;
};

/**
 * 从云存储下载图片并转为 Base64
 * @param {string} fileID - 云存储文件ID
 * @returns {Promise<string>} Base64 图片数据
 */
async function downloadAndConvertToBase64(fileID) {
  console.log('[图片处理] 从云存储下载:', fileID);

  try {
    const res = await cloud.downloadFile({
      fileID: fileID
    });

    const buffer = res.fileContent;
    const base64 = buffer.toString('base64');

    // 根据文件扩展名确定 MIME 类型
    let mimeType = 'image/jpeg';
    if (fileID.toLowerCase().includes('.png')) {
      mimeType = 'image/png';
    } else if (fileID.toLowerCase().includes('.gif')) {
      mimeType = 'image/gif';
    } else if (fileID.toLowerCase().includes('.webp')) {
      mimeType = 'image/webp';
    }

    console.log('[图片处理] 下载成功，大小:', Math.round(buffer.length / 1024), 'KB');
    return `data:${mimeType};base64,${base64}`;

  } catch (error) {
    console.error('[图片处理] 下载失败:', error.message);
    throw new Error('云存储图片下载失败: ' + error.message);
  }
}

/**
 * 处理图片输入，支持多种格式
 * @param {Object} event - 请求参数
 * @returns {Promise<string>} Base64 Data URL
 */
async function processImageInput(event) {
  const { fileID, imageData, image, tempFilePath } = event;

  // 优先使用云存储 fileID
  if (fileID) {
    return await downloadAndConvertToBase64(fileID);
  }

  // 其次使用直接传入的 base64 数据
  const base64Data = imageData || image;
  if (base64Data) {
    const trimmed = base64Data.trim();
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }
    return `data:image/jpeg;base64,${trimmed}`;
  }

  throw new Error('请提供 fileID（云存储）或 imageData（Base64）');
}

/**
 * 解析 JSON 响应
 */
const extractJson = (text) => {
  if (!text) {
    throw new Error('AI回复为空');
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI回复未包含 JSON');
  }
  return JSON.parse(match[0]);
};

/**
 * 解析食物列表
 */
const parseFoods = (rawText) => {
  const data = extractJson(rawText);
  if (!Array.isArray(data.foods)) {
    throw new Error('AI回复缺少 foods 数组');
  }
  return data.foods;
};

/**
 * 调用通义千问视觉模型
 * @param {string} imageDataUrl - Base64 Data URL
 * @returns {Promise<Array>} 识别的食物列表
 */
const callQwen = async (imageDataUrl) => {
  const client = new OpenAI({
    apiKey: ensureApiKey(),
    baseURL: BASE_URL,
  });

  console.log('[AI识别] 调用通义千问视觉模型');

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    top_p: 0.8,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: USER_PROMPT },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const answer = response.choices?.[0]?.message?.content || '';
  console.log('[AI识别] 原始响应:', answer.substring(0, 200));

  const textSegments = Array.isArray(answer)
    ? answer
        .filter((segment) => segment?.type === 'text' && segment.text)
        .map((segment) => segment.text)
    : [answer];
  const finalText = textSegments.join('\n').trim();

  return parseFoods(finalText);
};

/**
 * 云函数主入口
 *
 * 支持两种调用方式：
 * 1. 云存储方式（推荐）：{ fileID: "cloud://xxx" }
 * 2. Base64方式：{ imageData: "base64..." }
 */
exports.main = async (event) => {
  console.log('[foodRecognitionQwen] 开始处理请求');

  try {
    // 处理图片输入
    const imageDataUrl = await processImageInput(event);

    // 调用 AI 识别
    const foods = await callQwen(imageDataUrl);

    console.log('[foodRecognitionQwen] 识别成功，识别到', foods.length, '种食物');

    return {
      success: true,
      foods,
    };
  } catch (error) {
    const message = error?.message || '服务异常';
    console.error('[foodRecognitionQwen] 错误:', message);
    return {
      success: false,
      error: message,
    };
  }
};
