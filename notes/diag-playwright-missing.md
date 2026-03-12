# 診斷報告：Playwright 依賴缺失

## 異常現象
- 任務 t1772464056959 失敗，exitCode: -2。
- 任務 t1772461021162 (BrowserService) 準備部署但原始碼依賴 playwright。

## 發現
讀取 server/package.json 發現 dependencies 與 devDependencies 均無 playwright。

## 建議
執行 npm install playwright 並運行 npx playwright install --with-deps。