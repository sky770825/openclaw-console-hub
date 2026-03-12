# 題庫 H3 — 智慧修復引擎實戰（Lv.8 補強題）

> 新增原因：H1 delegate_agents 得分 50/100，H2 web_browse 得分 75/100，兩題均未達升級線 80 分。
> 本題測試小蔡對 auto-executor AI Repair 機制的理解與應用能力。

## 背景知識

auto-executor 有一個智慧修復引擎（`executor-agents.ts`），當腳本執行失敗時：
1. 把錯誤輸出（stderr + stdout tail）當 `errorFeedback` 傳入
2. 用 Gemini Flash 分析錯誤，生成修復建議（150 字以內）
3. 把修復建議注入下一輪 prompt（`AI REPAIR ANALYSIS: ...`）
4. 最多重試 1 次（`MAX_RETRIES = 1`）

## 任務目標

透過建立一個「故意失敗」的任務，然後觀察 AI Repair 是否生效，驗證修復引擎的運作。

### 步驟

1. **建立一個故意失敗的任務**
   用 `create_task` 建立一個會失敗的任務：
   ```
   name: "【H3】智慧修復引擎測試 — 故意失敗任務"
   description: "執行一個故意失敗的腳本，用來觸發 AI Repair 機制。腳本內容：#!/bin/bash\necho '開始執行'\nnon_existent_command_12345\necho '不會執行到這行'"
   priority: 1
   ```

2. **等待任務執行完畢**
   用 `query_supabase` 查詢任務狀態：
   ```sql
   SELECT id, title, status, thought FROM openclaw_tasks
   WHERE title LIKE '%H3%智慧修復%'
   ORDER BY created_at DESC LIMIT 1
   ```

3. **觀察是否有 retry 記錄**
   查 `openclaw_runs` 表：
   ```sql
   SELECT task_id, attempt, exit_code, output, created_at FROM openclaw_runs
   WHERE task_id = '<從上一步取得的任務ID>'
   ORDER BY attempt ASC
   ```

4. **分析 AI Repair 是否生效**
   從 `openclaw_runs` 的 `output` 欄位中找：
   - attempt=0 的 run：exit_code 應為非零（失敗）
   - attempt=1 的 run（如果存在）：查看 AI 生成的腳本是否包含「修復嘗試」
   - 比較兩次腳本的差異，判斷 Gemini 的修復建議是否被採用

5. **寫分析報告**
   `write_file` 寫到 `workspace/notes/H3-repair-test-result.md`，包含：
   - 任務 ID
   - attempt 0 的錯誤原因
   - AI Repair 分析文字（如果有）
   - attempt 1 的腳本（如果有）
   - 修復是否成功（成功 = exit_code=0）
   - 結論：AI Repair 機制是否正常運作

6. **index_file 入庫**
   ```
   index_file: workspace/notes/H3-repair-test-result.md, importance=mid, category=learning
   ```

## 評分標準

- create_task 正確建立並觸發執行：20 分
- 正確查詢到 attempt=0 的失敗記錄：20 分
- 找到 AI Repair 分析文字或 attempt=1 的修復腳本：30 分
- 寫出有意義的分析報告（說清楚 AI 做了什麼、修復是否成功）：20 分
- write_file + index_file 完成：10 分

滿分 100，達到 80 分升 Lv.8

## 進階加分（老蔡額外評）

如果小蔡能做到以下任一項，老蔡可以額外給 +1 分（超過 100 分不計入，但記入評語）：

- 分析 `executor-agents.ts:1155-1189` 的完整 AI Repair 程式碼，說明它的三個階段：
  1. 生成原始腳本（callGeminiForScript 無 errorFeedback）
  2. 執行失敗 → 收集 stderr + stdout tail
  3. 用 Gemini Flash 分析錯誤 → 生成 repairHint → 注入新 prompt → 重試
- 找到並說明 `MAX_RETRIES = 1` 的設計原因（只重試一次，避免卡管線）
- 說明保護區回滾機制（`git checkout -- server/src/` 防止 AI 腳本改到核心源碼）

## 預期結果

正常情況下：
- attempt=0：`non_existent_command_12345` 導致 `command not found`，exit_code=127
- Gemini Flash 分析：「失敗原因：non_existent_command_12345 命令不存在。修復方式：移除或替換為有效命令。」
- attempt=1：Gemini 重新生成腳本，移除 non_existent_command，任務可能 exit_code=0 成功

如果沒有 attempt=1 記錄，說明 AI Repair 未觸發，需要檢查 GOOGLE_API_KEY 是否設定。

## 注意事項

- `create_task` 建的任務進 draft，需要老蔡批准才會執行
- 如果老蔡不在線，可以用 `query_supabase UPDATE` 把任務狀態從 draft 改為 ready（需老蔡授權）
- `openclaw_runs` 表如果沒有對應 task_id 的記錄，說明任務還沒被 auto-executor 撿起來執行，需要等待

---

*本題由評估員 Claude Code 於 2026-03-03 新增，針對 H1 缺陷補充。*
