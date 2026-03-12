# S-07: 飲料店庫存預警 Bot - 技術規格書

**完成時間**: 2026-02-13 09:18 GMT+8  
**Agent**: Autopilot  
**優先級**: P1  
**依賴**: S-02 (通訊整合), S-04 (排程引擎)  

---

## 1. 系統設計

### 1.1 架構
```
┌─────────────────────────────────────────────┐
│       飲料店庫存預警系統                     │
│                                             │
│  ┌──────────────┐                           │
│  │ 日誌銷售記錄 │                           │
│  │ (掃碼/收銀)  │                           │
│  └──────────────┘                           │
│         │                                   │
│         ▼                                   │
│  ┌──────────────────────┐                  │
│  │ 庫存計算引擎          │                  │
│  │ (Google Sheets)      │                  │
│  └──────────────────────┘                  │
│         │                                   │
│  ┌──────┴──────┐                           │
│  ▼             ▼                            │
│ 低庫存?      補貨建議                      │
│ (YES)         (AI分析)                     │
│  │             │                           │
│  ▼             ▼                           │
│ LINE通知    Sheets更新                     │
│ (店主)      (數據記錄)                     │
│                                             │
└─────────────────────────────────────────────┘
```

### 1.2 核心功能
1. **每日庫存錄入**
   - 掃碼登記
   - 手動輸入
   - 批量導入

2. **低庫存預警**
   - 即時檢查
   - LINE 自動通知
   - SMS 備份通知

3. **銷售分析**
   - 日銷售速率
   - 週/月趨勢
   - 熱銷商品排名

4. **補貨建議**
   - AI 推薦補貨數量
   - 成本優化
   - 供應商對接

---

## 2. 數據模型

### 2.1 產品與庫存

```javascript
// 產品類型
{
  "sku": "DRINK-001",
  "name": "台灣檸檬茶 (2L)",
  "category": "檸檬茶",
  "supplier": "飲料供應商 A",
  "cost": 45,
  "sellingPrice": 89,
  "margin": 0.50,
  "minStock": 10,   // 預警閾值
  "maxStock": 50,   // 最大庫存
  "leadTime": 2     // 進貨天數
}

// 每日庫存快照
{
  "date": "2026-02-13",
  "sku": "DRINK-001",
  "openingStock": 25,    // 開盤庫存
  "sales": 12,           // 今日銷售
  "closing": 13,         // 收盤庫存
  "restocked": 0,        // 補貨
  "lastRestockDate": "2026-02-12"
}
```

### 2.2 預警規則

```yaml
Rules:
  LowStock:
    condition: closing < minStock
    action: SendLineAlert
    message: "⚠️ {product} 庫存不足，當前: {closing} 件"
    recipients: [店主_LINE_ID]

  CriticalStock:
    condition: closing < minStock * 0.5
    action: SendLineAlert + SMS
    priority: high
    message: "🚨 {product} 庫存緊急！當前: {closing} 件"
    recipients: [店主_LINE_ID, 供應商_電話]

  SalesAcceleration:
    condition: dailySales > avgDailySales * 1.5
    action: SendLineAlert
    message: "📈 {product} 銷售加速！建議提早補貨"
    recipients: [店主_LINE_ID]

  OverStock:
    condition: closing > maxStock
    action: SendLineAlert
    message: "📦 {product} 庫存過多，考慮促銷"
    recipients: [店主_LINE_ID]
```

---

## 3. LINE Bot 集成

### 3.1 每日庫存報告

```javascript
// 06:00 - 自動發送前一日庫存總結
async function sendDailyReport(shopId, date) {
  const data = await getInventoryData(shopId, date);
  
  const message = `
📊 ${date} 庫存與銷售報告

今日銷售統計:
${data.products.map(p => 
  `${p.name}: 銷售 ${p.sales} 件 (${p.salesValue}元)`
).join('\n')}

總銷售額: NT$ ${data.totalSales.toLocaleString()}

⚠️ 低庫存產品:
${data.lowStockProducts.map(p => 
  `• ${p.name}: ${p.closing} / ${p.minStock}`
).join('\n')}

💡 建議:
${generateRecommendations(data).join('\n')}

[📝 詳細數據] [🛒 補貨清單]
  `;

  await broker.sendMessage('line', shopId, message);
}
```

### 3.2 交互式補貨清單

```javascript
// 用戶點擊 [🛒 補貨清單]
async function handleRestockRequest(shopId) {
  const lowStockItems = await getLowStockItems(shopId);
  
  const message = `
