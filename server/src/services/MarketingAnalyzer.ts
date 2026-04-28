/**
 * MarketingAnalyzer — 行銷高規分析器
 *
 * 在 scrape 完之後產出：
 *  • report.md       — 行銷風格的客戶提案報告（給人看）
 *  • brief.json      — 結構化素材包（給下游 AI 用）
 *  • design-analysis.json — 設計風格分析（色票、版面、調性）
 *  • highlights/     — AI 挑出的重點圖片
 *
 * 用 Gemini 2.5 Flash 做（最便宜、有 vision、JSON mode）
 * 一個網站完整分析成本 < $0.05
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createLogger } from '../logger.js';
import type { ImageEntry } from './ScrapeService.js';

const log = createLogger('marketing-analyzer');

const GEMINI_MODEL = 'gemini-2.5-flash';
const ANALYSIS_TIMEOUT_MS = 60_000;

interface AnalyzerInput {
  outputDir: string;
  url: string;
  title: string;
  contentMd: string;
  metadata: Record<string, unknown>;
  jsonld: unknown[];
  images: ImageEntry[];
}

export interface AnalysisResult {
  ok: boolean;
  reportPath: string;
  briefPath: string;
  highlightsCount: number;
  costEstimateUsd: number;
  durationMs: number;
}

interface MarketingBrief {
  domain: string;
  url: string;
  title: string;
  one_liner: string;                          // 一句話摘要
  business_type: string;                      // 業態
  target_audience: string[];                  // 目標客群
  selling_points: string[];                   // 賣點
  service_or_product: string[];               // 提供什麼
  pricing: {
    has_price: boolean;
    range?: string;
    notes?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    social?: Record<string, string>;
  };
  design: {
    colors_hex: string[];
    style_keywords: string[];
    fonts_observation: string;
    overall_tone: string;
  };
  seo: {
    meta_title: string;
    meta_description: string;
    has_jsonld: boolean;
    has_og_image: boolean;
  };
  competitive_observation: string;            // 競品 / 差異化觀察
  weakness_or_improvement: Array<{
    issue: string;                            // 痛點 / 問題
    proposal: string;                         // 解決方案（行銷語氣）
    estimated_impact: string;                 // 預估效益（轉換 / 流量 / 成本）
  }>;
  hooks_for_pitch: string[];                  // 三句話打單話術（給接案者用）
  ai_prompts: {
    midjourney: string;                       // 生圖 prompt（風格參考）
    pdf_proposal: string;                     // 餵 ChatGPT 生提案 PDF 的 prompt
    canva_keywords: string[];                 // Canva 找模板用關鍵字
  };
}

function getGeminiKey(): string {
  return (process.env.GOOGLE_API_KEY
    || process.env.GOOGLE_API_KEY_2
    || process.env.GOOGLE_API_KEY_3
    || '').trim();
}

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('GOOGLE_API_KEY not set');

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 4096,
    temperature: 0.4,
  };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    }
  );
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
  if (!candidates?.length) throw new Error('Gemini returned no candidates');
  const parts = (candidates[0].content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
  return String(parts?.[0]?.text || '').trim();
}

async function callGeminiVision(imagePath: string, prompt: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('GOOGLE_API_KEY not set');

  const buf = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mimeType = ext === 'jpg' ? 'image/jpeg'
    : ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : ext === 'gif' ? 'image/gif'
    : 'image/jpeg';

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: buf.toString('base64') } },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    }
  );
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini Vision HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
  if (!candidates?.length) throw new Error('Gemini Vision returned no candidates');
  const parts = (candidates[0].content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
  return String(parts?.[0]?.text || '').trim();
}

/**
 * 從圖片清單挑出「行銷重點圖」
 * 邏輯：OG/Twitter > JSON-LD > <picture> > 大尺寸 <img> > 其他
 * 加上檔案大小（>30KB）跟前 N 張規則
 */
