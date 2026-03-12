# 平台設定指南

## Facebook 設定

### 步驟 1: 建立 Facebook 應用

1. 訪問 [Facebook Developers](https://developers.facebook.com)
2. 點擊「我的應用程式」→「建立應用程式」
3. 選擇「消費者」應用程式類型
4. 填入應用名稱和聯絡方式

### 步驟 2: 取得 Page ID 和 Token

1. 在應用設定中新增「Facebook 登入」產品
2. 設定 OAuth 重定向 URI
3. 訪問 [Graph API Explorer](https://developers.facebook.com/tools/explorer)
4. 選擇應用程式，然後選擇使用者 Token
5. 查詢 `me/accounts` 取得頁面 ID
6. 生成長期 Page Access Token

### 步驟 3: 更新配置

編輯 `config/platforms.json`:
```json
{
  "facebook": {
    "enabled": true,
    "page_id": "your_page_id",
    "access_token": "your_page_access_token",
    "app_id": "your_app_id"
  }
}
```

### 權限需求

- `pages_manage_posts`: 發布貼文
- `pages_read_engagement`: 讀取互動數據
- `pages_manage_metadata`: 管理頁面元數據

---

## Instagram 設定

### 步驟 1: 轉換為商業帳號

1. 打開 Instagram 應用
2. 進入設定 → 帳號
3. 選擇「切換至商業帳號」
4. 選擇業務類別

### 步驟 2: 連接 Facebook 應用

1. 訪問 [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
2. 在 Facebook 應用中新增「Instagram Graph API」
3. 設定正確的權限

### 步驟 3: 取得 Account ID 和 Token

1. 訪問 Graph API Explorer
2. 查詢 `me/instagram_business_account`
3. 記錄返回的 `id` (Instagram 商業帳號 ID)
4. 生成長期 User Access Token

### 步驟 4: 更新配置

編輯 `config/platforms.json`:
```json
{
  "instagram": {
    "enabled": true,
    "account_id": "your_account_id",
    "access_token": "your_access_token"
  }
}
```

### 權限需求

- `instagram_basic`: 基本存取
- `instagram_content_publish`: 發布內容
- `pages_read_engagement`: 讀取互動數據

### 限制事項

- 每天最多發布 100 張照片或影片
- 不支援直接上傳本機圖片，需使用 URL
- 發布後最多 24 小時內無法修改

---

## 蝦皮購物設定

### 步驟 1: 註冊蝦皮商家

1. 訪問 [蝦皮商家中心](https://seller.shopee.tw)
2. 申請成為蝦皮賣家
3. 完成身份驗證和銀行帳戶設定

### 步驟 2: 建立應用

1. 進入商家中心 → 工具 → API 中心
2. 點擊「建立應用」
3. 填入應用名稱和描述
4. 設定回調 URL (webhook)

### 步驟 3: 生成金鑰

1. 在應用設定中生成 Partner ID 和 Partner Key
2. 記錄 Shop ID (通常在店鋪設定)
3. 啟用 API 権限

### 步驟 4: 更新配置

編輯 `config/platforms.json`:
```json
{
  "shopee": {
    "enabled": true,
    "shop_id": "your_shop_id",
    "partner_id": "your_partner_id",
    "partner_key": "your_partner_key"
  }
}
```

### 權限需求

在蝦皮後台啟用以下 API 權限：
- Product Management (商品管理)
- Order Management (訂單管理)
- Shop (店鋪)
- Logistics (物流)

### API 限制

- 每秒最多 10 個請求
- 批量操作限制 1000 個項目
- 圖片限制: 最多 9 張，每張 < 5 MB

---

## 測試連線

### 測試 Facebook 連線

```bash
python -c "
from src.platforms.facebook import FacebookAdapter
from src.platforms.base import PlatformAdapter
import json

with open('config/platforms.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

try:
    adapter = FacebookAdapter(config['facebook'])
    adapter.authenticate()
    print('✅ Facebook 連線成功!')
except Exception as e:
    print(f'❌ Facebook 連線失敗: {e}')
"
```

### 測試 Instagram 連線

```bash
python -c "
from src.platforms.instagram import InstagramAdapter
import json

with open('config/platforms.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

try:
    adapter = InstagramAdapter(config['instagram'])
    adapter.authenticate()
    print('✅ Instagram 連線成功!')
except Exception as e:
    print(f'❌ Instagram 連線失敗: {e}')
"
```

### 測試蝦皮連線

```bash
python -c "
from src.platforms.shopee import ShopeeAdapter
import json

with open('config/platforms.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

try:
    adapter = ShopeeAdapter(config['shopee'])
    adapter.authenticate()
    print('✅ 蝦皮連線成功!')
except Exception as e:
    print(f'❌ 蝦皮連線失敗: {e}')
"
```

---

## 安全建議

### Token 管理

1. **不要將 Token 提交到版本控制**
   ```bash
   echo "config/platforms.json" >> .gitignore
   ```

2. **使用環境變數**
   ```bash
   export FACEBOOK_PAGE_ID="your_page_id"
   export FACEBOOK_TOKEN="your_token"
   ```

3. **定期輪換 Token**
   - Facebook: 每 60 天
   - Instagram: 每 60 天
   - 蝦皮: 每 90 天

### 權限最小化

- 只授予必要的權限
- 定期檢查並移除未使用的應用程式
- 監控異常的 API 活動

---

## 故障排除

### Facebook

| 問題 | 解決方案 |
|------|--------|
| Token 過期 | 重新生成 Page Access Token |
| 403 Forbidden | 檢查頁面權限和 Token 有效性 |
| 400 Bad Request | 驗證請求格式和必要欄位 |

### Instagram

| 問題 | 解決方案 |
|------|--------|
| 帳號未轉換為商業帳號 | 在設定中切換到商業帳號 |
| 發布失敗 | 檢查圖片 URL 是否可存取 |
| Webhook 未收到通知 | 檢查回調 URL 和防火牆設定 |

### 蝦皮

| 問題 | 解決方案 |
|------|--------|
| 認證失敗 | 檢查 Partner ID 和 Key |
| 商品上架失敗 | 檢查分類和屬性設定 |
| API 超限 | 實施請求隊列和延遲 |

---

## 更新日期

最後更新: 2025-02-13
API 版本:
- Facebook Graph API v18.0
- Instagram Graph API v18.0
- Shopee Partner API v2
