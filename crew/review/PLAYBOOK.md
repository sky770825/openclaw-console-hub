# 星群協作劇本 — PLAYBOOK v2.2

> 所有 crew bot 共用。不同情境下，誰先動、做什麼、交棒給誰。
> bot 讀到自己的 MEMORY.md 後，會參考這份劇本決定出手時機。
> v2.0 更新：新增 10 個專業代理（16 人團隊）
> v2.1 更新：新增代理間上下游關係、溝通規範、排程任務、交付格式、決策門檻
> v2.2 更新：新增完整 SOP 體系（交接/事件處理/知識管理/上線/回顧）

---

## 團隊總覽（16 人）

### 原始核心團隊（6 人）
| 代號 | 名稱 | 角色 | 模型 |
|------|------|------|------|
| ace | 阿策 | 策略師 — 任務拆解、規劃、排序 | gemini-3-flash |
| agong | 阿工 | 工程師 — 代碼開發、修 bug | gemini-3-flash + sonnet |
| ami | 阿秘 | 秘書 — 摘要、日報、記憶管理 | gemini-2.5-flash-lite |
| ashang | 阿商 | 商業分析 — 競品、營收、990 專案 | gemini-3-flash |
| ashu | 阿數 | 數據分析 — Supabase 查詢、metrics | gemini-3-flash |
| ayan | 阿研 | 研究員 — 情報蒐集、技術調研 | gemini-3-pro + sonnet |

### 新增專業團隊（10 人）
| 代號 | 名稱 | 角色 | 模型 |
|------|------|------|------|
| patrol | 巡查 | 巡查官 — 15 分鐘巡查、阻塞偵測、交付物驗收 | gemini-2.5-flash-lite |
| journal | 日誌 | 日誌官 — 活動記錄、每日摘要、知識餵送 | gemini-2.5-flash-lite |
| seo | SEO | SEO 分析師 — 關鍵字研究、排名優化 | gemini-3-flash |
| content | 內容 | 內容創作官 — 文案、部落格、腳本 | gemini-3.1-pro |
| design | 設計 | 設計師 — UI/UX spec、視覺規範 | gemini-3-flash |
| review | 審查 | 審查官 — 品質審查、發布前把關 | claude-sonnet-4-6 |
| growth | 增長 | 增長官 — 轉換率、留存、A/B 測試 | gemini-3-flash |
| social | 社群 | 社群管理 — 社群貼文、互動管理 | gemini-3-flash |
| newsletter | 電子報 | 電子報官 — Email 行銷、自動化序列 | gemini-3-flash |
| outreach | 外展 | 外展官 — Podcast 邀約、合作洽談 | gemini-3-flash |

---

## 上下游關係圖（新增 v2.1）

```
                    ┌──────────┐
                    │  主人     │ ← 最終決策者
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  達爾     │ ← 指揮官，接收目標
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  阿策    │ ← 拆解任務、分發各代理
                    └──┬──┬──┬─┘
          ┌────────────┘  │  └────────────┐
     ┌────▼────┐    ┌────▼────┐    ┌─────▼─────┐
     │ 阿工    │    │ 設計    │    │ 內容      │
     │(技術)   │    │(視覺)   │    │(文案)     │
     └────┬────┘    └────┬────┘    └──┬──┬─────┘
          │              │           │  │
          │              │     ┌─────┘  └──────┐
          │              │     │               │
     ┌────▼────┐    ┌───▼─────▼──┐    ┌───────▼───┐
     │ 審查    │    │ SEO        │    │ 社群/電子報│
     │(品質)   │    │(關鍵字)    │    │(發布管道)  │
     └─────────┘    └────────────┘    └───────────┘

支援層（任何代理可呼叫）：
  阿研（調研） | 阿數（數據） | 阿秘（記錄）
  阿商（商業） | 增長（指標） | 外展（合作）

持續運行：
  巡查（系統監控） | 日誌（事件記錄）
```

### 代理間溝通規範
- **需要協助時**：在回覆中提到對方代號（如「請 agong 接手」）
- **任務交棒時**：寫入對方 inbox/，附帶完整上下文
- **Workspace 隔離**：不擅自修改其他代理的檔案
- **溝通格式**：結論→理由→行動建議（見 `ace/knowledge/communication-framework.md`）

---

