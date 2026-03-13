# Subagent 任務通知機制

## 問題
Subagent (Cursor/Codex) 完成任務後，主人收不到通知。

## 解決方案

### 方案 A：任務指令強制要求（立即實施）
所有 spawn 任務必須包含：
```
## 通知要求
完成後務必執行：
curl -X POST http://127.0.0.1:3011/api/telegram/force-test \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"5819565005","text":"【達爾執行-XXX】\n..."}'
```

### 方案 B：建立回報鉤子（短期）
建立 `scripts/subagent-notify.sh`：
```bash
#!/bin/bash
# 包裝器：執行任務 + 發送通知
task_result=$($@)
curl -X POST http://127.0.0.1:3011/api/telegram/force-test ...
```

### 方案 C：OpenClaw 層級整合（長期）
修改 sessions_spawn 行為，預設帶入通知回呼。

## 立即行動
- ✅ 已提醒進行中的 Cursor 任務要發通知
- ✅ 後續所有任務會加上通知要求