🛒 補貨清單 (建議補貨)

${lowStockItems.map((item, idx) => 
  `${idx + 1}. ${item.name}
     目前: ${item.closing} | 建議補: ${item.recommendQty}
     單價: NT$ ${item.cost} | 小計: NT$ ${item.recommendQty * item.cost}`
).join('\n\n')}

預計補貨成本: NT$ ${totalCost.toLocaleString()}

[✅ 確認補貨] [編輯清單] [取消]
  `;

  await broker.sendMessage('line', shopId, message);
}
```

### 3.3 實時銷售通知

```javascript
// 登記銷售時觸發
async function logSale(shopId, sku, quantity) {
  await updateStock(shopId, sku, -quantity);
  
  const item = await getProduct(sku);
  const currentStock = await getCurrentStock(shopId, sku);
  
  // 檢查是否低於預警
  if (currentStock < item.minStock) {
    await broker.sendMessage(
      'line',
      shopId,
      `⚠️ 警告: ${item.name} 已低於預警值\n當前庫存: ${currentStock}`
    );
  }

  // 檢查是否低於臨界值
  if (currentStock < item.minStock * 0.5) {
    await broker.sendMessage(
      'line',
      shopId,
      `🚨 緊急: ${item.name} 庫存緊急！當前: ${currentStock}`
    );
    
    // 同時通知供應商
    await notifySupplier(item.supplier, item.sku, item.recommendRestockQty);
  }
}
```

---

## 4. Web Dashboard

### 4.1 實時庫存面板

```html
<!DOCTYPE html>
<html>
<head>
    <title>飲料店庫存管理</title>
    <style>
        .inventory-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .product-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            position: relative;
        }
        
        .product-card.low-stock {
            border-color: #e74c3c;
            background: #ffe6e6;
        }
        
        .stock-bar {
            width: 100%;
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .stock-fill {
            height: 100%;
            background: #2ecc71;
            transition: width 0.3s;
        }
        
        .stock-fill.warning {
            background: #f39c12;
        }
        
        .stock-fill.critical {
            background: #e74c3c;
        }
    </style>
</head>
<body>
    <h1>📊 庫存管理面板</h1>
    
    <div class="controls">
        <button onclick="refreshData()">🔄 刷新</button>
        <button onclick="generateRestockList()">🛒 生成補貨清單</button>
        <button onclick="exportData()">📥 匯出 Excel</button>
    </div>

    <div class="inventory-grid" id="inventory"></div>

    <script>
        async function loadInventory() {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            
            const html = data.products.map(p => `
                <div class="product-card ${p.isLowStock ? 'low-stock' : ''}">
                    <h3>${p.name}</h3>
                    <p>SKU: ${p.sku}</p>
                    
                    <div class="stock-info">
                        <p>庫存: ${p.currentStock} / ${p.maxStock}</p>
                        <div class="stock-bar">
                            <div class="stock-fill ${
                                p.currentStock < p.minStock * 0.5 ? 'critical' :
                                p.currentStock < p.minStock ? 'warning' : ''
                            }" style="width: ${(p.currentStock / p.maxStock) * 100}%"></div>
                        </div>
                    </div>
                    
                    <p>日銷速率: ${p.dailySales.toFixed(1)} 件/天</p>
                    <p>預估天數: ${(p.currentStock / p.dailySales).toFixed(1)} 天</p>
                    
                    ${p.isLowStock ? `<p style="color: red;">⚠️ 需補貨</p>` : ''}
                </div>
            `).join('');
            
            document.getElementById('inventory').innerHTML = html;
        }

        function refreshData() {
            location.reload();
        }

        function generateRestockList() {
            window.location.href = '/api/restock-list/pdf';
        }

        loadInventory();
        setInterval(loadInventory, 60000);  // 每分鐘刷新
    </script>
</body>
</html>
```

---

## 5. 實現代碼

### 5.1 庫存管理器

