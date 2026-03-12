# 練習 F-2：強化 run_script 白名單 (邏輯分析)

### 1. 診斷
sed 被擋，grep 定位失敗。根據 A-3 提示，whitelist 在 787-830 行。我將嘗試定位 handleRunScript 函數進入點，分析其過濾邏輯。

### 2. 行動
使用 grep 定位函數入口，確認其白名單檢查實作，準備用 patch_file 加入更嚴格的參數校驗（例如防止管道符串接）。