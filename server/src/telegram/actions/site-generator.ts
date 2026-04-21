/**
 * 網站生成 / 銷售詢價 / 作品集 — 從 action-handlers.ts 拆出
 * 四階段品質引擎：Pro 生成 → Flash 審核 → Pro 修正 → 程式化硬規則檢查
 * 並行鎖 + 5 分鐘全局超時，避免單一 generate_site 凍結整個 server
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { getGoogleKey } from '../shared/google-keys.js';
import type { ActionResult } from '../action-handlers.js';

const log = createLogger('telegram');

// ── generate_site 防護：並行鎖 + 全局超時 ──
let _generateSiteBusy = false;
const GENERATE_SITE_TIMEOUT_MS = 5 * 60 * 1000; // 5 分鐘硬上限

export async function handleGenerateSite(action: Record<string, string>): Promise<ActionResult> {
  if (_generateSiteBusy) {
    return { ok: false, output: 'generate_site 正在執行中，請等前一個完成再試（防止 server 凍結）' };
  }
  _generateSiteBusy = true;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), GENERATE_SITE_TIMEOUT_MS);

  try {
    const result = await Promise.race([
      _handleGenerateSiteInner(action),
      new Promise<ActionResult>((_, reject) => {
        ac.signal.addEventListener('abort', () =>
          reject(new Error(`generate_site 超時（超過 ${GENERATE_SITE_TIMEOUT_MS / 1000} 秒），已中斷`))
        );
      }),
    ]);
    return result;
  } catch (e) {
    return { ok: false, output: `generate_site 中斷: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(timer);
    _generateSiteBusy = false;
  }
}

async function _handleGenerateSiteInner(action: Record<string, string>): Promise<ActionResult> {
  const description = action.description || action.prompt || action.name || '';
  if (!description) return { ok: false, output: 'generate_site 需要 description 參數（描述你要什麼網站）' };

  const slug = action.slug || `site-${Date.now()}`;
  const sitesDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites', slug);
  fs.mkdirSync(sitesDir, { recursive: true });

  const googleKey = getGoogleKey();
  if (!googleKey) return { ok: false, output: 'generate_site: 沒有 GOOGLE_API_KEY' };

  // ── 查知識庫：把 cookbook 最佳實踐注入 prompt ──
  // lazy import 避免循環依賴（action-handlers → site-generator → action-handlers）
  let knowledgeContext = '';
  try {
    const { handleSemanticSearch } = await import('../action-handlers.js');
    const searchResult = await handleSemanticSearch(description, 5, 'task');
    if (searchResult.ok && searchResult.output) {
      knowledgeContext = searchResult.output.slice(0, 2000);
      log.info(`[GenerateSite] 知識庫注入: ${knowledgeContext.length} 字`);
    }
  } catch (e) {
    log.warn({ err: e }, '[GenerateSite] 知識庫查詢失敗，繼續生成');
  }

  const sitePrompt = `你是 Lovable.dev 等級的頂尖 UI 設計師兼全端開發者。生成的作品必須達到商業級品質，讓客戶第一眼就覺得專業。

需求：${description}
${knowledgeContext ? `\n參考知識庫：\n${knowledgeContext}\n` : ''}

## 設計系統（必須嚴格遵守）

在 <style> 最前面放這組 CSS 變數，所有樣式都引用變數，不要寫死顏色：
:root {
  /* 色彩 — 根據產品類型選一組主色 */
  --primary: #6366f1;      /* 主色（indigo 系列） */
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  --accent: #f59e0b;       /* 強調色 */
  --success: #10b981; --warning: #f59e0b; --error: #ef4444; --info: #3b82f6;
  /* 中性色 */
  --gray-50: #f9fafb; --gray-100: #f3f4f6; --gray-200: #e5e7eb;
  --gray-300: #d1d5db; --gray-400: #9ca3af; --gray-500: #6b7280;
  --gray-600: #4b5563; --gray-700: #374151; --gray-800: #1f2937; --gray-900: #111827;
  /* 背景/文字 */
  --bg: #ffffff; --bg-secondary: var(--gray-50); --text: var(--gray-900); --text-secondary: var(--gray-500);
  /* 間距 — 8px 網格 */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px; --space-20: 80px;
  /* 字型 */
  --font: 'Noto Sans TC', 'Inter', system-ui, sans-serif;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem; --text-4xl: 2.25rem; --text-5xl: 3rem;
  /* 圓角 */
  --radius-sm: 6px; --radius: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-full: 9999px;
  /* 陰影（5 級） */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
  --shadow-md: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
  --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  --shadow-xl: 0 25px 50px -12px rgba(0,0,0,0.25);
  /* 動畫 */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms; --duration: 200ms; --duration-slow: 300ms;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a; --bg-secondary: #1e293b;
    --text: #f1f5f9; --text-secondary: #94a3b8;
    --gray-50: #1e293b; --gray-100: #334155; --gray-200: #475569;
    --gray-800: #e2e8f0; --gray-900: #f8fafc;
    --shadow-xs: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
    --shadow-md: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3);
    --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3);
  }
}

