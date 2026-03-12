# SkillForge License System

## 簡介

這是一個簡單但安全的 License Key 管理系統，支援：
- 產生 License Key
- 驗證 License 有效性
- 追蹤啟用狀態
- 版本控制（Lite/Pro/Enterprise）

## 安裝

```bash
cd scripts/license-system
npm install
```

## 使用方式

### 產生 License Key

```bash
# 產生 1 個 Lite License
node generate-license.js --tier=lite --count=1

# 產生 5 個 Pro License
node generate-license.js --tier=pro --count=5

# 產生 Enterprise License 並指定輸出檔案
node generate-license.js --tier=enterprise --count=1 --output=enterprise-licenses.json
```

### 驗證 License Key

```bash
# 驗證單一 License
node verify-license.js --key=SF-LT-ABCDEF1234567890

# 在程式中使用
const { LicenseVerifier } = require('./verify-license');
const verifier = new LicenseVerifier();
const result = verifier.verify('SF-LT-...');

if (result.valid) {
  console.log('版本:', result.tier);
  console.log('最大啟用數:', result.maxActivations);
}
```

## License Key 格式

```
SF-LT-TIMESTAMP-RANDOM-HASH

範例: SF-LT-K8J2N1-7A3F9E2B-A1B2C3D4
```

- `SF-LT`: 版本前綴（Lite）
- `K8J2N1`: 時間戳（36進制）
- `7A3F9E2B`: 隨機碼
- `A1B2C3D4`: 驗證雜湊

## 版本對照

| 前綴 | 版本 | 最大啟用數 |
|------|------|-----------|
| SF-LT | Lite | 1 |
| SF-PR | Pro | 1 |
| SF-EN | Enterprise | 5 |

## 安全性

- 使用 HMAC-SHA256 產生驗證雜湊
- 支援環境變數 `LICENSE_SECRET` 自訂密鑰
- 預設一年有效期

## 整合到產品

```typescript
import { LicenseVerifier } from './license-system/verify-license';

const verifier = new LicenseVerifier();

// 在初始化時驗證
async initialize(config) {
  const result = verifier.verify(config.licenseKey);
  
  if (!result.valid) {
    throw new Error(`License invalid: ${result.error}`);
  }
  
  this.tier = result.tier;
  this.maxActivations = result.maxActivations;
}
```
