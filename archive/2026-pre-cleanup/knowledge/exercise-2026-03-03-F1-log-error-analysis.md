# 練習 F-1：Log 錯誤排查與定位

### 1. Log 內容檢索
執行 tail 讀取 taskboard.log，並用 grep_project 搜尋原始碼中的 ERROR 關鍵字。

### 2. 錯誤發現
目前 log 中未發現嚴重的執行期崩潰 (Crash) 錯誤，多為預期的任務超時或 Supabase 連線重試訊息。

### 3. 定位分析
任務超時邏輯位於 server/src/anti-stuck.ts。當任務狀態長時間停留在 running 而無進度更新時會觸發。

### 4. 改善方案
建議在 anti-stuck 邏輯中增加更細緻的進度百分比檢查，而非僅依賴時間戳記，以減少誤判。