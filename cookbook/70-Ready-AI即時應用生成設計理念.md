# 70 — Ready AI 即時應用生成設計理念

> 適用場景：了解 Prompt-to-App 類產品的核心概念、技術架構、以及如何應用到 OpenClaw 系統
> 關鍵字：Ready AI, Readdy AI, Replit Agent, AI App Builder, Prompt-to-App, Vibe Coding

---

## 一、什麼是 Ready AI / Replit Agent 類產品

「AI 即時應用生成」是一種新型開發範式：使用者用自然語言描述需求，AI 在數秒到數分鐘內生成完整的、可運行的應用程式。2025 年 Andrej Karpathy 提出「Vibe Coding」概念：你描述想要的「感覺」，AI 處理實作細節。

### 代表產品

| 產品 | 特色 | 定位 |
|------|------|------|
| **Readdy AI** | 自然語言生成多頁網站，拖曳編輯、代碼/Figma 匯出 | 網站生成器 |
| **Replit Agent** | 雲端 IDE + AI Agent，自主規劃、寫碼、測試、部署 | 全端應用建構 |
| **Vercel v0** | Prompt 生成 React 元件，即時預覽 | 前端元件生成 |
| **Taskade Genesis** | 文字 prompt 轉 Web App，2-15 分鐘完成 | 無代碼應用 |
| **Softr** | 從 prompt 到可用應用最快的平台 | 快速原型 |

市場規模：AI 應用生成市場預計 2034 年達 2,219 億美元（年增 18.6%）。2025 年已有超過 38% 的新 Web 應用透過 AI prompt 生成。

---

## 二、核心設計理念

### 2.1 自然語言驅動（Prompt-to-App）

使用者的意圖就是規格書：

```
使用者：「做一個餐廳訂位網站，日曆選擇、時段選擇、簡約日式風」

AI 輸出：
  ├── 前端頁面（首頁、訂位頁、菜單頁）
  ├── 後端 API（/api/bookings, /api/menu）
  ├── 資料庫 schema（bookings, menu_items 表）
  └── 部署配置（Dockerfile, env vars）
```

關鍵技術：
- **意圖解析**：從自然語言提取功能需求、設計風格、資料結構
- **上下文保持**：記住之前的對話，支援多輪修改
- **歧義消解**：不確定的部分主動詢問，或用合理預設值

### 2.2 即時預覽（Real-time Preview）

輸入 prompt 後秒級看到結果。預覽可互動（點擊、滾動），修改單一元素只重新渲染該元素。Readdy AI 從文字/模板/圖片/參考 URL 啟動，即時生成 layout、文案、圖片和響應式結構。

### 2.3 增量修改（Incremental Update）

用人話修改，不碰代碼：

```
第 1 輪：「做一個 TODO 清單應用」          → 生成完整 App
第 2 輪：「加一個分類標籤功能」            → 只修改相關元件
第 3 輪：「把完成的項目用刪除線顯示」       → 精準修改 CSS + 邏輯
第 4 輪：「加資料匯出，支援 CSV」          → 新增模組，不影響其他
```

技術關鍵：
- **差異化生成**：只生成變動部分，不重寫整個檔案
- **依賴追蹤**：改 A 知道影響 B，連帶更新
- **回溯能力**：每次修改自動建立版本快照，可一鍵回退

### 2.4 全端生成（Full-stack Generation）

前端頁面 + 後端 API + 資料庫 schema + 部署配置一次到位。不只是 demo，是可上線的產品。

### 2.5 一鍵部署（One-click Deploy）

自動配置域名、SSL、資料庫連接、環境變數。Replit 為每個專案提供獨立 Docker 容器沙盒，含獨立 Postgres 實例。

---

## 三、技術架構分析

### 3.1 LLM 代碼生成管線

```
Prompt → Plan → Code → Preview → Deploy

[使用者輸入] → [意圖解析：提取功能/風格/約束]
             → [規劃：任務清單、檔案結構、技術選型]
             → [代碼生成：分檔案生成，Replit 用受限 Python DSL，成功率 90%]
             → [預覽驗證：沙盒執行，Replit Agent 3 用真實瀏覽器自測]
             → [部署：容器化打包，自動部署雲端]
```

### 3.2 沙盒執行環境

每個專案獨立隔離：CPU/記憶體/磁碟限制、網路白名單、獨立檔案系統、執行時間限制、閒置自動回收。這是安全基礎設施，不是可選功能。

### 3.3 多代理架構（Replit Agent 內部）

