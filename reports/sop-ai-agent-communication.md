# AI Agent 指令溝通 SOP

> 建立日期：2026-02-14  
> 用途：標準化給 Codex / Cursor / Ollama 的任務指令，提升執行準確率  
> 來源：OpenAI Codex Prompting Guide + Cursor Best Practices + Anthropic Multi-Agent Research + Google ADK

---

## 📋 核心原則

把 Agent 當成「第一天上班的新進工程師」：
- 他不知道你的專案背景
- 他不知道你的技術選型
- 他不知道你的 coding style
- **你必須告訴他一切**

---

## 🏗️ 指令結構模板（必備欄位）

```markdown
【任務名稱】簡短描述（20 字內）

【背景資訊】
- 專案路徑：`/path/to/project`
- 相關檔案：`檔案A`, `檔案B`
- 技術堆疊：`Next.js 14 + Supabase + Tailwind CSS`
- 參考文件：`CLAUDE.md`, `.cursorrules`

【具體任務】
1. 第一步...
2. 第二步...
3. 第三步...

【輸出要求】
- 修改哪些檔案（路徑）
- 程式碼風格規範
- 註解要求

【驗收條件】✅ 必須可檢查
- [ ] 條件 1：具體可驗證的結果
- [ ] 條件 2：具體可驗證的結果

【禁止事項】❌ 明確限制
- 不要修改 X
- 不要用 Y 方法
- 不要刪除 Z

【回報格式】
統一標題：`【小蔡執行-TASK_NAME】`
```

---

## 🤖 Agent 分工對照表

| Agent | 專長 | 使用時機 | 成本 |
|-------|------|----------|------|
| **Codex** | 後端 API、資料庫、搜尋分析 | 修復 API、寫 script、查問題 | $ 訂閱制 |
| **Cursor** | 前端 UI、RWD、Refactor | 調整畫面、改樣式、重構 | $ 訂閱制 |
| **Ollama** | 監控報告、例行檢查 | 定時巡檢、報告產出 | **$0** |
| **Kimi** | 指揮協調、複雜決策 | 任務分配、策略討論 | 低 |

---

## 🔄 多 Agent 協作流程

```
┌─────────────────────────────────────────────┐
│            指揮官 Agent (小蔡/Kimi)           │
│     理解需求 → 分解任務 → 指派 → 整合結果      │
└─────────────────────────────────────────────┘
              ↓              ↓              ↓
        ┌─────────┐   ┌─────────┐   ┌─────────┐
        │  Codex  │   │ Cursor  │   │ Ollama  │
        │ 子 Agent│   │ 子 Agent│   │ 子 Agent│
        └─────────┘   └─────────┘   └─────────┘
              ↓              ↓              ↓
        ┌─────────────────────────────────────────┐
        │  回報 → 寫入 RESULT.md → 通知 Telegram   │
        └─────────────────────────────────────────┘
```

### 指揮官的責任
1. **翻譯**：把老蔡的自然語言 → 結構化指令
2. **補充**：加上 Context、路徑、限制條件
3. **驗收**：檢查成果是否符合預期
4. **整合**：把子 Agent 結果彙整給老蔡

---

## ✅ 好 vs 壞 指令對照

| ❌ 錯誤示範 | ✅ 正確示範 |
|------------|------------|
| 「修好這個 bug」 | 「當用戶在 `/login` 輸入錯誤密碼時，顯示『帳號或密碼錯誤』，不要曝露是哪個欄位錯」 |
| 「用 Supabase」 | 「使用 Supabase **public schema**，表格名稱 `users`，欄位 `id`/`email`/`created_at`」 |
| 「部署到 Cloudflare」 | 「使用 `wrangler deploy` 部署，環境變數從 `.env.production` 讀取」 |
| 「做個好看的按鈕」 | 「按鈕樣式：bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2，放在 `/components/Button.tsx`」 |
| 「檢查一下」 | 「檢查 `scripts/` 下所有 `.sh` 檔案，回報哪些沒有加 `set -e`」 |

---

## 🧠 讓 Agent 「記得」專案的技巧

