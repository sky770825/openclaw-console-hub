# 星群協作劇本 — PLAYBOOK

> 所有 crew bot 共用。不同情境下，誰先動、做什麼、交棒給誰。
> bot 讀到自己的 MEMORY.md 後，會參考這份劇本決定出手時機。

---

## 情境 1：製作網站 / 新功能開發

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿策 | 拆解需求 → create_task 建子任務 → 排優先 → 分配給誰 | create_task, query_supabase |
| 2 | 阿研 | 調研技術方案 → semantic_search 查知識庫有沒有類似案例 | semantic_search, web_search |
| 3 | 阿商 | 評估商業價值 → 這功能值不值得做、目標用戶是誰 | ask_ai, web_search |
| 4 | 阿工 | 動手寫代碼 → 架構設計 → 實作 → patch_file | grep_project, patch_file, run_script |
| 5 | 阿數 | 建立 metrics → 上線後追蹤數據、成功率 | query_supabase, run_script |
| 6 | 阿秘 | 記錄過程 → 整理文件 → 更新知識庫 | write_file, index_file |

## 情境 2：系統故障 / 緊急排錯

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿研 | 掃 log → 初篩錯誤類型和嚴重程度 | grep_project, semantic_search, read_file |
| 2 | 阿數 | 查 metrics → 確認影響範圍（錯誤率、受影響 API） | query_supabase, run_script |
| 3 | 阿工 | 接手排查 → 追根源 → patch_file 修復 | grep_project, patch_file, run_script, analyze_code |
| 4 | 阿秘 | 記錄事件 → 寫事後報告 | write_file, index_file |
| 5 | 阿策 | 評估是否需要更大範圍修改 → 排後續任務 | create_task, ask_ai |

## 情境 3：商業分析 / 990 專案

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
| 1 | 阿商 | 主導 → 市場調研、競品分析、商業模式 | web_search, ask_ai, proxy_fetch |
| 2 | 阿研 | 爬網蒐集數據 → 支援阿商的研究 | web_search, proxy_fetch, semantic_search |
| 3 | 阿數 | 數字試算 → 營收預估、成本分析 | query_supabase, run_script, ask_ai |
| 4 | 阿策 | 把商業結論轉成執行計畫 → create_task | create_task, query_supabase |
| 5 | 阿秘 | 整理報告 → 歸檔 | write_file, index_file |

## 情境 4：日常維運 / 巡邏

| 順序 | 誰 | 做什麼 | 常用 action |
|------|-----|--------|------------|
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

## 情境 6：主人/達爾直接指令

不管什麼指令，**被點名的 bot 最優先**。沒被點名就按上面情境判斷。
指揮官的指令 > 所有其他任務。

| 角色 | 常備 action（隨時可能被點名用到） |
|------|--------------------------------|
| 阿策 | create_task, query_supabase, ask_ai |
| 阿研 | semantic_search, web_search, grep_project, proxy_fetch |
| 阿商 | web_search, ask_ai, proxy_fetch |
| 阿工 | grep_project, patch_file, run_script, analyze_code |
| 阿數 | query_supabase, run_script, ask_ai |
| 阿秘 | write_file, read_file, index_file, reindex_knowledge |

---

## 協作原則

1. **不搶活** — 看到不是自己專長的，讓給對的人
2. **主動接棒** — 上一個人做完了，輪到你就直接動
3. **做完記錄** — 每次做完事 write_file 更新自己的 MEMORY.md
4. **有問題轉交** — 超出自己能力的，tag 對的人（在回覆裡提到他的名字）
5. **回覆精簡** — 別寫長篇大論，做事 > 說話
