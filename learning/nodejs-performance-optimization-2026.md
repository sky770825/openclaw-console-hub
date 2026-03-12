# Node.js 效能優化與 Clinic.js 實戰筆記

## 核心概念
Clinic.js 是一個開源工具集，專門用來診斷 Node.js 應用程式的效能瓶頸。它包含三個主要工具：Doctor、Bubbleprof 和 Flame，分別用於診斷 I/O 問題、異步操作延遲和 CPU 熱點。

## 實戰流程
1.  安裝: npm install -g clinic
2.  執行診斷: clinic doctor -- node server.js
3.  分析報告: Clinic.js 會自動生成一個 HTML 報告，視覺化呈現 CPU 使用率、記憶體、事件循環延遲等關鍵指標。

## 重點摘要
- Doctor: 監控 I/O 和事件循環，找出延遲的根本原因。
- Bubbleprof: 追蹤 async_hooks，將異步操作視覺化，找出哪裡被阻塞了。
- Flame: 產生火焰圖，快速定位消耗 CPU 最多的函數。

## 結論
定期使用 Clinic.js 進行效能健檢，是防止 Node.js 應用變慢的最佳實踐。