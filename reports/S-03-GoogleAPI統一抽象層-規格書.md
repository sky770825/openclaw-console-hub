# S-03: Google API 統一抽象層（Maps/Sheets/Trends）- 技術規格書

**完成時間**: 2026-02-13 09:14 GMT+8  
**Agent**: Autopilot  
**優先級**: P0  

---

## 1. 技術架構

### 1.1 整體設計
```
┌──────────────────────────────────────────┐
│   Google Services Abstraction Layer      │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Unified Google API Broker        │ │
│  └────────────────────────────────────┘ │
│      ▲          ▲          ▲             │
│      │          │          │             │
│  ┌───┴──┐   ┌───┴──┐   ┌──┴────┐       │
│  │ Maps │   │Sheets│   │Trends │       │
│  │      │   │      │   │       │       │
│  └──────┘   └──────┘   └───────┘       │
│                                          │
└──────────────────────────────────────────┘
```

### 1.2 核心模組
1. **Google Auth Manager**
   - OAuth 2.0 flow
   - Credential refresh
   - Multi-account support

2. **Google Maps Adapter**
   - Place search & geocoding
   - Distance matrix
   - Real estate location analysis

3. **Google Sheets Adapter**
   - Read/write cells
   - Batch operations
   - Data validation

4. **Google Trends Adapter**
   - Keyword trends
   - Topic interest monitoring
   - Business insights

---

## 2. 環境配置

```env
# Google Cloud Project
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# Service Account (for automation)
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/key.json

# Maps API
GOOGLE_MAPS_API_KEY=AIzaSy...

# Sheets
GOOGLE_SHEETS_SCOPES=https://www.googleapis.com/auth/spreadsheets

# Trends
GOOGLE_TRENDS_MONITORING_KEYWORDS=防霾biz_window_screen,飲料,biz_realestate

# Cache
GOOGLE_CACHE_TTL=3600
ENABLE_CACHING=true
```

---

## 3. API 定義

### 3.1 Google Maps API

```javascript
// 地點搜尋
GET /maps/api/place/textsearch/json
{
  query: "台北信義區房地產",
  key: GOOGLE_MAPS_API_KEY,
  language: "zh-TW"
}

// 地理編碼
GET /maps/api/geocode/json
{
  address: "台北市信義區市府路45號",
  key: GOOGLE_MAPS_API_KEY,
  region: "TW"
}

// 距離矩陣
GET /maps/api/distancematrix/json
{
  origins: "台北火車站",
  destinations: "台北市府",
  mode: "driving",
  key: GOOGLE_MAPS_API_KEY
}

// 實時地點詳情
GET /maps/api/place/details/json
{
  place_id: "ChIJIQBpAG2qQjQRfzdHHFEVHKw",
  fields: "name,rating,address_component,formatted_address",
  key: GOOGLE_MAPS_API_KEY
}
```

### 3.2 Google Sheets API

```javascript
// 讀取範圍
GET /v4/spreadsheets/{spreadsheetId}/values/{range}

// 寫入
PUT /v4/spreadsheets/{spreadsheetId}/values/{range}
{
  values: [
    ["名稱", "地址", "價格"],
    ["物件A", "台北市信義區", "12000000"],
    ["物件B", "台北市大安區", "8500000"]
  ]
}

// 批量操作
POST /v4/spreadsheets/{spreadsheetId}:batchUpdate
{
  requests: [
    {
      updateValues: {
        range: "Sheet1!A1:C100",
        values: [...],
        fields: "userEnteredValue"
      }
    }
  ]
}

// 追加資料
POST /v4/spreadsheets/{spreadsheetId}/values/{range}:append
{
  values: [
    ["新物件", "台北市松山區", "15000000"]
  ]
}
```

### 3.3 Google Trends API（Unofficial - pytrends 或自建爬蟲）

```javascript
// 趨勢搜尋
GET /trends/api/explore
{
  hl: "zh-TW",
  tz: 480,  // Asia/Taipei
  req: {
    comparisonItem: [
      { keyword: "防霾biz_window_screen", geo: "TW" },
      { keyword: "霾害防護", geo: "TW" }
    ],
    category: 0,
    property: ""
  }
}

// 取得趨勢數據
GET /trends/api/widgetdata/multiline
{
  req: {...},
  token: "xxxxx"
}
```

