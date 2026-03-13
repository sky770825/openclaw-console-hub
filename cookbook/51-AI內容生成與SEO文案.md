---
tags: [AI, content-generation, SEO, copywriting, OpenAI, Gemini, blog, marketing]
date: 2026-03-05
category: cookbook
---

# 51 — AI 內容生成與 SEO 文案

> 適用對象：行銷人員、內容創作者、接案網頁設計師、SEO 專員
> 最後更新：2026-03-05

---

## 目錄

1. [SEO 文案的 Prompt Engineering](#1-seo-文案的-prompt-engineering)
2. [部落格文章自動生成 Pipeline](#2-部落格文章自動生成-pipeline)
3. [商品描述自動產生](#3-商品描述自動產生)
4. [社群貼文排程生成](#4-社群貼文排程生成)
5. [AI 改寫與潤稿工具](#5-ai-改寫與潤稿工具)
6. [多語翻譯](#6-多語翻譯)
7. [圖片 Alt Text 自動生成](#7-圖片-alt-text-自動生成)
8. [n8n 自動發文工作流](#8-n8n-自動發文工作流)
9. [完整範例：端到端 SEO 內容工廠](#9-完整範例端到端-seo-內容工廠)

---

## 變數說明（全文通用）

| 變數 | 說明 | 取得方式 |
|------|------|---------|
| `GEMINI_API_KEY` | Google AI Studio API Key | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | OpenAI API Key | https://platform.openai.com/api-keys |
| `SUPABASE_URL` | Supabase 專案 URL | Supabase Dashboard → Settings → API |
| `SUPABASE_KEY` | Supabase service_role key | Supabase Dashboard → Settings → API |
| `WORDPRESS_URL` | WordPress 站點 URL | 你的 WordPress 網站 |
| `WORDPRESS_USER` | WordPress 應用程式密碼帳號 | WordPress → 使用者 → 應用程式密碼 |
| `WORDPRESS_APP_PASSWORD` | WordPress 應用程式密碼 | WordPress → 使用者 → 應用程式密碼 |

> 所有 API Key 建議用 `.env` 管理，不要寫死在程式碼裡。

---

## 1. SEO 文案的 Prompt Engineering

### 1.1 核心概念

SEO 文案的 prompt 必須包含三個維度：**搜尋意圖**、**關鍵字佈局**、**內容結構**。

| 維度 | 說明 | Prompt 中怎麼指定 |
|------|------|-------------------|
| 搜尋意圖 | 使用者搜這個詞想得到什麼 | 「寫一篇回答 X 問題的文章」 |
| 關鍵字佈局 | 主關鍵字 + 長尾關鍵字的自然分佈 | 「主關鍵字：X，長尾：Y、Z」 |
| 內容結構 | H1/H2/H3 標題層級、段落安排 | 「用 H2 分成 5 個段落」 |

### 1.2 SEO Prompt 模板系統

```typescript
// seo-prompt-templates.ts
// SEO 文案 Prompt 模板系統 — 可直接使用的 prompt 工廠

interface SEOPromptConfig {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetAudience: string;
  contentType: 'blog' | 'product' | 'landing' | 'faq';
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative';
  wordCount: number;
  language: string;
}

interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
  metaPrompt: string; // 用來生成 meta title/description
}

/**
 * 根據設定生成完整的 SEO 文案 prompt
 */
function buildSEOPrompt(config: SEOPromptConfig): GeneratedPrompt {
  const toneMap: Record<string, string> = {
    professional: '專業、權威，使用行業術語但保持可讀性',
    casual: '輕鬆自然，像朋友聊天一樣',
    friendly: '親切友善，使用簡單易懂的語言',
    authoritative: '具有權威感，引用數據和案例佐證',
  };

  const structureMap: Record<string, string> = {
    blog: `
## 文章結構要求：
- H1：包含主關鍵字的吸引人標題
- 開頭段落（100 字內）：直接點出讀者痛點，包含主關鍵字
- H2 分段（3-6 個）：每段圍繞一個子主題，自然融入長尾關鍵字
- 每段包含：實際案例 or 數據 or 步驟教學
- 結尾段落：總結 + CTA（呼籲行動）
- 內部連結建議：2-3 個相關文章連結位置
- FAQ 區塊：3-5 個常見問題（用 <details> 標籤）`,
    product: `
## 商品描述結構：
- 商品名稱（含主關鍵字）
- 一句話賣點（30 字內）
- 特色列表（3-5 個 bullet points）
- 詳細描述（200-400 字，包含使用場景）
- 規格表
- FAQ（2-3 個）`,
    landing: `
## Landing Page 結構：
- Hero 區塊：大標題 + 副標題 + CTA 按鈕文字
- 痛點區塊：3 個客戶常見問題
- 解決方案區塊：你的產品/服務如何解決
- 社會證明：客戶評價、數據
- 最終 CTA：行動呼籲`,
    faq: `
## FAQ 結構：
- 每個問題包含主關鍵字或長尾關鍵字
- 回答控制在 50-150 字
- 使用 Schema.org FAQPage 結構化資料格式
- 答案中自然連結到相關頁面`,
  };

  const systemPrompt = `你是一位資深 SEO 內容策略師，專精 ${config.language} SEO 文案撰寫。

## 你的核心能力：
1. 寫出搜尋引擎友好、同時對人類有價值的內容
2. 自然地將關鍵字融入文章，不堆砌
3. 使用正確的 HTML 語義標籤（H1-H6、ul/ol、strong、em）
4. 理解搜尋意圖，提供真正回答使用者問題的內容

## SEO 寫作鐵律：
- 主關鍵字出現在：標題、第一段、至少一個 H2、最後一段
- 主關鍵字密度控制在 1-2%（自然就好，不要刻意）
- 長尾關鍵字各出現 1-2 次，分散在不同段落
- 段落不超過 4 行（手機閱讀體驗）
- 每 300 字至少一個子標題（H2 或 H3）
- 使用清單（ul/ol）提升可讀性
- 包含內部連結和外部權威連結的建議位置

## 語氣要求：
${toneMap[config.tone]}`;

  const userPrompt = `請撰寫一篇關於「${config.topic}」的${config.contentType === 'blog' ? '部落格文章' : config.contentType === 'product' ? '商品描述' : config.contentType === 'landing' ? 'Landing Page 文案' : 'FAQ 頁面'}。

## 關鍵字配置：
- 主關鍵字：${config.primaryKeyword}
- 次要關鍵字：${config.secondaryKeywords.join('、')}

## 目標受眾：
${config.targetAudience}

## 字數要求：
約 ${config.wordCount} 字（${config.language}）

${structureMap[config.contentType]}

## 輸出格式：
使用 Markdown 格式，標題用 ## 和 ###。`;

  const metaPrompt = `根據以下文章內容，生成 SEO meta 資訊：

1. Meta Title（50-60 字元，含主關鍵字「${config.primaryKeyword}」）
2. Meta Description（120-155 字元，含主關鍵字，有吸引點擊的 CTA）
3. Open Graph Title（社群分享用，可以比 Meta Title 更吸引人）
4. Open Graph Description（社群分享用，70 字元內）
5. URL Slug 建議（英文小寫，用連字號分隔）

請以 JSON 格式輸出。`;

  return { systemPrompt, userPrompt, metaPrompt };
}

// ---- 使用範例 ----

const blogPrompt = buildSEOPrompt({
  topic: '2026 年台北網頁設計費用行情',
  primaryKeyword: '網頁設計費用',
  secondaryKeywords: ['網頁設計報價', '架設網站多少錢', '網頁設計公司推薦'],
  targetAudience: '想要架設公司網站的中小企業主',
  contentType: 'blog',
  tone: 'professional',
  wordCount: 2000,
  language: '繁體中文',
});

console.log('System Prompt:', blogPrompt.systemPrompt);
console.log('User Prompt:', blogPrompt.userPrompt);
```

### 1.3 關鍵字研究輔助工具

```typescript
// keyword-research-helper.ts
// 用 AI 輔助關鍵字研究 — 產出關鍵字叢集和內容策略

interface KeywordCluster {
  primary: string;
  secondary: string[];
  longTail: string[];
  searchIntent: 'informational' | 'navigational' | 'transactional' | 'local';
  suggestedContentType: string;
  difficulty: 'low' | 'medium' | 'high';
}

interface ContentStrategy {
  pillarPage: string;
  clusterPages: string[];
  internalLinkMap: Record<string, string[]>;
}

/**
 * 用 Gemini 分析種子關鍵字，產出關鍵字叢集
 */
async function analyzeKeywords(
  seedKeyword: string,
  industry: string,
  apiKey: string
): Promise<KeywordCluster[]> {
  const prompt = `你是 SEO 關鍵字研究專家。

針對「${seedKeyword}」這個種子關鍵字（產業：${industry}），請產出關鍵字叢集分析。

請以 JSON 陣列格式回傳，每個叢集包含：
- primary: 主關鍵字
- secondary: 次要關鍵字（3-5 個）
- longTail: 長尾關鍵字（5-8 個）
- searchIntent: 搜尋意圖（informational/navigational/transactional/local）
- suggestedContentType: 建議的內容類型
- difficulty: 競爭難度預估

請給出 3-5 個叢集，涵蓋不同搜尋意圖。僅回傳 JSON，不要多餘文字。`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  return JSON.parse(text) as KeywordCluster[];
}

/**
 * 根據關鍵字叢集，生成內容策略（Pillar + Cluster 模型）
 */
async function generateContentStrategy(
  clusters: KeywordCluster[],
  brandName: string,
  apiKey: string
): Promise<ContentStrategy> {
  const prompt = `你是內容策略師。根據以下關鍵字叢集，設計 Pillar-Cluster 內容策略。

關鍵字叢集：
${JSON.stringify(clusters, null, 2)}

品牌名稱：${brandName}

請輸出 JSON 格式：
{
  "pillarPage": "支柱頁面的標題和主題",
  "clusterPages": ["叢集頁面標題陣列，每個叢集至少 2-3 篇"],
  "internalLinkMap": { "頁面標題": ["該頁面應該連結到的其他頁面標題"] }
}

僅回傳 JSON。`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text) as ContentStrategy;
}
```

---

## 2. 部落格文章自動生成 Pipeline

### 2.1 架構概覽

```
關鍵字輸入 → 大綱生成 → 逐段撰寫 → SEO 檢查 → Meta 生成 → 儲存/發佈
```

### 2.2 完整 Pipeline 實作

```typescript
// blog-pipeline.ts
// 部落格文章自動生成 Pipeline — 從關鍵字到發佈

import { createClient } from '@supabase/supabase-js';

// ---- 型別定義 ----

interface BlogOutline {
  title: string;
  slug: string;
  sections: {
    heading: string;
    level: 2 | 3;
    keyPoints: string[];
    targetKeyword: string;
  }[];
  estimatedWordCount: number;
}

interface BlogArticle {
  title: string;
  slug: string;
  content: string; // Markdown 格式
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  tags: string[];
  wordCount: number;
  readingTime: number; // 分鐘
  createdAt: string;
}

interface SEOCheckResult {
  score: number; // 0-100
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  suggestions: string[];
}

// ---- Gemini API 呼叫封裝 ----

async function callGemini(
  prompt: string,
  systemInstruction: string,
  apiKey: string,
  jsonMode: boolean = false
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- Step 1: 生成文章大綱 ----

async function generateOutline(
  topic: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
  apiKey: string
): Promise<BlogOutline> {
  const system = `你是 SEO 內容策略師，專精繁體中文部落格文章結構規劃。`;

  const prompt = `為以下主題生成部落格文章大綱：

主題：${topic}
主關鍵字：${primaryKeyword}
次要關鍵字：${secondaryKeywords.join('、')}

要求：
1. 標題包含主關鍵字，吸引點擊
2. 5-7 個 H2 段落，涵蓋主題的各個面向
3. 每個段落標明要涵蓋的重點（3-5 個 bullet points）
4. 每個段落指定一個目標關鍵字（主或次要關鍵字）
5. 產出 URL slug（英文小寫、連字號分隔）

以 JSON 格式回傳：
{
  "title": "文章標題",
  "slug": "url-slug",
  "sections": [
    {
      "heading": "段落標題",
      "level": 2,
      "keyPoints": ["重點1", "重點2"],
      "targetKeyword": "目標關鍵字"
    }
  ],
  "estimatedWordCount": 2000
}`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as BlogOutline;
}

// ---- Step 2: 逐段撰寫 ----

async function writeSections(
  outline: BlogOutline,
  tone: string,
  apiKey: string
): Promise<string> {
  const system = `你是資深部落格寫手，擅長撰寫 SEO 友好的繁體中文文章。
語氣：${tone}
寫作規則：
- 段落不超過 4 行
- 善用清單、表格增加可讀性
- 關鍵字自然融入，不堆砌
- 每段 200-400 字
- 用 Markdown 格式`;

  let fullContent = `# ${outline.title}\n\n`;

  // 開頭段落
  const introPrompt = `寫一段開頭引言（80-120 字），主題是「${outline.title}」。
要求：
- 直接點出讀者痛點或需求
- 包含關鍵字「${outline.sections[0]?.targetKeyword || ''}」
- 讓讀者想繼續看下去
- 不要用「你是否曾經...」這種老套開頭`;

  const intro = await callGemini(introPrompt, system, apiKey);
  fullContent += intro + '\n\n---\n\n';

  // 逐段撰寫
  for (const section of outline.sections) {
    const sectionPrompt = `撰寫以下段落的完整內容：

## ${section.heading}

要涵蓋的重點：
${section.keyPoints.map((p) => `- ${p}`).join('\n')}

目標關鍵字（自然融入）：${section.targetKeyword}

要求：
- 使用 ## 作為標題（已提供）
- 段落 200-400 字
- 包含實際案例或數據
- 至少使用一個清單或表格
- 輸出 Markdown 格式`;

    const sectionContent = await callGemini(sectionPrompt, system, apiKey);
    fullContent += sectionContent + '\n\n';
  }

  // 結尾段落
  const outroPrompt = `寫一段結尾（80-120 字），為文章「${outline.title}」做總結。
要求：
- 總結文章重點
- 包含一個 CTA（例如：聯繫我們、留言討論、分享文章）
- 包含主關鍵字`;

  const outro = await callGemini(outroPrompt, system, apiKey);
  fullContent += '---\n\n## 總結\n\n' + outro + '\n';

  return fullContent;
}

// ---- Step 3: SEO 品質檢查 ----

function checkSEOQuality(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): SEOCheckResult {
  const checks: SEOCheckResult['checks'] = [];
  const suggestions: string[] = [];
  const contentLower = content.toLowerCase();
  const primaryLower = primaryKeyword.toLowerCase();

  // 1. 標題包含主關鍵字
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const titleContainsKeyword = titleMatch
    ? titleMatch[1].includes(primaryKeyword)
    : false;
  checks.push({
    name: '標題包含主關鍵字',
    passed: titleContainsKeyword,
    message: titleContainsKeyword
      ? `標題「${titleMatch?.[1]}」包含「${primaryKeyword}」`
      : `標題未包含主關鍵字「${primaryKeyword}」`,
  });

  // 2. 第一段包含主關鍵字
  const paragraphs = content.split('\n\n').filter((p) => p.trim() && !p.startsWith('#'));
  const firstParaHasKeyword =
    paragraphs.length > 0 && paragraphs[0].includes(primaryKeyword);
  checks.push({
    name: '第一段包含主關鍵字',
    passed: firstParaHasKeyword,
    message: firstParaHasKeyword
      ? '首段已包含主關鍵字'
      : '建議在首段加入主關鍵字',
  });

  // 3. 關鍵字密度
  const totalChars = content.replace(/[#\-*_\n\s]/g, '').length;
  const keywordCount = (
    contentLower.match(new RegExp(primaryLower, 'g')) || []
  ).length;
  const density = totalChars > 0 ? (keywordCount * primaryKeyword.length) / totalChars * 100 : 0;
  const densityOk = density >= 0.5 && density <= 3;
  checks.push({
    name: '關鍵字密度（0.5%-3%）',
    passed: densityOk,
    message: `主關鍵字出現 ${keywordCount} 次，密度約 ${density.toFixed(1)}%`,
  });

  // 4. H2 標題數量
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h2Ok = h2Count >= 3 && h2Count <= 8;
  checks.push({
    name: 'H2 標題數量（3-8 個）',
    passed: h2Ok,
    message: `共 ${h2Count} 個 H2 標題`,
  });

  // 5. 次要關鍵字涵蓋率
  const coveredSecondary = secondaryKeywords.filter((kw) =>
    contentLower.includes(kw.toLowerCase())
  );
  const secondaryCoverage = secondaryKeywords.length > 0
    ? coveredSecondary.length / secondaryKeywords.length
    : 1;
  checks.push({
    name: '次要關鍵字涵蓋率',
    passed: secondaryCoverage >= 0.6,
    message: `涵蓋 ${coveredSecondary.length}/${secondaryKeywords.length} 個次要關鍵字`,
  });

  // 6. 字數檢查
  const wordCount = content.replace(/[#\-*_\n]/g, '').replace(/\s+/g, '').length;
  const wordCountOk = wordCount >= 1000;
  checks.push({
    name: '字數 >= 1000',
    passed: wordCountOk,
    message: `共約 ${wordCount} 字`,
  });

  // 7. 是否有清單
  const hasList = /^[-*]\s/m.test(content) || /^\d+\.\s/m.test(content);
  checks.push({
    name: '包含清單（提升可讀性）',
    passed: hasList,
    message: hasList ? '文章包含清單' : '建議加入條列式清單',
  });

  // 8. 最後一段包含主關鍵字
  const lastPara = paragraphs[paragraphs.length - 1] || '';
  const lastParaHasKeyword = lastPara.includes(primaryKeyword);
  checks.push({
    name: '最後一段包含主關鍵字',
    passed: lastParaHasKeyword,
    message: lastParaHasKeyword
      ? '結尾段已包含主關鍵字'
      : '建議在結尾段加入主關鍵字',
  });

  // 計算總分
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  // 生成建議
  if (!titleContainsKeyword)
    suggestions.push(`將標題改為包含「${primaryKeyword}」的版本`);
  if (!densityOk && density < 0.5)
    suggestions.push('主關鍵字密度偏低，建議在文中多自然提及');
  if (!densityOk && density > 3)
    suggestions.push('主關鍵字密度過高，有堆砌嫌疑，建議減少或用同義詞替換');
  if (secondaryCoverage < 0.6) {
    const missing = secondaryKeywords.filter(
      (kw) => !contentLower.includes(kw.toLowerCase())
    );
    suggestions.push(`缺少次要關鍵字：${missing.join('、')}`);
  }

  return { score, checks, suggestions };
}

// ---- Step 4: 生成 Meta 資訊 ----

async function generateMeta(
  content: string,
  primaryKeyword: string,
  apiKey: string
): Promise<{
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  tags: string[];
}> {
  const prompt = `根據以下文章，生成 SEO meta 資訊。

文章摘要（取前 500 字）：
${content.slice(0, 500)}

主關鍵字：${primaryKeyword}

請以 JSON 回傳：
{
  "metaTitle": "50-60 字元，含主關鍵字",
  "metaDescription": "120-155 字元，含主關鍵字和 CTA",
  "ogTitle": "社群分享標題，可以更吸引人",
  "ogDescription": "社群分享描述，70 字元內",
  "tags": ["標籤1", "標籤2", "標籤3"]
}`;

  const system = '你是 SEO meta 資訊專家，精通繁體中文 meta 撰寫。';
  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result);
}

// ---- Step 5: 完整 Pipeline 整合 ----

async function runBlogPipeline(params: {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  tone: string;
  apiKey: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}): Promise<BlogArticle> {
  const { topic, primaryKeyword, secondaryKeywords, tone, apiKey } = params;

  console.log('[1/5] 生成大綱...');
  const outline = await generateOutline(
    topic,
    primaryKeyword,
    secondaryKeywords,
    apiKey
  );
  console.log(`  大綱完成：${outline.sections.length} 個段落`);

  console.log('[2/5] 撰寫文章...');
  const content = await writeSections(outline, tone, apiKey);
  console.log(`  撰寫完成：約 ${content.length} 字元`);

  console.log('[3/5] SEO 品質檢查...');
  const seoResult = checkSEOQuality(content, primaryKeyword, secondaryKeywords);
  console.log(`  SEO 分數：${seoResult.score}/100`);
  seoResult.suggestions.forEach((s) => console.log(`  建議：${s}`));

  console.log('[4/5] 生成 Meta 資訊...');
  const meta = await generateMeta(content, primaryKeyword, apiKey);

  const charCount = content.replace(/\s/g, '').length;
  const readingTime = Math.ceil(charCount / 500); // 中文每分鐘約 500 字

  const article: BlogArticle = {
    title: outline.title,
    slug: outline.slug,
    content,
    metaTitle: meta.metaTitle,
    metaDescription: meta.metaDescription,
    ogTitle: meta.ogTitle,
    ogDescription: meta.ogDescription,
    tags: meta.tags,
    wordCount: charCount,
    readingTime,
    createdAt: new Date().toISOString(),
  };

  // Step 5: 儲存到 Supabase（可選）
  if (params.supabaseUrl && params.supabaseKey) {
    console.log('[5/5] 儲存到資料庫...');
    const supabase = createClient(params.supabaseUrl, params.supabaseKey);
    const { error } = await supabase.from('blog_articles').insert({
      title: article.title,
      slug: article.slug,
      content: article.content,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      og_title: article.ogTitle,
      og_description: article.ogDescription,
      tags: article.tags,
      word_count: article.wordCount,
      reading_time: article.readingTime,
      seo_score: seoResult.score,
      status: seoResult.score >= 70 ? 'ready' : 'needs_review',
    });
    if (error) console.error('  儲存失敗:', error.message);
    else console.log('  已儲存到 blog_articles 表');
  } else {
    console.log('[5/5] 跳過資料庫儲存（未提供 Supabase 設定）');
  }

  return article;
}
```

### 2.3 Supabase 資料表 Schema

```sql
-- 部落格文章表
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  og_title TEXT,
  og_description TEXT,
  tags TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  seo_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'ready', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. 商品描述自動產生

### 3.1 商品描述生成器

```typescript
// product-description-generator.ts
// 商品描述 AI 自動生成 — 支援批次處理

interface ProductInput {
  name: string;
  category: string;
  features: string[];
  specs: Record<string, string>;
  targetAudience: string;
  priceRange?: string;
  brand?: string;
  images?: string[]; // 圖片 URL（用於 alt text 生成）
}

interface ProductDescription {
  shortDescription: string;    // 一句話（30 字內）
  mediumDescription: string;   // 中等長度（100-150 字）
  fullDescription: string;     // 完整描述（300-500 字，Markdown）
  bulletPoints: string[];      // 特色列表
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

/**
 * 生成單一商品的完整描述
 */
async function generateProductDescription(
  product: ProductInput,
  apiKey: string
): Promise<ProductDescription> {
  const system = `你是電商文案專家，擅長撰寫轉換率高的繁體中文商品描述。

撰寫原則：
- 強調利益（benefit），不只列規格（feature）
- 使用具體數字和場景描述
- 段落簡短，適合手機閱讀
- 關鍵字自然融入，有助 SEO
- 語氣溫暖但專業`;

  const prompt = `為以下商品生成完整的行銷描述：

商品名稱：${product.name}
分類：${product.category}
特色：${product.features.join('、')}
規格：${JSON.stringify(product.specs)}
目標受眾：${product.targetAudience}
${product.priceRange ? `價格帶：${product.priceRange}` : ''}
${product.brand ? `品牌：${product.brand}` : ''}

請以 JSON 格式回傳：
{
  "shortDescription": "一句話賣點（30 字內）",
  "mediumDescription": "中等長度描述（100-150 字，適合列表頁）",
  "fullDescription": "完整描述（300-500 字，Markdown 格式，含使用場景和利益描述）",
  "bulletPoints": ["特色1（利益導向）", "特色2", "特色3", "特色4", "特色5"],
  "seoTitle": "SEO 標題（含商品名和分類關鍵字，50-60 字元）",
  "seoDescription": "SEO 描述（120-155 字元，含 CTA）",
  "tags": ["標籤1", "標籤2", "標籤3"]
}`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as ProductDescription;
}

/**
 * 批次生成商品描述
 * 控制並發數避免 API 限速
 */
async function batchGenerateProductDescriptions(
  products: ProductInput[],
  apiKey: string,
  concurrency: number = 3
): Promise<Map<string, ProductDescription>> {
  const results = new Map<string, ProductDescription>();
  const queue = [...products];

  async function processNext(): Promise<void> {
    while (queue.length > 0) {
      const product = queue.shift();
      if (!product) break;

      try {
        console.log(`  生成中：${product.name}`);
        const desc = await generateProductDescription(product, apiKey);
        results.set(product.name, desc);
        console.log(`  完成：${product.name}`);
      } catch (err) {
        console.error(`  失敗：${product.name}`, err);
        // 失敗的放回佇列尾端重試一次
        if (!queue.includes(product)) {
          queue.push(product);
        }
      }

      // 間隔 500ms 避免限速
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 啟動多個並發 worker
  const workers = Array.from({ length: concurrency }, () => processNext());
  await Promise.all(workers);

  return results;
}

// ---- 使用範例 ----

async function demo() {
  const products: ProductInput[] = [
    {
      name: '極簡無線充電座 Pro',
      category: '3C 配件',
      features: ['15W 快充', 'Qi2 認證', '矽膠防滑底座', 'LED 指示燈'],
      specs: { 輸入: 'USB-C 20W', 輸出: '15W/10W/7.5W/5W', 重量: '120g', 尺寸: '100x100x8mm' },
      targetAudience: '注重桌面美學的上班族',
      priceRange: 'NT$800-1200',
      brand: 'MINIMALT',
    },
    {
      name: '有機棉嬰兒包巾組',
      category: '嬰兒用品',
      features: ['GOTS 有機認證', '透氣不悶熱', '四季可用', '可機洗'],
      specs: { 材質: '100% 有機棉', 尺寸: '120x120cm', 入數: '3 件組', 適用: '0-12 個月' },
      targetAudience: '注重安全材質的新手爸媽',
      priceRange: 'NT$1500-2000',
    },
  ];

  const apiKey = process.env.GEMINI_API_KEY || '';
  const results = await batchGenerateProductDescriptions(products, apiKey, 2);

  for (const [name, desc] of results) {
    console.log(`\n=== ${name} ===`);
    console.log('短描述:', desc.shortDescription);
    console.log('特色:', desc.bulletPoints.join(' | '));
    console.log('SEO 標題:', desc.seoTitle);
  }
}
```

### 3.2 商品描述 A/B 測試版本生成

```typescript
// product-ab-variants.ts
// 同一商品生成多個描述版本，用於 A/B 測試

interface ABVariant {
  variant: string;      // 'A' | 'B' | 'C'
  angle: string;        // 切入角度
  shortDescription: string;
  headline: string;
  ctaText: string;
}

async function generateABVariants(
  product: ProductInput,
  apiKey: string
): Promise<ABVariant[]> {
  const system = '你是電商轉換率優化專家，擅長從不同角度撰寫商品文案。';

  const prompt = `為以下商品生成 3 個不同切入角度的行銷文案版本（用於 A/B 測試）：

商品：${product.name}
特色：${product.features.join('、')}
受眾：${product.targetAudience}

3 個版本的切入角度：
A. 功能導向（強調性能和規格）
B. 情感導向（強調使用感受和生活場景）
C. 社會證明導向（強調其他人的選擇和評價）

以 JSON 陣列回傳：
[
  {
    "variant": "A",
    "angle": "功能導向",
    "shortDescription": "30 字內一句話",
    "headline": "主標題（15 字內）",
    "ctaText": "CTA 按鈕文字（8 字內）"
  }
]`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as ABVariant[];
}
```

---

## 4. 社群貼文排程生成

### 4.1 社群貼文生成器

```typescript
// social-post-generator.ts
// 社群貼文自動生成 — 支援 Facebook / Instagram / LINE / Twitter

type Platform = 'facebook' | 'instagram' | 'line' | 'twitter';

interface SocialPostConfig {
  topic: string;
  platform: Platform;
  goal: 'awareness' | 'engagement' | 'conversion' | 'traffic';
  brand: string;
  hashtags?: string[];
  includeEmoji: boolean;
  cta?: string;
  imageDescription?: string; // 搭配的圖片描述
}

interface SocialPost {
  platform: Platform;
  text: string;
  hashtags: string[];
  suggestedImagePrompt: string; // 可用來生成配圖的 prompt
  bestPostTime: string;        // 建議發佈時間
  characterCount: number;
}

const platformLimits: Record<Platform, { maxChars: number; hashtagCount: number; tips: string }> = {
  facebook: {
    maxChars: 2000,
    hashtagCount: 3,
    tips: '前 2 行最重要（展開前只看到這些），用段落分隔增加可讀性',
  },
  instagram: {
    maxChars: 2200,
    hashtagCount: 15,
    tips: '前 125 字元最關鍵，hashtag 放留言區或文末',
  },
  line: {
    maxChars: 500,
    hashtagCount: 0,
    tips: '簡短有力，直接說重點，附上連結',
  },
  twitter: {
    maxChars: 280,
    hashtagCount: 2,
    tips: '精煉到極致，每個字都要有用',
  },
};

async function generateSocialPost(
  config: SocialPostConfig,
  apiKey: string
): Promise<SocialPost> {
  const limits = platformLimits[config.platform];

  const system = `你是社群行銷專家，精通各平台的貼文撰寫技巧。

${config.platform} 平台規則：
- 字數上限：${limits.maxChars} 字
- Hashtag 數量：${limits.hashtagCount} 個
- 技巧：${limits.tips}`;

  const goalMap: Record<string, string> = {
    awareness: '提升品牌知名度 — 吸引新受眾注意',
    engagement: '提升互動率 — 讓人想留言、分享',
    conversion: '促進轉換 — 讓人想購買或行動',
    traffic: '導流量 — 讓人點擊連結',
  };

  const prompt = `為品牌「${config.brand}」撰寫一則 ${config.platform} 貼文。

主題：${config.topic}
目標：${goalMap[config.goal]}
${config.includeEmoji ? '可以使用 Emoji 增加視覺效果' : '不要使用 Emoji'}
${config.cta ? `CTA：${config.cta}` : ''}
${config.imageDescription ? `搭配圖片：${config.imageDescription}` : ''}
${config.hashtags ? `指定 Hashtag：${config.hashtags.join(' ')}` : ''}

以 JSON 回傳：
{
  "platform": "${config.platform}",
  "text": "完整貼文內容",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggestedImagePrompt": "可用於 AI 圖片生成的 prompt（英文，100 字內）",
  "bestPostTime": "建議發佈時間（如：週三 12:00-13:00）",
  "characterCount": 123
}`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as SocialPost;
}

// ---- 批次排程生成（一週份） ----

interface WeeklySchedule {
  posts: {
    dayOfWeek: string;
    time: string;
    platform: Platform;
    post: SocialPost;
  }[];
}

async function generateWeeklySchedule(
  brand: string,
  topics: string[],
  platforms: Platform[],
  apiKey: string
): Promise<WeeklySchedule> {
  const schedule: WeeklySchedule = { posts: [] };
  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const goals: SocialPostConfig['goal'][] = [
    'awareness', 'engagement', 'conversion', 'traffic',
    'engagement', 'awareness', 'engagement',
  ];

  for (let i = 0; i < 7; i++) {
    const topic = topics[i % topics.length];
    const platform = platforms[i % platforms.length];
    const goal = goals[i];

    const post = await generateSocialPost(
      {
        topic,
        platform,
        goal,
        brand,
        includeEmoji: platform !== 'line',
      },
      apiKey
    );

    schedule.posts.push({
      dayOfWeek: days[i],
      time: post.bestPostTime,
      platform,
      post,
    });

    // 避免 API 限速
    await new Promise((r) => setTimeout(r, 800));
  }

  return schedule;
}

// ---- 使用範例 ----

async function socialDemo() {
  const apiKey = process.env.GEMINI_API_KEY || '';

  // 單篇貼文
  const post = await generateSocialPost(
    {
      topic: '新品上架：夏日涼感系列',
      platform: 'instagram',
      goal: 'engagement',
      brand: '小蔡生活選物',
      includeEmoji: true,
      hashtags: ['小蔡選物', '夏日好物', '涼感穿搭'],
    },
    apiKey
  );
  console.log(post.text);

  // 一週排程
  const schedule = await generateWeeklySchedule(
    '小蔡工作室',
    ['客戶案例分享', '設計小技巧', '限時優惠', '幕後花絮', 'FAQ 回答'],
    ['facebook', 'instagram', 'line', 'twitter'],
    apiKey
  );
  for (const s of schedule.posts) {
    console.log(`${s.dayOfWeek} ${s.time} [${s.platform}] ${s.post.text.slice(0, 50)}...`);
  }
}
```

---

## 5. AI 改寫與潤稿工具

### 5.1 內容改寫引擎

```typescript
// content-rewriter.ts
// AI 改寫/潤稿工具 — 支援多種改寫模式

type RewriteMode =
  | 'seo_optimize'     // SEO 優化：加入關鍵字、調整結構
  | 'simplify'         // 簡化：降低閱讀難度
  | 'professional'     // 專業化：提升用字和語氣
  | 'shorten'          // 精簡：縮短到指定字數
  | 'expand'           // 擴寫：增加細節和例子
  | 'tone_change'      // 語氣轉換：正式/輕鬆/權威
  | 'plagiarism_proof'; // 反抄襲改寫：保持意思但完全換寫法

interface RewriteConfig {
  mode: RewriteMode;
  targetKeywords?: string[];     // seo_optimize 用
  targetWordCount?: number;      // shorten/expand 用
  targetTone?: string;           // tone_change 用
  preserveKeyPhrases?: string[]; // 必須保留的詞組
}

interface RewriteResult {
  original: string;
  rewritten: string;
  changesSummary: string;
  originalWordCount: number;
  rewrittenWordCount: number;
}

async function rewriteContent(
  content: string,
  config: RewriteConfig,
  apiKey: string
): Promise<RewriteResult> {
  const modeInstructions: Record<RewriteMode, string> = {
    seo_optimize: `SEO 優化改寫：
- 在標題和首段加入關鍵字：${config.targetKeywords?.join('、')}
- 增加 H2/H3 子標題（如果沒有）
- 段落控制在 3-4 行
- 自然融入關鍵字，密度 1-2%
- 加入內部連結的建議位置（用 [連結建議：XXX] 標記）`,

    simplify: `簡化改寫：
- 將複雜句子拆成簡短句子
- 用日常用語替換專業術語（必要時括號附原術語）
- 目標閱讀程度：國中生能理解
- 保持資訊完整性，只是換更簡單的說法`,

    professional: `專業化改寫：
- 提升用字精準度
- 使用專業術語（但不過度）
- 語氣沉穩、有權威感
- 加入數據或引用建議的位置`,

    shorten: `精簡改寫：
- 目標字數：${config.targetWordCount || '原文 50%'} 字
- 刪除冗詞贅字
- 合併重複的意思
- 保留所有關鍵資訊`,

    expand: `擴寫：
- 目標字數：${config.targetWordCount || '原文 200%'} 字
- 增加實際案例和情境描述
- 補充解釋和背景資訊
- 加入轉場句讓閱讀更流暢`,

    tone_change: `語氣轉換：
- 目標語氣：${config.targetTone || '友善親切'}
- 保持資訊完整，只改語氣和用詞
- 注意敬語和稱呼的一致性`,

    plagiarism_proof: `反抄襲改寫：
- 完全換寫法，但保持完全相同的意思
- 調整句子結構（主動/被動轉換）
- 替換同義詞
- 重新排列段落順序（如果不影響邏輯）
- 最終結果必須通過抄襲偵測`,
  };

  const system = '你是專業的中文內容編輯，擅長根據不同目的改寫文章。';

  const preserveNote = config.preserveKeyPhrases?.length
    ? `\n\n必須保留的詞組（不能改動）：${config.preserveKeyPhrases.join('、')}`
    : '';

  const prompt = `請改寫以下內容。

## 改寫規則：
${modeInstructions[config.mode]}
${preserveNote}

## 原文：
${content}

## 輸出要求：
直接輸出改寫後的內容，不要加任何說明文字。使用 Markdown 格式。`;

  const rewritten = await callGemini(prompt, system, apiKey);

  // 生成變更摘要
  const summaryPrompt = `比較以下原文和改寫版本，用 3-5 個 bullet points 摘要主要變更。

原文（前 300 字）：${content.slice(0, 300)}
改寫（前 300 字）：${rewritten.slice(0, 300)}

只列出差異，不要贅述。`;

  const summary = await callGemini(summaryPrompt, system, apiKey);

  return {
    original: content,
    rewritten,
    changesSummary: summary,
    originalWordCount: content.replace(/\s/g, '').length,
    rewrittenWordCount: rewritten.replace(/\s/g, '').length,
  };
}

// ---- 批次潤稿（整個網站的舊文翻新） ----

async function batchRewriteArticles(
  articles: { id: string; title: string; content: string }[],
  mode: RewriteMode,
  apiKey: string
): Promise<Map<string, RewriteResult>> {
  const results = new Map<string, RewriteResult>();

  for (const article of articles) {
    console.log(`改寫中：${article.title}`);
    try {
      const result = await rewriteContent(
        article.content,
        { mode },
        apiKey
      );
      results.set(article.id, result);
      console.log(
        `  完成：${result.originalWordCount} → ${result.rewrittenWordCount} 字`
      );
    } catch (err) {
      console.error(`  失敗：${article.title}`, err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}
```

### 5.2 文法與風格檢查

```typescript
// style-checker.ts
// 中文文法與風格自動檢查

interface StyleIssue {
  type: 'grammar' | 'style' | 'seo' | 'readability';
  severity: 'error' | 'warning' | 'suggestion';
  location: string;   // 問題所在的文字片段
  message: string;
  suggestion: string; // 建議修改
}

async function checkWritingStyle(
  content: string,
  apiKey: string
): Promise<StyleIssue[]> {
  const system = `你是繁體中文編輯專家，精通中文文法、用字規範和 SEO 寫作。

常見問題清單：
1. 簡繁混用（「于」→「於」、「么」→「嗎」）
2. 贅詞（「進行一個 XX 的動作」→「XX」）
3. 被動語態過多
4. 句子過長（超過 40 字無標點）
5. 段落過長（超過 5 行）
6. 專有名詞不一致（SEO/seo/搜尋引擎優化 混用）
7. 缺少轉場詞（因此、然而、此外）
8. 標點符號錯誤（全形半形混用）`;

  const prompt = `檢查以下文章的文法和風格問題：

${content}

以 JSON 陣列回傳，每個問題包含：
{
  "type": "grammar|style|seo|readability",
  "severity": "error|warning|suggestion",
  "location": "問題所在的文字片段",
  "message": "問題描述",
  "suggestion": "建議修改為什麼"
}

只回傳真正有問題的地方，不要硬找問題。如果文章品質良好，可以回傳空陣列。`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as StyleIssue[];
}
```

---

## 6. 多語翻譯

### 6.1 SEO 感知翻譯器

一般翻譯工具不會考慮 SEO，這個工具專門處理內容行銷的翻譯需求。

```typescript
// seo-translator.ts
// SEO 感知的多語翻譯 — 不只翻字，還翻關鍵字策略

interface TranslationConfig {
  sourceLanguage: string;
  targetLanguage: string;
  targetMarket: string;     // 目標市場（美國、日本、東南亞...）
  localizeKeywords: boolean; // 是否本地化關鍵字（不是直譯，而是查當地搜尋習慣）
  preserveFormatting: boolean; // 保留 Markdown 格式
  contentType: 'blog' | 'product' | 'ui' | 'marketing';
}

interface TranslationResult {
  translatedContent: string;
  translatedMeta: {
    title: string;
    description: string;
  };
  localizedKeywords: {
    original: string;
    translated: string;
    localAlternative: string; // 當地搜尋量更高的替代詞
  }[];
  culturalNotes: string[]; // 文化差異提醒
}

async function translateContent(
  content: string,
  meta: { title: string; description: string },
  keywords: string[],
  config: TranslationConfig,
  apiKey: string
): Promise<TranslationResult> {
  const system = `你是專業的 SEO 翻譯師，精通 ${config.sourceLanguage} 和 ${config.targetLanguage}。

翻譯原則：
1. 不是逐字翻譯，而是重寫（transcreation）
2. 關鍵字要本地化 — 用目標市場真正在搜的詞，不是直譯
3. 考慮文化差異（度量衡、日期格式、貨幣、慣用語）
4. 保持 SEO 結構（H1/H2/H3 層級不變）
5. ${config.preserveFormatting ? '保留 Markdown 格式' : '可以調整格式'}
6. 目標市場：${config.targetMarket}`;

  const prompt = `將以下 ${config.sourceLanguage} 內容翻譯成 ${config.targetLanguage}，目標市場是 ${config.targetMarket}。

## 原文：
${content}

## 原文 Meta：
Title: ${meta.title}
Description: ${meta.description}

## 需要本地化的關鍵字：
${keywords.join('、')}

請以 JSON 回傳：
{
  "translatedContent": "翻譯後的完整內容（Markdown）",
  "translatedMeta": {
    "title": "翻譯後的 meta title",
    "description": "翻譯後的 meta description"
  },
  "localizedKeywords": [
    {
      "original": "原始關鍵字",
      "translated": "直譯",
      "localAlternative": "當地搜尋量更高的替代詞"
    }
  ],
  "culturalNotes": ["文化差異提醒1", "提醒2"]
}`;

  const result = await callGemini(prompt, system, apiKey, true);
  return JSON.parse(result) as TranslationResult;
}

// ---- 批次多語翻譯 ----

async function translateToMultipleLanguages(
  content: string,
  meta: { title: string; description: string },
  keywords: string[],
  targets: { language: string; market: string }[],
  apiKey: string
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();

  for (const target of targets) {
    console.log(`翻譯中：${target.language}（${target.market}）...`);
    const result = await translateContent(
      content,
      meta,
      keywords,
      {
        sourceLanguage: '繁體中文',
        targetLanguage: target.language,
        targetMarket: target.market,
        localizeKeywords: true,
        preserveFormatting: true,
        contentType: 'blog',
      },
      apiKey
    );
    results.set(target.language, result);
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}

// ---- 使用範例 ----

async function translationDemo() {
  const apiKey = process.env.GEMINI_API_KEY || '';

  const results = await translateToMultipleLanguages(
    '# 2026 年網頁設計費用完整指南\n\n想架設公司網站但不知道要花多少錢？...',
    {
      title: '2026 網頁設計費用行情 — 完整報價指南',
      description: '網頁設計費用從 NT$30,000 到 NT$500,000 不等，本文完整解析各種方案的價格差異。',
    },
    ['網頁設計費用', '架設網站', '網頁設計報價'],
    [
      { language: 'English', market: '美國' },
      { language: '日本語', market: '日本' },
      { language: 'Bahasa Indonesia', market: '印尼' },
    ],
    apiKey
  );

  for (const [lang, result] of results) {
    console.log(`\n=== ${lang} ===`);
    console.log('Title:', result.translatedMeta.title);
    console.log('Keywords:', result.localizedKeywords.map((k) => `${k.original} → ${k.localAlternative}`).join(', '));
    console.log('Cultural Notes:', result.culturalNotes.join(' | '));
  }
}
```

---

## 7. 圖片 Alt Text 自動生成

### 7.1 Alt Text 生成器（使用 Gemini Vision）

```typescript
// alt-text-generator.ts
// 圖片 Alt Text 自動生成 — SEO 友好的無障礙描述

import * as fs from 'fs';
import * as path from 'path';

interface AltTextResult {
  altText: string;          // 精簡 alt text（125 字元內）
  longDescription: string;  // 長描述（用於 aria-describedby）
  seoAltText: string;       // SEO 優化版（含目標關鍵字）
  caption: string;          // 圖說（顯示在圖片下方）
  imageType: string;        // 圖片類型分類
}

/**
 * 用 Gemini Vision 分析圖片並生成 Alt Text
 * 支援本地檔案和 URL
 */
async function generateAltText(
  imageSource: string, // 檔案路徑或 URL
  context: {
    pageTitle: string;
    targetKeyword?: string;
    surroundingText?: string;
  },
  apiKey: string
): Promise<AltTextResult> {
  let imagePart: Record<string, unknown>;

  if (imageSource.startsWith('http')) {
    // URL 模式 — 先下載圖片轉 base64
    const response = await fetch(imageSource);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    imagePart = {
      inlineData: { data: base64, mimeType },
    };
  } else {
    // 本地檔案模式
    const fileBuffer = fs.readFileSync(imageSource);
    const base64 = fileBuffer.toString('base64');
    const ext = path.extname(imageSource).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    imagePart = {
      inlineData: { data: base64, mimeType: mimeMap[ext] || 'image/jpeg' },
    };
  }

  const textPart = {
    text: `分析這張圖片，生成 SEO 友好的 alt text。

頁面標題：${context.pageTitle}
${context.targetKeyword ? `目標關鍵字：${context.targetKeyword}` : ''}
${context.surroundingText ? `圖片周圍文字：${context.surroundingText}` : ''}

規則：
1. altText：精確描述圖片內容，125 字元內，不要用「圖片」「照片」開頭
2. longDescription：更詳細的描述，200 字內
3. seoAltText：自然融入目標關鍵字的版本（不要硬塞）
4. caption：適合顯示在圖片下方的圖說
5. imageType：分類（product/lifestyle/infographic/screenshot/illustration/photo）

以 JSON 回傳：
{
  "altText": "...",
  "longDescription": "...",
  "seoAltText": "...",
  "caption": "...",
  "imageType": "..."
}`,
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [imagePart, textPart] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text) as AltTextResult;
}

// ---- 批次處理整個目錄的圖片 ----

async function batchGenerateAltTexts(
  imageDir: string,
  pageTitle: string,
  targetKeyword: string,
  apiKey: string
): Promise<Map<string, AltTextResult>> {
  const results = new Map<string, AltTextResult>();
  const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const files = fs.readdirSync(imageDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return supportedExts.includes(ext);
  });

  console.log(`找到 ${files.length} 張圖片`);

  for (const file of files) {
    const filePath = path.join(imageDir, file);
    console.log(`  處理中：${file}`);
    try {
      const result = await generateAltText(
        filePath,
        { pageTitle, targetKeyword },
        apiKey
      );
      results.set(file, result);
      console.log(`  Alt: ${result.altText}`);
    } catch (err) {
      console.error(`  失敗：${file}`, err);
    }
    // Gemini Vision 間隔稍長
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}

// ---- 輸出 HTML img 標籤 ----

function generateImgTag(
  src: string,
  altResult: AltTextResult,
  lazyLoad: boolean = true
): string {
  const attrs = [
    `src="${src}"`,
    `alt="${altResult.seoAltText}"`,
    lazyLoad ? 'loading="lazy"' : '',
    `title="${altResult.caption}"`,
  ]
    .filter(Boolean)
    .join('\n    ');

  return `<figure>
  <img
    ${attrs}
  />
  <figcaption>${altResult.caption}</figcaption>
</figure>`;
}
```

### 7.2 現有網站圖片 Alt Text 掃描與修補

```typescript
// alt-text-auditor.ts
// 掃描 HTML 找出缺少 alt text 的圖片，自動補上

interface AuditResult {
  totalImages: number;
  missingAlt: number;
  emptyAlt: number;
  goodAlt: number;
  images: {
    src: string;
    currentAlt: string | null;
    status: 'missing' | 'empty' | 'good';
    suggestedAlt?: string;
  }[];
}

async function auditAndFixAltTexts(
  htmlContent: string,
  pageTitle: string,
  targetKeyword: string,
  apiKey: string
): Promise<{ auditResult: AuditResult; fixedHtml: string }> {
  // 解析所有 img 標籤
  const imgRegex = /<img([^>]*)>/gi;
  const images: AuditResult['images'] = [];
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const attrs = match[1];
    const srcMatch = attrs.match(/src=["']([^"']+)["']/);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/);

    const src = srcMatch?.[1] || '';
    const alt = altMatch ? altMatch[1] : null;

    let status: 'missing' | 'empty' | 'good';
    if (alt === null) status = 'missing';
    else if (alt.trim() === '') status = 'empty';
    else status = 'good';

    images.push({ src, currentAlt: alt, status });
  }

  // 批次生成缺少的 alt text
  const needsFix = images.filter((img) => img.status !== 'good');
  if (needsFix.length > 0) {
    const system = '你是無障礙設計和 SEO 專家，擅長撰寫圖片 alt text。';
    const prompt = `為以下圖片生成 alt text。
頁面標題：${pageTitle}
目標關鍵字：${targetKeyword}

圖片列表：
${needsFix.map((img, i) => `${i + 1}. src="${img.src}"`).join('\n')}

以 JSON 陣列回傳：
[
  { "src": "圖片 src", "altText": "描述性 alt text（125 字元內）" }
]

根據檔名和 URL 路徑推測圖片內容，撰寫合理的 alt text。`;

    const result = await callGemini(prompt, system, apiKey, true);
    const suggestions = JSON.parse(result) as { src: string; altText: string }[];

    for (const suggestion of suggestions) {
      const img = images.find((i) => i.src === suggestion.src);
      if (img) img.suggestedAlt = suggestion.altText;
    }
  }

  // 修補 HTML
  let fixedHtml = htmlContent;
  for (const img of images) {
    if (img.suggestedAlt && img.status !== 'good') {
      if (img.status === 'missing') {
        // 沒有 alt 屬性 — 加上
        fixedHtml = fixedHtml.replace(
          new RegExp(`(<img[^>]*src=["']${escapeRegex(img.src)}["'])`, 'g'),
          `$1 alt="${img.suggestedAlt}"`
        );
      } else {
        // alt 為空 — 替換
        fixedHtml = fixedHtml.replace(
          new RegExp(
            `(<img[^>]*src=["']${escapeRegex(img.src)}["'][^>]*)alt=["']["']`,
            'g'
          ),
          `$1alt="${img.suggestedAlt}"`
        );
      }
    }
  }

  const auditResult: AuditResult = {
    totalImages: images.length,
    missingAlt: images.filter((i) => i.status === 'missing').length,
    emptyAlt: images.filter((i) => i.status === 'empty').length,
    goodAlt: images.filter((i) => i.status === 'good').length,
    images,
  };

  return { auditResult, fixedHtml };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## 8. n8n 自動發文工作流

### 8.1 架構概覽

```
Schedule Trigger (每天早上 9:00)
  → Code: 從 Supabase 撈待發文章
  → Code: 依平台生成貼文
  → Switch: 分流到各平台
    → Facebook API
    → WordPress API
    → LINE Push API
    → Telegram API
  → Code: 更新發佈狀態
```

### 8.2 完整 n8n Workflow JSON

以下是可直接匯入 n8n 的 workflow 定義。

```typescript
// n8n-auto-publish-workflow.ts
// 產出 n8n workflow JSON — 自動排程發佈到多平台

interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

function buildAutoPublishWorkflow(): {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
} {
  return {
    name: 'AI 自動發文 — 多平台排程',
    nodes: [
      // 1. Schedule Trigger
      {
        id: 'schedule',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 9 * * *', // 每天早上 9:00
              },
            ],
          },
        },
      },

      // 2. 從 Supabase 撈今天要發的文章
      {
        id: 'fetchArticles',
        name: 'Fetch Ready Articles',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [250, 0],
        parameters: {
          jsCode: `
// 從 Supabase 撈取狀態為 ready 的文章
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_KEY;

const response = await fetch(
  supabaseUrl + '/rest/v1/blog_articles?status=eq.ready&order=created_at.asc&limit=5',
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
    },
  }
);

const articles = await response.json();

if (!articles || articles.length === 0) {
  return [{ json: { skip: true, message: '沒有待發佈的文章' } }];
}

return articles.map(article => ({
  json: {
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    metaTitle: article.meta_title,
    metaDescription: article.meta_description,
    tags: article.tags || [],
  }
}));
`,
        },
      },

      // 3. 生成各平台貼文
      {
        id: 'generatePosts',
        name: 'Generate Platform Posts',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [500, 0],
        parameters: {
          jsCode: `
const article = $input.first().json;

if (article.skip) {
  return [{ json: article }];
}

// 從文章內容擷取摘要（前 200 字）
const summary = article.content
  .replace(/^#+\\s.+$/gm, '') // 移除標題
  .replace(/\\n{2,}/g, '\\n')
  .trim()
  .slice(0, 200);

// Facebook 貼文
const fbPost = article.title + '\\n\\n'
  + summary + '...\\n\\n'
  + '閱讀全文：https://yourblog.com/blog/' + article.slug + '\\n\\n'
  + article.tags.slice(0, 3).map(t => '#' + t).join(' ');

// Twitter/X 貼文
const twitterPost = article.title + '\\n\\n'
  + summary.slice(0, 100) + '...\\n'
  + 'https://yourblog.com/blog/' + article.slug;

// LINE 推播
const lineMessage = article.title + '\\n'
  + summary.slice(0, 120) + '\\n\\n'
  + '查看更多 >> https://yourblog.com/blog/' + article.slug;

return [{
  json: {
    ...article,
    fbPost,
    twitterPost,
    lineMessage,
    wpContent: article.content,
  }
}];
`,
        },
      },

      // 4. 發佈到 WordPress
      {
        id: 'publishWP',
        name: 'Publish to WordPress',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [750, -150],
        parameters: {
          jsCode: `
const article = $input.first().json;
if (article.skip) return [{ json: { platform: 'wordpress', status: 'skipped' } }];

const wpUrl = $env.WORDPRESS_URL;
const wpUser = $env.WORDPRESS_USER;
const wpPass = $env.WORDPRESS_APP_PASSWORD;

const auth = Buffer.from(wpUser + ':' + wpPass).toString('base64');

const response = await fetch(wpUrl + '/wp-json/wp/v2/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + auth,
  },
  body: JSON.stringify({
    title: article.title,
    content: article.wpContent,
    status: 'publish',
    slug: article.slug,
    meta: {
      _yoast_wpseo_title: article.metaTitle,
      _yoast_wpseo_metadesc: article.metaDescription,
    },
  }),
});

const result = await response.json();

return [{
  json: {
    platform: 'wordpress',
    status: response.ok ? 'published' : 'failed',
    postId: result.id || null,
    postUrl: result.link || null,
    error: response.ok ? null : result.message,
  }
}];
`,
        },
      },

      // 5. 發佈到 Facebook（透過 Graph API）
      {
        id: 'publishFB',
        name: 'Publish to Facebook',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [750, 0],
        parameters: {
          jsCode: `
const article = $input.first().json;
if (article.skip) return [{ json: { platform: 'facebook', status: 'skipped' } }];

const pageId = $env.FB_PAGE_ID;
const accessToken = $env.FB_PAGE_ACCESS_TOKEN;

const response = await fetch(
  'https://graph.facebook.com/v19.0/' + pageId + '/feed',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: article.fbPost,
      access_token: accessToken,
    }),
  }
);

const result = await response.json();

return [{
  json: {
    platform: 'facebook',
    status: response.ok ? 'published' : 'failed',
    postId: result.id || null,
    error: result.error?.message || null,
  }
}];
`,
        },
      },

      // 6. 發佈到 Telegram
      {
        id: 'publishTG',
        name: 'Publish to Telegram',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [750, 150],
        parameters: {
          jsCode: `
const article = $input.first().json;
if (article.skip) return [{ json: { platform: 'telegram', status: 'skipped' } }];

const botToken = $env.TELEGRAM_BOT_TOKEN;
const chatId = $env.TELEGRAM_CHAT_ID;

const text = '<b>' + article.title + '</b>\\n\\n'
  + article.lineMessage; // 共用 LINE 的簡短訊息

const response = await fetch(
  'https://api.telegram.org/bot' + botToken + '/sendMessage',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  }
);

const result = await response.json();

return [{
  json: {
    platform: 'telegram',
    status: result.ok ? 'published' : 'failed',
    messageId: result.result?.message_id || null,
    error: result.ok ? null : result.description,
  }
}];
`,
        },
      },

      // 7. 更新 Supabase 狀態
      {
        id: 'updateStatus',
        name: 'Update Article Status',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1000, 0],
        parameters: {
          jsCode: `
// 收集所有平台的發佈結果
const results = $input.all().map(item => item.json);

// 取得文章 ID（從之前的步驟）
const articleId = $('Generate Platform Posts').first().json.id;
if (!articleId) return [{ json: { status: 'no_article_id' } }];

const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_KEY;

const allPublished = results.every(r => r.status === 'published' || r.status === 'skipped');

const response = await fetch(
  supabaseUrl + '/rest/v1/blog_articles?id=eq.' + articleId,
  {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      status: allPublished ? 'published' : 'needs_review',
      published_at: allPublished ? new Date().toISOString() : null,
    }),
  }
);

