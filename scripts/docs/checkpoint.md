# checkpoint.sh - 檢查點系統文檔

## 概述

`checkpoint.sh` 是 OpenClaw 的核心檢查點系統，用於在執行關鍵步驟前建立檢查點，失敗時可回滾。它還集成了熔斷器機制來防止連續失敗。

## 功能特性

- **檢查點建立**：保存當前系統狀態
- **故障回滾**：發生錯誤時恢復到上一個檢查點
- **熔斷器**：防止連續失敗導致系統雪崩
- **緊急停止**：全局應急停止機制
- **狀態管理**：追蹤系統和自動化狀態

## 快速開始

```bash
# 查看檢查點幫助
./checkpoint.sh --help

# 建立一個檢查點
./checkpoint.sh create "checkpoint_name"

# 列出所有檢查點
./checkpoint.sh list

# 回滾到指定檢查點
./checkpoint.sh rollback "checkpoint_name"

# 刪除檢查點
./checkpoint.sh delete "checkpoint_name"
```

## 詳細用法

### 檢查點操作

#### 1. 建立檢查點

```bash
./checkpoint.sh create "daily-backup-start"
```

將當前系統狀態保存為檢查點。包括：
- 文件系統狀態
- 自動化狀態
- Context 狀態
- 任務狀態

#### 2. 列出檢查點

```bash
./checkpoint.sh list
```

輸出：
```
可用的檢查點：
  daily-backup-start (2026-02-14 10:30:45) - 17MB
  weekly-cleanup (2026-02-13 15:20:30) - 45MB
  emergency-restore (2026-02-12 09:15:00) - 92MB
```

#### 3. 回滾到檢查點

```bash
./checkpoint.sh rollback "daily-backup-start"
```

恢復到指定檢查點的狀態。需要確認。

#### 4. 刪除檢查點

```bash
./checkpoint.sh delete "old-checkpoint"
```

釋放磁盤空間。

### 熔斷器操作

#### 查看狀態

```bash
./checkpoint.sh circuit-status
```

輸出自動化腳本的熔斷器狀態和錯誤計數。

#### 重置錯誤計數

```bash
./checkpoint.sh circuit-reset "script_name"
```

當腳本由於連續錯誤被熔斷時，使用此命令重置。

#### 全局緊急停止

```bash
./checkpoint.sh emergency-stop
```

停止所有自動化腳本執行。

#### 恢復執行

```bash
./checkpoint.sh emergency-resume
```

解除全局停止，允許自動化繼續執行。

## 環境變數

| 變數名 | 默認值 | 說明 |
|--------|--------|------|
| `OPENCLAW_HOME` | `$HOME/.openclaw` | OpenClaw 主目錄 |
| `CHECKPOINT_DIR` | `$HOME/Desktop/小蔡/檢查點` | 檢查點存儲位置 |
| `DEBUG` | `false` | 啟用除錯模式 |

## 故障排查

### 問題：無法建立檢查點

**症狀**：執行 `./checkpoint.sh create` 失敗

**解決方案**：
```bash
# 檢查目錄權限
ls -la $HOME/Desktop/小蔡/
chmod 755 $HOME/Desktop/小蔡/

# 檢查磁盤空間
df -h $HOME
```

### 問題：回滾失敗

**症狀**：執行 `./checkpoint.sh rollback` 返回錯誤

**解決方案**：
```bash
# 驗證檢查點存在
./checkpoint.sh list

# 檢查檢查點文件完整性
ls -lh $HOME/Desktop/小蔡/檢查點/

# 查看日誌
tail -50 ~/.openclaw/automation/logs/checkpoint.log
```

### 問題：熔斷器阻止執行

**症狀**：腳本被熔斷無法執行

**解決方案**：
```bash
# 查看當前狀態
./checkpoint.sh circuit-status

# 重置特定腳本
./checkpoint.sh circuit-reset "problematic-script"

# 如果是全局停止
./checkpoint.sh emergency-resume
```

## 進階配置

### 自訂檢查點位置

```bash
export CHECKPOINT_DIR="/path/to/checkpoints"
./checkpoint.sh create "custom-location"
```

### 壓縮檢查點

檢查點會自動進行增量備份，減少磁盤占用。

### 自動化清理

每天午夜自動刪除超過 30 天的檢查點：
```bash
# 配置在 crontab 中
0 0 * * * $HOME/.openclaw/workspace/scripts/checkpoint.sh cleanup
```

## 集成示例

### 在自動化腳本中使用

```bash
#!/bin/bash
set -e
source "$(dirname "$0")/lib/common.sh"

# 建立檢查點
log_info "建立檢查點..."
./checkpoint.sh create "task-execution-start"

# 執行關鍵操作
execute_critical_task || {
    log_error "任務失敗，回滾..."
    ./checkpoint.sh rollback "task-execution-start"
    exit 1
}

log_success "任務完成"
```

## 日誌位置

- 主日誌：`~/.openclaw/automation/logs/automation.log`
- 檢查點日誌：`~/.openclaw/automation/logs/checkpoint.log`
- 狀態文件：`~/.openclaw/automation/state/state.json`

## 限制與注意事項

1. **存儲空間**：檢查點會占用大量磁盤空間，定期清理舊檢查點
2. **網絡狀態**：回滾時不會恢復網絡配置或外部系統狀態
3. **並發執行**：不支持同時建立和回滾檢查點
4. **權限要求**：需要對檢查點目錄有讀寫權限

## 相關命令

```bash
# 查看所有自動化日誌
tail -f ~/.openclaw/automation/logs/automation.log

# 查看自動化狀態
cat ~/.openclaw/automation/state/state.json | jq .

# 監控檢查點磁盤使用
du -sh $HOME/Desktop/小蔡/檢查點/
```

## 常見問題

**Q: 檢查點需要多長時間建立？**
A: 取決於系統大小，通常 5-30 秒。

**Q: 可以同時有多個檢查點嗎？**
A: 可以，每個檢查點獨立存儲。

**Q: 檢查點會過期嗎？**
A: 默認保留 30 天，之後自動刪除。可配置。

**Q: 回滾會刪除新文件嗎？**
A: 是的，會恢復到檢查點創建時的狀態。

---

文檔版本：1.0
最後更新：2026-02-14
