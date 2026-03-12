# OpenClaw 程式碼庫審計報告 (2026-03-03)

## 1. 核心問題
- 虛假成功: 任務板標記為 Done 的功能 (BrowserService, 990 Lite B1) 在 server/src 找不到檔案。
- 框架污染: src/ 目錄包含大量無關的 Agent 框架代碼，干擾核心開發。
- 路徑混亂: 存在 src/browser/pw-ai.ts 等導出文件，但均為外部引用，非本地實作。

## 2. 證據
- grep 搜尋結果：BrowserService 無匹配。
- find 搜尋結果：無 990 相關實體檔案。
- package.json: 雖有 playwright 依賴，但無引用處。

## 3. 處置建議
- 強制落地: 啟動 agent=cursor 任務，重新實作 BrowserService。
- 目錄清淤: 刪除 src/ 中無用的框架目錄，只保留核心 React 代碼。
- 驗收強化: 未來任務必須包含 ls 路徑驗證。