return [{
  json: {
    articleId,
    overallStatus: allPublished ? 'published' : 'partial_failure',
    platformResults: results,
  }
}];
`,
        },
      },
    ],
    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Fetch Ready Articles', type: 'main', index: 0 }]],
      },
      'Fetch Ready Articles': {
        main: [[{ node: 'Generate Platform Posts', type: 'main', index: 0 }]],
      },
      'Generate Platform Posts': {
        main: [
          [
            { node: 'Publish to WordPress', type: 'main', index: 0 },
            { node: 'Publish to Facebook', type: 'main', index: 0 },
            { node: 'Publish to Telegram', type: 'main', index: 0 },
          ],
        ],
      },
      'Publish to WordPress': {
        main: [[{ node: 'Update Article Status', type: 'main', index: 0 }]],
      },
      'Publish to Facebook': {
        main: [[{ node: 'Update Article Status', type: 'main', index: 0 }]],
      },
      'Publish to Telegram': {
        main: [[{ node: 'Update Article Status', type: 'main', index: 0 }]],
      },
    },
  };
}

// 輸出 workflow JSON（可直接匯入 n8n）
const workflow = buildAutoPublishWorkflow();
console.log(JSON.stringify(workflow, null, 2));
```

### 8.3 Webhook 觸發版（手動或外部觸發）