```
Manager Agent（任務分解、流程編排）
  ├── Editor Agent（前端修改）
  ├── Editor Agent（後端修改）
  └── Verifier Agent（瀏覽器測試、必要時回退詢問使用者）
```

從基本 ReAct 迴圈演化而來。Agent 3 可自主運行最多 200 分鐘。Verifier 不只自動判斷，也會 Human-in-the-Loop 回退確認。

### 3.4 版本管理

每次 Agent 操作自動 commit，使用者可回溯任何歷史版本：

```
v1 ──── v2 ──── v3 ──── v4 (目前)
初版     加功能   改風格   修 bug
                          │
                          └── 可一鍵回到 v2
```

### 3.5 模板系統

模板不是固定 HTML，而是結構化意圖描述：

```json
{
  "type": "restaurant",
  "features": ["booking", "menu", "contact", "gallery"],
  "style": "minimal_japanese",
  "database": "supabase",
  "auth": true
}
```

常見模板類型：電商、部落格、Dashboard、Landing Page、管理後台。每個模板定義預設的頁面結構、功能模組和技術選型，使用者可在此基礎上用自然語言微調。

---

## 四、Readdy AI 深入分析

### 4.1 工作流程

```
1. 輸入方式（四選一）
   ├── 文字 Prompt（描述你要的網站）
   ├── 選擇模板（從預設類型開始）
   ├── 上傳參考圖片（AI 分析風格）
   └── 貼入參考 URL（AI 模仿結構）
          │
          ▼
2. AI 即時生成
   版面配置 + 多頁結構 + 文案 + 圖片 + 響應式設計
          │
          ▼
3. 視覺化編輯
   拖曳調整、改文字、換圖片、微調顏色間距
          │
          ▼
4. 匯出選項
   ├── 即時發布（Readdy 子域名）
   ├── 匯出乾淨代碼（production-ready）
   ├── 匯出 Figma 檔案
   └── 綁定自訂域名
```

### 4.2 定價模型

採 freemium + credit 制。免費層提供基礎生成與編輯，消耗 credit 的操作包括：建立新網站、AI 編輯、Agent 收集的 leads。付費層級解鎖自訂域名和乾淨代碼匯出。

### 4.3 後端整合

Readdy 不只是前端生成器，支援連接開源資料庫（Supabase 等）和認證系統，可建立全端 Web 應用。

---

## 五、如何應用到 OpenClaw 系統

### 5.1 現有能力對照

| Prompt-to-App 能力 | OpenClaw 對應 | 成熟度 |
|---------------------|--------------|--------|
| 自然語言解析 | ask_ai + chain-hints | 已有 |
| 代碼生成 | generate_site | 基礎版 |
| 增量修改 | patch_file | 已有 |
| 多代理協作 | delegate_agents | 已有 |
| 沙盒執行 | code_eval | 已有 |
| 即時預覽 | (待建立) | 無 |
| 一鍵部署 | (手動部署) | 半自動 |

### 5.2 星群協作 = 多代理架構

```
老蔡（指揮）→ 小蔡（Manager）
               ├── Gemini Flash（快速生成）
               ├── Gemini Pro（品質審查）
               └── DeepSeek（複雜邏輯）
```

`delegate_agents` = Manager 分派、`ask_ai` 升級鏈 = 模型升級路徑、`code_eval` = 沙盒驗證。

### 5.3 整合路徑

**Phase 1（1 週）**：generate_site 加模板選擇（餐廳/電商/部落格/企業/Landing Page），模板以 JSON 結構描述。

**Phase 2（1 週）**：增量修改閉環——支援修改已生成網站，用 patch_file 精準改動，每次修改 git commit。

**Phase 3（2 週）**：iframe 預覽窗口 + 臨時 Express route（/preview/:siteId），一鍵部署 API。

**Phase 4（1 個月+）**：後端代碼生成（Express + Supabase schema）、認證整合。

---

## 六、前端 UX 設計啟發

### 6.1 對話式介面（Chat + Preview 雙欄佈局）

```
┌──────────────────┬───────────────────────────┐
│  聊天對話區       │      即時預覽區            │
│                  │                           │
│  [使用者] 做一個  │   ┌─────────────────┐     │
│  餐廳訂位網站     │   │  美味餐廳         │     │
│                  │   │  [日期] [時段]    │     │
│  [AI] 已生成！   │   │  [人數] [送出]    │     │
│  請看右邊預覽     │   └─────────────────┘     │
│                  │                           │
│  [使用者] 配色改  │   (即時更新)               │
│  成暖色系         │                           │
│                  │  [桌機] [平板] [手機]       │
│  ┌────────────┐  │  (響應式切換按鈕)           │
│  │ 輸入修改指令 │  │                           │
│  └────────────┘  │                           │
└──────────────────┴───────────────────────────┘
```

