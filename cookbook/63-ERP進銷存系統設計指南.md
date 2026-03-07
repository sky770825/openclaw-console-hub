# 63 — ERP 進銷存系統設計指南

> 適用對象：台灣網頁開發者 / 接案工作室 / 中小企業要自建進銷存或 ERP 系統
> 最後更新：2026-03-07

---

## 目錄

1. [ERP 核心模組總覽](#1-erp-核心模組總覽)
2. [進貨管理](#2-進貨管理)
3. [銷售管理](#3-銷售管理)
4. [庫存管理](#4-庫存管理)
5. [報表中心](#5-報表中心)
6. [前端設計原則](#6-前端設計原則)
7. [代碼範例](#7-代碼範例)

---

## 1. ERP 核心模組總覽

### 1.1 模組關係圖

```
+------------------+     +------------------+     +------------------+
|    採購模組       |     |    銷售模組       |     |    庫存模組       |
|  (進貨/供應商)    |     |  (訂單/客戶)      |     |  (即時庫存/盤點)  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+---------------------------------------------------------------+
|                      財務模組（應收/應付/損益）                  |
+---------------------------------------------------------------+
         |                        |
   +-----+-----+          +------+------+
   | 人資模組   |          | 報表中心    |
   | (選配)     |          | (核心)      |
   +------------+          +-------------+
```

### 1.2 核心資料表

```sql
-- 供應商
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- S-001
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,                           -- 統一編號
  payment_terms INT DEFAULT 30,          -- 付款天數
  bank_info JSONB,                       -- 匯款資訊
  status TEXT DEFAULT 'active',          -- active/inactive
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 客戶
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- C-001
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  credit_limit DECIMAL(12, 2) DEFAULT 0,-- 信用額度
  payment_terms INT DEFAULT 30,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 商品
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,              -- PRD-001
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT '個',                -- 個/箱/公斤/公升
  cost_price DECIMAL(12, 2) DEFAULT 0,   -- 進貨成本
  selling_price DECIMAL(12, 2) DEFAULT 0,-- 售價
  safety_stock DECIMAL(10, 2) DEFAULT 0, -- 安全存量
  current_stock DECIMAL(10, 2) DEFAULT 0,-- 即時庫存
  warehouse TEXT DEFAULT 'main',         -- 倉庫
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 採購單
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,        -- PO-20260307-001
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'draft',           -- draft/approved/ordered/partial_received/received/cancelled
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,                    -- 預計到貨日
  items JSONB NOT NULL,                  -- [{product_id, sku, name, qty, unit_price, received_qty}]
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,          -- 稅額
  total DECIMAL(12, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid/partial/paid
  note TEXT,
  approved_by TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 銷售訂單
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number TEXT UNIQUE NOT NULL,        -- SO-20260307-001
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'draft',           -- draft/confirmed/processing/shipped/delivered/cancelled
  order_date DATE DEFAULT CURRENT_DATE,
  ship_date DATE,
  items JSONB NOT NULL,                  -- [{product_id, sku, name, qty, unit_price, shipped_qty}]
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  shipping_address TEXT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 庫存異動記錄
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  type TEXT NOT NULL,                    -- purchase_in/sales_out/return_in/return_out/adjust/transfer
  quantity DECIMAL(10, 2) NOT NULL,      -- 正數=入庫，負數=出庫
  reference_type TEXT,                   -- purchase_order/sales_order/adjustment
  reference_id UUID,
  warehouse TEXT DEFAULT 'main',
  before_stock DECIMAL(10, 2),
  after_stock DECIMAL(10, 2),
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 2. 進貨管理

### 2.1 採購流程

```
建立採購單 (draft)
    |
    v
主管審核 (approved)
    |
    v
向供應商下單 (ordered)
    |
    v
進貨驗收
    |
    +-- 全部到齊 --> received --> 庫存入庫 + 應付帳款
    +-- 部分到貨 --> partial_received --> 等待剩餘
    +-- 退貨 --> 退貨單 --> 庫存退出 + 應付沖銷
```

### 2.2 採購單 API

```javascript
// 建立採購單
router.post('/api/purchase-orders', async (req, res) => {
  const { supplierId, items, expectedDate, note } = req.body;

  const poNumber = await generatePoNumber(); // PO-20260307-001

  // 計算金額
  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.unit_price), 0);
  const tax = Math.round(subtotal * 0.05); // 5% 營業稅
  const total = subtotal + tax;

  const result = await db.query(`
    INSERT INTO purchase_orders (po_number, supplier_id, items, expected_date, subtotal, tax, total, note, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [poNumber, supplierId, JSON.stringify(items), expectedDate, subtotal, tax, total, note, req.user.name]);

  res.json(result.rows[0]);
});

// 進貨驗收
router.post('/api/purchase-orders/:id/receive', async (req, res) => {
  const { id } = req.params;
  const { receivedItems } = req.body;
  // receivedItems: [{ product_id, received_qty }]

  const po = await db.query(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
  const order = po.rows[0];
  const items = order.items;

  for (const ri of receivedItems) {
    // 更新採購單品項的已收數量
    const itemIdx = items.findIndex(i => i.product_id === ri.product_id);
    if (itemIdx >= 0) {
      items[itemIdx].received_qty = (items[itemIdx].received_qty || 0) + ri.received_qty;
    }

    // 庫存入庫
    const product = await db.query(`SELECT current_stock FROM products WHERE id = $1`, [ri.product_id]);
    const beforeStock = product.rows[0].current_stock;
    const afterStock = beforeStock + ri.received_qty;

    await db.query(`UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2`,
      [afterStock, ri.product_id]);

    await db.query(`
      INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, before_stock, after_stock, created_by)
      VALUES ($1, 'purchase_in', $2, 'purchase_order', $3, $4, $5, $6)
    `, [ri.product_id, ri.received_qty, id, beforeStock, afterStock, req.user.name]);
  }

  // 判斷是否全部到齊
  const allReceived = items.every(i => (i.received_qty || 0) >= i.qty);
  const newStatus = allReceived ? 'received' : 'partial_received';

  await db.query(`UPDATE purchase_orders SET items = $1, status = $2 WHERE id = $3`,
    [JSON.stringify(items), newStatus, id]);

  // 如果全部到齊，建立應付帳款
  if (allReceived) {
    await createPayable(order);
  }

  res.json({ success: true, status: newStatus });
});
```

### 2.3 退貨處理

```javascript
router.post('/api/purchase-orders/:id/return', async (req, res) => {
  const { id } = req.params;
  const { returnItems, reason } = req.body;

  for (const item of returnItems) {
    // 庫存退出
    const product = await db.query(`SELECT current_stock FROM products WHERE id = $1`, [item.product_id]);
    const beforeStock = product.rows[0].current_stock;
    const afterStock = beforeStock - item.qty;

    await db.query(`UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2`,
      [afterStock, item.product_id]);

    await db.query(`
      INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, before_stock, after_stock, note, created_by)
      VALUES ($1, 'return_out', $2, 'purchase_order', $3, $4, $5, $6, $7)
    `, [item.product_id, -item.qty, id, beforeStock, afterStock, reason, req.user.name]);
  }

  res.json({ success: true });
});
```

### 2.4 供應商管理

```javascript
// 供應商績效分析
router.get('/api/suppliers/:id/performance', async (req, res) => {
  const { id } = req.params;
  const { year } = req.query;

  const result = await db.query(`
    SELECT
      COUNT(*) AS total_orders,
      COUNT(CASE WHEN status = 'received' THEN 1 END) AS completed_orders,
      SUM(total) AS total_amount,
      AVG(
        EXTRACT(DAY FROM (
          -- 實際到貨日 vs 預計到貨日
          (SELECT MIN(created_at) FROM inventory_transactions
           WHERE reference_id = po.id AND type = 'purchase_in')
          - po.expected_date::TIMESTAMPTZ
        ))
      ) AS avg_delay_days
    FROM purchase_orders po
    WHERE supplier_id = $1
      AND EXTRACT(YEAR FROM order_date) = $2
  `, [id, year || new Date().getFullYear()]);

  res.json(result.rows[0]);
});
```

---

## 3. 銷售管理

### 3.1 銷售流程

```
建立銷售訂單 (draft)
    |
    v
確認訂單 (confirmed) --> 檢查庫存
    |
    v
揀貨出庫 (processing) --> 庫存扣減
    |
    v
出貨 (shipped)
    |
    v
客戶簽收 (delivered) --> 應收帳款
    |
    +-- 退換貨 --> 退貨單 --> 庫存回入 + 應收沖銷
```

### 3.2 銷售訂單 API

```javascript
// 建立銷售訂單
router.post('/api/sales-orders', async (req, res) => {
  const { customerId, items, discount, shippingAddress, note } = req.body;

  // 檢查庫存
  const stockIssues = [];
  for (const item of items) {
    const product = await db.query(`SELECT current_stock, name FROM products WHERE id = $1`, [item.product_id]);
    if (product.rows[0].current_stock < item.qty) {
      stockIssues.push({
        product: product.rows[0].name,
        available: product.rows[0].current_stock,
        requested: item.qty,
      });
    }
  }

  if (stockIssues.length > 0) {
    return res.status(400).json({ error: '庫存不足', details: stockIssues });
  }

  const soNumber = await generateSoNumber();
  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.unit_price), 0);
  const tax = Math.round((subtotal - (discount || 0)) * 0.05);
  const total = subtotal - (discount || 0) + tax;

  const result = await db.query(`
    INSERT INTO sales_orders (so_number, customer_id, items, subtotal, discount, tax, total, shipping_address, note, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
  `, [soNumber, customerId, JSON.stringify(items), subtotal, discount || 0, tax, total, shippingAddress, note, req.user.name]);

  res.json(result.rows[0]);
});

// 確認出貨（扣庫存）
router.post('/api/sales-orders/:id/ship', async (req, res) => {
  const { id } = req.params;
  const { shippedItems } = req.body;

  const so = await db.query(`SELECT * FROM sales_orders WHERE id = $1`, [id]);
  const order = so.rows[0];

  for (const si of shippedItems) {
    const product = await db.query(`SELECT current_stock FROM products WHERE id = $1`, [si.product_id]);
    const beforeStock = product.rows[0].current_stock;
    const afterStock = beforeStock - si.qty;

    if (afterStock < 0) {
      return res.status(400).json({ error: `${si.name} 庫存不足` });
    }

    await db.query(`UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2`,
      [afterStock, si.product_id]);

    await db.query(`
      INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, before_stock, after_stock, created_by)
      VALUES ($1, 'sales_out', $2, 'sales_order', $3, $4, $5, $6)
    `, [si.product_id, -si.qty, id, beforeStock, afterStock, req.user.name]);
  }

  await db.query(`UPDATE sales_orders SET status = 'shipped', ship_date = CURRENT_DATE WHERE id = $1`, [id]);

  // 建立應收帳款
  await createReceivable(order);

  res.json({ success: true });
});
```

### 3.3 退換貨

```javascript
router.post('/api/sales-orders/:id/return', async (req, res) => {
  const { id } = req.params;
  const { returnItems, reason, returnType } = req.body;
  // returnType: 'refund' | 'exchange'

  for (const item of returnItems) {
    // 退貨入庫
    const product = await db.query(`SELECT current_stock FROM products WHERE id = $1`, [item.product_id]);
    const beforeStock = product.rows[0].current_stock;
    const afterStock = beforeStock + item.qty;

    await db.query(`UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2`,
      [afterStock, item.product_id]);

    await db.query(`
      INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, before_stock, after_stock, note, created_by)
      VALUES ($1, 'return_in', $2, 'sales_order', $3, $4, $5, $6, $7)
    `, [item.product_id, item.qty, id, beforeStock, afterStock, reason, req.user.name]);
  }

  // 退款金額
  const refundAmount = returnItems.reduce((sum, i) => sum + (i.qty * i.unit_price), 0);

  res.json({ success: true, refundAmount, returnType });
});
```

### 3.4 應收帳款

```javascript
// 客戶應收帳款查詢
router.get('/api/receivables', async (req, res) => {
  const { customerId, status } = req.query;

  let query = `
    SELECT
      so.so_number,
      c.name AS customer_name,
      so.total,
      so.payment_status,
      so.order_date,
      so.order_date + c.payment_terms AS due_date,
      CASE
        WHEN so.payment_status = 'paid' THEN 'paid'
        WHEN CURRENT_DATE > so.order_date + c.payment_terms THEN 'overdue'
        ELSE 'pending'
      END AS aging_status,
      GREATEST(0, CURRENT_DATE - (so.order_date + c.payment_terms)) AS overdue_days
    FROM sales_orders so
    JOIN customers c ON c.id = so.customer_id
    WHERE so.status = 'delivered'
  `;
  const params = [];

  if (customerId) {
    params.push(customerId);
    query += ` AND so.customer_id = $${params.length}`;
  }
  if (status === 'overdue') {
    query += ` AND CURRENT_DATE > so.order_date + c.payment_terms AND so.payment_status != 'paid'`;
  }

  query += ` ORDER BY due_date ASC`;
  const result = await db.query(query, params);
  res.json({ receivables: result.rows });
});
```

---

## 4. 庫存管理

### 4.1 即時庫存查詢

```javascript
router.get('/api/inventory', async (req, res) => {
  const { category, warehouse, lowStock, keyword } = req.query;

  let query = `
    SELECT
      p.*,
      CASE
        WHEN p.current_stock = 0 THEN 'out_of_stock'
        WHEN p.current_stock <= p.safety_stock THEN 'low'
        WHEN p.current_stock <= p.safety_stock * 1.5 THEN 'warning'
        ELSE 'normal'
      END AS stock_status,
      p.current_stock * p.cost_price AS stock_value
    FROM products p
    WHERE p.is_active = true
  `;
  const params = [];

  if (category) { params.push(category); query += ` AND p.category = $${params.length}`; }
  if (warehouse) { params.push(warehouse); query += ` AND p.warehouse = $${params.length}`; }
  if (lowStock === 'true') { query += ` AND p.current_stock <= p.safety_stock`; }
  if (keyword) { params.push(`%${keyword}%`); query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`; }

  query += ` ORDER BY p.sku`;

  const result = await db.query(query, params);
  const totalValue = result.rows.reduce((sum, r) => sum + parseFloat(r.stock_value || 0), 0);

  res.json({
    products: result.rows,
    summary: {
      totalProducts: result.rows.length,
      totalValue: Math.round(totalValue),
      lowStockCount: result.rows.filter(r => r.stock_status === 'low').length,
      outOfStockCount: result.rows.filter(r => r.stock_status === 'out_of_stock').length,
    }
  });
});
```

### 4.2 安全存量警告

```javascript
// 定時檢查（每天早上 8 點）
async function checkSafetyStock() {
  const alerts = await db.query(`
    SELECT sku, name, unit, current_stock, safety_stock, warehouse
    FROM products
    WHERE is_active = true AND current_stock <= safety_stock
    ORDER BY current_stock / NULLIF(safety_stock, 0) ASC
  `);

  if (alerts.rows.length > 0) {
    // 發送通知
    await sendNotification({
      title: `庫存警告：${alerts.rows.length} 項商品低於安全存量`,
      body: alerts.rows.map(a =>
        `${a.sku} ${a.name}：剩 ${a.current_stock} ${a.unit}（安全量 ${a.safety_stock}）`
      ).join('\n'),
    });
  }

  return alerts.rows;
}
```

### 4.3 盤點作業

```javascript
// 建立盤點單
router.post('/api/inventory/stocktake', async (req, res) => {
  const { warehouse, category } = req.body;

  // 取得要盤點的商品
  let query = `SELECT id, sku, name, unit, current_stock, warehouse FROM products WHERE is_active = true`;
  const params = [];
  if (warehouse) { params.push(warehouse); query += ` AND warehouse = $${params.length}`; }
  if (category) { params.push(category); query += ` AND category = $${params.length}`; }

  const products = await db.query(query, params);

  const stocktake = await db.query(`
    INSERT INTO stocktakes (warehouse, category, items, status, created_by)
    VALUES ($1, $2, $3, 'in_progress', $4) RETURNING *
  `, [
    warehouse || 'all',
    category || 'all',
    JSON.stringify(products.rows.map(p => ({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      system_stock: p.current_stock,
      actual_stock: null,  // 待盤點
      difference: null,
    }))),
    req.user.name
  ]);

  res.json(stocktake.rows[0]);
});

// 提交盤點結果
router.post('/api/inventory/stocktake/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  // items: [{ product_id, actual_stock }]

  for (const item of items) {
    const product = await db.query(`SELECT current_stock FROM products WHERE id = $1`, [item.product_id]);
    const systemStock = product.rows[0].current_stock;
    const diff = item.actual_stock - systemStock;

    if (diff !== 0) {
      // 庫存調整
      await db.query(`UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2`,
        [item.actual_stock, item.product_id]);

      await db.query(`
        INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id, before_stock, after_stock, note, created_by)
        VALUES ($1, 'adjust', $2, 'stocktake', $3, $4, $5, $6, $7)
      `, [item.product_id, diff, id, systemStock, item.actual_stock,
          `盤點調整：系統 ${systemStock} → 實際 ${item.actual_stock}`, req.user.name]);
    }
  }

  await db.query(`UPDATE stocktakes SET status = 'completed', items = $1 WHERE id = $2`,
    [JSON.stringify(items), id]);

  res.json({ success: true });
});
```

### 4.4 調撥（倉庫間移動）

```javascript
router.post('/api/inventory/transfer', async (req, res) => {
  const { productId, fromWarehouse, toWarehouse, quantity, note } = req.body;

  // 來源倉庫扣減
  await db.query(`
    UPDATE products SET current_stock = current_stock - $1
    WHERE id = $2 AND warehouse = $3
  `, [quantity, productId, fromWarehouse]);

  // 目標倉庫增加（如果目標倉庫沒有此商品，新增一筆）
  const existing = await db.query(
    `SELECT id FROM products WHERE sku = (SELECT sku FROM products WHERE id = $1) AND warehouse = $2`,
    [productId, toWarehouse]
  );

  if (existing.rows.length > 0) {
    await db.query(`UPDATE products SET current_stock = current_stock + $1 WHERE id = $2`,
      [quantity, existing.rows[0].id]);
  }

  // 記錄異動
  await db.query(`
    INSERT INTO inventory_transactions (product_id, type, quantity, note, created_by)
    VALUES ($1, 'transfer', $2, $3, $4)
  `, [productId, -quantity, `調撥：${fromWarehouse} → ${toWarehouse}`, req.user.name]);

  res.json({ success: true });
});
```

---

## 5. 報表中心

### 5.1 損益表

```javascript
router.get('/api/reports/pnl', async (req, res) => {
  const { startDate, endDate } = req.query;

  // 銷售收入
  const revenue = await db.query(`
    SELECT COALESCE(SUM(total), 0) AS total_revenue,
           COALESCE(SUM(discount), 0) AS total_discount
    FROM sales_orders
    WHERE status IN ('delivered', 'shipped')
      AND order_date BETWEEN $1 AND $2
  `, [startDate, endDate]);

  // 銷售成本（COGS）
  const cogs = await db.query(`
    SELECT COALESCE(SUM(
      (item->>'qty')::DECIMAL * (
        SELECT cost_price FROM products WHERE id = (item->>'product_id')::UUID
      )
    ), 0) AS total_cogs
    FROM sales_orders,
      jsonb_array_elements(items) AS item
    WHERE status IN ('delivered', 'shipped')
      AND order_date BETWEEN $1 AND $2
  `, [startDate, endDate]);

  // 進貨成本
  const purchases = await db.query(`
    SELECT COALESCE(SUM(total), 0) AS total_purchases
    FROM purchase_orders
    WHERE status = 'received'
      AND order_date BETWEEN $1 AND $2
  `, [startDate, endDate]);

  const totalRevenue = parseFloat(revenue.rows[0].total_revenue);
  const totalCogs = parseFloat(cogs.rows[0].total_cogs);
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0;

  res.json({
    period: { start: startDate, end: endDate },
    revenue: totalRevenue,
    discount: parseFloat(revenue.rows[0].total_discount),
    cogs: totalCogs,
    grossProfit,
    grossMargin: `${grossMargin}%`,
    purchases: parseFloat(purchases.rows[0].total_purchases),
  });
});
```

### 5.2 庫存周轉率

```javascript
router.get('/api/reports/inventory-turnover', async (req, res) => {
  const { year } = req.query;

  const result = await db.query(`
    SELECT
      p.sku,
      p.name,
      p.category,
      p.current_stock,
      p.cost_price,
      p.current_stock * p.cost_price AS stock_value,
      COALESCE(sales.total_sold, 0) AS total_sold,
      COALESCE(sales.total_sold * p.cost_price, 0) AS cogs,
      CASE
        WHEN p.current_stock > 0
        THEN ROUND(COALESCE(sales.total_sold, 0)::DECIMAL / p.current_stock, 2)
        ELSE 0
      END AS turnover_rate,
      CASE
        WHEN COALESCE(sales.avg_monthly_sold, 0) > 0
        THEN ROUND(p.current_stock / sales.avg_monthly_sold, 1)
        ELSE NULL
      END AS months_of_stock
    FROM products p
    LEFT JOIN (
      SELECT
        (item->>'product_id')::UUID AS product_id,
        SUM((item->>'qty')::DECIMAL) AS total_sold,
        SUM((item->>'qty')::DECIMAL) / 12.0 AS avg_monthly_sold
      FROM sales_orders,
        jsonb_array_elements(items) AS item
      WHERE status IN ('delivered', 'shipped')
        AND EXTRACT(YEAR FROM order_date) = $1
      GROUP BY (item->>'product_id')::UUID
    ) sales ON sales.product_id = p.id
    WHERE p.is_active = true
    ORDER BY turnover_rate DESC
  `, [year || new Date().getFullYear()]);

  res.json({ products: result.rows });
});
```

### 5.3 ABC 分析

```javascript
// ABC 分析：依銷售額將商品分為 A/B/C 三類
router.get('/api/reports/abc-analysis', async (req, res) => {
  const { startDate, endDate } = req.query;

  const result = await db.query(`
    WITH product_revenue AS (
      SELECT
        (item->>'product_id')::UUID AS product_id,
        (item->>'name') AS name,
        SUM((item->>'qty')::DECIMAL * (item->>'unit_price')::DECIMAL) AS revenue
      FROM sales_orders,
        jsonb_array_elements(items) AS item
      WHERE status IN ('delivered', 'shipped')
        AND order_date BETWEEN $1 AND $2
      GROUP BY (item->>'product_id')::UUID, (item->>'name')
    ),
    ranked AS (
      SELECT *,
        SUM(revenue) OVER () AS total_revenue,
        SUM(revenue) OVER (ORDER BY revenue DESC) AS cumulative_revenue
      FROM product_revenue
    )
    SELECT *,
      ROUND(revenue / total_revenue * 100, 2) AS revenue_pct,
      ROUND(cumulative_revenue / total_revenue * 100, 2) AS cumulative_pct,
      CASE
        WHEN cumulative_revenue / total_revenue <= 0.8 THEN 'A'
        WHEN cumulative_revenue / total_revenue <= 0.95 THEN 'B'
        ELSE 'C'
      END AS abc_class
    FROM ranked
    ORDER BY revenue DESC
  `, [startDate, endDate]);

  const summary = {
    A: { count: 0, revenue: 0 },
    B: { count: 0, revenue: 0 },
    C: { count: 0, revenue: 0 },
  };

  result.rows.forEach(r => {
    summary[r.abc_class].count++;
    summary[r.abc_class].revenue += parseFloat(r.revenue);
  });

  res.json({ products: result.rows, summary });
});
```

### 5.4 應收應付總覽

```javascript
router.get('/api/reports/ar-ap', async (req, res) => {
  // 應收（AR）
  const ar = await db.query(`
    SELECT
      COUNT(*) AS total_count,
      SUM(total) AS total_amount,
      SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS paid_amount,
      SUM(CASE WHEN payment_status != 'paid' THEN total ELSE 0 END) AS outstanding_amount,
      SUM(CASE WHEN payment_status != 'paid'
        AND CURRENT_DATE > order_date + (SELECT payment_terms FROM customers WHERE id = customer_id)
        THEN total ELSE 0 END) AS overdue_amount
    FROM sales_orders
    WHERE status = 'delivered'
  `);

  // 應付（AP）
  const ap = await db.query(`
    SELECT
      COUNT(*) AS total_count,
      SUM(total) AS total_amount,
      SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) AS paid_amount,
      SUM(CASE WHEN payment_status != 'paid' THEN total ELSE 0 END) AS outstanding_amount
    FROM purchase_orders
    WHERE status = 'received'
  `);

  res.json({
    accountsReceivable: ar.rows[0],
    accountsPayable: ap.rows[0],
  });
});
```

---

## 6. 前端設計原則

### 6.1 ERP 前端要點

| 原則 | 說明 |
|------|------|
| 表格為主 | ERP 就是大量表格，用 Ant Design Table 或 AG Grid |
| 篩選排序 | 每個欄位都可排序、篩選、搜尋 |
| 批次操作 | 勾選多筆後可批次核准/刪除/匯出 |
| 匯入匯出 | Excel 匯入商品/CSV 匯出報表 |
| 快捷鍵 | Enter=確認、Esc=取消、Tab=下一欄 |
| 列印友善 | 採購單/出貨單要能列印 |
| 權限控制 | 不同角色看到不同模組/按鈕 |

### 6.2 表格元件選型

| 元件 | 適用場景 | 特色 |
|------|---------|------|
| Ant Design Table | 中小資料量 (<1000 筆) | 內建篩選排序、簡單好用 |
| AG Grid | 大資料量 (萬筆以上) | 虛擬滾動、Excel 般操作 |
| TanStack Table | 客製需求高 | Headless、完全自定 UI |
| React Data Grid | 需要 Excel 輸入 | 儲存格直接編輯 |

### 6.3 匯入匯出

```javascript
// Excel 匯入（使用 xlsx 套件）
import * as XLSX from 'xlsx';

function importExcel(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      resolve(data);
    };
    reader.readAsArrayBuffer(file);
  });
}