```typescript
// n8n-webhook-publish.ts
// Webhook 觸發的發文工作流 — 適合從外部系統觸發

function buildWebhookPublishWorkflow(): Record<string, unknown> {
  return {
    name: 'Webhook 觸發 — AI 生成 + 發佈',
    nodes: [
      {
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 0],
        parameters: {
          httpMethod: 'POST',
          path: 'auto-publish',
          responseMode: 'responseNode',
        },
      },
      {
        id: 'aiGenerate',
        name: 'AI Generate Article',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [250, 0],
        parameters: {
          jsCode: `
// 從 webhook body 取得參數
const { topic, primaryKeyword, secondaryKeywords, tone } = $input.first().json.body;

if (!topic || !primaryKeyword) {
  return [{
    json: {
      error: 'Missing required fields: topic, primaryKeyword',
      status: 400,
    }
  }];
}

const apiKey = $env.GEMINI_API_KEY;

// Step 1: 生成大綱
const outlineResponse = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: '為主題「' + topic + '」生成部落格大綱，主關鍵字：' + primaryKeyword
            + '，次要關鍵字：' + (secondaryKeywords || []).join('、')
            + '。以 JSON 回傳 { title, slug, sections: [{ heading, keyPoints }] }'
        }]
      }],
      generationConfig: { temperature: 0.5, responseMimeType: 'application/json' }
    })
  }
);

