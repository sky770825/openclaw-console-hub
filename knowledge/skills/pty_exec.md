# OpenClaw_pty_exec

## 能力描述
在虛擬終端中執行互動式指令，支援自動回答提示 (stdin)。

## 輸入參數
- command: 指令 (必填)
- answers: 自動回答的字串陣列
- timeout: 超時限制 (秒)

## 執行規範
- 白名單：僅限 npm, git, brew 等安全工具。
- 互動處理：按順序將 answers 注入 stdout 請求。

## 輸出預期
終端輸出的完整 Log。