### 1. Context 檔案（專案根目錄）

**CLAUDE.md**（給 Codex）
```markdown
# 專案背景
- 名稱：XXX
- 技術：Next.js 14 App Router + Supabase
- 部署：Cloudflare Pages

## Coding Style
- 使用 TypeScript
- 元件放在 `app/components/`
- API 路由放在 `app/api/`
```

**.cursorrules**（給 Cursor）
```markdown
# Cursor 規則
- 使用 Tailwind CSS
- 優先使用 Server Components
- 型別定義放在 `types/` 目錄
```

### 2. Plan Mode 策略

複雜任務先進入 Plan Mode：
1. Agent 研究程式碼 → 產生計畫
2. 你審核計畫 → 編輯調整
3. 確認後執行

### 3. Working Memory

讓 Agent 把重要決定寫到檔案：
- `memory/decisions/YYYY-MM-DD-topic.md`
- `projects/X/modules/Y/docs/decisions.md`

---

## 📝 實際範例：完整的任務指令

### 範例 1：修復 API 錯誤（給 Codex）

```markdown
【任務名稱】修復 /api/auth/login 錯誤處理

【背景資訊】
- 專案路徑：`/Users/caijunchang/.openclaw/workspace/projects/easyclaw-pro/`
- 相關檔案：`src/app/api/auth/login/route.ts`
- 技術堆疊：Next.js 14 + Supabase Auth

【問題描述】
目前當用戶輸入錯誤密碼時，API 回傳 500 錯誤，應該回傳 401。

【具體任務】
1. 讀取 `src/app/api/auth/login/route.ts`
2. 找到密碼驗證失敗的處理邏輯
3. 將錯誤回應從 500 改為 401
4. 錯誤訊息改為「帳號或密碼錯誤」（不要說是哪個錯）

【輸出要求】
- 只修改 `route.ts`
- 使用標準 Response.json() 格式
- 加上 try-catch 錯誤處理

【驗收條件】
- [ ] 輸入錯誤密碼時回傳 HTTP 401
- [ ] 錯誤訊息為「帳號或密碼錯誤」
- [ ] 輸入正確密碼時正常登入

【回報格式】
標題：`【小蔡執行-FIX_LOGIN_ERROR】`
內容：修改內容 + 測試結果 + 檔案 diff
```

### 範例 2：調整 RWD（給 Cursor）

```markdown
【任務名稱】修復 Dashboard 手機版排版

【背景資訊】
- 專案路徑：`/projects/dashboard/`
- 相關檔案：`src/components/StatsCard.tsx`, `src/app/page.tsx`
- 參考設計：Figma 連結（如有）

【具體任務】
1. StatsCard 在手機版（< 640px）改為單欄排列
2. 字體大小在手機版縮小為 text-sm
3. padding 在手機版改為 p-4

【輸出要求】
- 使用 Tailwind 響應式語法（md:, lg:）
- 不要改變桌面版樣式
- 用 Chrome DevTools 測試 iPhone SE 尺寸

【驗收條件】
- [ ] iPhone SE 尺寸下 StatsCard 單欄顯示
- [ ] 文字不會超出容器
- [ ] 桌面版樣式不變

【禁止事項】
- 不要修改元件的 props 接口
- 不要改變顏色主題
```

---

## 🔍 任務派發前檢查清單

- [ ] 專案路徑是否正確？
- [ ] 相關檔案是否列出？
- [ ] 技術堆疊是否說明？
- [ ] 任務是否可分解成步驟？
- [ ] 驗收條件是否具體可檢查？
- [ ] 是否有禁止事項？
- [ ] 回報格式是否指定？

---

## 📚 參考資源

| 資源 | 連結 |
|------|------|
| OpenAI Codex Prompting Guide | https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide/ |
| Cursor Agent Best Practices | https://cursor.com/blog/agent-best-practices |
| Anthropic Multi-Agent Research | https://www.anthropic.com/engineering/multi-agent-research-system |
| Google ADK Multi-Agent | https://google.github.io/adk-docs/agents/multi-agents/ |

---

🐣 小蔡整理 | 最後更新：2026-02-14
