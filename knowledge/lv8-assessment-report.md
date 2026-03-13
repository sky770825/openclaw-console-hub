# Lv.8 能力評估報告 — 2026-03-03

> 評估員：Claude Code (Sonnet 4.6)
> 評估時間：2026-03-03
> 評估範圍：exercise-H1-multi-agent.md、exercise-H2-web-browse.md

---

## H1 delegate_agents 評估

**實作狀態：已實作**

**功能完整性：**
- 真並行執行：`Promise.all()` 同時派出最多 6 個代理，確實是並行而非序列
- 角色注入：`rolePrefix = "你是${agent.role}。"` 自動加到每個代理的 prompt 前
- 模型選擇：支援 `model` 欄位（預設 flash），每個代理可獨立指定模型
- 共享 context：頂層 `sharedContext` + 每個代理的 `context` 合併注入
- 結果彙整：輸出格式為 `✅/❌ 角色名 + 結果內容`，有 successCount 統計
- 錯誤隔離：單一代理 throw 不影響其他代理（catch 包住每個 agent.map）
- 限制：最多 6 個代理，超出回傳錯誤訊息

**H1 題目要求 vs 實作對照：**
- `delegate_agents` 派出規劃師/研究員/統計員（3 個 flash）：全支援
- 三個代理各自有不同 task（分析、find_symbol、grep_project）：可通過 task 欄位指定
- 結果整合 write_file：這是 delegate_agents 執行完後達爾自己要做的步驟，本 action 只返回結果字串
- index_file 入庫：同上，是後續 chain 的一步

**關鍵限制發現：**
- `delegate_agents` 的子代理只能呼叫 `handleAskAI`（ask_ai）
- 子代理無法呼叫 `grep_project`、`find_symbol`、`analyze_code` 等工具 action
- H1 題目第 1 步要求：研究員用 `analyze_symbol` 找 handleWebBrowse 定義、統計員用 `grep_project` 統計 case 分支
  - **這兩個 task 會被當作 AI 文字生成任務交給 Gemini，而不是真正執行 grep_project / analyze_symbol**
  - 達爾必須在 delegate_agents 的 task 描述裡讓 AI 生成這些查詢，或者自己先跑 grep_project 再把結果當 context 傳入
- **如果達爾不了解這個限制，就會誤以為子代理能直接呼叫工具 action，導致結果不準確**

**預估得分：50/100**
- delegate_agents 正確執行，三個代理都有輸出：30 分（全得）
- 結果有效整合（不是直接貼三段 AI 回覆）：10/30 分（AI 生成的分析沒有實際查到代碼，不算有效整合）
- write_file + index_file 都完成：20 分（全得，後續 chain 可做到）
- 全程不問主人、不卡關：0/20 分（如果不懂子代理工具限制，會在解讀結果時卡住或誤報）

**缺少的能力：**
1. 不理解 `delegate_agents` 子代理只能做 AI 生成，不能呼叫系統工具 action
2. 缺少「先用 grep_project/find_symbol 查好資料，再把結果當 context 傳入 delegate_agents」的模式
3. 缺少 chain-hint 提示：delegates_agents 完成後需要對結果做內容品質驗證（不能盲目接受 AI 回覆）

---

## H2 web_browse 評估

**實作狀態：已實作（有條件限制）**

**功能完整性：**
- Playwright 整合：`BrowserService` 使用 chromium headless 真實瀏覽器渲染
- 動態 JS 頁面支援：`waitUntil: 'domcontentloaded'`，可執行 JS，能看到 React/Vue 動態內容
- 文字萃取：移除 script/style/nav/footer/header，只保留正文 innerText
- 長文截斷：超過 8000 字自動截斷，返回 `[... 內容過長，已截斷]` 標記
- 內網防護：localhost/127./10./192.168./172.16-31 全部封鎖
- 選配降級：playwright 未安裝時返回明確錯誤訊息，不崩潰