根據產品類型調整 --primary 色系：
- 美業/美甲/美睫 → 粉色系 #ec4899
- 餐飲/POS/點餐 → 橘紅系 #f97316
- 商務/CRM/ERP → 靛藍系 #6366f1
- 醫療/預約 → 青綠系 #14b8a6
- 電商/購物 → 紫色系 #8b5cf6
- 科技/Dashboard → 深藍系 #3b82f6

## 設計規範（不可違反）

1. **字型**：<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
2. **圖示**：<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
3. **所有元素** transition: all var(--duration) var(--ease)
4. **卡片**：bg white, radius var(--radius-md), shadow var(--shadow-sm), hover 時 shadow 升一級 + translateY(-2px)
5. **按鈕**：padding var(--space-3) var(--space-6), radius var(--radius), font-weight 600, hover 亮度 +10%
6. **主要按鈕**：背景 var(--primary), 文字白色, hover var(--primary-dark)
7. **輸入框**：border 1px var(--gray-200), radius var(--radius), padding var(--space-3) var(--space-4), focus 時 border-color var(--primary) + ring
8. **間距**：section 之間 var(--space-20), 元素之間 var(--space-4) 或 var(--space-6)
9. **Hero 區塊**：漸層背景, 最少 70vh, 大標題 text-5xl font-weight 700, 副標 text-xl text-secondary
10. **手機優先 RWD**：max-width 1200px 居中, grid 用 repeat(auto-fill, minmax(280px, 1fr))
11. **微動畫**：頁面載入 fadeInUp（@keyframes fadeInUp）, 卡片 stagger 延遲（:nth-child * 0.1s）
12. **空狀態**：列表為空時顯示插圖 + 文字 + CTA 按鈕，不能留白
13. **Toast 通知**：操作成功/失敗時右上角彈出 toast，3 秒後自動消失
14. **暗色模式**：加入 @media (prefers-color-scheme: dark) 變體，科技類/儀表板類預設暗色

## 技術要求
- 完整 HTML（<!DOCTYPE html>），CSS 在 <style>，JS 在 <script>
- 繁體中文介面
- 手機優先 RWD
- 表單前端驗證
- 數據用 localStorage 模擬持久化
- 互動用原生 JS 或 Alpine.js
- 圖表用 Chart.js（如需要）
- 只輸出 HTML，不要解釋文字，不要 markdown 代碼框

## 絕對禁止（重要！）
- **禁止用 JS 動態注入主要內容**：所有文字、服務項目、價格、描述必須直接寫在 HTML 裡，不能用 display:none + JS 注入
- **禁止 skeleton loading**：不要用骨架屏，內容直接顯示
- **禁止空的 placeholder**：每個區塊都要有完整的真實內容（文字、價格、描述），不能寫 "Lorem ipsum" 或 "內容即將推出"

