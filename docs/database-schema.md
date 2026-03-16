# 訂購飲料網站 - 資料庫綱要 (v0.1)

設計者：阿工

## 資料表

### `products` (商品)
- `id` (uuid, pk)
- `name` (text, not null) - 品項名稱
- `description` (text) - 描述
- `price` (numeric, not null) - 價格
- `category` (text) - 分類 (例如：純茶、奶茶)
- `image_url` (text) - 商品圖片
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `users` (用戶)
- `id` (uuid, pk)
- `phone` (text, unique) - 手機號碼 (用於登入/識別)
- `created_at` (timestamptz)

### `orders` (訂單)
- `id` (uuid, pk)
- `user_id` (uuid, fk to users.id)
- `status` (text, default: 'pending') - 狀態 (pending, paid, preparing, completed, cancelled)
- `total_amount` (numeric, not null) - 總金額
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `order_items` (訂單項目)
- `id` (uuid, pk)
- `order_id` (uuid, fk to orders.id)
- `product_id` (uuid, fk to products.id)
- `quantity` (integer, not null)
- `unit_price` (numeric, not null) - 當時單價
- `customizations` (jsonb) - 客製化選項 (例如：{"sweetness": "半糖", "ice": "少冰"})
