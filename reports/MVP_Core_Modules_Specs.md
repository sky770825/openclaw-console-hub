# MVP 核心功能模組規格定義 (Phase 1)

## 1. 用戶模組 (User Module)
**目的**: 處理身分驗證、權限管理與基本個人資料。

| 欄位名稱 | 型別 | 必填 | 說明 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| id | UUID/String | 是 | 唯一識別碼 | 主鍵 |
| email | String | 是 | 電子郵件 | 登入帳號, 唯一索引 |
| password_hash | String | 是 | 加密後的密碼 | Argon2 或 Bcrypt |
| display_name | String | 是 | 顯示名稱 | |
| avatar_url | String | 否 | 頭像連結 | |
| role | Enum | 是 | 角色 (ADMIN, USER) | 預設 USER |
| status | Enum | 是 | 狀態 (ACTIVE, BANNED) | 預設 ACTIVE |
| last_login | DateTime | 否 | 最後登入時間 | |
| created_at | DateTime | 是 | 建立時間 | |
| updated_at | DateTime | 是 | 更新時間 | |

---

## 2. 商品模組 (Product Module)
**目的**: 管理實體或虛擬商品的展示與庫存控管。

| 欄位名稱 | 型別 | 必填 | 說明 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| id | UUID/String | 是 | 商品 ID | |
| sku | String | 是 | 庫存單位 (SKU) | 唯一索引 |
| name | String | 是 | 商品名稱 | |
| description | Text | 否 | 商品詳情 | 支援 Markdown/HTML |
| base_price | Decimal | 是 | 基本售價 | 精確度 (10, 2) |
| sale_price | Decimal | 否 | 促銷價 | |
| stock_quantity | Integer | 是 | 庫存數量 | 預設 0 |
| category_id | String | 否 | 分類 ID | 關聯 Category 模組 |
| images | Array[String] | 否 | 商品圖片路徑清單 | |
| status | Enum | 是 | 狀態 (DRAFT, PUBLISHED, ARCHIVED) | 預設 DRAFT |
| created_at | DateTime | 是 | 建立時間 | |

---

## 3. CMS 內容管理模組 (CMS Module)
**目的**: 管理網站靜態頁面、部落格文章或任務公告。

| 欄位名稱 | 型別 | 必填 | 說明 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| id | UUID/String | 是 | 內容 ID | |
| slug | String | 是 | URL 路徑別名 | 唯一索引 (e.g., about-us) |
| title | String | 是 | 標題 | |
| content | Text | 是 | 主要內容 | Markdown 格式 |
| author_id | String | 是 | 作者 ID | 關聯 User 模組 |
| tags | Array[String] | 否 | 標籤 | 方便篩選 |
| status | Enum | 是 | 狀態 (DRAFT, PUBLISHED) | |
| published_at | DateTime | 否 | 發佈日期 | |
| created_at | DateTime | 是 | 建立時間 | |

