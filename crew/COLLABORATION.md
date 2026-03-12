# 星群協作劇本 — COLLABORATION.md

> 定義 crew bot 之間的跨角色協作機制：任務傳遞格式、協作矩陣、求助清單、action 範例。
> 所有 bot 共用此文件。bot 讀到自己的 MEMORY.md 後，參考此劇本決定何時轉交、如何通知。

---

## 1. 跨 Bot 任務傳遞格式

Bot 之間透過 **write_file 寫入對方 inbox** 來傳遞任務。每個 bot 有獨立的 inbox 目錄：

```
~/.openclaw/workspace/crew/{botId}/inbox/
```

### 1.1 傳遞檔案命名規則

```
{類型}-{時間戳}-{來源bot}.md
```

類型代碼：
| 類型 | 代碼 | 說明 |
|------|------|------|
| 告警 | alert | 系統異常、錯誤告警 |
| 任務 | task | 需要對方執行的任務 |
| 資料 | data | 數據、報表、查詢結果 |
| 請求 | req | 請求協助、諮詢 |
| 回報 | report | 完成回報、結果通知 |

範例：`alert-20260304-1430-ayan.md`（阿研在 14:30 發出的告警）

### 1.2 傳遞檔案內容格式

所有跨 bot 傳遞的檔案必須包含以下欄位：

```markdown
## {類型}：{標題}
- 來源：{發送 bot 名稱}
- 目標：{接收 bot 名稱}
- 時間：{YYYY-MM-DD HH:mm}
- 嚴重度：{P0/P1/P2/P3}
- 狀態：待處理

### 內容
{詳細描述}

### 相關資料
{log 片段、查詢結果、檔案路徑等}

### 期望動作
{希望對方做什麼}
```

嚴重度定義：
| 等級 | 說明 | 回應時間 |
|------|------|----------|
| P0 | 系統掛了、服務中斷 | 立刻 |
| P1 | 功能異常、錯誤率飆升 | 15 分鐘內 |
| P2 | 效能下降、非關鍵問題 | 1 小時內 |
| P3 | 優化建議、非緊急事項 | 下次巡邏時 |

### 1.3 傳遞完成後的群組通知

寫完 inbox 檔案後，bot 應在群組回覆中 **@提及目標 bot 名稱**，讓路由機制觸發對方注意。例如：

> 「已把 log 異常分析寫到阿工的 inbox，阿工請查收排查。」

---

## 2. 六人協作矩陣

### 2.1 Bug 修復流程

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 發現異常 | 阿研 | - | grep_project + read_file 掃 log | 掃 `~/.openclaw/automation/logs/taskboard.log`，找 error/crash/timeout |
| 2. 初篩分類 | 阿研 | 阿數（提供錯誤率數據） | 阿研 write_file 到阿工 inbox | 標記嚴重度 P0-P3，附 log 片段和初步判斷 |
| 3. 根因排查 | 阿工 | 阿研（補充資訊） | 阿工 grep_project + analyze_symbol | 追根源，找到問題代碼 |
| 4. 修復代碼 | 阿工 | - | patch_file 修改代碼 | 直接修，修完在群組通知 |
| 5. 影響評估 | 阿策 | 阿數（受影響範圍數據） | 阿策評估是否需要更大範圍修改 | 判斷是否排後續任務 |
| 6. Push 上線 | 小蔡 | 阿工（提供修改清單） | 阿工 write_file 到小蔡 inbox | 小蔡做 git push + build + 重啟 |
| 7. 事後記錄 | 阿秘 | 阿工（提供修復細節） | 阿秘 write_file 事後報告 | 歸檔到知識庫 index_file |