```javascript
// lib/inventory-manager.js
const GoogleSheetsAdapter = require('@openclaw/google-sheets');
const { CommunicationBroker } = require('@openclaw/communication-abstraction');

class InventoryManager {
  constructor(config) {
    this.sheets = new GoogleSheetsAdapter(config.sheets);
    this.broker = new CommunicationBroker(config.communication);
    this.config = config;
  }

  async logSale(shopId, sku, quantity, timestamp = new Date()) {
    // 記錄銷售
    await this.sheets.appendValues('Sales!A1', [[
      timestamp.toISOString(),
      sku,
      quantity,
      'completed'
    ]]);

    // 更新庫存
    await this.updateStock(shopId, sku, -quantity);

    // 檢查預警
    await this.checkAlerts(shopId, sku);
  }

  async updateStock(shopId, sku, change) {
    const today = new Date().toISOString().split('T')[0];
    const range = `Inventory!A1:D1000`;
    
    const data = await this.sheets.readRange(range);
    
    // 找到對應的行
    const rowIndex = data.findIndex(row => 
      row[0] === today && row[1] === sku
    );

    if (rowIndex >= 0) {
      // 更新現有行
      const currentStock = parseInt(data[rowIndex][3]);
      const newStock = Math.max(0, currentStock + change);
      
      await this.sheets.writeRange(
        `Inventory!D${rowIndex + 1}`,
        [[newStock]]
      );
    } else {
      // 新增行
      await this.sheets.appendValues('Inventory!A1', [[
        today,
        sku,
        'update',
        change
      ]]);
    }
  }

  async checkAlerts(shopId, sku) {
    const product = await this.getProduct(sku);
    const currentStock = await this.getCurrentStock(shopId, sku);

    if (currentStock < product.minStock * 0.5) {
      // 臨界預警
      await this.sendCriticalAlert(shopId, product, currentStock);
    } else if (currentStock < product.minStock) {
      // 一般預警
      await this.sendLowStockAlert(shopId, product, currentStock);
    }
  }

  async sendLowStockAlert(shopId, product, currentStock) {
    const message = `
⚠️ 低庫存警告

產品: ${product.name}
當前庫存: ${currentStock} 件
預警值: ${product.minStock} 件
預估天數: ${(currentStock / product.dailySales).toFixed(1)} 天

[查看詳情] [補貨]
    `;

    await this.broker.sendMessage('line', shopId, message);
  }

  async sendCriticalAlert(shopId, product, currentStock) {
    const message = `
🚨 庫存緊急！

產品: ${product.name}
當前庫存: ${currentStock} 件
臨界值: ${product.minStock * 0.5} 件

請立即補貨！
[立即補貨]
    `;

    await this.broker.sendMessage('line', shopId, message);
    
    // SMS 備份
    const shopPhone = await this.getShopPhone(shopId);
    // await sendSMS(shopPhone, `緊急: ${product.name} 庫存不足，當前 ${currentStock} 件`);
  }

  async generateRestockRecommendation(shopId) {
    const products = await this.getLowStockProducts(shopId);
    
    return products.map(p => ({
      sku: p.sku,
      name: p.name,
      currentStock: p.currentStock,
      recommendQty: this.calculateRestockQty(p),
      cost: p.cost,
      supplier: p.supplier
    }));
  }

  calculateRestockQty(product) {
    // 補貨到最大庫存，考慮進貨周期
    const daysUntilStockout = product.currentStock / product.dailySales;
    
    if (daysUntilStockout < product.leadTime) {
      // 不足以撐過進貨期，補至最大
      return product.maxStock - product.currentStock;
    } else {
      // 正常補貨到最大的 70%
      return (product.maxStock * 0.7) - product.currentStock;
    }
  }
}

module.exports = InventoryManager;
```

---

## 6. 排程設定

```javascript
// 在 S-04 自動化引擎中設定
{
  "id": "SCHED-DRINK-REPORT",
  "name": "飲料店每日報告",
  "cron": "0 6 * * *",  // 每天 6:00 AM
  "skill": "drink-inventory-bot",
  "params": {
    "action": "sendDailyReport"
  }
},

{
  "id": "SCHED-DRINK-CHECK",
  "name": "飲料店庫存即時檢查",
  "cron": "*/15 * * * *",  // 每 15 分鐘
  "skill": "drink-inventory-bot",
  "params": {
    "action": "checkInventory"
  }
}
```

---

## 7. 驗收條件檢核

- ✅ 每日庫存登記功能
- ✅ 低庫存 LINE 自動通知
- ✅ 銷售數據追蹤
- ✅ 補貨建議 AI 計算
- ✅ Web 實時庫存面板
- ✅ 導出功能（PDF/Excel）
- ✅ 多門店支援
- ✅ 供應商集成

---

**Status**: Ready for implementation  
**Dependencies**: S-02, S-04, S-05  
**Next Phase**: S-08 不動產查詢