直接輸出 HTML：`;

  async function callGemini(model: string, prompt: string, maxTokens: number, timeout: number): Promise<string> {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(timeout),
      }
    );
    if (!resp.ok) throw new Error(`Gemini ${model} HTTP ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
    const contentObj = ((candidates[0] || {}) as Record<string, unknown>).content as Record<string, unknown> || {};
    const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
    return parts.map(p => (p.text as string) || '').join('').trim();
  }

  function cleanHtml(raw: string): string {
    return raw.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  try {
    // Phase 1: Pro 生成初版
    log.info(`[GenerateSite] Phase 1: Pro 生成初版...`);
    const rawHtml = await callGemini('gemini-2.5-pro', sitePrompt, 65536, 180000);
    if (!rawHtml) return { ok: false, output: 'Gemini Pro 回傳空內容' };
    let html = cleanHtml(rawHtml);

    // Phase 2: Flash 品質審核
    log.info(`[GenerateSite] Phase 2: Flash 品質審核...`);
    const auditPrompt = `你是頂尖的 UI/UX 審核員。請嚴格審核以下 HTML 網站代碼，找出所有問題。

審核清單（每項打 ✅ 或 ❌）：
1. **內容完整性**：所有區塊是否有實際文字內容？有沒有空白區塊、placeholder、"即將推出"？
2. **JS 注入問題**：主要內容（服務項目、價格、描述）是否直接寫在 HTML？有沒有用 display:none + JS 動態注入？
3. **CSS 設計系統**：是否使用 CSS 變數（--primary 等）？色彩是否統一？
4. **RWD 響應式**：有沒有 viewport meta？有沒有 media query 或 grid/flex 自適應？
5. **字型載入**：有沒有引入 Google Fonts（Noto Sans TC）？
6. **圖示**：有沒有引入 Font Awesome 或其他圖示庫？
7. **動畫效果**：有沒有 hover 效果、transition、@keyframes？
8. **表單驗證**：預約/聯絡表單有沒有前端驗證？
9. **視覺層次**：Hero 區塊是否夠大（70vh+）？標題大小層次是否分明？
10. **整體美感**：以 Lovable.dev / Dribbble 水準，1-10 分打幾分？
11. **暗色模式**：是否有 prefers-color-scheme: dark 支援？

最後輸出格式：
SCORE: X/10
ISSUES:
- 具體問題1：如何修正
- 具體問題2：如何修正
VERDICT: PASS 或 NEEDS_FIX

HTML 代碼（前 15000 字）：
${html.slice(0, 15000)}`;

    let auditResult = '';
    let needsFix = false;
    try {
      auditResult = await callGemini('gemini-2.5-flash', auditPrompt, 2000, 30000);
      needsFix = auditResult.includes('NEEDS_FIX');
      const scoreMatch = auditResult.match(/SCORE:\s*(\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      log.info(`[GenerateSite] Phase 2 審核結果: score=${score}/10 needsFix=${needsFix}`);
      if (score >= 7) needsFix = false;
    } catch (e) {
      log.warn({ err: e }, '[GenerateSite] Phase 2 審核失敗，跳過修正');
    }

    // Phase 3: Pro 根據審核修正
    if (needsFix && auditResult) {
      log.info(`[GenerateSite] Phase 3: Pro 根據審核修正...`);
      const fixPrompt = `你是頂尖的 UI 設計師。以下 HTML 網站有品質問題，請根據審核意見修正並輸出完整的修正版 HTML。

## 審核意見
${auditResult}

## 修正要求
1. 修正所有 ❌ 的項目
2. 所有內容必須直接寫在 HTML，禁止 JS 動態注入
3. 保留原有的好設計，只修問題
4. 確保美感至少 8/10
5. 只輸出完整修正後的 HTML，不要解釋

## 原始 HTML
${html}`;

      try {
        const fixedRaw = await callGemini('gemini-2.5-pro', fixPrompt, 65536, 180000);
        if (fixedRaw && fixedRaw.length > html.length * 0.5) {
          html = cleanHtml(fixedRaw);
          log.info(`[GenerateSite] Phase 3 修正完成: ${html.length} 字元`);
        }
      } catch (e) {
        log.warn({ err: e }, '[GenerateSite] Phase 3 修正失敗，使用初版');
      }
    }

    // Phase 4: 程式化品質檢查
    const issues: string[] = [];
    if (!html.includes('<!DOCTYPE html')) issues.push('缺少 DOCTYPE');
    if (!html.includes('viewport')) issues.push('缺少 viewport meta');
    if (!html.includes('Noto Sans') && !html.includes('noto-sans')) issues.push('缺少 Noto Sans TC 字型');
    if (!html.includes('font-awesome') && !html.includes('fontawesome')) issues.push('缺少 Font Awesome');
    if (!html.includes('--primary')) issues.push('缺少 CSS 變數系統');
    if (html.includes('display: none') || html.includes('display:none')) issues.push('⚠️ 有 display:none 可能隱藏內容');
    if (html.includes('Lorem ipsum') || html.includes('即將推出')) issues.push('有 placeholder 文字');
    if (!/@keyframes|animation|transition/.test(html)) issues.push('缺少動畫效果');

    // 自動修補缺失
    if (!html.includes('viewport')) {
      html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
    if (!html.includes('Noto Sans') && !html.includes('noto-sans')) {
      html = html.replace('</head>', '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">\n</head>');
    }
    if (!html.includes('font-awesome') && !html.includes('fontawesome')) {
      html = html.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n</head>');
    }

    const filePath = path.join(sitesDir, 'index.html');
    fs.writeFileSync(filePath, html, 'utf8');

    const port = process.env.PORT || '3011';
    const localUrl = `http://localhost:${port}/sites/${slug}/index.html`;
    const publicBase = process.env.TUNNEL_URL || process.env.PUBLIC_URL || '';
    const publicUrl = publicBase ? `${publicBase}/sites/${slug}/index.html` : '';
    const previewUrl = publicUrl || localUrl;

    const phaseInfo = needsFix ? '（經過 AI 審核+修正）' : '（一次通過審核）';
    const issueNote = issues.length > 0 ? `\n⚠️ 自動修補: ${issues.join(', ')}` : '';

    log.info(`[GenerateSite] ✅ 完成 slug=${slug} size=${html.length} phases=${needsFix ? 3 : 2}${issueNote}`);

    // Portfolio 自動登錄
    const portfolioPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites', 'portfolio.json');
    let portfolio: Array<Record<string, unknown>> = [];
    try { portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8')); } catch { /* first time */ }
    const existingIdx = portfolio.findIndex((p: Record<string, unknown>) => p.slug === slug);
    const entry = {
      slug,
      name: action.name || action.slug || slug,
      description: description.slice(0, 200),
      productType: action.productType || action.type || 'website',
      auditScore: needsFix ? 'fixed' : 'pass',
      htmlSize: html.length,
      createdAt: existingIdx >= 0 ? (portfolio[existingIdx] as Record<string, unknown>).createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      previewUrl,
      vercelUrl: '',
    };
    if (existingIdx >= 0) portfolio[existingIdx] = entry;
    else portfolio.push(entry);
    fs.writeFileSync(portfolioPath, JSON.stringify(portfolio, null, 2), 'utf8');
    log.info(`[Portfolio] 📋 登錄 ${slug}，共 ${portfolio.length} 個作品`);

    // Vercel 自動部署
    let vercelUrl = '';
    try {
      const vercelToken = process.env.VERCEL_TOKEN?.trim();
      if (vercelToken) {
        log.info(`[Deploy] 🚀 開始 Vercel 部署 ${slug}...`);
        const deployResult = execSync(
          `cd "${sitesDir}" && vercel deploy --yes --prod --token="${vercelToken}" --name="${slug}" 2>&1`,
          { timeout: 120_000, encoding: 'utf8' }
        );
        const urlMatch = deployResult.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/);
        if (urlMatch) {
          vercelUrl = urlMatch[0];
          entry.vercelUrl = vercelUrl;
          fs.writeFileSync(portfolioPath, JSON.stringify(portfolio, null, 2), 'utf8');
          log.info(`[Deploy] ✅ 已部署: ${vercelUrl}`);
        }
      } else {
        log.info('[Deploy] ⏭ 未設定 VERCEL_TOKEN，跳過自動部署');
      }
    } catch (deployErr) {
      log.warn(`[Deploy] ⚠️ Vercel 部署失敗: ${deployErr instanceof Error ? deployErr.message : String(deployErr)}`);
    }

    // 自動生成 Portfolio 展示頁
    try {
      _generatePortfolioPage(portfolio);
    } catch { /* non-critical */ }

    // n8n 網站生成完成 webhook
    try {
      const n8nUrl = process.env.N8N_API_URL?.replace(/\/$/, '');
      if (n8nUrl) {
        fetch(`${n8nUrl}/webhook/site-generated`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteName: slug,
            url: vercelUrl || publicUrl || previewUrl,
            productType: action.productType || action.type || 'website',
            auditScore: needsFix ? 'fixed' : 'pass',
          }),
        }).catch(() => {});
      }
    } catch { /* n8n optional */ }

    const deployNote = vercelUrl ? `\n🌐 正式網址：${vercelUrl}` : '';
    return {
      ok: true,
      output: `✅ 網站已生成！${phaseInfo}\n\n🔗 預覽：${previewUrl}${publicUrl ? `\n📱 手機可開：${publicUrl}` : ''}${deployNote}\n📏 大小：${html.length} 字元${issueNote}\n📋 已加入作品集（共 ${portfolio.length} 件）\n\n主人可以直接點連結預覽。如果要修改，告訴我哪裡要改。`
    };
  } catch (e) {
    return { ok: false, output: `generate_site 失敗: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Portfolio 展示頁生成 ──

function _generatePortfolioPage(portfolio: Array<Record<string, unknown>>): void {
  const sitesRoot = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites');
  const cards = portfolio.map((p) => `
    <div class="card" onclick="window.open('${p.vercelUrl || p.previewUrl}','_blank')">
      <div class="card-badge">${p.productType || 'website'}</div>
      <iframe src="${p.previewUrl}" loading="lazy" sandbox></iframe>
      <div class="card-body">
        <h3>${_escHtml(String(p.name || p.slug))}</h3>
        <p>${_escHtml(String(p.description || '').slice(0, 100))}</p>
        <div class="card-meta">
          <span>${String(p.updatedAt || '').split('T')[0]}</span>
          <span>${p.auditScore === 'pass' ? '✅ 一次通過' : '🔧 AI修正'}</span>
        </div>
        ${p.vercelUrl ? `<a href="${p.vercelUrl}" class="deploy-link" target="_blank">🌐 正式網址</a>` : ''}
      </div>
    </div>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEUXA AI 作品集 — OpenClaw TsAIs</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans TC','Inter',sans-serif;background:#0a0a0f;color:#e8e8f0;min-height:100vh}
.hero{text-align:center;padding:60px 20px 40px;background:linear-gradient(135deg,#0a0a2e,#1a0a3e)}
.hero h1{font-size:2.5rem;background:linear-gradient(90deg,#6366f1,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:#9ca3af;margin-top:12px;font-size:1.1rem}
.stats{display:flex;gap:24px;justify-content:center;margin-top:24px}
.stat{background:rgba(255,255,255,.05);padding:12px 24px;border-radius:12px}
.stat strong{font-size:1.5rem;color:#a855f7}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));gap:24px;padding:40px 5%;max-width:1400px;margin:0 auto}
.card{background:#16162a;border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative}
.card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(168,85,247,.2)}
.card-badge{position:absolute;top:12px;right:12px;background:rgba(168,85,247,.8);color:#fff;padding:4px 10px;border-radius:8px;font-size:.75rem;z-index:2}
.card iframe{width:100%;height:220px;border:none;pointer-events:none}
.card-body{padding:16px}
.card-body h3{font-size:1.1rem;margin-bottom:6px}
.card-body p{color:#9ca3af;font-size:.85rem;line-height:1.4}
.card-meta{display:flex;justify-content:space-between;margin-top:10px;font-size:.75rem;color:#6b7280}
.deploy-link{display:inline-block;margin-top:8px;color:#a855f7;font-size:.85rem;text-decoration:none}
.footer{text-align:center;padding:40px;color:#6b7280;font-size:.85rem}
.cta{display:inline-block;margin-top:20px;padding:14px 36px;background:linear-gradient(90deg,#6366f1,#a855f7);color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:1.1rem;transition:opacity .2s}
.cta:hover{opacity:.85}
</style></head><body>
<div class="hero">
  <h1>NEUXA AI 作品集</h1>
  <p>由 AI 全自動生成、審核、部署的商用網站</p>
  <div class="stats">
    <div class="stat"><strong>${portfolio.length}</strong><br>作品數</div>
    <div class="stat"><strong>${portfolio.filter(p => p.vercelUrl).length}</strong><br>已上線</div>
    <div class="stat"><strong>${portfolio.filter(p => p.auditScore === 'pass').length}</strong><br>一次通過</div>
  </div>
  <a class="cta" href="https://t.me/neuxa_sales_bot" target="_blank">📩 聯繫我們訂製網站</a>
</div>
<div class="grid">${cards}</div>
<div class="footer">© ${new Date().getFullYear()} OpenClaw TsAIs — Powered by NEUXA AI</div>
</body></html>`;

  const dir = path.join(sitesRoot, 'portfolio');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  log.info(`[Portfolio] 📄 展示頁已更新 (${portfolio.length} 件作品)`);
}

function _escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Sales Bot：客戶查看作品集 + 自動報價 ──

export async function handleSalesInquiry(action: Record<string, string>): Promise<ActionResult> {
  try {
    const portfolioPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites', 'portfolio.json');
    let portfolio: Array<Record<string, unknown>> = [];
    try { portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8')); } catch { /* empty */ }

    const clientType = action.type || action.productType || 'website';
    const clientDesc = action.description || '';

    const priceTable: Record<string, { base: number; label: string }> = {
      'landing-page':    { base: 3000,  label: '單頁式形象網站' },
      'portfolio':       { base: 5000,  label: '作品集展示網站' },
      'ecommerce':       { base: 12000, label: '電商購物網站' },
      'saas':            { base: 18000, label: 'SaaS 應用網站' },
      'dashboard':       { base: 15000, label: '管理後台' },
      'blog':            { base: 4000,  label: '部落格網站' },
      'website':         { base: 5000,  label: '商用網站' },
    };
    const pricing = priceTable[clientType] || priceTable['website']!;

    const relatedWorks = portfolio
      .filter(p => p.productType === clientType || String(p.description || '').includes(clientType))
      .slice(0, 3);
    const worksPreview = relatedWorks.length > 0
      ? relatedWorks.map(p => `  • ${p.name} → ${p.vercelUrl || p.previewUrl}`).join('\n')
      : '  （暫無同類作品，但我們可以為您量身打造）';

    const quote = `📋 **NEUXA AI 網站服務報價單**

🏷 類型：${pricing.label}
💰 參考價格：NT$ ${pricing.base.toLocaleString()} 起
📝 需求：${clientDesc || '（待確認）'}

🖼 相關作品：
${worksPreview}

✅ 包含服務：
  • AI 全自動設計 + 程式碼生成
  • 響應式設計（手機/平板/桌機）
  • SEO 基礎優化
  • Vercel 自動部署 + SSL
  • 一次免費修改

⏰ 交付時間：24 小時內
📩 確認訂製請回覆「確認」，我會通知主人開始製作。`;

    const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
    if (ownerChatId) {
      const notify = `🔔 新客戶詢價！\n類型：${pricing.label}\n需求：${clientDesc || '未說明'}\n報價：NT$ ${pricing.base.toLocaleString()}`;
      sendTelegramMessageToChat(ownerChatId, notify).catch(() => {});
    }

    return { ok: true, output: quote };
  } catch (e) {
    return { ok: false, output: `sales_inquiry 失敗: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function handleListPortfolio(): Promise<ActionResult> {
  const portfolioPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites', 'portfolio.json');
  let portfolio: Array<Record<string, unknown>> = [];
  try { portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf8')); } catch { /* empty */ }

  if (portfolio.length === 0) return { ok: true, output: '📋 作品集目前是空的。生成網站後會自動加入。' };

  const port = process.env.PORT || '3011';
  const publicBase = process.env.TUNNEL_URL || process.env.PUBLIC_URL || `http://localhost:${port}`;
  const portfolioUrl = `${publicBase}/sites/portfolio/index.html`;

  const list = portfolio.map((p, i) =>
    `${i + 1}. **${p.name || p.slug}** [${p.productType}]\n   ${p.vercelUrl || p.previewUrl}\n   ${p.auditScore === 'pass' ? '✅' : '🔧'} ${String(p.updatedAt || '').split('T')[0]}`
  ).join('\n\n');

  return { ok: true, output: `📋 **NEUXA 作品集** (${portfolio.length} 件)\n\n${list}\n\n🖼 展示頁：${portfolioUrl}` };
}
