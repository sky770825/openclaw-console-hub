# 美業網站店家管理後端開發報告

## 實作功能清單
1. **店家資訊管理**：支援店名、地址、聯絡方式的讀取與更新。
2. **服務項目管理**：支援新增服務（名稱、價格、時長），自動生成 ID。
3. **營業時間管理**：支援各日營業時段設定及公休日標記。
4. **作品集管理**：支援作品新增（標題、圖片路徑、描述）。

## 技術細節
- **資料存儲**：採用 JSON 文件作為輕量級資料庫 (/Users/sky770825/.openclaw/workspace/sandbox/shop_db.json)。
- **邏輯控制**：使用 Node.js (ES Module) 編寫管理工具 (/Users/sky770825/.openclaw/workspace/scripts/shop_manager.js)。
- **環境適應**：已修正對 `type: module` 環境的支援，確保在 macOS 環境下正常運作。

## 管理工具用法
- 獲取資訊：`node shop_manager.js get-info`
- 新增服務：`node shop_manager.js add-service '{"name": "新服務", "price": 100, "duration": 30}'`

## 資料狀態
```json
{
  "shopInfo": {
    "name": "主人的美業工坊",
    "address": "台北市大安區忠孝東路四段",
    "contact": "0912-345-678"
  },
  "services": [
    {
      "id": 1,
      "name": "精緻剪髮",
      "price": 800,
      "duration": 60
    },
    {
      "id": 2,
      "name": "深層護髮",
      "price": 1500,
      "duration": 90
    },
    {
      "name": "韓式燙髮",
      "price": 3200,
      "duration": 180,
      "id": 3
    }
  ],
  "businessHours": {
    "monday": {
      "open": "10:00",
      "close": "20:00",
      "isClosed": false
    },
    "tuesday": {
      "open": "10:00",
      "close": "20:00",
      "isClosed": false
    },
    "wednesday": {
      "open": "10:00",
      "close": "20:00",
      "isClosed": false
    },
    "thursday": {
      "open": "10:00",
      "close": "20:00",
      "isClosed": false
    },
    "friday": {
      "open": "10:00",
      "close": "20:00",
      "isClosed": false
    },
    "saturday": {
      "open": "11:00",
      "close": "18:00",
      "isClosed": false
    },
    "sunday": {
      "open": "12:00",
      "close": "17:00",
      "isClosed": false
    }
  },
  "portfolio": [
    {
      "id": 1,
      "title": "夏季清爽短髮",
      "imageUrl": "/assets/p1.jpg",
      "description": "適合夏天的俐落短髮"
    },
    {
      "title": "精緻染髮作品",
      "imageUrl": "/images/portfolio/dye1.jpg",
      "description": "霧感灰褐色",
      "id": 2
    }
  ]
}
```
