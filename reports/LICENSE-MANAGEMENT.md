# License 與客戶資料管理指南

## 📊 **資料儲存結構**

### 本地檔案（主要）
```
skill-github-automation/
├── scripts/
│   ├── licenses.json              # 授權資料庫
│   ├── admin-license.py           # 本地管理工具
│   └── supabase-license.js        # 雲端同步工具
└── customers/                     # 客戶資料（手動管理）
    ├── customer-list.md           # 客戶清單
    └── purchase-history.md        # 購買紀錄
```

### 雲端備份（Supabase）
```sql
-- licenses 表格結構
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  license_key VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  user_id VARCHAR(100),
  user_email VARCHAR(255),
  machine_fingerprint VARCHAR(32),
  activated_at TIMESTAMP,
  activations INTEGER DEFAULT 0,
  max_activations INTEGER DEFAULT 1,
  updated_at TIMESTAMP,
  notes TEXT
);

-- customers 表格結構
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  telegram_id VARCHAR(50),
  email VARCHAR(255),
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

---

## 🔐 **客戶資料保護**

### 儲存內容（最小化原則）

| 資料 | 用途 | 儲存位置 |
|------|------|---------|
| Telegram ID | 聯繫、驗證身份 | 本地 + 雲端 |
| Email | 發送 License | 本地 + 雲端 |
| 付款截圖 | 收款證明 | **本地 only**（不上傳雲端） |
| 錢包地址 | 付款紀錄 | 本地 only |
| 機器指紋 | 授權綁定 | 雲端（加密） |

### 不儲存的資料
- ❌ 身分證字號
- ❌ 電話號碼
- ❌ 信用卡資訊
- ❌ 詳細地址

---

## 🛠️ **管理流程**

### 1. 新客戶購買

```bash
# Step 1: 產生 License
python3 admin-license.py generate pro "telegram_id" "email@example.com"
# 輸出: SF-PR-XXXXXXXX-XXXXXXXX-XXXXXXXX

# Step 2: 記錄到客戶清單
echo "- $(date '+%Y-%m-%d') | telegram_id | email@example.com | Pro | SF-PR-XXX..." >> ../customers/customer-list.md

# Step 3: 備份到雲端
export SUPABASE_SERVICE_KEY="你的_service_role_key"
node supabase-license.js sync-to-cloud

# Step 4: 發送給客戶
# 透過 Telegram Bot 發送 License Key + 安裝說明
```

### 2. 客戶換電腦（轉移授權）

```bash
# Step 1: 驗證身份（對照客戶清單）
python3 admin-license.py info SF-PR-XXXXXXXX

# Step 2: 解除綁定
python3 admin-license.py unbind SF-PR-XXXXXXXX

# Step 3: 同步到雲端
node supabase-license.js sync-to-cloud

# Step 4: 通知客戶
# "已解除綁定，請在新電腦上重新啟用"
```

### 3. 每日備份

```bash
#!/bin/bash
# backup.sh - 加到 crontab 每天執行

cd /Users/caijunchang/.openclaw/workspace/skill-github-automation/scripts

# 備份本地資料庫
cp licenses.json "backups/licenses-$(date +%Y%m%d).json"

# 同步到雲端
export SUPABASE_SERVICE_KEY="你的_key"
node supabase-license.js sync-to-cloud

echo "$(date): Backup completed" >> backup.log
```

---

## ☁️ **Supabase 設定步驟**

### Step 1: 建立表格
登入 Supabase Dashboard → SQL Editor → 執行：

```sql
-- 建立授權表格
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  license_key VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  user_id VARCHAR(100),
  user_email VARCHAR(255),
  machine_fingerprint VARCHAR(32),
  activated_at TIMESTAMP WITH TIME ZONE,
  activations INTEGER DEFAULT 0,
  max_activations INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 建立客戶表格
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  telegram_id VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 建立索引
CREATE INDEX idx_licenses_user ON licenses(user_email);
CREATE INDEX idx_licenses_tier ON licenses(tier);
CREATE INDEX idx_customers_telegram ON customers(telegram_id);
```

### Step 2: 取得 Service Role Key
Project Settings → API → service_role key

### Step 3: 設定環境變數
```bash
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📝 **客戶清單範本**

```markdown
# SkillForge 客戶清單

## 2026-02

| 日期 | Telegram | Email | 版本 | License Key | 狀態 |
|------|----------|-------|------|-------------|------|
| 02-12 | @user123 | user@example.com | Pro | SF-PR-XXX... | ✅ 活躍 |
| 02-12 | @dev456 | dev@company.com | Enterprise | SF-EN-XXX... | 🔒 已綁定 |

## 備註

- @user123: 付款快速，已推薦給朋友
- @dev456: 企業客戶，可能需要客製化功能
```

---

## 🔄 **自動化建議**

### 使用 Telegram Bot 自動記錄
修改 Bot 程式，當收到購買確認時自動：
1. 產生 License Key
2. 儲存到本地 JSON
3. 同步到 Supabase
4. 發送給客戶

### 使用 n8n 自動化
設定工作流程：
- 收到付款通知 → 產生 License → 發送 Email → 記錄到 Google Sheets

---

## ⚠️ **安全提醒**

1. **定期備份**：本地 + 雲端雙重備份
2. **加密敏感資料**：Service Role Key 不要上傳 GitHub
3. **最小權限**：Supabase 使用 Row Level Security
4. **定期檢查**：每月確認授權使用狀況

---

**需要我幫忙設定 Supabase 或自動化流程嗎？**
