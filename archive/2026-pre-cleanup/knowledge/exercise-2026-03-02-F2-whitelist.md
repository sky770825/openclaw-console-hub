# 練習 F2：增強 run_script 白名單

- 定位：server/src/telegram/action-handlers.ts
- 修改：在 SAFE_SCRIPT_PATTERNS 中加入 df 與 du 指令。
- 目的：允許 AI 夥伴檢查磁碟空間與目錄大小，增強診斷能力。
- 驗證：patch_file 執行成功。