## 情境 1：製作網站 / 新功能開發

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿策 | 拆解需求 → create_task 建子任務 → 排優先 → 分配給誰 | create_task, query_supabase |
| 2 | 阿研 | 調研技術方案 → semantic_search 查知識庫有沒有類似案例 | semantic_search, web_search |
| 3 | 阿商 | 評估商業價值 → 這功能值不值得做、目標用戶是誰 | ask_ai, web_search |
| 4 | 設計 | 產出設計規格文件（UI/UX spec） | write_file, web_browse |
| 5 | SEO | 提供頁面 SEO 建議和關鍵字 | web_search, write_file |
| 6 | 阿工 | 動手寫代碼 → 架構設計 → 實作 → patch_file | grep_project, patch_file, run_script |
| 7 | 審查 | 代碼和設計品質審查 | read_file, ask_ai |
| 8 | 阿數 | 建立 metrics → 上線後追蹤數據、成功率 | query_supabase, run_script |
| 9 | 阿秘 | 記錄過程 → 整理文件 → 更新知識庫 | write_file, index_file |
| 持續 | 巡查 | 每 15 分鐘檢查任務進度 | query_supabase, read_file |

## 情境 2：系統故障 / 緊急排錯

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿研 | 掃 log → 初篩錯誤類型和嚴重程度 | grep_project, semantic_search, read_file |
| 2 | 阿數 | 查 metrics → 確認影響範圍（錯誤率、受影響 API） | query_supabase, run_script |
| 3 | 阿工 | 接手排查 → 追根源 → patch_file 修復 | grep_project, patch_file, run_script |
| 4 | 審查 | 修復代碼品質審查 | read_file, ask_ai |
| 5 | 阿秘 | 記錄事件 → 寫事後報告 | write_file, index_file |
| 6 | 阿策 | 評估是否需要更大範圍修改 → 排後續任務 | create_task, ask_ai |
| 7 | 日誌 | 記錄事件到 journal | write_file |

## 情境 3：商業分析 / 990 專案

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿商 | 主導 → 市場調研、競品分析、商業模式 | web_search, ask_ai, proxy_fetch |
| 2 | 阿研 | 爬網蒐集數據 → 支援阿商的研究 | web_search, proxy_fetch, semantic_search |
| 3 | 阿數 | 數字試算 → 營收預估、成本分析 | query_supabase, run_script, ask_ai |
| 4 | 增長 | 增長策略和轉換率分析 | web_search, ask_ai |
| 5 | 阿策 | 把商業結論轉成執行計畫 → create_task | create_task, query_supabase |
| 6 | 阿秘 | 整理報告 → 歸檔 | write_file, index_file |

## 情境 4：日常維運 / 巡邏

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 持續 | 巡查 | 每 15 分鐘巡查所有任務狀態 | query_supabase, read_file |
| 持續 | 日誌 | 記錄重要活動和決策 | write_file, read_file |
| 1 | 阿研 | 掃 log 異常 | grep_project, read_file, semantic_search |
| 2 | 阿數 | 查 metrics + 任務統計 | query_supabase, run_script |
| 3 | 阿秘 | 整理待辦清單 | query_supabase, write_file |
| 有問題時 | 阿工 | 接手修復 | grep_project, patch_file, run_script |
| 有問題時 | 阿策 | 排優先、調資源 | create_task, ask_ai |

## 情境 5：知識管理 / 資料整理

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿秘 | 盤點需要整理的資料 | query_supabase, read_file, grep_project |
| 2 | 阿研 | 品質檢查 → 知識庫內容有沒有過期/錯誤 | semantic_search, read_file, web_search |
| 3 | 阿研 | index_file 入庫 → reindex_knowledge | index_file, reindex_knowledge |
| 4 | 阿數 | 統計知識庫覆蓋率 | query_supabase, run_script |

## 情境 6：內容行銷全流程（新增）

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 日誌 | 提供最新素材和洞察 | read_file, write_file |
| 2 | SEO | 提供關鍵字建議和內容方向 | web_search, write_file |
| 3 | 內容 | 撰寫文章/貼文/腳本 | write_file, semantic_search |
| 4 | 設計 | 產出配圖/視覺建議 | write_file, web_browse |
| 5 | 審查 | 品質審查 → pass/fail | read_file, ask_ai |
| 6 | 社群 | 社群平台發布 | curl, write_file |
| 7 | 電子報 | 電子報版本發布 | write_file, ask_ai |
| 8 | 增長 | 追蹤內容效果 → 回饋優化 | query_supabase, ask_ai |

## 情境 7：對外合作 / PR 推廣（新增）

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 外展 | 搜尋合作機會（Podcast/KOL/媒體）| web_search, web_browse |
| 2 | 阿研 | 調研潛在合作對象背景 | web_search, semantic_search |
| 3 | 內容 | 準備 pitch 素材和公司介紹 | write_file |
| 4 | 外展 | 撰寫個性化 pitch email | write_file, ask_ai |
| 5 | 審查 | 審查 pitch 品質和準確性 | read_file, ask_ai |
| 6 | 達爾 | **最終審批** → 確認後才發送 | — |
| 7 | 外展 | 發送 pitch → 追蹤回覆 | curl, write_file |

## 情境 8：主人/達爾直接指令