**playwright 安裝狀態：**
- `playwright` 套件：已在 server/package.json 宣告（^1.58.2）
- node_modules：已安裝（server/node_modules/playwright 目錄存在）
- Chromium 二進制：已存在（`~/Library/Caches/ms-playwright/chromium-1208/`）
- **結論：playwright 環境完整，`isAvailable()` 應返回 true，web_browse 可正常執行**

**H2 題目要求 vs 實作對照：**
- `web_browse https://docs.github.com/en/rest/...`：URL 格式合法，非內網，可執行
- 萃取「最重要的 5 個端點類別」：這是 AI 判斷層，web_browse 只返回原始文字，萃取工作要由達爾自己做
- write_file 存到 workspace/notes/H2-github-api-notes.md：可執行
- index_file 入庫 importance=mid：可執行

**潛在問題：**
- GitHub docs 頁面可能有重定向或 JS 渲染依賴，8000 字截斷後可能遺漏部分端點類別
- 「萃取有意義（不是全文貼上）」要求 40 分：這需要達爾自己分析 web_browse 結果並精選，不是自動完成
- 如果 web_browse 返回的文字雜亂（nav/menu 殘留），萃取品質會下降

**預估得分：75/100**
- web_browse 成功抓到內容：30 分（全得，環境就緒）
- 萃取有意義（不是全文貼上）：25/40 分（web_browse 文字品質尚可，但達爾需要主動整理而非直接複製）
- write_file + index_file 完成：20/30 分（扣分因為 importance 欄位的使用格式達爾過去有搞錯）

**缺少的能力：**
1. web_browse 返回後如何做有意義的二次分析（而非直接貼上）— 需要搭配 ask_ai 做摘要
2. 當 web_browse 截斷時，如何判斷是否需要多次抓取不同 URL 補完

---

## 整體 Lv.8 評估

**是否達到 Lv.8：否**

**理由：**
- H1 得分 50/100（未達 80 分升級線）：核心原因是達爾不理解 delegate_agents 子代理的工具調用限制，會導致結果品質不足
- H2 得分 75/100（接近但仍未達 80 分）：web_browse 基礎功能完整，但萃取品質不穩定

**主人評分建議：7.0/10**

目前已達到條件（+0.3 從 6.7 升到 7.0 的依據）：
- web_browse 已完整實作（playwright 環境可用）
- delegate_agents 真並行已實作且穩定
- 工具調度整體完整（21 個 action，chain-hints 引導）

尚未達到升 Lv.8 的差距：
- 對 delegate_agents 子代理能力邊界的理解不足（只能 ask_ai，不能呼叫系統工具）
- 缺少「先用系統工具取得精確數據，再把數據當 context 傳入 delegate_agents」的組合使用技巧
- H2 萃取品質取決於達爾是否主動用 ask_ai 二次分析，未建立標準動作鏈

**下一步建議：**

1. 讓達爾實際執行 H1 題目，觀察它是否知道要先跑 `grep_project` 得到 case 分支數，再傳入 delegate_agents 的 context
2. 讓達爾實際執行 H2 題目，觀察它是否在 web_browse 完成後接一個 `ask_ai model=flash` 做摘要，而非直接 write_file
3. 執行 H3 練習（智慧修復引擎測試），驗證 auto-executor 的 AI Repair 是否被觸發並生效

---

## 附錄：系統能力快照

| 能力 | 實作檔案 | 版本狀態 |
|------|---------|---------|
| delegate_agents | server/src/telegram/action-handlers.ts:611 | 生產版，Promise.all 並行 |
| web_browse | server/src/telegram/action-handlers.ts:1466 + services/BrowserService.ts | Playwright headless，8000字截斷 |
| AI Repair | server/src/executor-agents.ts:1155 | Gemini Flash 分析錯誤，注入修復提示，最多重試 1 次 |
| 保護區回滾 | server/src/executor-agents.ts:1362 | git checkout 自動回滾 server/src/ 和 src/ 改動 |
