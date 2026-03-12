# 練習 F-5：Anti-Stuck 參數分析與優化

### 1. 檔案分析
讀取 server/src/anti-stuck.ts 以確認當前卡住偵測邏輯。系統通常會檢查任務的 updatedAt 與當前時間的差值。

### 2. 優化提議
若偵測時間過長（例如 30 分鐘），對於輕量腳本任務會反應太慢。建議將偵測閾值（STUCK_THRESHOLD）縮短為 10 分鐘，或根據任務類別動態調整。

### 3. 修復方案
計畫使用 patch_file 調整 STUCK_THRESHOLD 常數，以提升系統自癒速度。