### 2.2 新功能開發

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 需求拆解 | 阿策 | 老蔡/小蔡（確認需求） | 阿策 write_file 規劃文件 | 大需求拆小任務，排優先，分配人 |
| 2. 技術調研 | 阿研 | 阿工（技術可行性） | 阿研 write_file 到阿工 inbox | semantic_search + web_search 調研方案 |
| 3. 商業評估 | 阿商 | 阿數（數據佐證） | 阿商在群組回覆評估結果 | 評估 ROI、目標用戶、商業價值 |
| 4. 架構設計 | 阿工 | 阿策（確認分工） | 阿工 write_file 設計文件 | 定義 API、資料結構、技術方案 |
| 5. 代碼實作 | 阿工 | - | patch_file / write_file | 寫代碼、跑測試 |
| 6. 數據埋點 | 阿數 | 阿工（確認埋點位置） | 阿數 write_file 到阿工 inbox | 定義需要追蹤的 metrics |
| 7. 文件記錄 | 阿秘 | 全員（提供各自產出） | 阿秘 write_file + index_file | 整理過程文件、更新知識庫 |

### 2.3 數據異常

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 發現異常 | 阿數 | - | query_supabase + run_script 監控 | 發現指標偏離正常基準（API > 2s、錯誤率 > 5%） |
| 2. 通知排查 | 阿數 | 阿工 | 阿數 write_file 到阿工 inbox | 附數據截圖、偏離程度、時間範圍 |
| 3. 根因排查 | 阿工 | 阿研（查 log） | 阿工 grep_project + read_file | 從系統層面找根因 |
| 4. 風險評估 | 阿策 | 阿數（量化影響） | 阿策在群組回覆評估 | 判斷嚴重性、是否需要緊急修復 |
| 5. 修復上線 | 阿工 + 小蔡 | - | 同 Bug 修復流程 5-6 | patch + push + restart |

### 2.4 工具評估

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 找工具 | 阿商 | - | web_search + web_browse | 搜尋 SaaS 工具、訂閱服務 |
| 2. 數據分析 | 阿數 | 阿商（提供工具清單） | 阿商 write_file 到阿數 inbox | 阿數跑成本分析、使用量預估 |
| 3. 技術可行性 | 阿工 | 阿商（確認整合需求） | 阿商 write_file 到阿工 inbox | 阿工評估 API 整合難度 |
| 4. ROI 評估 | 阿策 | 阿商 + 阿數 | 阿策在群組回覆 | 綜合評估值不值得用 |
| 5. 決策 | 小蔡 | 阿策（提供建議） | 阿策 write_file 到小蔡 inbox | 小蔡做最終決策 |

### 2.5 日報產出

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 蒐集數據 | 阿秘 | 阿數 | 阿秘 write_file req 到阿數 inbox | 請阿數拉今日任務統計、系統指標 |
| 2. 數據回覆 | 阿數 | - | 阿數 write_file data 到阿秘 inbox | 回傳今日數據：完成任務數、錯誤率等 |
| 3. 規劃補充 | 阿策 | - | 阿策 write_file data 到阿秘 inbox | 補充明日規劃、優先任務 |
| 4. 主筆撰寫 | 阿秘 | - | write_file 日報 | 整合數據 + 規劃 + 重點事件 |
| 5. 歸檔索引 | 阿秘 | - | index_file | 日報入知識庫 |

### 2.6 系統巡邏

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 掃 log | 阿研 | - | grep_project + read_file | 掃 taskboard.log 找異常 |
| 2. 查 metrics | 阿數 | - | query_supabase + run_script | 查 API 健康、任務統計 |
| 3. 整理待辦 | 阿秘 | - | query_supabase | 統計待辦任務 |
| 4. 有問題 | 阿工 | 阿研（提供 log） | 阿研 write_file alert 到阿工 inbox | 阿工接手修復 |
| 5. 需調整 | 阿策 | 阿數（提供數據） | 阿數在群組 @阿策 | 阿策評估排優先 |

### 2.7 知識庫維護

| 階段 | 主負責 | 協作者 | 傳遞方式 | 具體動作 |
|------|--------|--------|----------|----------|
| 1. 盤點內容 | 阿秘 | - | query_supabase + list_dir | 統計知識庫覆蓋率 |
| 2. 品質檢查 | 阿研 | - | semantic_search + read_file | 檢查是否有過期/錯誤資料 |
| 3. 更新入庫 | 阿研 | 阿秘（確認分類） | index_file + reindex_knowledge | 新資料入庫 |
| 4. 覆蓋率統計 | 阿數 | - | query_supabase | 統計各 category 的 chunk 數量 |

---

## 3. 每個 Bot 的求助清單