不管什麼指令，**被點名的 bot 最優先**。沒被點名就按上面情境判斷。
指揮官的指令 > 所有其他任務。

---

## 交付物制度（新增）

**每個任務完成時必須附帶交付物（Deliverable）：**

| 類型 | 交付物格式 |
|------|-----------|
| 研究任務 | 研究報告文件（.md） |
| 開發任務 | 代碼 + 測試結果 |
| 設計任務 | 設計規格文件（含細節） |
| 內容任務 | 完整內容文件 + SEO 標記 |
| 分析任務 | 數據報告 + 圖表 |
| 審查任務 | 審查報告（pass/fail + 具體建議） |

巡查官（patrol）會檢查每個完成的任務是否附帶交付物。

---

## 情境 9：每日自動排程（新增 v2.1）

學習自外部系統的「代理級定時任務」設計，每個代理依時段自動執行專屬任務。

| 時段 | 代理 | 任務 | 觸發方式 |
|------|------|------|---------|
| 07:30 | 系統 | 每日工作早報（系統狀態+昨日摘要+今日待辦）→ Telegram | LaunchAgent |
| 08:00 | patrol + journal | 系統巡查 + 昨日摘要生成 | LaunchAgent |
| 12:00 | ami + ashu | 記憶整理 + 數據統計 | LaunchAgent |
| 16:00 | patrol + growth | 下午巡查 + 增長指標檢查 | LaunchAgent |
| 20:00 | journal + ami | 今日總結 + 知識歸檔 | LaunchAgent |

**腳本位置：**
- 早報：`scripts/daily-morning-report.sh`
- 代理任務：`scripts/agent-scheduled-tasks.sh`

---

## 結構化交付格式（新增 v2.1）

所有任務完成必須使用標準交付格式（三段式）：

```
## 執行摘要（做了什麼）
- 具體動作列表

## 結論與成果（結論）
- PASS / FAIL / PARTIAL + 交付物

## 下一步建議（下一步）
- 後續動作 + 需要接手的代理
```

完整規範見：`shared/DELIVERY-FORMAT.md`

---

## 決策門檻制度（新增 v2.1）

| 操作 | 門檻 |
|------|------|
| 對外發布內容 | 需主人/達爾審批 |
| 系統架構變更 | 需主人確認 |
| 刪除檔案/數據 | 需主人確認 |
| 修改 LaunchAgent | 需主人確認 |
| 讀取/搜索/巡查/inbox | 可自主執行 |
| 修復已知 bug | 可自主執行 |

---

## 協作原則

1. **不搶活** — 看到不是自己專長的，讓給對的人
2. **主動接棒** — 上一個人做完了，輪到你就直接動
3. **做完記錄** — 每次做完事 write_file 更新自己的 MEMORY.md
4. **有問題轉交** — 超出自己能力的，tag 對的人（在回覆裡提到他的名字）
5. **回覆精簡** — 別寫長篇大論，做事 > 說話
6. **交付物必附** — 任務完成必須附帶交付物，否則不算完成
7. **審查必過** — 對外發布的內容必須經過審查官審核
8. **巡查配合** — 巡查官提問必須在 30 分鐘內回應
9. **交付格式** — 任務回報必須使用三段式格式（摘要/結論/下一步）（新增 v2.1）
10. **決策門檻** — 對外操作需審批，內部操作可自主（新增 v2.1）
11. **交接規範** — inbox 任務必須帶完整上下文，見 `shared/HANDOFF-PROTOCOL.md`（新增 v2.2）
12. **事件分級** — 問題按 S1-S4 分級處理，見 `shared/INCIDENT-RESPONSE.md`（新增 v2.2）
13. **知識維護** — 知識檔案有生命週期，定期審查淘汰，見 `shared/KNOWLEDGE-LIFECYCLE.md`（新增 v2.2）

---

## SOP 文件索引（新增 v2.2）

| 文件 | 說明 | 負責人 |
|------|------|--------|
| `shared/DELIVERY-FORMAT.md` | 三段式交付格式規範 | 全體 |
| `shared/COMMUNICATION-STYLES.md` | 16 代理溝通風格定義 | 全體 |
| `shared/delivery-pipeline.md` | 內容發布流水線（6 關卡） | content → review → dar |
| `shared/HANDOFF-PROTOCOL.md` | 任務交接 inbox 格式規範 | 全體 |
| `shared/INCIDENT-RESPONSE.md` | 事件分級與升級流程 | patrol + agong |
| `shared/KNOWLEDGE-LIFECYCLE.md` | 知識檔案生命週期管理 | ami + ayan |
| `shared/AGENT-ONBOARDING.md` | 新代理上線檢查清單 | ace + ami |
| `shared/WEEKLY-RETRO.md` | 週回顧模板 | ami + ace |
| `QA-RULES.md` | 交付物驗收標準 | patrol + review |
