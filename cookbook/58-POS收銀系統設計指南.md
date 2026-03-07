# 58 — POS 收銀系統設計指南

> 適用對象：台灣網頁設計接案者 / 餐飲零售業客戶 / 需要輕量 POS 方案的中小商家
> 最後更新：2026-03-07

---

## 目錄

1. [POS 系統核心功能](#1-pos-系統核心功能)
2. [UI 設計原則](#2-ui-設計原則)
3. [前端實作：商品網格與分類快選](#3-前端實作商品網格與分類快選)
4. [購物車與結帳計算](#4-購物車與結帳計算)
5. [折扣與優惠券機制](#5-折扣與優惠券機制)
6. [報表功能](#6-報表功能)
7. [硬體串接考量](#7-硬體串接考量)
8. [離線運作（localStorage / IndexedDB）](#8-離線運作)
9. [完整代碼範例](#9-完整代碼範例)

---

## 1. POS 系統核心功能

### 1.1 功能清單

| 模組 | 功能項 | 優先級 |
|------|--------|--------|
| **商品管理** | 商品 CRUD、分類、圖片、條碼 | P0 |
| **快速結帳** | 商品點選加入購物車、數量調整、小計 | P0 |
| **找零計算** | 輸入收款金額、自動算找零 | P0 |
| **折扣/優惠券** | 單品折扣、全單折扣、優惠碼 | P1 |
| **會員管理** | 會員卡、儲值、消費紀錄 | P1 |
| **日結報表** | 營業額、交易筆數、付款方式統計 | P1 |
| **庫存管理** | 即時庫存扣減、低庫存警示 | P2 |
| **多店管理** | 分店切換、統一後台 | P2 |

### 1.2 資料結構設計

```typescript
// 商品
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  barcode?: string;
  image?: string;
  stock: number;
  isActive: boolean;
}

// 購物車項目
interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // 單品折扣金額
}

// 訂單
interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment: 'cash' | 'card' | 'linepay' | 'jkopay';
  receivedAmount: number;
  change: number;
  createdAt: string;
  cashier: string;
}
```

---

## 2. UI 設計原則

### 2.1 觸控友善設計

POS 系統多在平板或觸控螢幕上操作，UI 必須遵守以下原則：

| 原則 | 說明 | 建議數值 |
|------|------|----------|
| **大按鈕** | 手指點擊友善 | 最小 60x60px，建議 80x80px |
| **間距充足** | 防誤觸 | 按鈕間距 >= 8px |
| **高對比** | 在光線強的店面也能看清 | 白底深字或深底白字 |
| **字體大** | 收銀員快速辨識 | 商品名 16px+，價格 20px+ |
| **分類色塊** | 以顏色區分商品類別 | 每個分類一個色系 |

### 2.2 典型 Layout（三欄式）

```
+--------------------------------------------------+
|  Header: 店名 / 收銀員 / 日期時間              |
+----------+--------------------+------------------+
|          |                    |                  |
| 分類列表  |   商品網格          |   購物車         |
| (左側bar) |   (中間主區域)       |   (右側 sidebar) |
|          |   4x4 或 3x3 格     |                  |
|          |   每格顯示圖+名+價   |   商品列表       |
|          |                    |   小計           |
|          |                    |   折扣           |
|          |                    |   總計           |
|          |                    |   [結帳] 按鈕    |
+----------+--------------------+------------------+
```

---

## 3. 前端實作：商品網格與分類快選

### 3.1 分類快選

```html
<div class="category-bar">
  <button class="cat-btn active" data-cat="all"
          style="background:#6366f1">全部</button>
  <button class="cat-btn" data-cat="drink"
          style="background:#f59e0b">飲品</button>
  <button class="cat-btn" data-cat="food"
          style="background:#10b981">餐點</button>
  <button class="cat-btn" data-cat="dessert"
          style="background:#ec4899">甜點</button>
</div>
```

### 3.2 商品網格

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: calc(100vh - 80px);
}

.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  min-height: 100px;
  transition: transform 0.1s;
}

.product-card:active {
  transform: scale(0.95);
  background: #f0f0ff;
}

.product-card .name { font-size: 16px; font-weight: 600; }
.product-card .price { font-size: 20px; color: #e11d48; margin-top: 4px; }
```

---

## 4. 購物車與結帳計算

### 4.1 購物車邏輯

```javascript
class PosCart {
  constructor() {
    this.items = [];
    this.orderDiscount = 0; // 全單折扣
  }

  addItem(product) {
    const existing = this.items.find(i => i.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push({ product, quantity: 1, discount: 0 });
    }
    this.render();
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.product.id !== productId);
    this.render();
  }

  updateQuantity(productId, qty) {
    const item = this.items.find(i => i.product.id === productId);
    if (item) {
      if (qty <= 0) return this.removeItem(productId);
      item.quantity = qty;
    }
    this.render();
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity) - item.discount;
    }, 0);
  }

  getTotal() {
    return Math.max(0, this.getSubtotal() - this.orderDiscount);
  }

  clear() {
    this.items = [];
    this.orderDiscount = 0;
    this.render();
  }

  render() {
    const cartEl = document.getElementById('cart-items');
    cartEl.innerHTML = this.items.map(item => `
      <div class="cart-item">
        <span class="item-name">${item.product.name}</span>
        <div class="qty-controls">
          <button onclick="cart.updateQuantity('${item.product.id}', ${item.quantity - 1})">-</button>
          <span>${item.quantity}</span>
          <button onclick="cart.updateQuantity('${item.product.id}', ${item.quantity + 1})">+</button>
        </div>
        <span class="item-total">$${item.product.price * item.quantity}</span>
      </div>
    `).join('');

    document.getElementById('subtotal').textContent = `$${this.getSubtotal()}`;
    document.getElementById('total').textContent = `$${this.getTotal()}`;
  }
}

const cart = new PosCart();
```

### 4.2 找零計算

```javascript
function checkout() {
  const total = cart.getTotal();
  const received = parseInt(document.getElementById('received-input').value);

  if (isNaN(received) || received < total) {
    alert('收款金額不足');
    return;
  }

  const change = received - total;
  document.getElementById('change-display').textContent = `找零: $${change}`;

  // 建立訂單
  const order = {
    id: `ORD-${Date.now()}`,
    items: [...cart.items],
    subtotal: cart.getSubtotal(),
    discount: cart.orderDiscount,
    total,
    receivedAmount: received,
    change,
    payment: 'cash',
    createdAt: new Date().toISOString(),
    cashier: currentCashier
  };

  saveOrder(order);
  printReceipt(order);
  cart.clear();
}
```

### 4.3 快速收款按鈕

```html
<!-- 常用面額快速鍵 -->
<div class="quick-pay">
  <button onclick="quickPay(100)">$100</button>
  <button onclick="quickPay(500)">$500</button>
  <button onclick="quickPay(1000)">$1000</button>
  <button onclick="quickPay(cart.getTotal())">剛好</button>
</div>

<script>
function quickPay(amount) {
  document.getElementById('received-input').value = amount;
  checkout();
}
</script>
```

---

## 5. 折扣與優惠券機制

### 5.1 折扣類型

```javascript
const DiscountType = {
  PERCENT: 'percent',       // 打折（如 8 折）
  FIXED: 'fixed',           // 固定減價（如 折 $50）
  BUY_X_GET_Y: 'bxgy',     // 買 X 送 Y
  COUPON: 'coupon'          // 優惠碼
};

function applyDiscount(type, value) {
  switch (type) {
    case 'percent':
      // value = 80 代表 8 折
      cart.orderDiscount = Math.round(cart.getSubtotal() * (1 - value / 100));
      break;
    case 'fixed':
      cart.orderDiscount = value;
      break;
    case 'coupon':
      const coupon = lookupCoupon(value);
      if (coupon && coupon.valid) {
        applyDiscount(coupon.discountType, coupon.discountValue);
      } else {
        alert('優惠碼無效或已過期');
      }
      break;
  }
  cart.render();
}
```

### 5.2 優惠券驗證

```javascript
function lookupCoupon(code) {
  const coupons = JSON.parse(localStorage.getItem('coupons') || '[]');
  const coupon = coupons.find(c => c.code === code.toUpperCase());
  if (!coupon) return null;

  return {
    ...coupon,
    valid: new Date(coupon.expiresAt) > new Date() && coupon.usedCount < coupon.maxUses
  };
}
```

---

## 6. 報表功能

### 6.1 日結報表

```javascript
function generateDailyReport(date) {
  const orders = getOrdersByDate(date);

  const report = {
    date,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((s, o) => s + o.total, 0),
    totalDiscount: orders.reduce((s, o) => s + o.discount, 0),
    paymentBreakdown: {
      cash: orders.filter(o => o.payment === 'cash').reduce((s, o) => s + o.total, 0),
      card: orders.filter(o => o.payment === 'card').reduce((s, o) => s + o.total, 0),
      linepay: orders.filter(o => o.payment === 'linepay').reduce((s, o) => s + o.total, 0),
    },
    topProducts: getTopProducts(orders, 10),
    avgOrderValue: orders.length > 0
      ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length)
      : 0
  };

  return report;
}

function getTopProducts(orders, limit) {
  const productMap = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const id = item.product.id;
      if (!productMap[id]) {
        productMap[id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productMap[id].qty += item.quantity;
      productMap[id].revenue += item.product.price * item.quantity;
    });
  });

  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
```

### 6.2 報表顯示

```html
<div class="report-card">
  <h2>日結報表 — <span id="report-date"></span></h2>
  <div class="stats-grid">
    <div class="stat"><label>交易筆數</label><span id="r-orders">0</span></div>
    <div class="stat"><label>營業額</label><span id="r-revenue">$0</span></div>
    <div class="stat"><label>折扣總額</label><span id="r-discount">$0</span></div>
    <div class="stat"><label>平均客單價</label><span id="r-avg">$0</span></div>
  </div>
  <h3>付款方式</h3>
  <table>
    <tr><td>現金</td><td id="r-cash">$0</td></tr>
    <tr><td>信用卡</td><td id="r-card">$0</td></tr>
    <tr><td>LINE Pay</td><td id="r-linepay">$0</td></tr>
  </table>
  <h3>熱門商品 Top 10</h3>
  <table id="r-top-products"></table>
</div>
```

---

## 7. 硬體串接考量

### 7.1 常見 POS 硬體

| 硬體 | 用途 | 串接方式 | 台灣常見品牌 |
|------|------|----------|-------------|
| **感熱印表機** | 列印收據 | USB / 藍牙 / 網路 | EPSON TM-T82、Star |
| **掃碼槍** | 掃商品條碼 | USB HID（模擬鍵盤）| Honeywell、Zebra |
| **錢箱** | 收納現金 | 印表機 RJ11 觸發 | 通用型 |
| **客顯螢幕** | 顯示金額給客人看 | USB / 串口 | EPSON DM-D30 |
| **標籤機** | 列印商品標籤 | USB / 藍牙 | Brother QL |

### 7.2 感熱印表機（Web 方案）

```javascript
// 方案一：Web Serial API（Chrome 支援）
async function printReceipt(order) {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const encoder = new TextEncoder();

    // ESC/POS 指令
    const ESC = '\x1B';
    const GS = '\x1D';

    let receipt = '';
    receipt += `${ESC}@`;              // 初始化
    receipt += `${ESC}a\x01`;          // 置中
    receipt += `${GS}!\x11`;           // 放大字體
    receipt += '老蔡的店\n';
    receipt += `${GS}!\x00`;           // 恢復正常
    receipt += '========================\n';

    order.items.forEach(item => {
      const name = item.product.name.padEnd(12);
      const qty = `x${item.quantity}`.padStart(4);
      const price = `$${item.product.price * item.quantity}`.padStart(8);
      receipt += `${name}${qty}${price}\n`;
    });

    receipt += '========================\n';
    receipt += `總計: $${order.total}\n`;
    receipt += `收款: $${order.receivedAmount}\n`;
    receipt += `找零: $${order.change}\n`;
    receipt += `${ESC}d\x03`;          // 進紙 3 行
    receipt += `${GS}V\x00`;           // 切紙

    await writer.write(encoder.encode(receipt));
    writer.releaseLock();
    await port.close();
  } catch (err) {
    console.error('列印失敗:', err);
  }
}
```

### 7.3 掃碼槍

掃碼槍接 USB 後會模擬鍵盤輸入，直接監聽鍵盤事件即可：

```javascript
let barcodeBuffer = '';
let barcodeTimer = null;

document.addEventListener('keydown', (e) => {
  // 掃碼槍會快速連續輸入字元，最後送 Enter
  if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
    const barcode = barcodeBuffer;
    barcodeBuffer = '';
    handleBarcodeScan(barcode);
    return;
  }

  if (e.key.length === 1) {
    barcodeBuffer += e.key;
    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 100);
  }
});

