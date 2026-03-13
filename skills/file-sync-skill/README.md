# File Sync Skill

自動化檔案同步與備份技能，支援本地目錄同步、雲端儲存、增量備份與排程執行。

## 用途

- 本地資料夾雙向/單向同步
- iCloud/Dropbox/Google Drive 備份
- 增量備份節省空間
- 定時自動備份排程
- 智能衝突解決

## 安裝

```bash
cd skills/file-sync-skill
npm install
```

### 系統需求

- Node.js 16+
- rsync（macOS/Linux 內建，Windows 需安裝 cwRsync）

## 使用範例

### 本地同步

```bash
# 單向同步（來源 → 目標）
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents

# 雙向同步
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --bidirectional

# 排除暫存檔
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents \
  --exclude "*.tmp" --exclude ".DS_Store"
```

### 雲端備份

```bash
# iCloud 備份
node scripts/cloud-backup.js --source ~/Documents --provider icloud

# Dropbox 加密備份
node scripts/cloud-backup.js --source ~/Important --provider dropbox --encrypt

# Google Drive 壓縮備份
node scripts/cloud-backup.js --source ~/Projects --provider googledrive --compress
```

### 增量備份

```bash
# 僅備份變更檔案
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents

# 60 天保留期
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents \
  --retention 60
```

### 排程設定

```bash
# 每日凌晨 2 點
node scripts/schedule.js --task daily-backup --cron "0 2 * * *" --script incremental-backup

# 每週一上午 9 點
node scripts/schedule.js --task weekly-backup --cron "0 9 * * 1" --script cloud-backup

# 列出排程
node scripts/schedule.js --action list
```

## 使用場景矩陣

| 場景 | 方法 | 指令 |
|------|------|------|
| 本地鏡像 | 本地同步 | `local-sync.js --source A --target B` |
| 重要檔案備份 | 增量備份 | `incremental-backup.js` |
| 跨裝置同步 | 雲端備份 | `cloud-backup.js --provider icloud` |
| 定時自動備份 | 排程 | `schedule.js --cron "0 2 * * *"` |

## 設定檔

建立 `config/sync-config.json`：

```json
{
  "profiles": [
    {
      "name": "daily-documents",
      "type": "local",
      "source": "~/Documents",
      "target": "~/Backup/Documents",
      "options": {
        "delete": true,
        "exclude": ["*.tmp", ".DS_Store"]
      },
      "schedule": "0 2 * * *"
    }
  ]
}
```

## 系統需求

- Node.js 16+
- rsync
- 雲端提供者桌面應用程式（如使用雲端備份）

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
