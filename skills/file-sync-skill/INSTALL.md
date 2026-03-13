# File Sync Skill 安裝指南

## 系統需求

- **Node.js**: 16.0.0 或更高版本
- **作業系統**: macOS, Linux, Windows
- **工具**: rsync (macOS/Linux 內建，Windows 需安裝)

---

## 快速安裝

```bash
# 1. 進入技能目錈
cd ~/.openclaw/workspace/skills/file-sync-skill

# 2. 安裝相依套件
npm install

# 3. 驗證安裝
node scripts/local-sync.js --version
```

---

## 詳細安裝步驟

### macOS

```bash
# 1. 檢查 Node.js
node --version

# 如果未安裝，使用 Homebrew 安裝
brew install node

# 2. 安裝相依套件
cd ~/.openclaw/workspace/skills/file-sync-skill
npm install

# 3. 確保腳本可執行
chmod +x scripts/*.js

# 4. 測試
node scripts/local-sync.js --help
```

### Linux (Ubuntu/Debian)

```bash
# 1. 安裝 Node.js
sudo apt-get update
sudo apt-get install -y nodejs npm

# 2. 安裝 rsync（通常已內建）
sudo apt-get install -y rsync

# 3. 安裝相依套件
cd ~/.openclaw/workspace/skills/file-sync-skill
npm install

# 4. 確保腳本可執行
chmod +x scripts/*.js

# 5. 測試
node scripts/local-sync.js --help
```

### Windows

```powershell
# 1. 安裝 Node.js
# 從 https://nodejs.org/ 下載安裝程式

# 2. 安裝 rsync (使用 Chocolatey)
choco install rsync

# 3. 安裝相依套件
cd %USERPROFILE%\.openclaw\workspace\skills\file-sync-skill
npm install

# 4. 測試
node scripts\local-sync.js --help
```

---

## 雲端儲存設定

### iCloud

1. 確保已登入 iCloud
2. 在系統偏好設定中啟用 iCloud Drive
3. 驗證路徑存在：`~/Library/Mobile Documents/com~apple~CloudDocs`

### Dropbox

1. 安裝 Dropbox 桌面應用程式
2. 登入您的 Dropbox 帳號
3. 驗證路徑存在：`~/Dropbox`

### Google Drive

1. 安裝 Google Drive 桌面應用程式
2. 登入您的 Google 帳號
3. 驗證路徑存在：`~/Google Drive`

---

## 驗證安裝

```bash
# 測試本地同步
node scripts/local-sync.js --help

# 測試雲端備份
node scripts/cloud-backup.js --help

# 測試增量備份
node scripts/incremental-backup.js --help

# 測試排程
node scripts/schedule.js --help
```

---

## 常見問題

### Q: 執行時顯示 "rsync: command not found"

**A**: 
- macOS: 通常已內建，如果遺失請安裝 Xcode Command Line Tools: `xcode-select --install`
- Linux: `sudo apt-get install rsync` 或 `sudo yum install rsync`
- Windows: 安裝 cwRsync 或使用 WSL

### Q: 雲端備份顯示 "雲端目錄不存在"

**A**: 請確認：
1. 雲端桌面應用程式已安裝
2. 您已登入帳號
3. 雲端資料夾已同步到本地

### Q: 權限錯誤

**A**: 
```bash
# 修復腳本權限
chmod +x scripts/*.js

# 修復目錄權限（macOS/Linux）
chmod -R u+rw ~/Documents
```

### Q: Node.js 版本過舊

**A**:
```bash
# 使用 nvm 升級
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

---

## 解除安裝

```bash
# 刪除技能目錄
rm -rf ~/.openclaw/workspace/skills/file-sync-skill

# 刪除設定檔（可選）
rm -rf ~/.openclaw/config/file-sync-schedule.json
```

---

## 獲取協助

- 完整文件: [SKILL.md](../SKILL.md)
- 使用範例: [examples/README.md](../examples/README.md)
- 問題回報: 請在專案 issue 頁面提交
