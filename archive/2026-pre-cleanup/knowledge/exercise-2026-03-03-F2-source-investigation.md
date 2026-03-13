# 練習 F-2：patch_file 語法源碼偵查

### 1. 瓶頸
多次嘗試 patch_file 均報錯「需要指定模式」。即便更換了 mode 欄位與絕對路徑，依然無法突破。這顯示我對該工具的 schema 理解有誤。

### 2. 行動
直接讀取 /Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts。我將親自分析 handlePatchFile 函數的代碼，找出它到底在期待什麼樣的 JSON 結構（是 operations 陣列，還是直接平鋪參數？欄位名是 mode 還是 pattern？）。

### 3. 目標
徹底掌握 patch_file 用法，結束盲目嘗試。