# OpenClaw_run_script

## 能力描述
執行輕量級的 Bash 指令或腳本。用於系統診斷、環境檢查、小工具調用等場景。

## 輸入參數
- command: 欲執行的 Bash 指令 (必填)

## 執行規範
- 白名單：僅限安全指令（如 curl, grep, tail, ls, python3 -c）。
- 超時管理：預設 30 秒超時，超時會自動中止並回報。
- 權限保護：禁止執行 sudo, rm -rf / 等毀滅性指令。

## 輸出預期
指令的 stdout 或 stderr 內容。