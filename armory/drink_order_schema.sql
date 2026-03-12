-- 啟用 uuid-ossp 擴充套件，用於生成 UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 建立自訂 ENUM 類型，用於使用者角色和訂單狀態，增加資料一致性
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'completed', 'cancelled');

-- 建立一個通用的觸發器函式，用於在資料更新時自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- =================================================================
-- 使用者 (Users)
-- 儲存使用者基本資訊、密碼（雜湊後）和角色權限
-- =================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 為 email 建立唯一索引，加速登入時的查詢
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 建立觸發器，在 users 資料更新時自動更新 updated_at
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- =================================================================
-- 商品 (Products)
-- 儲存飲料品項，價格為基本價格，客製化選項使用 JSONB 儲存
-- =================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    -- 使用 NUMERIC 儲存金額，避免浮點數精度問題
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    image_url VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT true,
    -- 使用 JSONB 儲存可用的客製化選項，結構彈性大，例如：
    -- {"sizes": [{"name": "大杯", "price_diff": 10}, {"name": "中杯", "price_diff": 0}], "sugar_levels": ["正常糖", "少糖", "半糖", "微糖", "無糖"], "ice_levels": ["正常冰", "少冰", "微冰", "去冰", "常溫", "溫", "熱"], "add_ons": [{"name": "珍珠", "price": 10}, {"name": "椰果", "price": 10}]}
    options JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 為 name 建立唯一索引，加速商品查詢
CREATE UNIQUE INDEX idx_products_name ON products(name);

-- 建立觸發器，在 products 資料更新時自動更新 updated_at
CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- =================================================================
-- 訂單 (Orders)
-- 儲存訂單主體資訊，包含使用者、總價和狀態
-- =================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    -- 訂單總金額，NUMERIC 避免精度問題
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status order_status NOT NULL DEFAULT 'pending',
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 外鍵約束
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

-- 為 user_id 和 status 建立索引，加速訂單查詢和管理
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- 建立觸發器，在 orders 資料更新時自動更新 updated_at
CREATE TRIGGER update_orders_modtime
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- =================================================================
-- 訂單項目 (Order Items)
-- 儲存每筆訂單中的具體商品和其客製化詳情
-- =================================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    -- 購買時的單價，可能與商品當前價格不同 (如促銷)
    price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (price_at_purchase >= 0),
    -- 實際購買的客製化選項，JSONB 儲存，例如：
    -- {"size": {"name": "大杯", "price_diff": 10}, "sugar": "半糖", "ice": "少冰", "add_ons": [{"name": "珍珠", "price": 10}]}
    selected_options JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 外鍵約束
    CONSTRAINT fk_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON DELETE RESTRICT -- 商品不能被刪除，如果還有訂單項目引用它
);

-- 為 order_id 和 product_id 建立索引，加速訂單項目查詢
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 建立觸發器，在 order_items 資料更新時自動更新 updated_at
CREATE TRIGGER update_order_items_modtime
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- =================================================================
-- 商品選項 (Product Options) - 獨立表結構 (可選，若選項複雜且重複性高)
-- 考慮到 JSONB 的彈性，這個表可能不一定需要，但如果選項結構化且重複率高，可以獨立出來。
-- 此處暫不實作，優先使用 Product.options 的 JSONB 字段。若未來需求變更，可再考慮。
-- =================================================================
