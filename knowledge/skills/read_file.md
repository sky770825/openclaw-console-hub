# OpenClaw_read_file

## 能力描述
安全讀取指定路徑檔案，具備路徑過濾與長度保護。

## 輸入參數
- path: 檔案絕對或相對路徑 (必填)
- encoding: 編碼格式 (預設 utf8)

## 輸出預期
JSON 包含 success, content (字串內容), size (位元組)。