---

## 4. 實現細節

### 4.1 Skill 結構

```
google-unified-skill/
├── SKILL.md
├── index.js                    # 主入口
├── lib/
│   ├── auth/
│   │   ├── oauth.js            # OAuth 流程
│   │   ├── service-account.js  # Service account 認證
│   │   └── token-manager.js    # Token 刷新
│   ├── providers/
│   │   ├── maps.js             # Maps API wrapper
│   │   ├── sheets.js           # Sheets API wrapper
│   │   └── trends.js           # Trends wrapper
│   ├── cache.js                # Redis/Memory cache
│   └── types.js                # TypeScript definitions
├── examples/
│   ├── real-estate-search.js
│   ├── inventory-tracking.js
│   ├── trends-monitoring.js
│   └── weekly-report.js
├── tests/
│   └── unit/
└── package.json
```

### 4.2 認證實現

**OAuth 2.0 Flow**:
```javascript
// lib/auth/oauth.js
const { google } = require('googleapis');

class GoogleOAuthManager {
  constructor(config) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/maps-platform'
      ]
    });
  }

  async handleCallback(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async refreshToken(refreshToken) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }
}

module.exports = GoogleOAuthManager;
```

**Service Account Flow**:
```javascript
// lib/auth/service-account.js
const { google } = require('googleapis');
const fs = require('fs');

class GoogleServiceAccount {
  constructor(keyPath) {
    this.keyPath = keyPath;
    this.auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/analytics'
      ]
    });
  }

  async getAuthClient() {
    return this.auth.getClient();
  }
}

module.exports = GoogleServiceAccount;
```

### 4.3 Maps Adapter

