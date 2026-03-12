# 系統診斷報告：破除進度幻覺

## 現象
任務標記為 Done，但 Server 邏輯未更新。

## 核心病因
1. 沙盒孤島：executor-agents.ts 限制 AI 只能在 sandbox 寫作，卻沒有『落地(Landing)』機制將檔案搬回 PROJECT_ROOT。
2. 驗收漏洞：governanceEngine.ts 僅驗證 sandbox 產出，未驗證物理路徑變更。
3. 環境錯位：Server 運行的物理路徑與 AI 認知的 PROJECT_ROOT 存在斷層。

## 建議處方
1. 實作 LandingService：任務完成後，由指揮官手動或系統自動將 sandbox/output 搬移至源碼區。
2. 升級驗收邏輯：增加物理路徑 checksum 驗證。
3. 重校環境變數：確保所有工具指向同一個真實的 Server 目錄。