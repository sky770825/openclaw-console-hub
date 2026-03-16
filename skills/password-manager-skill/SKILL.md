---
name: password-manager-skill
description: Secure password management and generation skill for OpenClaw. Provides strong password generation, encrypted storage using macOS Keychain, and password strength checking. Never stores passwords in plaintext.
task_id: password-manager-skill-20260214
---

# Password Manager Skill

安全密碼管理與生成技能，使用系統 Keychain 進行加密儲存，不儲存任何明文密碼。

## 功能

1. **強密碼生成** (`generate`)
   - 可自定義長度 (預設 16 字符)
   - 可選字符集：大寫、小寫、數字、特殊字符
   - 可排除特定字符
   - 使用 /dev/urandom 加密安全隨機數

2. **加密儲存** (`store`)
   - 使用 macOS Keychain 安全儲存
   - 支援帳號標籤和備註
   - 自動檢查重複項目

3. **密碼取出** (`retrieve`)
   - 從 Keychain 安全取出
   - 支援複製到剪貼簿 (30秒自動清除)

4. **密碼刪除** (`delete`)
   - 安全刪除 Keychain 項目
   - 支援強制刪除模式

5. **密碼強度檢查** (`check`)
   - 10 分制評分系統
   - 檢查字符多樣性
   - 檢測常見弱密碼模式
   - 提供改進建議

## 使用方法

### 生成密碼
```bash
# 生成預設 16 字符密碼
~/.openclaw/workspace/skills/password-manager-skill/scripts/password-manager generate

# 生成 32 字符密碼
password-manager generate -l 32

# 生成不含特殊字符的密碼
password-manager generate -S

# 生成僅含字母的密碼
password-manager generate -D -S
```

### 儲存密碼
```bash
# 互動式儲存
password-manager store -a "github.com"

# 直接儲存
password-manager store -a "github.com" -p "MyStr0ng!P@ss"

# 帶備註
password-manager store -a "github.com" -p "MyStr0ng!P@ss" -c "個人 GitHub 帳號"
```

### 取出密碼
```bash
# 顯示密碼
password-manager retrieve -a "github.com"

# 複製到剪貼簿
password-manager retrieve -a "github.com" -c
```

### 檢查密碼強度
```bash
# 互動式檢查
password-manager check

# 直接檢查
password-manager check -p "myPassword123"
```

### 列出所有項目
```bash
password-manager list
```

### 刪除密碼
```bash
# 確認刪除
password-manager delete -a "github.com"

# 強制刪除
password-manager delete -a "github.com" -f
```

## 安裝

```bash
# 建立符號連結
ln -s ~/.openclaw/workspace/skills/password-manager-skill/scripts/password-manager /usr/local/bin/password-manager
```

## 安全特性

- ✅ 使用 /dev/urandom 產生加密安全隨機數
- ✅ 密碼僅儲存在 macOS Keychain，由系統加密保護
- ✅ 不儲存任何明文密碼
- ✅ 剪貼簿自動清除 (30秒)
- ✅ 無記憶體轉儲保護

## 依賴

- macOS (使用 `security` 命令)
- Bash 4.0+

## 技術規格

- **技能 ID**: password-manager-skill-20260214
- **創建日期**: 2026-02-14
- **Keychain Service**: openclaw-password-manager
- **作者**: Cursor