### 6.2 分步引導（降低認知負擔）

比空白 prompt 更友善的引導式流程：

```
步驟 1：選類型    [餐廳] [電商] [部落格] [企業]
步驟 2：選風格    [簡約] [活潑] [專業] [日式]
步驟 3：填內容    店名 / 簡介 / 營業時間
步驟 4：選功能    [x]訂位 [ ]外送 [x]菜單 [ ]會員
         → [開始生成]
```

### 6.3 即時預覽元件

```javascript
function LivePreview({ generatedHtml, device }) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (!iframeRef.current || !generatedHtml) return;
    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(generatedHtml);
    doc.close();
  }, [generatedHtml]);

  const sizes = { desktop: '100%', tablet: '768px', mobile: '375px' };
  return (
    <iframe
      ref={iframeRef}
      style={{ width: sizes[device] || '100%', height: '600px' }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
```

---

## 七、代碼範例：Prompt-to-App 管線

```typescript
async function promptToApp(userPrompt: string): Promise<GeneratedApp> {
  const spec = await parseIntent(userPrompt);     // 意圖解析 → 結構化規格
  const plan = await generatePlan(spec);           // 規劃 → 檔案結構、技術選型
  const files: GeneratedFile[] = [];
  for (const fileSpec of plan.files) {             // 逐檔生成代碼
    files.push({ path: fileSpec.path, content: await generateCode(fileSpec, spec, files) });
  }
  const validation = await validateInSandbox(files);  // 沙盒驗證
  if (!validation.ok) await autoFix(files, validation.errors);
  return { files, previewUrl: await deployToSandbox(files), version: 1 };
}

async function incrementalUpdate(app: GeneratedApp, prompt: string): Promise<GeneratedApp> {
  const diff = await analyzeDiff(app, prompt);     // 分析修改意圖
  for (const change of diff.changes) {             // 只改受影響的檔案
    if (change.type === 'modify') {
      const idx = app.files.findIndex(f => f.path === change.file);
      app.files[idx].content = await applyPatch(app.files[idx].content, change.patch);
    } else if (change.type === 'add') {
      app.files.push({ path: change.file, content: change.content });
    }
  }
  return { ...app, previewUrl: await deployToSandbox(app.files), version: app.version + 1 };
}
```

### API 端點建議

```
POST   /api/openclaw/generate-app          # { prompt, type?, template? } → { siteId, previewUrl }
PATCH  /api/openclaw/update-app/:siteId     # { prompt } → { previewUrl, diff[], version }
GET    /api/openclaw/preview/:siteId        # HTML（可嵌入 iframe）
POST   /api/openclaw/deploy/:siteId         # { platform } → { deployUrl }
GET    /api/openclaw/app-versions/:siteId    # 版本歷史
POST   /api/openclaw/rollback/:siteId       # { version } → 回溯
```

---

## 八、關鍵學習總結

1. **降低門檻比增加功能重要** — 讓不會寫程式的人也能建應用
2. **即時回饋是核心體驗** — 預覽必須秒級回應
3. **增量修改比重新生成實用** — 80% 操作是微調不是重做
4. **DSL 比裸 function calling 可靠** — Replit 用受限 Python DSL，成功率 90%
5. **多代理比單代理更穩** — Manager + Editor + Verifier 分工明確
6. **沙盒隔離是安全底線** — 不是可選功能

OpenClaw 已有 70% 基礎元件（generate_site / patch_file / delegate_agents / code_eval / git），差的是串連這些元件的「應用生成工作流」和面向使用者的「即時預覽體驗」。

---

## 參考資源

- [Readdy AI](https://readdy.ai)
- [Replit Agent 文件](https://docs.replit.com/replitai/agent)
- [Replit Agent 架構案例 (LangChain)](https://www.langchain.com/breakoutagents/replit)
- [Replit 多代理架構 (ZenML)](https://www.zenml.io/llmops-database/building-a-production-ready-multi-agent-coding-assistant)
- [Vercel v0 Platform API](https://vercel.com/blog/build-your-own-ai-app-builder-with-the-v0-platform-api)
- [Zapier: Best AI App Builders 2026](https://zapier.com/blog/best-ai-app-builder/)
- [Flatlogic: Top 12 Prompt-to-App Builders](https://flatlogic.com/blog/top-12-prompt-to-app-builders/)
