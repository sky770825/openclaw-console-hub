# OpenClaw 植眼手術指南

## 1. 環境安裝 (Host 端)
指令：
npm install --prefix server playwright
npm exec --prefix server playwright install chromium

## 2. 檔案部署
- 將 notes/BrowserService.ts.txt 內容存為 server/src/services/BrowserService.ts。
- 修正 server/src/executor-agents.ts 中的 PROJECT_ROOT。

## 3. 驗證
重啟 Server 後執行 curl http://localhost:3011/api/health。