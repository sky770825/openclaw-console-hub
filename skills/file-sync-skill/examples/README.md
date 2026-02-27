# File Sync Skill 使用範例

這裡提供各種使用場景的範例。

---

## 📂 範例 1: 基本本地同步

將 Documents 同步到 Backup：

```bash
cd ~/.openclaw/workspace/skills/file-sync-skill

# 單向同步
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents

# 雙向同步
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --bidirectional

# 同步並刪除目標多餘檔案
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --delete
```

---

## ☁️ 範例 2: 雲端備份

### iCloud
```bash
node scripts/cloud-backup.js --source ~/Documents --provider icloud
```

### Dropbox
```bash
node scripts/cloud-backup.js --source ~/Documents --provider dropbox
```

### Google Drive
```bash
node scripts/cloud-backup.js --source ~/Documents --provider googledrive
```

---

## 🔄 範例 3: 增量備份

```bash
# 基本增量備份
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents

# 保留 60 天
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents --retention 60

# 壓縮備份
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents --compress
```

---

## ⏰ 範例 4: 排程設定

```bash
# 每日凌晨 2 點執行
node scripts/schedule.js --task daily-backup --cron "0 2 * * *" --script incremental-backup

# 每週一上午 9 點
node scripts/schedule.js --task weekly-backup --cron "0 9 * * 1" --script cloud-backup

# 列出所有排程
node scripts/schedule.js --action list

# 移除排程
node scripts/schedule.js --action remove --task daily-backup
```

---

## 📋 範例 5: 批次同步

使用設定檔批量執行：

```bash
# 使用預設設定檔
node scripts/batch-sync.js --config config/sync-config.json

# 模擬執行
node scripts/batch-sync.js --config config/sync-config.json --dry-run

# 平行執行
node scripts/batch-sync.js --config config/sync-config.json --parallel
```

---

## 🧹 範例 6: 清理舊備份

```bash
# 刪除超過 30 天的備份
node scripts/cleanup.js --path ~/Backups --older-than 30

# 模擬清理（不實際刪除）
node scripts/cleanup.js --path ~/Backups --older-than 30 --dry-run
```

---

## 📊 範例 7: 查看統計

```bash
# 顯示統計資訊
node scripts/stats.js

# JSON 格式輸出
node scripts/stats.js --json

# 使用特定設定檔
node scripts/stats.js --config config/sync-config.json
```

---

## 🔧 範例 8: 排除特定檔案

```bash
# 排除暫存檔和系統檔案
node scripts/local-sync.js \
  --source ~/Documents \
  --target ~/Backup/Documents \
  --exclude "*.tmp" \
  --exclude ".DS_Store" \
  --exclude "node_modules" \
  --exclude ".git"
```

---

## 🚀 範例 9: 模擬執行

在實際執行前先預覽變更：

```bash
# 本地同步預覽
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --dry-run

# 增量備份預覽
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups --dry-run
```

---

## 📝 範例 10: 完整工作流程

每日自動備份 workflow：

```bash
#!/bin/bash

# 1. 執行本地同步
echo "開始本地同步..."
node scripts/local-sync.js \
  --source ~/Documents \
  --target ~/Backup/Documents \
  --exclude ".DS_Store" \
  --exclude "*.tmp"

# 2. 執行增量備份
echo "開始增量備份..."
node scripts/incremental-backup.js \
  --source ~/Documents \
  --target ~/Backups/Documents \
  --retention 30

# 3. 清理舊備份
echo "清理舊備份..."
node scripts/cleanup.js \
  --path ~/Backups/Documents \
  --older-than 30

# 4. 查看統計
echo "備份統計:"
node scripts/stats.js

echo "備份完成!"
```

儲存為 `daily-backup.sh` 並設定執行權限：
```bash
chmod +x daily-backup.sh
```

---

## 💡 進階使用技巧

### 使用 launchd 自動排程 (macOS)

建立 `~/Library/LaunchAgents/com.openclaw.file-sync.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" 
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.file-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/.openclaw/workspace/skills/file-sync-skill/scripts/batch-sync.js</string>
        <string>--config</string>
        <string>/Users/YOUR_USERNAME/.openclaw/workspace/skills/file-sync-skill/config/sync-config.json</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
```

載入並啟動：
```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.file-sync.plist
launchctl start com.openclaw.file-sync
```

### 使用 cron (Linux/macOS)

```bash
# 編輯 crontab
crontab -e

# 新增每日凌晨 2 點執行
0 2 * * * cd ~/.openclaw/workspace/skills/file-sync-skill && node scripts/batch-sync.js --config config/sync-config.json
```

---

如需更多資訊，請參見 [SKILL.md](../SKILL.md)
