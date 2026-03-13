# 🔧 達爾系統故障排查手冊

> 版本：v1.0 | 更新日期：2026-02-14
> 
> 快速定位問題、自助修復、減少等待時間

---

## 📋 快速索引

| 問題類型 | 常見症狀 | 跳轉 |
|---------|---------|------|
| Gateway 連線失敗 | "無法連接到 Gateway" | [#gateway-issues](#1-gateway-連線問題) |
| 模型回應異常 | 回應慢/不回應/錯誤 | [#model-issues](#2-模型回應異常) |
| Cron Job 失敗 | 排程未執行 | [#cron-issues](#3-cron-job-執行失敗) |
| Context 過長 | 提示濃縮/截斷 | [#context-issues](#4-context-過長或異常) |
| 子 Agent 卡住 | 任務無回應 | [#subagent-issues](#5-子-agent-卡住或超時) |
| Skill 載入失敗 | "找不到 skill" | [#skill-issues](#6-skill-載入失敗) |
| Telegram 異常 | 訊息收不到 | [#telegram-issues](#7-telegram-訊息異常) |
| 自動模式異常 | 未自動執行 | [#autopilot-issues](#8-自動模式異常) |
| 檢查點問題 | 回滾失敗 | [#checkpoint-issues](#9-檢查點回滾失敗) |
| Ollama 問題 | 本地模型無回應 | [#ollama-issues](#10-ollama-本地模型異常) |
| 儲存空間不足 | 寫入失敗 | [#storage-issues](#11-儲存空間不足) |
| 腳本權限錯誤 | "Permission denied" | [#permission-issues](#12-腳本權限問題) |

---

## 1. Gateway 連線問題

### 🔴 症狀
- 提示 "無法連接到 Gateway"
- `openclaw` 指令無回應
- API 呼叫 timeout

### 🔍 診斷步驟
```bash
# 1. 檢查 Gateway 是否運行
openclaw gateway status

# 2. 檢查 port 是否被佔用
lsof -i :$(cat ~/.openclaw/gateway-port 2>/dev/null || echo 4445)

# 3. 查看 Gateway 日誌
tail -f ~/.openclaw/logs/gateway.log
```

### ✅ 解決方案

**方案 A：重啟 Gateway**
```bash
openclaw gateway restart
# 或
killall openclaw-gateway 2>/dev/null; sleep 2; openclaw gateway start
```

**方案 B：清理僵死進程**
```bash
# 查找並終止僵死進程
ps aux | grep openclaw | grep -v grep
kill -9 <PID>
```

**方案 C：修復 health watchdog**
```bash
./scripts/gateway-health-watchdog.sh
```

---

## 2. 模型回應異常

### 🔴 症狀
- 模型不回應或回應極慢
- 出現 "Rate limit exceeded"
- 模型切換後無效

### 🔍 診斷步驟
```bash
# 1. 檢查目前模型
openclaw session_status

# 2. 檢查模型路由狀態
cat ~/.openclaw/model-router-state.json 2>/dev/null

# 3. 測試備用模型
./scripts/switch-model.sh kimi/kimi-k2.5
```

### ✅ 解決方案

**方案 A：切換到備用模型**
```bash
# 使用預設 Kimi（免費穩定）
./scripts/switch-model.sh kimi/kimi-k2.5

# 或本地 Ollama
./scripts/switch-model.sh ollama/llama3.2
```

**方案 B：檢查 API Key**
```bash
# 確認環境變數
echo $OPENROUTER_API_KEY
echo $ANTHROPIC_API_KEY

# 重新載入
cd ~/.openclaw && source .env 2>/dev/null
```

**方案 C：重置模型路由**
```bash
rm ~/.openclaw/model-router-state.json
openclaw session_status --model=kimi/kimi-k2.5
```

---

## 3. Cron Job 執行失敗

### 🔴 症狀
- 排程任務未執行
- `openclaw cron list` 顯示異常
- 日誌中無執行記錄

### 🔍 診斷步驟
```bash
# 1. 列出所有 cron jobs
openclaw cron list

# 2. 查看執行歷史
openclaw cron runs <job-id>

# 3. 手動測試執行
openclaw cron run <job-id>
```

### ✅ 解決方案

**方案 A：重新載入 cron**
```bash
openclaw gateway restart
```

**方案 B：修復執行權限**
```bash
# 檢查 cron job 腳本權限
ls -la ~/.openclaw/workspace/scripts/*.sh

# 添加執行權限
chmod +x ~/.openclaw/workspace/scripts/*.sh
```

**方案 C：切換模型（免費優先）**
```bash
# 編輯 cron job，改用免費模型
openclaw cron update <job-id> '{"model": "gemini-25-pro-free"}'
```

---

## 4. Context 過長或異常

### 🔴 症狀
- 提示 "Context 過長，正在濃縮"
- 對話歷史遺失
- 回應品質下降

### 🔍 診斷步驟
```bash
# 1. 檢查目前 context 大小
./scripts/context-audit.sh

# 2. 查看壓縮記錄
grep "compact" ~/.openclaw/logs/*.log | tail -10

# 3. 檢查檢查點
./scripts/checkpoint.sh list | head -5
```

### ✅ 解決方案

**方案 A：手動觸發濃縮**
```bash
./scripts/context-auto-compact.sh
```

**方案 B：建立檢查點並重置**
```bash
# 建立檢查點
./scripts/checkpoint.sh create "context-cleanup" "手動清理"

# 開新會話
openclaw session new
```

---

## 5. 子 Agent 卡住或超時

### 🔴 症狀
- 子任務長時間無回應
- `sessions_list` 顯示卡住任務
- 無法取得任務結果

### 🔍 診斷步驟
```bash
# 1. 列出所有會話
openclaw sessions_list --active-minutes=30

# 2. 查看特定會話歷史
openclaw sessions_history <session-key> --limit=20
```

### ✅ 解決方案

**方案 A：終止卡住任務**
```bash
# 發送終止訊號
openclaw sessions_send <session-key> "__ABORT__"

# 或強制終止
kill $(pgrep -f <session-key>) 2>/dev/null || true
```

**方案 B：降級重試**
```bash
# 用更簡單的提示重新 spawn
openclaw sessions_spawn --task="簡化版任務" --model="kimi/kimi-k2.5"
```

---

## 6. Skill 載入失敗

### 🔴 症狀
- "找不到 skill" 錯誤
- Skill 指令無回應
- 載入時抛出異常

### 🔍 診斷步驟
```bash
# 1. 列出已安裝 skills
ls ~/.openclaw/workspace/skills/

# 2. 檢查 skill 結構
ls ~/.openclaw/workspace/skills/<skill-name>/
```

### ✅ 解決方案

**方案 A：重新安裝 Skill**
```bash
# 從 ClawHub 重新安裝
clawhub install <skill-name>

# 或手動恢復
./scripts/restore-skill.sh <skill-name>
```

**方案 B：暫時禁用問題 Skill**
```bash
# 移動到 quarantine
mkdir -p ~/.openclaw/workspace/quarantine
mv ~/.openclaw/workspace/skills/<skill-name> ~/.openclaw/workspace/quarantine/
```

---

## 7. Telegram 訊息異常

### 🔴 症狀
- 收不到 Telegram 訊息
- 發送訊息失敗
- Bot 無回應

### ✅ 解決方案

**方案 A：重啟 Gateway**
```bash
openclaw gateway restart
```

**方案 B：檢查 Bot Token**
```bash
# 確認 token 有效
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

---

## 8. 自動模式異常

### 🔴 症狀
- Autopilot 未自動執行任務
- 閒置時無動作
- 重複執行相同任務

### 🔍 診斷步驟
```bash
# 1. 檢查自動模式狀態
./scripts/autopilot-lean.sh status

# 2. 查看 watchdog
tail ~/.openclaw/logs/auto-mode-watchdog.log
```

### ✅ 解決方案

**方案 A：手動觸發測試**
```bash
# 強制執行一次
./scripts/autopilot-lean.sh once
```

**方案 B：重置狀態**
```bash
# 清除卡住狀態
rm ~/.openclaw/automation/autopilot.lock 2>/dev/null
./scripts/autopilot-lean.sh status
```

**方案 C：檢查預算限制**
```bash
./scripts/daily-budget-tracker.sh check
```

---

## 9. 檢查點回滾失敗

### 🔴 症狀
- `checkpoint.sh rollback` 失敗
- 回滾後系統異常
- 找不到檢查點

### ✅ 解決方案

**方案 A：指定檢查點回滾**
```bash
# 列出檢查點
./scripts/checkpoint.sh list

# 指定 ID 回滾
./scripts/checkpoint.sh rollback <checkpoint-id>
```

**方案 B：手動恢復**
```bash
# 從檢查點手動複製
cp -r ~/.openclaw/checkpoints/<checkpoint-id>/files/* ~/.openclaw/workspace/
```

---

## 10. Ollama 本地模型異常

### 🔴 症狀
- Ollama 模型無回應
- "Connection refused" 錯誤
- 回應品質極差

### ✅ 解決方案

**方案 A：重啟 Ollama**
```bash
# macOS
brew services restart ollama

# 或手動重啟
killall ollama 2>/dev/null; sleep 2; ollama serve &
```

**方案 B：重新拉取模型**
```bash
ollama pull qwen2.5:14b
```

---

## 11. 儲存空間不足

### 🔴 症狀
- "No space left on device"
- 寫入檔案失敗

### ✅ 解決方案

**方案 A：清理日誌**
```bash
# 清理舊日誌
find ~/.openclaw/logs -name "*.log" -mtime +7 -delete
```

**方案 B：清理舊檢查點**
```bash
# 只保留最近 10 個檢查點
ls -t ~/.openclaw/checkpoints/ | tail -n +11 | xargs rm -rf
```

---

## 12. 腳本權限問題

### 🔴 症狀
- "Permission denied"
- 腳本無法執行

### ✅ 解決方案

**批量修復權限**
```bash
chmod +x ~/.openclaw/workspace/scripts/*.sh
```

---

## 🆘 仍無法解決？

1. **查看詳細日誌**：`tail -f ~/.openclaw/logs/*.log`
2. **建立檢查點**：`./scripts/checkpoint.sh create "pre-debug" "除錯前"`
3. **聯繫達爾**：描述問題 + 貼上錯誤訊息

---

*此文件由達爾自動維護*