function handleBarcodeScan(barcode) {
  const product = products.find(p => p.barcode === barcode);
  if (product) {
    cart.addItem(product);
  } else {
    alert(`找不到條碼 ${barcode} 對應的商品`);
  }
}
```

---

## 8. 離線運作

### 8.1 為什麼 POS 必須支援離線

店面網路斷線不能停止營業。POS 必須能在離線狀態下正常收銀，待網路恢復後同步資料。

### 8.2 IndexedDB 儲存方案

```javascript
const DB_NAME = 'PosDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('orders')) {
        const store = db.createObjectStore('orders', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 儲存訂單（離線也能存）
async function saveOrder(order) {
  const db = await openDB();
  const tx = db.transaction('orders', 'readwrite');
  tx.objectStore('orders').put({ ...order, synced: false });
  await tx.complete;
}

// 網路恢復後同步
async function syncOrders() {
  const db = await openDB();
  const tx = db.transaction('orders', 'readonly');
  const index = tx.objectStore('orders').index('synced');
  const unsyncedOrders = await index.getAll(false);

  for (const order of unsyncedOrders) {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      // 標記已同步
      const txUpdate = db.transaction('orders', 'readwrite');
      txUpdate.objectStore('orders').put({ ...order, synced: true });
    } catch (e) {
      console.log('同步失敗，稍後重試:', order.id);
    }
  }
}