// CSV 匯出
function exportCSV(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

---

## 7. 代碼範例

### 7.1 庫存表格 HTML/JS

```html
<!-- 庫存管理頁面 -->
<div id="inventory-page">
  <div class="page-header">
    <h1>庫存管理</h1>
    <div class="actions">
      <button onclick="exportInventory()">匯出 Excel</button>
      <button onclick="showStocktake()">盤點</button>
    </div>
  </div>

  <!-- 篩選列 -->
  <div class="filter-bar">
    <input type="text" id="inv-search" placeholder="搜尋商品名稱或編號..." oninput="filterInventory()">
    <select id="inv-category" onchange="filterInventory()">
      <option value="">全部分類</option>
      <option value="electronics">電子產品</option>
      <option value="accessories">配件</option>
      <option value="consumables">耗材</option>
    </select>
    <select id="inv-stock-filter" onchange="filterInventory()">
      <option value="">全部狀態</option>
      <option value="low">庫存不足</option>
      <option value="out">已缺貨</option>
      <option value="normal">庫存正常</option>
    </select>
    <select id="inv-warehouse" onchange="filterInventory()">
      <option value="">全部倉庫</option>
      <option value="main">主倉</option>
      <option value="branch">分倉</option>
    </select>
  </div>

  <!-- 庫存摘要 -->
  <div class="summary-cards">
    <div class="card">
      <h3>總品項</h3>
      <span id="total-products">0</span>
    </div>
    <div class="card">
      <h3>庫存總值</h3>
      <span id="total-value">$0</span>
    </div>
    <div class="card warning">
      <h3>庫存不足</h3>
      <span id="low-stock-count">0</span>
    </div>
    <div class="card danger">
      <h3>已缺貨</h3>
      <span id="out-stock-count">0</span>
    </div>
  </div>

  <!-- 庫存表格 -->
  <table id="inventory-table">
    <thead>
      <tr>
        <th><input type="checkbox" id="select-all" onclick="toggleSelectAll()"></th>
        <th onclick="sortTable('sku')">商品編號 <span class="sort-icon"></span></th>
        <th onclick="sortTable('name')">商品名稱</th>
        <th onclick="sortTable('category')">分類</th>
        <th onclick="sortTable('current_stock')">庫存量</th>
        <th>單位</th>
        <th onclick="sortTable('safety_stock')">安全存量</th>
        <th>狀態</th>
        <th onclick="sortTable('cost_price')">成本價</th>
        <th>庫存價值</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="inventory-body"></tbody>
  </table>

  <!-- 分頁 -->
  <div class="pagination">
    <button onclick="changePage(-1)">上一頁</button>
    <span id="page-info">第 1 頁，共 1 頁</span>
    <button onclick="changePage(1)">下一頁</button>
    <select id="page-size" onchange="loadInventory()">
      <option value="20">20 筆/頁</option>
      <option value="50">50 筆/頁</option>
      <option value="100">100 筆/頁</option>
    </select>
  </div>
</div>

<script>
let inventoryData = [];
let currentPage = 1;
let sortField = 'sku';
let sortDir = 'asc';

async function loadInventory() {
  const keyword = document.getElementById('inv-search').value;
  const category = document.getElementById('inv-category').value;
  const lowStock = document.getElementById('inv-stock-filter').value;
  const warehouse = document.getElementById('inv-warehouse').value;

  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (category) params.set('category', category);
  if (lowStock === 'low') params.set('lowStock', 'true');
  if (warehouse) params.set('warehouse', warehouse);

  const res = await fetch(`/api/inventory?${params}`);
  const data = await res.json();
  inventoryData = data.products;

  // 更新摘要
  document.getElementById('total-products').textContent = data.summary.totalProducts;
  document.getElementById('total-value').textContent = `$${data.summary.totalValue.toLocaleString()}`;
  document.getElementById('low-stock-count').textContent = data.summary.lowStockCount;
  document.getElementById('out-stock-count').textContent = data.summary.outOfStockCount;

  renderTable();
}

function renderTable() {
  const pageSize = parseInt(document.getElementById('page-size').value);
  const start = (currentPage - 1) * pageSize;
  const pageData = inventoryData.slice(start, start + pageSize);

  document.getElementById('inventory-body').innerHTML = pageData.map(p => `
    <tr class="${p.stock_status === 'out_of_stock' ? 'row-danger' : p.stock_status === 'low' ? 'row-warning' : ''}">
      <td><input type="checkbox" value="${p.id}" class="row-check"></td>
      <td>${p.sku}</td>
      <td>${p.name}</td>
      <td>${p.category || '-'}</td>
      <td class="number">${p.current_stock}</td>
      <td>${p.unit}</td>
      <td class="number">${p.safety_stock}</td>
      <td><span class="badge ${p.stock_status}">${getStockLabel(p.stock_status)}</span></td>
      <td class="number">$${parseFloat(p.cost_price).toLocaleString()}</td>
      <td class="number">$${parseFloat(p.stock_value || 0).toLocaleString()}</td>
      <td>
        <button class="btn-sm" onclick="editProduct('${p.id}')">編輯</button>
        <button class="btn-sm" onclick="adjustStock('${p.id}')">調整</button>
      </td>
    </tr>
  `).join('');

  const totalPages = Math.ceil(inventoryData.length / pageSize);
  document.getElementById('page-info').textContent = `第 ${currentPage} 頁，共 ${totalPages} 頁`;
}

function getStockLabel(status) {
  return { normal: '正常', warning: '偏低', low: '不足', out_of_stock: '缺貨' }[status] || status;
}

function sortTable(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }

  inventoryData.sort((a, b) => {
    const va = a[field], vb = b[field];
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir === 'asc' ? cmp : -cmp;
  });
  renderTable();
}

function filterInventory() { currentPage = 1; loadInventory(); }
function changePage(delta) {
  const totalPages = Math.ceil(inventoryData.length / parseInt(document.getElementById('page-size').value));
  currentPage = Math.max(1, Math.min(totalPages, currentPage + delta));
  renderTable();
}

loadInventory();
</script>
```

### 7.2 進貨表單 HTML/JS

```html
<!-- 建立採購單 -->
<div id="purchase-form">
  <h1>建立採購單</h1>

  <div class="form-row">
    <label>供應商</label>
    <select id="po-supplier" onchange="loadSupplierProducts()">
      <option value="">選擇供應商...</option>
    </select>
  </div>

  <div class="form-row">
    <label>預計到貨日</label>
    <input type="date" id="po-expected-date">
  </div>

  <!-- 採購品項 -->
  <table id="po-items-table">
    <thead>
      <tr>
        <th>商品</th>
        <th>目前庫存</th>
        <th>安全存量</th>
        <th>建議採購量</th>
        <th>採購數量</th>
        <th>單價</th>
        <th>小計</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="po-items-body"></tbody>
    <tfoot>
      <tr>
        <td colspan="5"><button onclick="addPoItem()">+ 新增品項</button></td>
        <td>小計</td>
        <td id="po-subtotal">$0</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="5"></td>
        <td>稅額 (5%)</td>
        <td id="po-tax">$0</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="5"></td>
        <td><strong>合計</strong></td>
        <td id="po-total"><strong>$0</strong></td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="form-row">
    <label>備註</label>
    <textarea id="po-note" rows="3"></textarea>
  </div>

  <div class="form-actions">
    <button onclick="savePoDraft()">儲存草稿</button>
    <button class="primary" onclick="submitPo()">送出採購單</button>
  </div>
</div>

<script>
let poItems = [];
let supplierProducts = [];

async function loadSuppliers() {
  const res = await fetch('/api/suppliers?status=active');
  const { suppliers } = await res.json();
  document.getElementById('po-supplier').innerHTML =
    '<option value="">選擇供應商...</option>' +
    suppliers.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('');
}

function addPoItem() {
  const idx = poItems.length;
  poItems.push({ product_id: '', qty: 1, unit_price: 0 });

  const row = document.createElement('tr');
  row.id = `po-row-${idx}`;
  row.innerHTML = `
    <td>
      <select onchange="onProductSelect(${idx}, this.value)">
        <option value="">選擇商品...</option>
        ${supplierProducts.map(p =>
          `<option value="${p.id}">${p.sku} - ${p.name}</option>`
        ).join('')}
      </select>
    </td>
    <td id="po-stock-${idx}">-</td>
    <td id="po-safety-${idx}">-</td>
    <td id="po-suggest-${idx}">-</td>
    <td><input type="number" min="1" value="1" onchange="updatePoItem(${idx}, 'qty', this.value)"></td>
    <td><input type="number" min="0" step="0.01" value="0" onchange="updatePoItem(${idx}, 'unit_price', this.value)"></td>
    <td id="po-line-total-${idx}">$0</td>
    <td><button onclick="removePoItem(${idx})">X</button></td>
  `;
  document.getElementById('po-items-body').appendChild(row);
}

function onProductSelect(idx, productId) {
  const product = supplierProducts.find(p => p.id === productId);
  if (!product) return;

  poItems[idx].product_id = productId;
  poItems[idx].unit_price = product.cost_price;
  const suggest = Math.max(0, product.safety_stock * 2 - product.current_stock);

  document.getElementById(`po-stock-${idx}`).textContent = product.current_stock;
  document.getElementById(`po-safety-${idx}`).textContent = product.safety_stock;
  document.getElementById(`po-suggest-${idx}`).textContent = suggest;

  poItems[idx].qty = suggest || 1;
  recalcPo();
}

function updatePoItem(idx, field, value) {
  poItems[idx][field] = parseFloat(value);
  recalcPo();
}

function recalcPo() {
  let subtotal = 0;
  poItems.forEach((item, idx) => {
    const lineTotal = item.qty * item.unit_price;
    subtotal += lineTotal;
    const el = document.getElementById(`po-line-total-${idx}`);
    if (el) el.textContent = `$${lineTotal.toLocaleString()}`;
  });

  const tax = Math.round(subtotal * 0.05);
  document.getElementById('po-subtotal').textContent = `$${subtotal.toLocaleString()}`;
  document.getElementById('po-tax').textContent = `$${tax.toLocaleString()}`;
  document.getElementById('po-total').innerHTML = `<strong>$${(subtotal + tax).toLocaleString()}</strong>`;
}

async function submitPo() {
  const supplierId = document.getElementById('po-supplier').value;
  if (!supplierId) return alert('請選擇供應商');
  if (poItems.length === 0) return alert('請新增品項');

  const res = await fetch('/api/purchase-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplierId,
      items: poItems.filter(i => i.product_id),
      expectedDate: document.getElementById('po-expected-date').value,
      note: document.getElementById('po-note').value,
    }),
  });

  const po = await res.json();
  alert(`採購單 ${po.po_number} 已建立`);
  window.location.href = `/purchase-orders/${po.id}`;
}

loadSuppliers();
</script>
```

### 7.3 報表圖表 HTML/JS

```html
<!-- 報表儀表板 -->
<div id="reports-dashboard">
  <div class="date-range">
    <input type="date" id="report-start" value="2026-03-01">
    <span>至</span>
    <input type="date" id="report-end" value="2026-03-07">
    <button onclick="loadReports()">查詢</button>
    <button onclick="setRange('week')">本週</button>
    <button onclick="setRange('month')">本月</button>
    <button onclick="setRange('quarter')">本季</button>
  </div>

  <!-- 損益摘要 -->
  <div class="pnl-cards">
    <div class="card"><h3>營業收入</h3><span id="pnl-revenue">$0</span></div>
    <div class="card"><h3>銷售成本</h3><span id="pnl-cogs">$0</span></div>
    <div class="card"><h3>毛利</h3><span id="pnl-gross">$0</span></div>
    <div class="card"><h3>毛利率</h3><span id="pnl-margin">0%</span></div>
  </div>

  <!-- 圖表區 -->
  <div class="charts-grid">
    <div class="chart-box">
      <h3>每日營收趨勢</h3>
      <canvas id="revenue-chart"></canvas>
    </div>
    <div class="chart-box">
      <h3>ABC 商品分析</h3>
      <canvas id="abc-chart"></canvas>
    </div>
    <div class="chart-box">
      <h3>庫存周轉率 TOP 10</h3>
      <canvas id="turnover-chart"></canvas>
    </div>
    <div class="chart-box">
      <h3>應收 vs 應付</h3>
      <canvas id="arap-chart"></canvas>
    </div>
  </div>
</div>

<!-- Chart.js CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>

<script>
let charts = {};

async function loadReports() {
  const start = document.getElementById('report-start').value;
  const end = document.getElementById('report-end').value;

  // 並行載入所有報表
  const [pnl, abc, turnover, arap] = await Promise.all([
    fetch(`/api/reports/pnl?startDate=${start}&endDate=${end}`).then(r => r.json()),
    fetch(`/api/reports/abc-analysis?startDate=${start}&endDate=${end}`).then(r => r.json()),
    fetch(`/api/reports/inventory-turnover?year=${start.slice(0, 4)}`).then(r => r.json()),
    fetch('/api/reports/ar-ap').then(r => r.json()),
  ]);

  // 損益摘要
  document.getElementById('pnl-revenue').textContent = `$${pnl.revenue.toLocaleString()}`;
  document.getElementById('pnl-cogs').textContent = `$${pnl.cogs.toLocaleString()}`;
  document.getElementById('pnl-gross').textContent = `$${pnl.grossProfit.toLocaleString()}`;
  document.getElementById('pnl-margin').textContent = pnl.grossMargin;

  // 營收趨勢圖（折線圖）
  renderChart('revenue-chart', 'line', {
    labels: generateDateRange(start, end),
    datasets: [{
      label: '營收',
      data: generateDateRange(start, end).map(() => Math.floor(Math.random() * 100000)), // 用實際資料替換
      borderColor: '#4CAF50',
      tension: 0.3,
    }]
  });

  // ABC 分析（圓餅圖）
  renderChart('abc-chart', 'doughnut', {
    labels: ['A 類（80% 營收）', 'B 類（15% 營收）', 'C 類（5% 營收）'],
    datasets: [{
      data: [abc.summary.A.count, abc.summary.B.count, abc.summary.C.count],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
    }]
  });

  // 庫存周轉率 TOP 10（橫條圖）
  const top10 = turnover.products.slice(0, 10);
  renderChart('turnover-chart', 'bar', {
    labels: top10.map(p => p.name),
    datasets: [{
      label: '周轉率',
      data: top10.map(p => p.turnover_rate),
      backgroundColor: '#2196F3',
    }]
  }, { indexAxis: 'y' });

  // 應收 vs 應付（堆疊長條圖）
  const ar = arap.accountsReceivable;
  const ap = arap.accountsPayable;
  renderChart('arap-chart', 'bar', {
    labels: ['應收帳款', '應付帳款'],
    datasets: [
      { label: '已收/已付', data: [parseFloat(ar.paid_amount), parseFloat(ap.paid_amount)], backgroundColor: '#4CAF50' },
      { label: '未收/未付', data: [parseFloat(ar.outstanding_amount), parseFloat(ap.outstanding_amount)], backgroundColor: '#FFC107' },
      { label: '逾期', data: [parseFloat(ar.overdue_amount || 0), 0], backgroundColor: '#F44336' },
    ]
  }, { scales: { x: { stacked: true }, y: { stacked: true } } });
}

function renderChart(canvasId, type, data, extraOptions = {}) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      ...extraOptions,
    },
  });
}

function generateDateRange(start, end) {
  const dates = [];
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    dates.push(d.toISOString().slice(5, 10)); // MM-DD
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function setRange(type) {
  const now = new Date();
  let start;
  if (type === 'week') { start = new Date(now); start.setDate(now.getDate() - now.getDay()); }
  else if (type === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (type === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), q, 1);
  }
  document.getElementById('report-start').value = start.toISOString().slice(0, 10);
  document.getElementById('report-end').value = now.toISOString().slice(0, 10);
  loadReports();
}

loadReports();
</script>
```

---

## 常見問題

| 問題 | 解法 |
|------|------|
| 庫存數量不一致 | 定期盤點 + 每次異動都記錄 inventory_transactions |
| 採購單重複建立 | 前端送出後 disable 按鈕，後端 po_number 唯一約束 |
| 大量商品匯入慢 | 用 COPY 或 batch insert，不要逐筆 INSERT |
| 報表查詢太慢 | 建立 materialized view，定時刷新 |
| 多倉庫同商品 | products 表加 warehouse 欄位，或獨立 warehouse_stock 表 |
| 小數精度問題 | 金額用 DECIMAL(12,2)，不要用 float |
| 權限太複雜 | 用 RBAC（角色權限），admin/manager/operator/viewer 四級 |