### 3.1 阿研（研究員）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | log 初篩完發現嚴重 error，需要修代碼 | 阿工 | write_file alert 到 `~/.openclaw/workspace/crew/agong/inbox/` |
| 2 | 調研完技術方案，需要拆成執行計畫 | 阿策 | write_file report 到 `~/.openclaw/workspace/crew/ace/inbox/` |
| 3 | 研究需要數據佐證（用量、成功率等） | 阿數 | write_file req 到 `~/.openclaw/workspace/crew/ashu/inbox/` |
| 4 | 調研結果涉及商業決策（定價、市場） | 阿商 | write_file report 到 `~/.openclaw/workspace/crew/ashang/inbox/` |
| 5 | 調研完成，需要整理歸檔到知識庫 | 阿秘 | write_file report 到 `~/.openclaw/workspace/crew/ami/inbox/` |

### 3.2 阿工（工程師）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | 修完代碼需要 push + 重啟 server | 小蔡 | 在群組 @小蔡 通知，附修改檔案清單 |
| 2 | Bug 根因不明，需要更多 log 或背景資料 | 阿研 | write_file req 到 `~/.openclaw/workspace/crew/ayan/inbox/` |
| 3 | 修復可能影響其他功能，需要評估 | 阿策 | write_file req 到 `~/.openclaw/workspace/crew/ace/inbox/` |
| 4 | 需要數據驗證修復效果（前後對比） | 阿數 | write_file req 到 `~/.openclaw/workspace/crew/ashu/inbox/` |
| 5 | 修復完成，需要記錄事後報告 | 阿秘 | write_file report 到 `~/.openclaw/workspace/crew/ami/inbox/` |

### 3.3 阿策（策略師）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | 規劃需要技術可行性評估 | 阿工 | write_file req 到 `~/.openclaw/workspace/crew/agong/inbox/` |
| 2 | 規劃需要市場數據或競品分析 | 阿研 | write_file req 到 `~/.openclaw/workspace/crew/ayan/inbox/` |
| 3 | 規劃需要成本/數據佐證 | 阿數 | write_file req 到 `~/.openclaw/workspace/crew/ashu/inbox/` |
| 4 | 涉及商業模式或 ROI 評估 | 阿商 | write_file req 到 `~/.openclaw/workspace/crew/ashang/inbox/` |
| 5 | 重大決策需要指揮官拍板 | 小蔡 | write_file report 到 `~/.openclaw/workspace/crew/xiaocai/inbox/` |

### 3.4 阿秘（秘書）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | 日報需要今日數據統計 | 阿數 | write_file req 到 `~/.openclaw/workspace/crew/ashu/inbox/` |
| 2 | 整理文件遇到技術術語不理解 | 阿工 | write_file req 到 `~/.openclaw/workspace/crew/agong/inbox/` |
| 3 | 需要知識庫品質檢查（過期/錯誤內容） | 阿研 | write_file req 到 `~/.openclaw/workspace/crew/ayan/inbox/` |
| 4 | 整理完成後需要阿策確認下一步規劃 | 阿策 | write_file report 到 `~/.openclaw/workspace/crew/ace/inbox/` |
| 5 | 發現截止日期將到，需要提醒負責人 | 相關 bot | 在群組 @對方名字 提醒 |

### 3.5 阿數（分析師）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | 發現系統指標異常（API > 2s、錯誤率 > 5%） | 阿工 | write_file alert 到 `~/.openclaw/workspace/crew/agong/inbox/` |
| 2 | 數據分析需要背景資料（為什麼某段時間異常） | 阿研 | write_file req 到 `~/.openclaw/workspace/crew/ayan/inbox/` |
| 3 | 數据結果需要轉成行動計畫 | 阿策 | write_file report 到 `~/.openclaw/workspace/crew/ace/inbox/` |
| 4 | 報表產出完成，需要歸檔 | 阿秘 | write_file data 到 `~/.openclaw/workspace/crew/ami/inbox/` |
| 5 | 數據涉及商業決策（營收、成本） | 阿商 | write_file data 到 `~/.openclaw/workspace/crew/ashang/inbox/` |

### 3.6 阿商（商業自動化）遇到這些情況找別人