const outlineData = await outlineResponse.json();
const outline = JSON.parse(outlineData.candidates[0].content.parts[0].text);

// Step 2: 撰寫完整文章
const articleResponse = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: '根據以下大綱撰寫完整部落格文章（Markdown 格式，2000 字）。'
            + '語氣：' + (tone || '專業友善') + '\\n\\n'
            + '大綱：' + JSON.stringify(outline)
        }]
      }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    })
  }
);

const articleData = await articleResponse.json();
const content = articleData.candidates[0].content.parts[0].text;

return [{
  json: {
    title: outline.title,
    slug: outline.slug,
    content,
    topic,
    primaryKeyword,
    status: 'generated',
  }
}];
`,
        },
      },
      {
        id: 'respond',
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [500, 0],
        parameters: {
          respondWith: 'json',
          responseBody:
            '={{ JSON.stringify({ success: true, title: $json.title, slug: $json.slug, wordCount: $json.content.length }) }}',
        },
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'AI Generate Article', type: 'main', index: 0 }]],
      },
      'AI Generate Article': {
        main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
      },
    },
  };
}
```

### 8.4 呼叫 Webhook 發文

```bash
# 觸發 AI 生成 + 發佈
curl -X POST "http://localhost:5678/webhook/auto-publish" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "2026 年台北咖啡廳推薦",
    "primaryKeyword": "台北咖啡廳",
    "secondaryKeywords": ["不限時咖啡廳", "工作咖啡廳", "台北咖啡推薦"],
    "tone": "輕鬆友善"
  }'
```

