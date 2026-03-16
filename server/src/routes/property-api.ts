/**
 * 房源文案 API 路由 v2
 * 任務：P3 房源文案 v2 — 建立 property-api.ts 路由
 * 
 * POST /api/tools/property-copy
 * 接收：{type: "住宅"|"法拍"|"商業", data: {address, size, rooms, price, features:[]}}
 * 呼叫 Gemini Flash 生成文案
 * 回傳：{591: string, 信義: string, 永慶: string}
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';

const log = createLogger('property-api');
const router = Router();

// Gemini API 設定
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

// 房源類型定義
interface PropertyData {
  address: string;
  size: string;
  rooms: string;
  price: string;
  features: string[];
  floor?: string;
  age?: string;
}

interface PropertyRequest {
  type: '住宅' | '法拍' | '商業';
  data: PropertyData;
}

// 生成 Prompt
function generatePrompt(type: string, data: PropertyData, style: string): string {
  const baseInfo = `
房源資訊：
- 地址：${data.address}
- 坪數：${data.size}
- 房型：${data.rooms}
- 價格：${data.price}
- 特色：${data.features.join('、')}
${data.floor ? `- 樓層：${data.floor}` : ''}
${data.age ? `- 屋齡：${data.age}` : ''}
`;

  const stylePrompts: Record<string, string> = {
    '591': `${baseInfo}
請以 591 房屋交易網的風格，生成一則房源文案。
風格特點：
- 標題簡潔有力，強調最大賣點
- 內容分段清晰，使用表情符號
- 語氣活潑親切，適合年輕首購族
- 強調生活機能和交通便利

請生成：
1. 標題（20字以內）
2. 文案內容（100-150字）
3. 適合客群
4. 行動呼籲`,

    '信義': `${baseInfo}
請以信義房屋的風格，生成一則專業房源文案。
風格特點：
- 標題專業大氣，突顯地段價值
- 內容嚴謹詳實，數據導向
- 語氣專業可信，強調品質和保障
- 適合重視品牌和安全的中高階買家

請生成：
1. 標題（20字以內）
2. 文案內容（100-150字）
3. 地段分析
4. 信義房屋服務承諾`,

    '永慶': `${baseInfo}
請以永慶房屋的風格，生成一則房源文案。
風格特點：
- 標題直接明瞭，強調真實資訊
- 內容誠實透明，不過度包裝
- 語氣誠懇實在，建立信任感
- 強調誠實房仲和售後服務

請生成：
1. 標題（20字以內）
2. 文案內容（100-150字）
3. 房屋優缺點誠實分析
4. 永慶房屋誠實承諾`,
  };

  return stylePrompts[style] || stylePrompts['591'];
}

// 呼叫 Gemini API
async function callGemini(prompt: string): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  } catch (error) {
    log.error({ error }, 'Gemini API call failed');
    throw error;
  }
}

// 驗證請求資料
function validateRequest(body: unknown): { valid: boolean; error?: string; data?: PropertyRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '請求本文必須是物件' };
  }

  const req = body as PropertyRequest;

  // 驗證 type
  if (!req.type || !['住宅', '法拍', '商業'].includes(req.type)) {
    return { valid: false, error: 'type 必須是 "住宅"、"法拍" 或 "商業"' };
  }

  // 驗證 data
  if (!req.data || typeof req.data !== 'object') {
    return { valid: false, error: 'data 欄位必須存在' };
  }

  const requiredFields = ['address', 'size', 'rooms', 'price'];
  for (const field of requiredFields) {
    if (!req.data[field as keyof PropertyData]) {
      return { valid: false, error: `data.${field} 是必填欄位` };
    }
  }

  // 驗證 features 是陣列
  if (!Array.isArray(req.data.features)) {
    req.data.features = [];
  }

  return { valid: true, data: req };
}

// POST /api/tools/property-copy
router.post('/property-copy', async (req, res) => {
  try {
    log.info({ body: req.body }, '收到房源文案生成請求');

    // 驗證請求
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error,
      });
    }

    const { type, data } = validation.data!;

    // 檢查 Gemini API Key 是否可用
    if (!GOOGLE_API_KEY) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'GOOGLE_API_KEY 未設定',
        hint: '請在 .env 設定 GOOGLE_API_KEY',
      });
    }

    // 並行生成三種風格的文案
    const styles = ['591', '信義', '永慶'];
    const results: Record<string, string> = {};

    await Promise.all(
      styles.map(async (style) => {
        try {
          const prompt = generatePrompt(type, data, style);
          const response = await callGemini(prompt);
          results[style] = response.trim();
        } catch (error) {
          log.error({ error, style }, `生成 ${style} 風格文案失敗`);
          results[style] = `【生成失敗】請稍後再試`;
        }
      })
    );

    // 回傳結果
    res.json({
      success: true,
      type,
      data,
      results: {
        '591': results['591'],
        '信義': results['信義'],
        '永慶': results['永慶'],
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    log.error({ error }, '房源文案生成失敗');
    res.status(500).json({
      error: 'Internal Server Error',
      message: '生成文案時發生錯誤',
    });
  }
});

// GET /api/tools/property-copy/health
// 健康檢查端點
router.get('/property-copy/health', async (_req, res) => {
  res.json({
    status: GOOGLE_API_KEY ? 'ok' : 'no_api_key',
    provider: 'gemini',
    model: GEMINI_MODEL,
  });
});

export default router;