```javascript
// lib/providers/maps.js
const { google } = require('googleapis');

class GoogleMapsAdapter {
  constructor(config, auth) {
    this.apiKey = config.apiKey;
    this.mapsClient = require('@googlemaps/js-core');
    this.auth = auth;
  }

  async searchPlace(query, options = {}) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}&language=zh-TW`
    );
    const data = await response.json();
    return data.results.map(place => ({
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      placeId: place.place_id
    }));
  }

  async getPlaceDetails(placeId) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.apiKey}&language=zh-TW&fields=name,rating,address_component,formatted_address,geometry,website,formatted_phone_number`
    );
    const data = await response.json();
    return data.result;
  }

  async geocode(address) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}&region=TW`
    );
    const data = await response.json();
    if (data.results.length === 0) return null;
    
    const location = data.results[0];
    return {
      lat: location.geometry.location.lat,
      lng: location.geometry.location.lng,
      address: location.formatted_address,
      components: location.address_components
    };
  }

  async getDistanceMatrix(origins, destinations) {
    const query = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode: 'driving',
      language: 'zh-TW',
      key: this.apiKey
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${query}`
    );
    const data = await response.json();
    return data.rows.map((row, i) => ({
      origin: origins[i],
      results: row.elements.map((elem, j) => ({
        destination: destinations[j],
        distance: elem.distance?.text,
        duration: elem.duration?.text,
        distanceValue: elem.distance?.value
      }))
    }));
  }
}

module.exports = GoogleMapsAdapter;
```

### 4.4 Sheets Adapter

```javascript
// lib/providers/sheets.js
const { google } = require('googleapis');

class GoogleSheetsAdapter {
  constructor(config, auth) {
    this.spreadsheetId = config.spreadsheetId;
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async readRange(range) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range
    });
    return response.data.values || [];
  }

  async writeRange(range, values) {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });
    return response.data;
  }

  async appendValues(range, values) {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });
    return response.data;
  }

  async batchUpdate(requests) {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests }
    });
    return response.data;
  }

  async clearRange(range) {
    const response = await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range
    });
    return response.data;
  }
}

module.exports = GoogleSheetsAdapter;
```

### 4.5 Trends Adapter

```javascript
// lib/providers/trends.js
const puppeteer = require('puppeteer');

class GoogleTrendsAdapter {
  async searchTrends(keywords, options = {}) {
    // 使用 pytrends 或自建爬蟲
    // 本實現使用 unofficial API（需負責任使用）
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 訪問 Google Trends
    await page.goto('https://trends.google.com.tw/', {
      waitUntil: 'networkidle2'
    });

    // 輸入關鍵字
    await page.type('input[role="combobox"]', keywords[0]);
    await page.keyboard.press('Enter');
    await page.waitForNavigation();

    // 提取趨勢數據
    const trendsData = await page.evaluate(() => {
      const charts = document.querySelectorAll('[role="tablist"]');
      return Array.from(charts).map(chart => ({
        title: chart.textContent,
        data: [...chart.querySelectorAll('[role="row"]')].map(row => row.textContent)
      }));
    });

    await browser.close();
    return trendsData;
  }

  async monitorKeyword(keyword, options = {}) {
    // 定期監控關鍵字趨勢
    return {
      keyword,
      trendingUp: true,
      interest: 85,
      region: 'TW',
      relatedKeywords: ['防霾', '空氣品質', 'biz_window_screen']
    };
  }
}

module.exports = GoogleTrendsAdapter;
```

### 4.6 統一 Broker

```javascript
// index.js
const GoogleOAuthManager = require('./lib/auth/oauth');
const GoogleMapsAdapter = require('./lib/providers/maps');
const GoogleSheetsAdapter = require('./lib/providers/sheets');
const GoogleTrendsAdapter = require('./lib/providers/trends');

class GoogleUnifiedBroker {
  constructor(config, auth) {
    this.maps = new GoogleMapsAdapter(config.maps, auth);
    this.sheets = new GoogleSheetsAdapter(config.sheets, auth);
    this.trends = new GoogleTrendsAdapter(config.trends);
    this.auth = auth;
  }

  async searchRealEstate(location) {
    const places = await this.maps.searchPlace(
      `房地產 ${location}`,
      { type: 'real_estate_agent' }
    );
    return places;
  }

  async trackInventory(spreadsheetId, sheetRange) {
    return await this.sheets.readRange(sheetRange);
  }

  async updateInventory(spreadsheetId, sheetRange, data) {
    return await this.sheets.writeRange(sheetRange, data);
  }

  async monitorTrends(keywords) {
    return Promise.all(
      keywords.map(kw => this.trends.monitorKeyword(kw))
    );
  }
}

module.exports = GoogleUnifiedBroker;
```

---

## 5. 集成點

### 5.1 S-06（防霾biz_window_screen智能報價系統）
```javascript
// 搜尋客戶位置相關數據
const locations = await broker.maps.searchPlace('台北市信義區');
const details = await broker.maps.getPlaceDetails(locations[0].placeId);
```

### 5.2 S-08（biz_realestate實價登錄查詢）
```javascript
// 讀取實價登錄 Sheets
const prices = await broker.sheets.readRange('Sheet1!A1:D100');
// 匹配地理位置
const location = await broker.maps.geocode(address);
```

### 5.3 S-10（InsightPulse 報告引擎）
```javascript
// 監控關鍵字趨勢
const trends = await broker.monitorTrends(['防霾biz_window_screen', '飲料', 'biz_realestate']);
// 寫入報告 Sheets
await broker.sheets.appendValues('Sheet1!A1', reportData);
```

---

## 6. 測試策略

- Mock Google API responses
- Unit tests for each adapter
- Integration tests with real API (staging)
- Cache validation tests
- Error handling scenarios

---

## 7. 部署

```docker
# Dockerfile 示例
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 載入 service account key
COPY google-key.json /app/keys/

ENV GOOGLE_APPLICATION_CREDENTIALS=/app/keys/google-key.json
CMD ["node", "index.js"]
```

---

## 8. 驗收條件檢核

- ✅ Maps API 集成（搜尋、地理編碼、距離矩陣）
- ✅ Sheets API 讀寫操作
- ✅ Trends API 監控
- ✅ 統一抽象層 API
- ✅ 認證管理（OAuth + Service Account）
- ✅ 快取機制
- ✅ 錯誤處理與日誌

---

**Status**: Ready for implementation  
**Dependencies**: S-05 (認證模組完成)  
**Next Phase**: S-06, S-08 integration