// 監聽網路狀態
window.addEventListener('online', syncOrders);
```

### 8.3 Service Worker 離線快取

```javascript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pos-v1').then(cache => {
      return cache.addAll([
        '/', '/index.html', '/pos.css', '/pos.js',
        '/products.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 9. 完整代碼範例

### 9.1 最小可用 POS（單檔 HTML）

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POS 收銀機</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Microsoft JhengHei', sans-serif; display: flex; height: 100vh; }
    .categories { width: 100px; background: #1e293b; color: #fff; padding: 8px; }
    .cat-btn { width: 100%; padding: 16px 8px; margin-bottom: 4px; border: none;
               border-radius: 8px; color: #fff; font-size: 14px; cursor: pointer; }
    .cat-btn.active { outline: 3px solid #fff; }
    .products { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr);
                gap: 8px; padding: 12px; overflow-y: auto; align-content: start; }
    .prod-btn { padding: 16px; border: none; border-radius: 12px; background: #f8fafc;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; text-align: center; }
    .prod-btn:active { transform: scale(0.95); }
    .prod-btn .name { font-size: 16px; font-weight: 600; }
    .prod-btn .price { font-size: 20px; color: #e11d48; }
    .cart-panel { width: 320px; background: #f1f5f9; display: flex; flex-direction: column; }
    .cart-header { padding: 16px; background: #334155; color: #fff; font-size: 18px; }
    .cart-items { flex: 1; overflow-y: auto; padding: 8px; }
    .cart-item { display: flex; justify-content: space-between; align-items: center;
                 padding: 8px; background: #fff; margin-bottom: 4px; border-radius: 8px; }
    .cart-footer { padding: 16px; background: #fff; border-top: 2px solid #e2e8f0; }
    .total-line { display: flex; justify-content: space-between; font-size: 24px;
                  font-weight: 700; margin-bottom: 12px; }
    .checkout-btn { width: 100%; padding: 16px; background: #16a34a; color: #fff;
                    border: none; border-radius: 12px; font-size: 20px; cursor: pointer; }
    .checkout-btn:active { background: #15803d; }
  </style>
</head>
<body>
  <div class="categories" id="categories"></div>
  <div class="products" id="products"></div>
  <div class="cart-panel">
    <div class="cart-header">購物車</div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-footer">
      <div class="total-line">
        <span>總計</span><span id="total">$0</span>
      </div>
      <button class="checkout-btn" onclick="openCheckout()">結帳</button>
    </div>
  </div>
  <script>
    // 略 — 使用上方 PosCart class + 商品資料即可運行
  </script>
</body>
</html>
```

---

## 小結

| 要點 | 說明 |
|------|------|
| 觸控優先 | 所有按鈕 >= 60px，間距足夠 |
| 離線必備 | IndexedDB + Service Worker，斷網照常收銀 |
| 硬體漸進 | 先做純軟體，再加印表機/掃碼槍 |
| 報表即時 | 日結報表存 IndexedDB，支援匯出 CSV |
| 安全 | 收銀員帳號分權，操作紀錄不可竄改 |