| # | 情況 | 找誰 | 怎麼傳遞 |
|---|------|------|----------|
| 1 | 找到的工具需要技術整合評估 | 阿工 | write_file req 到 `~/.openclaw/workspace/crew/agong/inbox/` |
| 2 | 需要深度技術調研（API 文件、開源方案） | 阿研 | write_file req 到 `~/.openclaw/workspace/crew/ayan/inbox/` |
| 3 | 需要使用量/成本數據做 ROI 計算 | 阿數 | write_file req 到 `~/.openclaw/workspace/crew/ashu/inbox/` |
| 4 | 評估完成，需要排進路線圖 | 阿策 | write_file report 到 `~/.openclaw/workspace/crew/ace/inbox/` |
| 5 | 重大訂閱/採購決策需要指揮官批准 | 小蔡 | write_file report 到 `~/.openclaw/workspace/crew/xiaocai/inbox/` |

---

## 4. 任務傳遞 Action 範例

以下是具體可執行的 JSON action 範例。每個 bot 可以直接複製使用。

### 4.1 阿研發現 log 異常 -> 通知阿工排查

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/agong/inbox/alert-20260304-1430-ayan.md","content":"## 告警：Server API 500 錯誤頻繁\n- 來源：阿研\n- 目標：阿工\n- 時間：2026-03-04 14:30\n- 嚴重度：P1\n- 狀態：待處理\n\n### 內容\n掃 log 發現過去 30 分鐘內出現 12 次 HTTP 500 錯誤，集中在 /api/openclaw/tasks 端點。\n錯誤訊息：TypeError: Cannot read properties of undefined (reading 'id')\n\n### 相關資料\n- Log 路徑：~/.openclaw/automation/logs/taskboard.log\n- 錯誤行號：1523-1535\n- 影響 API：POST /api/openclaw/tasks\n- 初步判斷：task 物件在某些情況下為 undefined，缺少 null check\n\n### 期望動作\n請阿工排查 server/src/ 中 tasks 相關路由的 null check，找到根因並 patch_file 修復。"}
```

### 4.2 阿策拆完任務 -> 通知阿工執行

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/agong/inbox/task-20260304-1500-ace.md","content":"## 任務：實作 Live2D 角色互動 API\n- 來源：阿策\n- 目標：阿工\n- 時間：2026-03-04 15:00\n- 嚴重度：P2\n- 狀態：待處理\n\n### 內容\n老蔡要求新增 Live2D 角色互動功能。已拆解為以下子任務：\n1. 建立 GET /api/live2d/status 端點（回傳角色狀態）\n2. 建立 POST /api/live2d/interact 端點（處理互動事件）\n3. 前端整合 pixi-live2d-display\n\n本次請阿工先做第 1、2 項（後端 API）。\n\n### 相關資料\n- 參考 PoC：server/src/live2dService.ts\n- 技術棧：Express.js + TypeScript\n- 阿研調研報告：~/.openclaw/workspace/crew/ayan/notes/live2d-research.md\n\n### 期望動作\n請在 server/src/routes/ 下新增 live2d 路由，實作兩個端點。完成後通知小蔡 push。"}
```

### 4.3 阿策拆完任務 -> 通知阿研調研

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ayan/inbox/task-20260304-1500-ace.md","content":"## 任務：調研 Live2D Web SDK 最佳實踐\n- 來源：阿策\n- 目標：阿研\n- 時間：2026-03-04 15:00\n- 嚴重度：P2\n- 狀態：待處理\n\n### 內容\n新功能開發需要 Live2D Web SDK 的技術調研。請調查：\n1. pixi-live2d-display 最新版本和 PixiJS 兼容性\n2. 效能最佳化（模型載入、動畫 FPS）\n3. 社群常見問題和解法\n\n### 相關資料\n- GitHub: https://github.com/guansss/pixi-live2d-display\n- 現有 PoC: server/src/live2dService.ts\n\n### 期望動作\n用 web_search + web_browse 調研，結果寫到 ~/.openclaw/workspace/crew/ayan/notes/live2d-research.md，完成後通知阿工。"}
```

### 4.4 阿秘整理完摘要 -> 歸檔並通知

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ami/notes/daily-report-20260304.md","content":"## 日報 2026-03-04\n\n### 今日重點\n- Live2D 互動角色 PoC 完成（v2.4.34）\n- write_file 反引號 bug 修復（v2.4.33）\n- 星群 bot 權限修復（v2.4.32）\n\n### 任務進度\n| 任務 | 狀態 | 負責人 |\n|------|------|--------|\n| Live2D PoC | done | 阿工 |\n| 反引號修復 | done | 小蔡 |\n| Bot 權限修復 | done | 小蔡 |\n\n### 系統指標\n- API 平均回應：0.8s\n- 錯誤率：1.2%\n- 任務完成率：85%\n\n### 明日待辦\n- Live2D API 端點實作\n- 知識庫品質檢查"}
```

