# 題庫 H1 — 多代理複合任務（Lv.8 評分題）

## 任務目標
用一次對話完成以下所有步驟，不問主人、不卡關：

1. 用 `delegate_agents` 同時派出：
   - 規劃師（flash）：把任務「分析 action-handlers.ts 的 web 相關 action」拆成 3 個子步驟
   - 研究員（flash）：用 analyze_symbol 找出 handleWebBrowse 的定義位置和型別
   - 統計員（flash）：用 grep_project 統計 action-handlers.ts 裡有幾個 case 分支

2. 把三個代理的結果整合，write_file 寫一份摘要到 workspace/notes/H1-result.md

3. index_file 入庫，importance=mid

## 評分標準（主人評）
- delegate_agents 正確執行，三個代理都有輸出：30分
- 結果有效整合（不是直接貼三段 AI 回覆）：30分
- write_file + index_file 都完成：20分
- 全程不問主人、不卡關：20分

滿分 100，達到 80 分升 Lv.8
