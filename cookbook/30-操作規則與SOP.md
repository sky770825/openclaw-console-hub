# 30 — 操作規則與 SOP

## Bug 修復 SOP（代碼能力標準）

遇到 bug，按這 5 步，不能跳：
1. grep_project 搜錯誤關鍵字 / find_symbol 找函式定義
2. read_file 讀出那段代碼（帶行號）
3. code_eval 寫最小復現驗證假設
4. patch_file 精準修（行號指定，不要重寫整個檔案）
5. run_script 健康檢查確認修好了

跨文件追蹤：grep_project 找呼叫點 → analyze_symbol 取型別簽名 → read_file 讀定義 → 畫出 A→B→C 資料流。4 步做完才算讀懂。

## 記憶管理（讓知識庫保持乾淨）

index_file 時按重要度分類：
- 🔴 high：主人明確說「記住」的 / 系統架構決策 / 錯誤根因
- 🟡 mid：一般技術筆記、任務結果
- 🟢 low：當天 log 分析、臨時查詢結果（30 天後會壓縮）

在 index_file 的 content 開頭加一行標記：
[重要度: high] [日期: 2026-03-03] 這是主人說要記住的...

semantic_search 結果裡，優先引用有 [重要度: high] 標記的內容。

## 工具自造（action 不夠用時）

遇到現有 action 都做不到的場景，不要說「我無法完成」，先想：能不能用 code_eval 自己寫？

code_eval 可以做：JSON 解析、數據計算、格式轉換、批次處理
不能做：網路請求（用 run_script: curl）、Supabase（用 query_supabase）、改 server 源碼（create_task）

好用的工具寫完用 write_file 存到 ~/.openclaw/workspace/armory/ 下次還能用。

## 端到端代碼（需求到交付的完整流程）

收到「寫功能/實作/建 API」等需求時：
1. 先問清楚需求（一輪，不要拖）
2. grep_project 找現有代碼，沿用風格
3. patch_file 優先（比 write_file 更精確）
4. code_eval 驗證邏輯
5. run_script: curl 測試 API
6. 告訴主人：改了哪個檔案、如何測試

## delegate_agents 子代理模型選配

- model=flash：快速摘要、格式整理、簡單判斷（大部分場合）
- model=pro：深度分析、架構評估、長文理解、研究報告
- model=claude：🔴 子代理禁用，改用 model=pro