---

## 9. 完整範例：端到端 SEO 內容工廠

### 9.1 內容工廠整合模組

將以上所有模組串連成一條完整的自動化 pipeline。

```typescript
// content-factory.ts
// 端到端 SEO 內容工廠 — 從關鍵字研究到多平台發佈

interface ContentFactoryConfig {
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  brand: string;
  website: string;
  defaultTone: string;
  defaultLanguage: string;
  platforms: Platform[];
}

interface ContentJob {
  id: string;
  seedKeyword: string;
  industry: string;
  status: 'queued' | 'researching' | 'outlining' | 'writing' | 'reviewing' | 'publishing' | 'done' | 'failed';
  result?: {
    article: BlogArticle;
    seoScore: number;
    socialPosts: SocialPost[];
    translations: Map<string, TranslationResult>;
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

class ContentFactory {
  private config: ContentFactoryConfig;
  private jobs: Map<string, ContentJob> = new Map();

  constructor(config: ContentFactoryConfig) {
    this.config = config;
  }

  /**
   * 提交一個內容生成任務
   */
  async submitJob(seedKeyword: string, industry: string): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ContentJob = {
      id: jobId,
      seedKeyword,
      industry,
      status: 'queued',
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    // 非同步執行
    this.executeJob(job).catch((err) => {
      job.status = 'failed';
      job.error = err.message;
    });

    return jobId;
  }

  /**
   * 查詢任務狀態
   */
  getJobStatus(jobId: string): ContentJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 執行完整的內容生成流程
   */
  private async executeJob(job: ContentJob): Promise<void> {
    const { geminiApiKey } = this.config;

    try {
      // Phase 1: 關鍵字研究
      job.status = 'researching';
      console.log(`[${job.id}] Phase 1: 關鍵字研究`);
      const clusters = await analyzeKeywords(
        job.seedKeyword,
        job.industry,
        geminiApiKey
      );
      const bestCluster = clusters[0]; // 取搜尋量最高的叢集

      // Phase 2: 生成大綱
      job.status = 'outlining';
      console.log(`[${job.id}] Phase 2: 生成大綱`);
      const outline = await generateOutline(
        bestCluster.primary,
        bestCluster.primary,
        bestCluster.secondary,
        geminiApiKey
      );

      // Phase 3: 撰寫文章
      job.status = 'writing';
      console.log(`[${job.id}] Phase 3: 撰寫文章`);
      const content = await writeSections(
        outline,
        this.config.defaultTone,
        geminiApiKey
      );

      // Phase 4: 品質檢查 + Meta 生成
      job.status = 'reviewing';
      console.log(`[${job.id}] Phase 4: 品質檢查`);
      const seoResult = checkSEOQuality(
        content,
        bestCluster.primary,
        bestCluster.secondary
      );
      const meta = await generateMeta(content, bestCluster.primary, geminiApiKey);

      const charCount = content.replace(/\s/g, '').length;
      const article: BlogArticle = {
        title: outline.title,
        slug: outline.slug,
        content,
        metaTitle: meta.metaTitle,
        metaDescription: meta.metaDescription,
        ogTitle: meta.ogTitle,
        ogDescription: meta.ogDescription,
        tags: meta.tags,
        wordCount: charCount,
        readingTime: Math.ceil(charCount / 500),
        createdAt: new Date().toISOString(),
      };

      // Phase 5: 生成社群貼文
      console.log(`[${job.id}] Phase 5: 生成社群貼文`);
      const socialPosts: SocialPost[] = [];
      for (const platform of this.config.platforms) {
        const post = await generateSocialPost(
          {
            topic: article.title,
            platform,
            goal: 'traffic',
            brand: this.config.brand,
            includeEmoji: platform !== 'line',
          },
          geminiApiKey
        );
        socialPosts.push(post);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Phase 6: 儲存到資料庫
      job.status = 'publishing';
      console.log(`[${job.id}] Phase 6: 儲存到資料庫`);
      const supabase = createClient(
        this.config.supabaseUrl,
        this.config.supabaseKey
      );
      await supabase.from('blog_articles').insert({
        title: article.title,
        slug: article.slug,
        content: article.content,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        og_title: article.ogTitle,
        og_description: article.ogDescription,
        tags: article.tags,
        word_count: article.wordCount,
        reading_time: article.readingTime,
        seo_score: seoResult.score,
        status: seoResult.score >= 70 ? 'ready' : 'needs_review',
      });

      // 完成
      job.status = 'done';
      job.completedAt = new Date().toISOString();
      job.result = {
        article,
        seoScore: seoResult.score,
        socialPosts,
        translations: new Map(),
      };

      console.log(`[${job.id}] 完成！SEO 分數：${seoResult.score}/100`);
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      console.error(`[${job.id}] 失敗：${job.error}`);
    }
  }
}

// ---- Express API 端點 ----

import express from 'express';

function createContentFactoryRouter(factory: ContentFactory): express.Router {
  const router = express.Router();

  // 提交新的內容生成任務
  router.post('/jobs', async (req, res) => {
    const { seedKeyword, industry } = req.body;
    if (!seedKeyword || !industry) {
      return res.status(400).json({ error: 'seedKeyword 和 industry 為必填' });
    }
    const jobId = await factory.submitJob(seedKeyword, industry);
    res.json({ jobId, status: 'queued' });
  });

  // 查詢任務狀態
  router.get('/jobs/:id', (req, res) => {
    const job = factory.getJobStatus(req.params.id);
    if (!job) return res.status(404).json({ error: '找不到該任務' });
    res.json({
      id: job.id,
      status: job.status,
      seedKeyword: job.seedKeyword,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.result
        ? {
            title: job.result.article.title,
            seoScore: job.result.seoScore,
            wordCount: job.result.article.wordCount,
            socialPostCount: job.result.socialPosts.length,
          }
        : undefined,
    });
  });

  return router;
}

// ---- 啟動範例 ----

async function main() {
  const factory = new ContentFactory({
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    brand: '小蔡工作室',
    website: 'https://openclaw.dev',
    defaultTone: '專業友善',
    defaultLanguage: '繁體中文',
    platforms: ['facebook', 'instagram', 'line'],
  });

  const app = express();
  app.use(express.json());
  app.use('/api/content-factory', createContentFactoryRouter(factory));

  app.listen(3012, () => {
    console.log('Content Factory API running on port 3012');
  });
}
```

