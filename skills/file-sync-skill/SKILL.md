---
name: file-sync-skill
description: 自動化的檔案同步與備份技能，支援本地目錄同步、雲端儲存（iCloud, Dropbox, Google Drive）、增量備份與排程自動執行
version: 1.0.0
author: Cursor
---

# File Sync Skill 🔄

自動化的檔案同步與備份技能，支援本地與雲端儲存。

---

## ✨ 功能特色

- ✅ **本地目錄同步** — 雙向/單向同步本地資料夾
- ✅ **雲端儲存支援** — iCloud, Dropbox, Google Drive
- ✅ **增量備份** — 僅同步變更檔案，節省時間與空間
- ✅ **排程自動執行** — 定時自動備份
- ✅ **衝突解決** — 智能處理檔案衝突
- ✅ **日誌記錄** — 完整備份歷史記錄

---

## 📦 安裝

```bash
cd skills/file-sync-skill
npm install
```

### 系統需求

- Node.js 16+
- macOS / Linux / Windows
- rsync (macOS/Linux 內建，Windows 需安裝 cwRsync)

---

## 🚀 快速開始

### 1️⃣ 本地目錄同步

```bash
# 單向同步（來源 → 目標）
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents

# 雙向同步
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --bidirectional
```

### 2️⃣ 雲端備份

```bash
# 備份到 iCloud
node scripts/cloud-backup.js --source ~/Documents --provider icloud

# 備份到 Dropbox
node scripts/cloud-backup.js --source ~/Documents --provider dropbox

# 備份到 Google Drive
node scripts/cloud-backup.js --source ~/Documents --provider googledrive
```

### 3️⃣ 增量備份

```bash
# 僅備份變更的檔案
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents
```

### 4️⃣ 排程設定

```bash
# 每日凌晨 2 點自動備份
node scripts/schedule.js --task daily-backup --cron "0 2 * * *" --script incremental-backup

# 每週備份
node scripts/schedule.js --task weekly-backup --cron "0 0 * * 0" --script cloud-backup
```

---

## 📖 使用場景矩陣

| 使用場景 | 推薦方法 | 指令 |
|---------|---------|------|
| 本地資料夾鏡像 | 本地同步 | `local-sync.js --source A --target B` |
| 重要檔案備份 | 增量備份 | `incremental-backup.js` |
| 跨裝置同步 | 雲端備份 | `cloud-backup.js --provider icloud` |
| 定時自動備份 | 排程 | `schedule.js --cron "0 2 * * *"` |

---

## 🔧 指令參考

### local-sync.js

本地目錄同步腳本。

```bash
node scripts/local-sync.js [選項]

選項:
  --source <path>      來源目錄 (必填)
  --target <path>      目標目錄 (必填)
  --bidirectional      啟用雙向同步
  --delete             刪除目標中多餘的檔案
  --dry-run            模擬執行，不實際變更
  --exclude <pattern>  排除檔案模式 (可重複)
  --log <path>         日誌檔案路徑
```

**範例:**
```bash
# 基本同步
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents

# 排除暫存檔
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents \
  --exclude "*.tmp" --exclude ".DS_Store" --exclude "node_modules"

# 模擬執行（預覽變更）
node scripts/local-sync.js --source ~/Documents --target ~/Backup/Documents --dry-run
```

### cloud-backup.js

雲端儲存備份腳本。

```bash
node scripts/cloud-backup.js [選項]

選項:
  --source <path>      來源目錄 (必填)
  --provider <name>    雲端提供者: icloud, dropbox, googledrive (必填)
  --target-path <path> 雲端目標路徑 (預設: /Backups)
  --incremental        啟用增量備份
  --encrypt            加密備份檔案
  --compress           壓縮備份檔案
```

**範例:**
```bash
# iCloud 備份
node scripts/cloud-backup.js --source ~/Documents --provider icloud

# Dropbox 加密備份
node scripts/cloud-backup.js --source ~/Important --provider dropbox --encrypt

# Google Drive 壓縮備份
node scripts/cloud-backup.js --source ~/Projects --provider googledrive --compress
```

### incremental-backup.js

增量備份腳本。

```bash
node scripts/incremental-backup.js [選項]

選項:
  --source <path>      來源目錄 (必填)
  --target <path>      目標目錄 (必填)
  --retention <days>   保留天數 (預設: 30)
  --full-backup-day    每週完整備份日 (0-6, 預設: 0=週日)
```

**範例:**
```bash
# 基本增量備份
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents

# 60 天保留期
node scripts/incremental-backup.js --source ~/Documents --target ~/Backups/Documents --retention 60
```

### schedule.js

排程管理腳本。

