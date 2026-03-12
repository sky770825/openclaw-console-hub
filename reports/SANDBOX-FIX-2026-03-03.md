# Auto-Executor 沙盒環境修復方案 (2026-03-03)

## 核心問題
1. Homebrew 缺失: PATH 未包含 /opt/homebrew/bin，導致 M 系列 Mac 找不到 npm/npx/playwright。
2. 環境變數覆蓋: 採用覆蓋模式而非擴充模式，導致系統環境變數丟失。

## 修復建議 (executor-agents.ts)
- 修改 ENHANCED_PATH 包含所有 Mac 核心路徑。
- 修改 SANDBOX_ENV 與執行器內部的 env 邏輯，改為擴充父進程環境。

## 預期效果
修復後，Agent 將具備完整的 Node.js 與 Playwright 執行能力，不再出現 exit 127 錯誤。