function selectHighlights(images: ImageEntry[], maxCount = 8): ImageEntry[] {
  const priority: Record<string, number> = {
    og: 100,
    twitter: 90,
    jsonld: 80,
    picture: 60,
    img: 40,
    lazy: 30,
  };
  const scored = images
    .filter(i => i.filename && (i.bytes ?? 0) > 30 * 1024)
    .map((img, idx) => ({
      img,
      score: (priority[img.source] || 0)
        + Math.min((img.bytes || 0) / 1024, 200)
        - idx * 0.5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map(x => x.img);
  return scored;
}

export async function analyzeForMarketing(input: AnalyzerInput): Promise<AnalysisResult> {
  const startedAt = Date.now();
  const { outputDir, url, title, contentMd, metadata, images } = input;

  // 截斷過長 content（Gemini 雖支援長 context 但省 token）
  const trimmedContent = contentMd.length > 15_000
    ? contentMd.slice(0, 15_000) + '\n\n[... 內容過長已截斷]'
    : contentMd;

  // ── 1. 結構化分析（一次 LLM call 出 brief.json）──
  const briefPrompt = `你是頂級接案工作室的提案總監，專長是「網站健檢 → 賣優化方案給客戶」。
分析這個網站，產出**有 sell 力**的提案級分析（JSON）。

# 你的撰寫原則
- 不寫「客觀分析作業」語氣，要用「我可以幫你做什麼」的提案語氣
- 改善建議要量化（轉換率提升 X% / 流量翻倍 / 成本省 Y）
- 賣點要是「客戶會被打動」的，不是「商業教科書」的
- 每個 issue 都要附「估算效益」

# 目標網站
URL: ${url}
標題: ${title}

# Meta 資訊
${JSON.stringify({
  description: metadata['og:description'] || metadata['description'],
  ogTitle: metadata['og:title'],
  ogImage: metadata['og:image'],
  ogType: metadata['og:type'],
  keywords: metadata['keywords'],
}, null, 2)}

# 主要內容（Markdown）
${trimmedContent}

# 你要產出的 JSON schema（請嚴格按照此格式回傳）
{
  "one_liner": "用一句話描述這個品牌/業務（30 字以內，要抓眼球）",
  "business_type": "業態類型（例：美容沙龍 / SaaS 工具 / 餐廳 / 房仲）",
  "target_audience": ["目標客群（最多 3 個）"],
  "selling_points": ["核心賣點（最多 5 個，要具體可驗證，不要空話）"],
  "service_or_product": ["提供的服務或產品（最多 5 個）"],
  "pricing": {
    "has_price": true,
    "range": "價格區間 / NT$X-Y / 沒寫就 null",
    "notes": "定價策略觀察"
  },
  "contact": {
    "phone": "...或 null",
    "email": "...或 null",
    "address": "...或 null",
    "hours": "...或 null",
    "social": {"facebook": "url", "instagram": "url", "line": "id"}
  },
  "design": {
    "colors_hex": ["從內容描述+網站推測的主色 hex，最多 4 個，例 #D4A574"],
    "style_keywords": ["設計風格關鍵字，最多 5 個，例：日式、簡約、暖色調"],
    "fonts_observation": "字體調性觀察（中英、襯線/無襯線/手寫）",
    "overall_tone": "整體調性（例：高端優雅 / 親民活潑 / 專業冷靜）"
  },
  "seo": {
    "meta_title": "從 metadata 抽出的標題",
    "meta_description": "從 metadata 抽出的描述",
    "has_jsonld": ${input.jsonld.length > 0},
    "has_og_image": ${!!metadata['og:image']}
  },
  "competitive_observation": "競品/差異化觀察（接案者最該注意什麼，給設計蝦/工程蝦看）",
  "weakness_or_improvement": [
    {
      "issue": "具體痛點（例：菜單頁需要點 3 次才找到價格）",
      "proposal": "解決方案，要是「我幫你做」的口吻（例：重整菜單頁資訊架構，一頁直達點餐）",
      "estimated_impact": "量化效益（例：預估線上點餐轉換 +20% / SEO 流量翻倍 / 客服詢問降 30%）"
    }
  ],
  "hooks_for_pitch": ["三句可以直接傳 LINE 給客戶的開場話術，每句 50 字內，要勾起興趣不是推銷"],
  "ai_prompts": {
    "midjourney": "生成相似風格圖片的 Midjourney prompt（英文，含 --ar 16:9 --v 6）",
    "pdf_proposal": "餵 ChatGPT 生客戶提案 PDF 的指令（中文，要明確指定章節）",
    "canva_keywords": ["在 Canva 搜模板的關鍵字（中英混合，最多 4 個）"]
  }
}

只回 JSON，不要前後文字、不要 markdown code fence。`;

  let brief: MarketingBrief;
  try {
    const briefRaw = await callGemini(briefPrompt, true);
    const cleaned = briefRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    brief = JSON.parse(cleaned) as MarketingBrief;
    brief.domain = new URL(url).host;
    brief.url = url;
    brief.title = title;
  } catch (e) {
    log.error({ err: e }, '[analyzer] brief 生成失敗');
    throw new Error(`brief 分析失敗：${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Vision 分析主視覺（多層 fallback：OG > Twitter > JSON-LD > 最大檔 > 任何 >30KB）──
  let visionAnalysis: Record<string, unknown> | null = null;
  const sortedBySize = [...images].filter(i => i.filename).sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
  const heroImage = images.find(i => i.source === 'og' && i.filename)
    || images.find(i => i.source === 'twitter' && i.filename)
    || images.find(i => i.source === 'jsonld' && i.filename)
    || sortedBySize.find(i => (i.bytes ?? 0) > 50 * 1024)
    || sortedBySize.find(i => (i.bytes ?? 0) > 30 * 1024)
    || sortedBySize[0];
  if (heroImage?.filename) {
    log.info(`[analyzer] vision 用 ${heroImage.source} 來源：${heroImage.filename} (${heroImage.bytes} bytes)`);
    try {
      const heroPath = path.join(outputDir, 'images', heroImage.filename);
      const visionPrompt = `分析這張行銷主視覺圖片，回傳 JSON：
{
  "dominant_colors_hex": ["最多 4 個主色 hex，例 #D4A574"],
  "mood": "氛圍描述（例：寧靜溫暖 / 活力陽光）",
  "composition": "構圖描述（例：人物特寫 / 產品平拍 / 空間情境）",
  "subjects": ["畫面主體，最多 3 個"],
  "style_tags": ["設計風格標籤（例：minimalist, japanese-zen），最多 5 個"]
}
只回 JSON。`;
      const visionRaw = await callGeminiVision(heroPath, visionPrompt);
      const cleaned = visionRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      visionAnalysis = JSON.parse(cleaned);
      // 把 vision 抓到的色票合進 design.colors_hex（去重）
      const visionColors = (visionAnalysis?.dominant_colors_hex as string[]) || [];
      const merged = Array.from(new Set([...visionColors, ...brief.design.colors_hex]));
      brief.design.colors_hex = merged.slice(0, 6);
    } catch (e) {
      log.warn(`[analyzer] vision 分析失敗（不致命）：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 3. 挑重點圖片，複製到 highlights/ ──
  const highlights = selectHighlights(images, 8);
  const highlightsDir = path.join(outputDir, 'highlights');
  await fs.mkdir(highlightsDir, { recursive: true });
  let highlightsCount = 0;
  for (let i = 0; i < highlights.length; i++) {
    const img = highlights[i];
    if (!img.filename) continue;
    const src = path.join(outputDir, 'images', img.filename);
    const ext = path.extname(img.filename);
    const labels = ['hero', 'main-1', 'main-2', 'product-1', 'product-2', 'feature-1', 'feature-2', 'extra'];
    const dst = path.join(highlightsDir, `${String(i + 1).padStart(2, '0')}-${labels[i] || 'image'}${ext}`);
    try {
      await fs.copyFile(src, dst);
      highlightsCount++;
    } catch (e) {
      log.debug?.(`[analyzer] copy highlight failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── 4. design-analysis.json ──
  const designAnalysis = {
    extractedAt: new Date().toISOString(),
    fromContent: {
      colors_hex: brief.design.colors_hex,
      style_keywords: brief.design.style_keywords,
      overall_tone: brief.design.overall_tone,
    },
    fromHero: visionAnalysis,
    overallSummary: brief.design,
  };
  await fs.writeFile(
    path.join(outputDir, 'design-analysis.json'),
    JSON.stringify(designAnalysis, null, 2),
    'utf-8'
  );

  // ── 5. brief.json（給下游用）──
  await fs.writeFile(
    path.join(outputDir, 'brief.json'),
    JSON.stringify(brief, null, 2),
    'utf-8'
  );

  // ── 6. report.md（行銷高規）──
  const reportMd = buildReport(brief, designAnalysis, highlightsCount, url);
  await fs.writeFile(path.join(outputDir, 'report.md'), reportMd, 'utf-8');

  // ── 7. brief-package.zip（給下游用，含 report + brief + highlights）──
  try {
    const { spawnSync } = await import('node:child_process');
    const zipPath = path.join(outputDir, 'brief-package.zip');
    // 移除可能存在的舊 zip
    try { await fs.unlink(zipPath); } catch { /* ok */ }
    const result = spawnSync(
      'zip',
      ['-rq', 'brief-package.zip', 'report.md', 'brief.json', 'design-analysis.json', 'highlights/'],
      { cwd: outputDir, timeout: 30_000 }
    );
    if (result.status !== 0) {
      log.warn(`[analyzer] zip 打包失敗（不致命）：${result.stderr?.toString().slice(0, 200)}`);
    }
  } catch (e) {
    log.warn(`[analyzer] zip 失敗：${e instanceof Error ? e.message : String(e)}`);
  }

  const durationMs = Date.now() - startedAt;
  // Gemini Flash 大約 $0.075 / 1M input + $0.30 / 1M output token
  // 一次 brief ~10K input + 2K output ≈ $0.001~0.002，加 vision 翻倍
  const costEstimateUsd = 0.005;

  log.info(`[analyzer] 完成 ${url} → report.md / brief.json / design-analysis.json (${durationMs}ms, ~$${costEstimateUsd})`);

  return {
    ok: true,
    reportPath: path.join(outputDir, 'report.md'),
    briefPath: path.join(outputDir, 'brief.json'),
    highlightsCount,
    costEstimateUsd,
    durationMs,
  };
}

function buildReport(brief: MarketingBrief, design: Record<string, unknown>, highlightsCount: number, url: string): string {
  const lines: string[] = [];
  const dt = new Date().toLocaleDateString('zh-TW');

  lines.push(`# 🎯 ${brief.title || brief.domain} — 行銷分析報告`);
  lines.push('');
  lines.push(`> 分析日期：${dt} · 來源：${url}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 一句話摘要
  lines.push(`## 📋 一句話摘要`);
  lines.push('');
  lines.push(`> **${brief.one_liner}**`);
  lines.push('');
  lines.push(`**業態：** ${brief.business_type}`);
  lines.push(`**目標客群：** ${brief.target_audience.join('、')}`);
  lines.push('');

  // 核心賣點
  lines.push(`## 💎 核心賣點`);
  lines.push('');
  brief.selling_points.forEach((sp, i) => lines.push(`${i + 1}. ${sp}`));
  lines.push('');

  // 提供什麼
  lines.push(`## 🛒 服務 / 產品`);
  lines.push('');
  brief.service_or_product.forEach(s => lines.push(`- ${s}`));
  lines.push('');

  // 定價
  lines.push(`## 💰 定價策略`);
  lines.push('');
  if (brief.pricing.has_price) {
    if (brief.pricing.range) lines.push(`**價格區間：** ${brief.pricing.range}`);
    if (brief.pricing.notes) lines.push(`**觀察：** ${brief.pricing.notes}`);
  } else {
    lines.push(`*網站未公開價格資訊*`);
  }
  lines.push('');

  // 聯絡資訊
  lines.push(`## 📞 聯絡資訊`);
  lines.push('');
  if (brief.contact.phone) lines.push(`**電話：** ${brief.contact.phone}`);
  if (brief.contact.email) lines.push(`**Email：** ${brief.contact.email}`);
  if (brief.contact.address) lines.push(`**地址：** ${brief.contact.address}`);
  if (brief.contact.hours) lines.push(`**營業時間：** ${brief.contact.hours}`);
  if (brief.contact.social && Object.keys(brief.contact.social).length) {
    lines.push(`**社群：**`);
    for (const [k, v] of Object.entries(brief.contact.social)) lines.push(`  - ${k}: ${v}`);
  }
  lines.push('');

  // 設計分析
  lines.push(`## 🎨 設計風格分析`);
  lines.push('');
  lines.push(`**整體調性：** ${brief.design.overall_tone}`);
  lines.push(`**風格關鍵字：** ${brief.design.style_keywords.join(' · ')}`);
  lines.push(`**字體觀察：** ${brief.design.fonts_observation}`);
  lines.push('');
  lines.push(`**主色票：**`);
  lines.push('');
  brief.design.colors_hex.forEach(hex => {
    lines.push(`- \`${hex}\` ![](https://placehold.co/40x20/${hex.replace('#', '')}/png)`);
  });
  lines.push('');

  // SEO
  lines.push(`## 🔍 SEO 觀察`);
  lines.push('');
  lines.push(`**Meta 標題：** ${brief.seo.meta_title || '（未設定）'}`);
  lines.push(`**Meta 描述：** ${brief.seo.meta_description || '（未設定）'}`);
  lines.push(`**結構化資料 (JSON-LD)：** ${brief.seo.has_jsonld ? '✅ 有' : '❌ 無'}`);
  lines.push(`**OG 主圖：** ${brief.seo.has_og_image ? '✅ 有' : '❌ 無'}`);
  lines.push('');

  // 競品觀察
  lines.push(`## 🎯 競品 / 差異化觀察`);
  lines.push('');
  lines.push(brief.competitive_observation);
  lines.push('');

  // 改善建議（提案語氣）
  lines.push(`## 🛠️ 提案機會點（直接拿去打單）`);
  lines.push('');
  brief.weakness_or_improvement.forEach((w, i) => {
    if (typeof w === 'string') {
      lines.push(`${i + 1}. ${w}`);
    } else {
      lines.push(`### ${i + 1}. ${w.issue}`);
      lines.push('');
      lines.push(`**解決方案：** ${w.proposal}`);
      lines.push('');
      lines.push(`**預估效益：** ${w.estimated_impact}`);
      lines.push('');
    }
  });

  // 開場話術
  if (brief.hooks_for_pitch && brief.hooks_for_pitch.length) {
    lines.push(`## 💬 LINE 開場話術（直接複製傳客戶）`);
    lines.push('');
    brief.hooks_for_pitch.forEach((h, i) => {
      lines.push(`**${i + 1}.** ${h}`);
      lines.push('');
    });
  }

  // 重點圖片
  lines.push(`## 🖼️ 重點素材`);
  lines.push('');
  lines.push(`已挑出 **${highlightsCount} 張** 重點圖片到 \`highlights/\` 資料夾，可直接拿去：`);
  lines.push(`- 餵 Midjourney 做風格參考`);
  lines.push(`- 拼簡報 / 提案 PDF`);
  lines.push(`- 設計蝦做版型參考`);
  lines.push('');

  // 下游 AI 工具 prompts
  lines.push(`## 🤖 下游 AI 工具 Prompt`);
  lines.push('');
  lines.push(`### Midjourney（生風格圖）`);
  lines.push('```');
  lines.push(brief.ai_prompts.midjourney);
  lines.push('```');
  lines.push('');
  lines.push(`### ChatGPT（生提案 PDF）`);
  lines.push('```');
  lines.push(brief.ai_prompts.pdf_proposal);
  lines.push('```');
  lines.push('');
  lines.push(`### Canva（搜模板關鍵字）`);
  lines.push(brief.ai_prompts.canva_keywords.map(k => `\`${k}\``).join(' · '));
  lines.push('');

  // 附錄
  lines.push(`---`);
  lines.push('');
  lines.push(`## 📎 附件`);
  lines.push('');
  lines.push(`### 🎁 給下游 AI 用（拖拉上傳到 ChatGPT/Claude/Notion）`);
  lines.push(`- **\`brief-package.zip\`** ← 一個檔搞定（含 report + brief + design + highlights）`);
  lines.push('');
  lines.push(`### 📂 個別檔案`);
  lines.push(`- \`brief.json\` — 結構化素材包`);
  lines.push(`- \`design-analysis.json\` — 設計風格細節（含 Vision 分析）`);
  lines.push(`- \`highlights/\` — ${highlightsCount} 張重點圖片`);
  lines.push(`- \`content.md\` — 網站完整內容`);
  lines.push(`- \`metadata.json\` — Meta / OG / Twitter card`);
  lines.push(`- \`raw.html\` — 原始 HTML（重新處理用）`);
  lines.push('');
  lines.push(`*由 OpenClaw 達爾自動產生 · v9.3.8*`);

  return lines.join('\n');
}
