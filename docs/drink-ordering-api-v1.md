# 訂購飲料網站 API 設計 v1 (草案)

**設計原則：** Headless、RESTful、Stateless

## 核心資源 (Resources)

### 1. 商品 (Products)
- `GET /products`: 取得所有商品列表（含分類、價格、客製化選項）。
- `GET /products/{id}`: 取得單一商品詳細資訊。

### 2. 購物車 (Cart)
- `GET /cart`: 取得當前使用者的購物車內容。
- `POST /cart/items`: 新增商品到購物車（支援客製化選項）。
- `PUT /cart/items/{itemId}`: 修改購物車中某個商品的數量或選項。
- `DELETE /cart/items/{itemId}`: 從購物車移除商品。

### 3. 訂單 (Orders)
- `POST /orders`: 從購物車內容建立一筆新訂單（觸發結帳流程）。
- `GET /orders`: 取得使用者的歷史訂單。
- `GET /orders/{id}`: 取得特定訂單的詳細狀態。

### 4. 使用者 (Users)
- `POST /auth/register`: 註冊新使用者。
- `POST /auth/login`: 使用者登入。
- `GET /me`: 取得當前登入使用者的資訊。

## 數據追蹤點 (對應阿數的指標)
- `GET /products`: 對應「瀏覽商品頁」。
- `POST /cart/items`: 對應「加入購物車」。
- `POST /orders` (初步): 對應「開始結帳」。
- `GET /orders/{id}` (狀態為 paid): 對應「完成訂單」。
