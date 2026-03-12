# Scripts Audit Report - Stage 1: SCAN Phase

**任務 ID**: task_1771007468_scripts-audit-scan  
**Run ID**: run_scan001  
**掃描時間**: 2026-02-14 02:36:08  
**掃描目錄**: scripts/, src/

## 掃描摘要

| 指標 | 數值 |
|------|------|
| 掃描腳本總數 | 2683 |
| 發現問題總數 | 2950 |
| 高風險問題 | 185 |
| 中風險問題 | 2726 |
| 低風險問題 | 0 |

## Top 10 高風險問題

### 1. 🚨 src/security/audit.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 密碼硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 2. 🚨 src/commands/auth-choice.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 API Key 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 3. 🚨 src/gateway/server.auth.e2e.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 4. 🚨 scripts/ollama-task-monitor.sh
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 5. 🚨 src/agents/tools/telegram-actions.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 6. 🚨 src/agents/model-auth.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 API Key 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 7. 🚨 src/gateway/call.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 密碼硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 8. 🚨 src/commands/status.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 9. 🚨 src/gateway/server.models-voicewake-misc.e2e.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

### 10. 🚨 src/commands/doctor.warns-state-directory-is-missing.test.ts
- **問題類型**: hardcoded_secrets
- **嚴重程度**: CRITICAL
- **描述**: 發現 Secret/Token 硬編碼
- **影響**: 安全性風險，敏感資訊洩漏

## 詳細腳本分析

### 問題統計

| 問題類型 | 數量 | 樣例檔案 |
|----------|------|----------|
| low_doc_ratio | 2340 | scripts/archived/setup-xiaocai-ideas.sh |
| medium_complexity | 326 | scripts/taskboard-dashboard-launch.sh |
| high_complexity | 162 | scripts/ollama-task-monitor.sh |
| external_deps | 60 | scripts/task-board-api.sh |
| hardcoded_secrets | 39 | scripts/context-watchdog.sh |
| no_set_e | 23 | scripts/refill-task-pool.sh |

### 行數 > 500 的腳本 (高複雜度)

| 腳本路徑 | 行數 | 問題數 |
|----------|------|--------|
| src/telegram/bot.test.ts | 3068 | 2 |
| src/memory/manager.ts | 2412 | 2 |
| src/agents/bash-tools.exec.ts | 1631 | 2 |
| src/tts/tts.ts | 1580 | 2 |
| src/infra/exec-approvals.ts | 1542 | 2 |
| src/security/audit.test.ts | 1512 | 3 |
| src/line/flex-templates.ts | 1512 | 1 |
| src/cli/update-cli.ts | 1364 | 2 |
| src/node-host/runner.ts | 1309 | 2 |
| src/security/audit-extra.ts | 1306 | 2 |
| src/media-understanding/runner.ts | 1305 | 2 |
| src/gateway/gateway-models.profiles.live.test.ts | 1248 | 2 |
| src/infra/outbound/message-action-runner.ts | 1148 | 2 |
| src/config/schema.ts | 1115 | 2 |
| src/infra/session-cost-usage.ts | 1093 | 2 |
| src/infra/heartbeat-runner.returns-default-unset.test.ts | 1079 | 2 |
| src/infra/heartbeat-runner.ts | 1031 | 2 |
| src/gateway/server/ws-connection/message-handler.ts | 1009 | 2 |
| src/security/audit.ts | 993 | 2 |
| src/infra/outbound/outbound-session.ts | 987 | 2 |

### 缺少 set -e 的 Shell 腳本

| 腳本路徑 | 行數 |
|----------|------|
| scripts/refill-task-pool.sh | 72 |
| scripts/recovery/recovery-desktop.sh | 300 |
| scripts/recovery/telegram-bridge.sh | 186 |
| scripts/recovery/dashboard-panel.sh | 117 |
| scripts/recovery/health-check.sh | 97 |
| scripts/recovery/recovery.sh | 224 |
| scripts/recovery/create-recovery-ui.sh | 300 |
| scripts/recovery/restore.command | 233 |
| scripts/recovery/🛠️ 系統恢復.app/Contents/MacOS/啟動 | 13 |
| scripts/archived/autopilot-cycle.sh | 69 |
| scripts/archived/use-gemini-pro.sh | 5 |
| scripts/archived/send-to-cursor.sh | 163 |
| scripts/archived/agent-monitor-ollama.sh | 236 |
| scripts/archived/get-cursor-chat-coordinates.sh | 34 |
| scripts/archived/ask-cursor-cli.sh | 33 |
| scripts/archived/context-monitor.sh | 22 |
| scripts/archived/batch-add-xiaocai-ideas.sh | 63 |
| scripts/archived/setup-xiaocai-ideas.sh | 69 |
| scripts/archived/dashboard-monitor.sh | 53 |
| scripts/archived/use-gemini-flash.sh | 5 |

## 重複邏輯檢測

未發現明顯的重複邏輯

## 建議行動

1. **優先處理高風險問題**: 為缺少 set -e 的 shell 腳本添加錯誤處理
2. **重構複雜腳本**: 將行數 > 500 的腳本拆分為更小、可測試的模組
3. **提升文檔覆蓋**: 為文檔比 < 5% 的腳本添加註釋和說明
4. **統一重複邏輯**: 將相似腳本提取為共享函式庫
5. **移除硬編碼密鑰**: 使用環境變數或密鑰管理服務

---
*此報告由 Scripts Audit Scanner 自動生成*