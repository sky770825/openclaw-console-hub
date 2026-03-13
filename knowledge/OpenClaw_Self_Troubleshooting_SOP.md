# OpenClaw 自主排解 拒絕卡關 SOP (V1.0)

## 核心準則：自主排解，拒絕卡關
當遇到執行阻礙或找不到文件時，阿研應依循此 SOP 進行診斷與突破。

### 第一階段：環境檢索 (Environment Audit)
- 檢查當前工作目錄與目標目錄是否存在。
- 確認工具鏈 (bash, curl, node, python3, jq) 是否可用。
- 檢查權限：確認 `/Users/sky770825/.openclaw/workspace/` 下的子目錄為可寫。

### 第二階段：邏輯溯源 (Logic Tracing)
- 讀取 `$SRC_DIR` (唯讀區) 以理解系統架構。
- 使用 `grep` 檢索錯誤訊息或關鍵字。
- 檢查 `scripts/` 目錄中是否有現成的工具。

### 第三階段：快速原型與修復 (Rapid Prototyping)
- 在 `sandbox/` 進行實驗性執行。
- 撰寫小型測試腳本驗證假設。

### 第四階段：回報與固化 (Reporting & Persistence)
- 若成功解決，將解決方案記錄於 `knowledge/` 或轉化為 `scripts/` 中的自動化工具。
- 若仍卡關超過 15 分鐘，生成 `reports/` 診斷報告並提交給主人。

## 禁止行為 (Restriction Zone)
- 嚴禁觸碰 .env, *.json 等核心密鑰設定。
- 嚴禁修改 server/src 與前端原始碼。
- 嚴禁未經授權的 Git Push。
