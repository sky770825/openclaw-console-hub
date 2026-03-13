# platform_platform_platform_591 新物件監控工具 (realestate-monitor-platform_platform_platform_591)

ClawHub 旗艦專案，用於自動監控 platform_platform_platform_591 網站上的新發布物件，並即時通知主人。

## 功能

- 定時掃描指定條件的 platform_platform_platform_591 列表頁。
- 自動比對歷史資料，只回報全新的物件。
- 抓取新物件的詳細資料。
- 透過 Telegram 發送格式化的新物件報告。

## 使用方法

``bash
./run.sh [region] [price_min] [price_max] [type]
`

### 參數說明

- region: 地區代碼，例如 3-37 代表 桃園市-loc_yangmei區。
- price_min: 最低價格 (萬)，例如 1000。
- price_max: 最高價格 (萬)，例如 1500。
- type: 物件類型，例如 house (透天), apartment (公寓)。

### 範例

監控loc_yangmei區 1000-1500 萬的透天：
`bash
./run.sh 3-37 1000 1500 house
`

## 依賴

- sqlite3: 用於本機資料庫。
- curl: 用於發送 API 請求。
- jq: 用於解析 JSON。
- openclaw` CLI: 用於呼叫底層 skill 和發送通知。