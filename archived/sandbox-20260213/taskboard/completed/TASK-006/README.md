# 市場需求監控機制

自動監控老蔡三項業務（住商不動產、飲料店、普特斯防霾紗窗）的市場趨勢與競品動態。

## 功能特色

- 🔍 **多平台監控**：Google Trends、蝦皮、PTT、Dcard、Mobile01
- 📊 **三業務追蹤**：房地產、飲料店、防霾紗窗
- ⚡ **智能警示**：熱度飆升、競品活動、輿情變化
- 📈 **趨勢報告**：每日/每週自動生成報告

## 檔案結構

```
TASK-006/
├── market-monitor.sh      # 主監控腳本
├── config/
│   └── watchlist.json     # 監控清單設定
├── data/                  # 資料儲存
├── logs/                  # 執行日誌
└── reports/               # 監控報告
```

## 安裝需求

```bash
# macOS
brew install jq curl

# Ubuntu/Debian
sudo apt-get install jq curl
```

## 快速開始

```bash
# 1. 初始化設定
./market-monitor.sh init

# 2. 檢查系統狀態
./market-monitor.sh status

# 3. 執行監控
./market-monitor.sh monitor

# 4. 查看報告
./market-monitor.sh report

# 5. 儀表板
./market-monitor.sh dashboard
```

## 監控項目

### 住商不動產
- **關鍵字**：台北買房、台中房地產、房仲推薦、首購族
- **競品**：信義、永慶、台灣房屋
- **平台**：591、樂屋網、好房網

### 飲料店
- **關鍵字**：手搖飲、珍珠奶茶、飲料加盟、創業
- **競品**：50嵐、CoCo、迷客夏、大苑子
- **平台**：Foodpanda、UberEats

### 普特斯防霾紗窗
- **關鍵字**：防霾紗窗、PM2.5防護、換紗窗
- **競品**：3M防霾、其他紗窗品牌
- **平台**：蝦皮、momo、Mobile01

## 自動化排程

```bash
# 編輯 crontab
crontab -e

# 每6小時執行監控
0 */6 * * * /path/to/market-monitor.sh monitor

# 每天早上8點發送報告
0 8 * * * /path/to/market-monitor.sh report
```

## 擴充計畫

- [ ] 整合 Google Trends API
- [ ] 蝦皮爬蟲自動化
- [ ] PTT/Dcard 輿情分析
- [ ] Telegram 即時推播
- [ ] 網頁版儀表板

## 版本記錄

- v1.0 (2026-02-13) - 基礎架構建立
