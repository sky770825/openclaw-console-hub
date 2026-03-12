# Password Manager Skill

安全的密碼管理與生成技能，使用 macOS Keychain 進行加密儲存。

## 快速開始

```bash
# 安裝
./scripts/install.sh

# 生成密碼
password-manager generate -l 20

# 儲存密碼
password-manager store -a "github.com"

# 取出密碼
password-manager retrieve -a "github.com"

# 檢查強度
password-manager check -p "your_password"
```

## 功能

- 🔐 **強密碼生成** - 可自定義長度和字符集
- 🔒 **加密儲存** - 使用 macOS Keychain
- 📊 **強度檢查** - 10 分制評分系統
- 📋 **剪貼簿整合** - 自動清除保護

## 檔案結構

```
password-manager-skill/
├── SKILL.md              # 技能規格文件
├── README.md             # 本文件
└── scripts/
    ├── password-manager  # 主程式
    └── install.sh        # 安裝腳本
```

## 安全特性

- 使用 `/dev/urandom` 產生加密安全隨機數
- 密碼僅儲存在系統 Keychain
- 不儲存任何明文密碼
- 剪貼簿 30 秒自動清除

## 任務資訊

- **任務 ID**: password-manager-skill-20260214
- **創建日期**: 2026-02-14
- **執行者**: Cursor
