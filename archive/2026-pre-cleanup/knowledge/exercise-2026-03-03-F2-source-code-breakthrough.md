# 練習 F-2：patch_file 語法源碼突破

### 1. 診斷
之前的 patch_file 失敗是因為我對參數結構的誤解。透過 sed 讀取 action-handlers.ts 第 830 行後的代碼，我將直接看到 handlePatchFile 的判斷邏輯。

### 2. 關鍵發現預測
我需要確認它是檢查 action.old 和 action.new，還是 action.pattern？以及 mode 欄位是否必須為特定字串。

### 3. 行動
讀取源碼 -> 提取正確 schema -> 記錄到知識庫。