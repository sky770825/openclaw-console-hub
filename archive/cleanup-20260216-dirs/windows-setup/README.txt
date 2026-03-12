# Windows OpenClaw 安裝包 - 使用說明

## 📦 安裝包內容

```
openclaw-windows-setup/
├── 📄 README.txt           ← 這個檔案
├── 🔧 install/
│   └── setup.sh           ← 主要安裝腳本
├── ⚙️  config/
│   └── (從 Mac 複製過來的設定)
└── 🧠 scripts/
    └── (Auto-Skill 腳本)
```

## 🚀 安裝步驟

### 第 1 步：Windows 準備

1. **開啟 WSL2**（以系統管理員開啟 PowerShell）：
   ```powershell
   wsl --install
   ```
   安裝完畢後重新開機

2. **安裝 Ubuntu**（Microsoft Store 搜尋 "Ubuntu" 安裝）

### 第 2 步：複製安裝包

1. **Mac 端**：把 `openclaw-windows-setup/` 資料夾複製到 USB 或雲端
2. **Windows 端**：放到 `C:\openclaw-setup\`

### 第 3 步：執行安裝

1. **開啟 WSL**（Ubuntu 終端機）
2. **執行安裝**：
   ```bash
   cd /mnt/c/openclaw-setup/install
   bash setup.sh
   ```

### 第 4 步：複製 Mac 資料

**在 Mac 端執行**（打包資料）：
```bash
cd ~
tar czf openclaw-backup.tar.gz .openclaw/workspace/
```

**複製到 Windows**，然後在 WSL 解壓：
```bash
cd ~
tar xzf /mnt/c/Users/你的使用者名稱/Downloads/openclaw-backup.tar.gz
```

### 第 5 步：設定 Syncthing（記憶同步）

1. **兩台都裝 Syncthing**：
   ```bash
   # Mac
   brew install syncthing
   
   # WSL
   curl -s https://syncthing.net/release-key.txt | sudo apt-key add -
   echo "deb https://apt.syncthing.net/ syncthing stable" | sudo tee /etc/apt/sources.list.d/syncthing.list
   sudo apt-get update
   sudo apt-get install syncthing
   ```

2. **設定同步資料夾**：
   - 路徑：`~/.openclaw/workspace/memory/`
   - 兩邊互相配對

### 第 6 步：啟動

```bash
cd ~/.openclaw/workspace
openclaw
```

## 🔧 設定檔說明

### Telegram Bot 設定
編輯 `~/.openclaw/config.json`：
```json
{
  "telegram": {
    "botToken": "你的BotToken",
    "allowedChatIds": [你的ChatID]
  }
}
```

### 使用同一個 Bot
**重要**：Windows 和 Mac 要用**同一個 Telegram Bot Token**
這樣你發訊息，兩台都會收到（但只會有一台回應）

## 🎯 主從模式（重要！）

為了避免兩台電腦同時回應 Telegram 訊息，使用**主從模式**：

```
Mac（主節點）    Windows（從節點）
    👑              😴
   優先回應        偵測 Mac 在線就待命
   
Mac 關機時：
    ❌              👑
                  自動接管回應
```

### 設定主從模式

1. **在 WSL 執行**：
   ```bash
   cd /mnt/c/openclaw-setup/install
   bash install-master-slave.sh
   ```

2. **輸入 Mac 的 IP 位址**（可以在 Mac 的 系統偏好設定 → 網路 查看）

3. **使用主從模式啟動**：
   ```bash
   openclaw-slave          # 自動偵測 Mac 狀態
   ```

   而不是直接執行 `openclaw`

### 主從模式指令

```bash
openclaw-slave           # 啟動，自動偵測主節點
openclaw-slave status    # 查看狀態
openclaw-slave force-start  # 強制啟動（忽略 Mac 狀態）
```

## ⚠️ 注意事項

1. **記憶同步**：一定要用 Syncthing，不然兩邊記憶會不同步
2. **主從模式**：Windows 一定要用 `openclaw-slave` 啟動，避免兩台同時回應
3. **WSL 限制**：WSL 關閉時，OpenClaw 也會停
   - 解法：保持 WSL 運作，或設定 WSL 常駐

## 🆘 問題排除

### WSL 無法啟動
```powershell
# PowerShell 系統管理員
wsl --update
wsl --shutdown
```

### 權限問題
```bash
sudo chown -R $USER:$USER ~/.openclaw
```

### 找不到 node/bun
```bash
export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
```

## 📞 支援

有問題就問 Mac 上的我！

---
*建立日期：2026-02-15*
*版本：v1.0*