```bash
node scripts/schedule.js [選項]

選項:
  --task <name>        任務名稱 (必填)
  --cron <expression>  Cron 表達式 (必填)
  --script <name>      要執行的腳本 (必填)
  --action <action>    動作: add, remove, list
  --config <path>      設定檔路徑
```

**Cron 表達式格式:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └── 星期 (0-7, 0 和 7 都是週日)
│ │ │ └──── 月份 (1-12)
│ │ └────── 日期 (1-31)
│ └──────── 小時 (0-23)
└────────── 分鐘 (0-59)
```

**範例:**
```bash
# 每日凌晨 2 點
node scripts/schedule.js --task daily-backup --cron "0 2 * * *" --script incremental-backup

# 每週一上午 9 點
node scripts/schedule.js --task weekly-backup --cron "0 9 * * 1" --script cloud-backup

# 列出所有排程
node scripts/schedule.js --action list
```

---

## ⚙️ 設定檔

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
        "exclude": ["*.tmp", ".DS_Store", "node_modules"]
      },
      "schedule": "0 2 * * *"
    },
    {
      "name": "icloud-photos",
      "type": "cloud",
      "provider": "icloud",
      "source": "~/Pictures",
      "target": "/Backups/Photos",
      "options": {
        "incremental": true,
        "encrypt": false
      },
      "schedule": "0 3 * * 0"
    }
  ],
  "global": {
    "logDirectory": "~/.openclaw/logs/file-sync",
    "retentionDays": 30,
    "notification": {
      "enabled": true,
      "onError": true,
      "onSuccess": false
    }
  }
}
```

---

## 🔒 安全性

### 加密備份

```bash
# 使用密碼加密
node scripts/cloud-backup.js --source ~/Secret --provider dropbox --encrypt

# 使用 GPG 金鑰
node scripts/cloud-backup.js --source ~/Secret --provider dropbox --encrypt --gpg-key user@example.com
```

### 權限檢查

```bash
# 驗證檔案權限
node scripts/local-sync.js --source ~/Documents --target ~/Backup --check-permissions
```

---

## 📊 日誌與監控

### 查看日誌

```bash
# 查看最新備份日誌
tail -f ~/.openclaw/logs/file-sync/backup.log

# 查看特定期間的日誌
node scripts/log-viewer.js --from 2026-02-01 --to 2026-02-14
```

### 備份統計

```bash
# 顯示備份統計資訊
node scripts/stats.js

# 輸出 JSON 格式
node scripts/stats.js --json
```

---

## 🛠️ 進階用法

### 多個來源同步

```bash
# 使用設定檔批量同步
node scripts/batch-sync.js --config config/sync-config.json
```

### 版本控制備份

```bash
# 保留多個版本
node scripts/versioned-backup.js --source ~/Documents --target ~/Backups --versions 10
```

### 網路磁碟機同步

```bash
# SMB/CIFS 分享
node scripts/local-sync.js --source ~/Documents --target /Volumes/NetworkDrive/Backup

# NFS 分享
node scripts/local-sync.js --source ~/Documents --target /mnt/nfs/backup
```

---

## 🐛 疑難排解

### 權限錯誤

```bash
# 檢查檔案權限
ls -la ~/Documents

# 修復權限
chmod -R u+rw ~/Documents
```

### 雲端連線問題

**iCloud:**
- 確認已登入 iCloud
- 檢查 iCloud Drive 空間

**Dropbox:**
- 確認 Dropbox 桌面應用程式已安裝並登入
- 檢查 API 權杖是否有效

**Google Drive:**
- 確認 Google Drive 桌面應用程式已安裝
- 驗證 OAuth 憑證

### 空間不足

```bash
# 檢查磁碟空間
df -h

# 清理舊備份
node scripts/cleanup.js --older-than 30 --path ~/Backups
```

---

## 📝 最佳實踐

1. **3-2-1 備份原則**
   - 3 份資料副本
   - 2 種不同儲存媒體
   - 1 份異地備份

2. **定期測試還原**
   - 定期驗證備份完整性
   - 實際測試還原流程

3. **監控備份狀態**
   - 啟用電子郵件/通知
   - 定期檢查日誌

4. **加密敏感資料**
   - 個人文件使用加密
   - 安全保管加密金鑰

---

## 🔮 未來改進

- [ ] WebDAV 支援
- [ ] AWS S3 / Azure Blob 整合
- [ ] 圖形化界面
- [ ] 備份驗證與完整性檢查
- [ ] 自動化測試還原
- [ ] 頻寬限制控制

---

## 📚 參考資料

- [rsync 文件](https://rsync.samba.org/documentation.html)
- [Cron 表達式](https://crontab.guru/)
- [iCloud Drive](https://support.apple.com/icloud-drive)
- [Dropbox API](https://www.dropbox.com/developers)
- [Google Drive API](https://developers.google.com/drive)

---

## 📄 授權

MIT License