### 9.2 API 使用範例

```bash
# 提交內容生成任務
curl -X POST http://localhost:3012/api/content-factory/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "seedKeyword": "台北網頁設計",
    "industry": "網頁設計接案"
  }'

# 回應：{ "jobId": "job_1709654321_abc123", "status": "queued" }

# 查詢任務狀態
curl http://localhost:3012/api/content-factory/jobs/job_1709654321_abc123

# 回應：
# {
#   "id": "job_1709654321_abc123",
#   "status": "done",
#   "seedKeyword": "台北網頁設計",
#   "result": {
#     "title": "2026 台北網頁設計完整指南",
#     "seoScore": 85,
#     "wordCount": 2340,
#     "socialPostCount": 3
#   }
# }
```

---

## 附錄：常用 Prompt 片段速查

| 用途 | Prompt 片段 |
|------|------------|
| 控制字數 | `字數控制在 ${n} 字左右，不超過 ${n * 1.1} 字` |
| 指定語氣 | `語氣：${tone}。用詞要像一個有 10 年經驗的 ${role} 在跟客戶說話` |
| 避免 AI 感 | `不要用「首先」「其次」「總之」這種教科書轉場詞。用自然的口語連接` |
| 強制 JSON | `generationConfig: { responseMimeType: 'application/json' }` |
| 避免幻覺 | `只根據提供的資料回答，如果資料不足就說「資料不足，無法確定」` |
| SEO 標題 | `標題格式：[數字] + [主關鍵字] + [利益承諾]，例如「5 個網頁設計技巧讓轉換率提升 30%」` |
| CTA 指定 | `文末 CTA：${ctaText}，用 <a> 標籤包裹，class="cta-button"` |
| 多版本 | `生成 3 個不同版本，分別從 功能/情感/社會證明 三個角度切入` |

---

## 附錄：API 費用估算

| 模型 | 每篇文章（2000 字） | 批次 30 篇/月 |
|------|---------------------|-------------|
| Gemini 2.5 Flash | ~NT$1-2 | ~NT$30-60 |
| Gemini 2.5 Pro | ~NT$5-10 | ~NT$150-300 |
| GPT-4o | ~NT$8-15 | ~NT$240-450 |
| GPT-4o-mini | ~NT$1-3 | ~NT$30-90 |
| Claude Sonnet | ~NT$5-12 | ~NT$150-360 |

> 以上為估算值，實際費用依文章長度、prompt 複雜度而異。
> 建議用 Gemini 2.5 Flash 作為主力（便宜且品質好），重要文章用 Pro 或 GPT-4o 精修。

---

> 本手冊最後更新：2026-03-05 | 作者：小蔡 (NEUXA Deputy)