```json
{"action":"index_file","path":"~/.openclaw/workspace/crew/ami/notes/daily-report-20260304.md","category":"daily-report"}
```

### 4.5 阿數發現數據異常 -> 通知阿工

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/agong/inbox/alert-20260304-1600-ashu.md","content":"## 告警：API 回應時間飆升\n- 來源：阿數\n- 目標：阿工\n- 時間：2026-03-04 16:00\n- 嚴重度：P1\n- 狀態：待處理\n\n### 內容\nquery_supabase 監控發現 /api/openclaw/tasks 端點平均回應時間從 0.8s 飆升至 4.2s（超過 2s 基準線）。\n異常開始時間約 15:30，持續至今。\n\n### 相關資料\n- 正常基準：API 回應 < 2s\n- 當前數值：4.2s（超標 110%）\n- 受影響端點：GET /api/openclaw/tasks、POST /api/openclaw/tasks\n- Supabase 查詢結果：最近 50 筆 request 中 38 筆超過 2s\n\n### 期望動作\n請排查是否有 N+1 查詢、missing index、或 Supabase 連線池滿等問題。"}
```

### 4.6 阿商找到工具 -> 通知阿數做 ROI 分析

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ashu/inbox/req-20260304-1100-ashang.md","content":"## 請求：Vercel Analytics ROI 數據分析\n- 來源：阿商\n- 目標：阿數\n- 時間：2026-03-04 11:00\n- 嚴重度：P3\n- 狀態：待處理\n\n### 內容\n我評估了 Vercel Analytics Pro 方案（$20/月），需要阿數協助分析 ROI：\n1. 目前我們每月花多少時間手動查看 log 和 metrics？\n2. Vercel Analytics 能節省多少分析時間？\n3. 與現有 Supabase + 自建監控的功能重疊度？\n\n### 相關資料\n- Vercel Analytics 功能：Real-time, Web Vitals, Audience insights\n- 定價：$20/月 Pro plan\n- 我的評估報告：~/.openclaw/workspace/crew/ashang/notes/vercel-analytics-eval.md\n\n### 期望動作\n請用 query_supabase 統計過去 30 天的監控數據，計算手動分析時間，回覆 ROI 數據到我的 inbox。"}
```

### 4.7 阿工修完代碼 -> 通知小蔡 Push

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/xiaocai/inbox/report-20260304-1700-agong.md","content":"## 回報：tasks 端點 null check 修復完成\n- 來源：阿工\n- 目標：小蔡\n- 時間：2026-03-04 17:00\n- 嚴重度：P1\n- 狀態：待 push\n\n### 內容\n已修復阿研回報的 HTTP 500 問題。根因是 POST /api/openclaw/tasks 路由中缺少 request body 的 null check。\n\n### 修改檔案\n- server/src/routes/taskRoutes.ts（第 45 行，新增 body 驗證）\n- server/src/routes/taskRoutes.ts（第 78 行，新增 try-catch）\n\n### patch_file 紀錄\n```\nsearch: const task = req.body;\nreplace: const task = req.body;\nif (!task || !task.name) {\n  return res.status(400).json({ error: 'Missing required field: name' });\n}\n```\n\n### 期望動作\n請小蔡做 git add + commit + push + build + restart。修復後預期 500 錯誤歸零。"}
```

### 4.8 阿秘請阿數提供日報數據

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ashu/inbox/req-20260304-2200-ami.md","content":"## 請求：今日系統數據（日報用）\n- 來源：阿秘\n- 目標：阿數\n- 時間：2026-03-04 22:00\n- 嚴重度：P3\n- 狀態：待處理\n\n### 內容\n我在整理今日日報，需要以下數據：\n1. 今日完成任務數（status=done）\n2. 今日新增任務數\n3. API 平均回應時間\n4. 錯誤率\n5. 知識庫 chunk 總數\n\n### 期望動作\n請用 query_supabase 查詢以上數據，結果寫到 ~/.openclaw/workspace/crew/ami/inbox/data-20260304-ashu.md"}
```

