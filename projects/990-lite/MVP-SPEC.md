# 990 Lite - MVP 規格書 (v1.0)

## 1. 產品定位
針對個人開發者與小團隊的「AI 代碼安全守護者」。

## 2. 核心功能 (The Shield)
- LeakScan: 偵測檔案中的 API Key、Secret、Token。
- CommandGuard: 識別危險指令 (sudo, rm, chmod) 與可疑腳本。
- PathWatch: 檢查是否有越權存取敏感目錄的行為。

## 3. 交付物
- scan-990.sh: 一鍵執行腳本。
- 990-report.md: 自動產出的診斷報告。
