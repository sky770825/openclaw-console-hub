# 錯誤分析：2026-03-08 心跳異常原因

## 背景
在 2026-03-08 的多個心跳檢查中，系統回報了多次「心跳異常」。經過回溯日誌，發現主要原因集中在文件搜索工具的使用問題。

## 錯誤類型與分析

### 1. grep_project / run_script (grep/rg) 選項錯誤：--no-git 不被識別
•   *現象*：
    •   grep_project 失敗: rg: unrecognized flag --no-git
    •   run_script: stderr: grep: unrecognized option --no-git
•   *原因分析*：這表示在調用 grep 或 rg 命令時，使用了不被這些工具識別的 --no-git 選項。通常 --no-git 用於排除 .git 目錄或避免 Git 相關的行為。可能是 grep_project 工具內部自動傳遞了這個參數，但底層的 rg 或 grep 版本不支援，或者在非 Git repo 環境下使用時不適用。需要檢查 grep_project 的實現細節或調整使用策略。
•   *對策*：
    •   在調用 grep_project 時，避免使用可能導致 --no-git 被傳遞的上下文或參數。
    •   如果需要排除 .git 目錄，應查閱 grep 或 rg 的官方文檔，使用其支持的排除方式（如 rg -g '!/.git' 或 grep --exclude-dir=.git）。

### 2. read_file 檔案不存在
•   *現象*：檔案不存在: /Users/sky770825/.bashrc
•   *原因分析*：在嘗試讀取 /Users/sky770825/.bashrc 或其他非 workspace 內檔案時，該檔案路徑不存在。這提醒我在讀取不確定是否存在的文件時，應先進行路徑確認。
•   *對策*：
    •   在執行 read_file 前，特別是針對非標準工作區路徑，應先使用 list_dir 或 run_script ls 確認檔案或目錄是否存在。
    •   優先處理 /Users/sky770825/.openclaw/workspace 內的文件，因為這些路徑是明確受我管轄的。

### 3. grep_project 命令未找到
•   *現象*：run_script: stderr: sh: line 0: type: grep_project: not found
•   *原因分析*：這可能是由於 grep_project 是一個自定義工具而非 shell 內建命令，或者其可執行文件不在 $PATH 中，導致 sh 無法找到它。在某些 run_script 的執行環境下，可能無法直接調用 grep_project。這也可能與 semantic_search 中搜尋到的資訊有關，如果 semantic_search 建議使用 grep_project，但實際執行環境中無法直接調用，就會出錯。
•   *對策*：
    •   確認 grep_project 的實際執行方式，是否需要通過特定的 API 或 wrapper 來調用。
    •   如果 grep_project 是一個外部腳本，應確保其有執行權限，且路徑被正確配置。

## 總結
這些錯誤表明我在調用系統工具時，需要更嚴謹地考慮其參數支持、文件路徑存在性以及執行環境的限制。未來應加強前置檢查和錯誤處理。