### 4.9 阿數回覆阿秘的數據請求

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ami/inbox/data-20260304-2210-ashu.md","content":"## 資料：今日系統數據\n- 來源：阿數\n- 目標：阿秘\n- 時間：2026-03-04 22:10\n- 嚴重度：P3\n- 狀態：已完成\n\n### 內容\n以下是今日系統數據（query_supabase 查詢結果）：\n\n| 指標 | 數值 |\n|------|------|\n| 完成任務數 | 8 |\n| 新增任務數 | 5 |\n| API 平均回應 | 0.9s |\n| 錯誤率 | 1.5% |\n| 知識庫 chunks | 4,359 |\n\n### 備註\n- 錯誤率略高於昨日（0.8%），主因是 15:00-15:30 的 500 錯誤（已修復）\n- 知識庫新增 42 個 chunks（batch-index 批次入庫）"}
```

### 4.10 阿策請阿商評估工具

```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/ashang/inbox/req-20260304-1400-ace.md","content":"## 請求：評估 n8n 雲端方案 vs 自架\n- 來源：阿策\n- 目標：阿商\n- 時間：2026-03-04 14:00\n- 嚴重度：P2\n- 狀態：待處理\n\n### 內容\n我們目前用 Zeabur 跑 n8n，但有些 workflow 需要更多 execution 額度。\n請阿商評估：\n1. Zeabur 目前方案的 execution 限制和成本\n2. n8n Cloud 的定價和功能差異\n3. 自架 n8n（Docker on VPS）的成本\n4. 推薦哪個方案\n\n### 期望動作\n用 web_search 調研三個方案的定價，寫評估報告到你的 notes，完成後通知我。"}
```

---

## 5. 協作快速參考表

### 5.1 誰找誰速查

| 我需要... | 找誰 | 說明 |
|-----------|------|------|
| 修代碼 / 排 bug | 阿工 | 附 log 片段和錯誤訊息 |
| 調研技術方案 | 阿研 | 附研究方向和關鍵字 |
| 拆任務 / 排優先 | 阿策 | 附需求描述和約束條件 |
| 查數據 / 跑統計 | 阿數 | 附需要的指標和時間範圍 |
| 整理文件 / 寫摘要 | 阿秘 | 附來源資料和格式要求 |
| 找工具 / 評估 SaaS | 阿商 | 附使用場景和預算限制 |
| Push / 重啟 / 重大決策 | 小蔡 | 附修改清單和影響評估 |

### 5.2 inbox 路徑速查

| Bot | inbox 路徑 |
|-----|-----------|
| 阿研 | `~/.openclaw/workspace/crew/ayan/inbox/` |
| 阿工 | `~/.openclaw/workspace/crew/agong/inbox/` |
| 阿策 | `~/.openclaw/workspace/crew/ace/inbox/` |
| 阿秘 | `~/.openclaw/workspace/crew/ami/inbox/` |
| 阿數 | `~/.openclaw/workspace/crew/ashu/inbox/` |
| 阿商 | `~/.openclaw/workspace/crew/ashang/inbox/` |
| 小蔡 | `~/.openclaw/workspace/crew/xiaocai/inbox/` |

### 5.3 傳遞規則

1. **一定要寫 inbox 檔案** -- 口頭說「幫我查」沒有紀錄，容易漏
2. **一定要在群組 @提及** -- 寫完 inbox 後在群組說一句，觸發路由
3. **一定要標嚴重度** -- P0/P1 立刻處理，P2/P3 排隊
4. **做完回報** -- 處理完寫 report 回對方 inbox，形成閉環
5. **阿秘歸檔** -- 重要的協作紀錄請阿秘 index_file 入知識庫
