# 練習題 001：系統健康全面檢查

## 目標
確認 TLS 系統所有核心服務正常運行。

## 步驟
1. 檢查 Server (3011) 狀態：`curl http://localhost:3011/health`
2. 檢查 Ollama (11434) 狀態：`curl http://localhost:11434/api/tags`
3. 檢查 n8n 狀態
4. 確認 Supabase 連線正常
5. 確認 Telegram bot 回應

## 成功條件
- 所有服務回應正常
- 無 error log 近 1 小時內
