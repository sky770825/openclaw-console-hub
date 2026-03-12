# 市場需求監控系統設定指南

## 快速開始

### 1. 環境設定

```bash
# 建立虛擬環境
python3 -m venv venv
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt
```

### 2. 執行監控

```bash
# 完整監控
python3 scripts/main_monitor.py

# 或使用 shell 腳本
chmod +x run_monitoring.sh
./run_monitoring.sh full      # 完整監控
./run_monitoring.sh quick     # 快速監控
./run_monitoring.sh report    # 僅報告
```

### 3. 啟動排程系統

```bash
python3 schedule_monitoring.py
```

## 監控業務配置

### 住商不動產
- **關鍵字來源**：`keywords/real_estate.json`
- **監控重點**：房價趨勢、交易量、購屋需求
- **競品**：台灣房屋、信義房屋、永慶房屋
- **數據來源**：Google Trends、PTT 房屋板

### 飲料店
- **關鍵字來源**：`keywords/beverage.json`
- **監控重點**：品牌聲量、新品趨勢、消費偏好
- **競品**：50嵐、清心福全、CoCo都可、迷客夏
- **數據來源**：Google Trends、PTT 飲料板、Dcard

### 普特斯防霾紗窗
- **關鍵字來源**：`keywords/puratex.json`
- **監控重點**：空汙議題、競品動態、安裝需求
- **觸發因子**：PM2.5、AQI、季節性
- **數據來源**：Google Trends、環保署空品監測、PTT

## 輸出文件說明

### 數據檔案

```
data/raw/
├── real_estate_trends_*.json      # 房地產趨勢
├── beverage_trends_*.json         # 飲料店趨勢
└── puratex_trends_*.json          # 防霾紗窗趨勢

data/processed/
├── real_estate_analysis_*.json    # 房地產分析
├── beverage_analysis_*.json       # 飲料店分析
└── puratex_analysis_*.json        # 防霾紗窗分析
```

### 報告檔案

```
data/reports/
├── weekly_real_estate_*.json      # 房地產週報
├── weekly_beverage_*.json         # 飲料店週報
├── weekly_puratex_*.json          # 防霾紗窗週報
├── monthly_*.json                 # 月報
├── alerts_*.json                  # 警報
└── monitoring_summary.json        # 監控摘要
```

## 警示設定

### 搜尋量異常
- **紅色警報**：波動超過 ±30%
- **黃色警報**：波動 20-30%
- **正常**：波動 <20%

### 負面聲量
- **紅色警報**：超過 40%
- **黃色警報**：30-40%
- **正常**：<30%

### 競品監控
- 新品發布自動提示
- 促銷活動監控
- 話題聲量對比

## 自訂配置

### 修改監控頻率

在 `schedule_monitoring.py` 中修改：

```python
# 改為每 4 小時執行
schedule.every(4).hours.do(self.hourly_social_monitoring)

# 改為每天 10:00
schedule.every().day.at("10:00").do(self.daily_trends_collection)
```

### 調整警示閾值

在 `keywords/*.json` 中修改：

```json
{
  "alert_thresholds": {
    "search_volume_spike": 50,      # 改為 50%
    "negative_sentiment": 50        # 改為 50%
  }
}
```

### 新增關鍵字

在 `keywords/*.json` 中添加：

```json
{
  "keywords": {
    "new_category": [
      {"keyword": "新關鍵字", "type": "trend", "priority": "high"}
    ]
  }
}
```

## 常見問題

### Q: 如何新增新的監控業務？

A: 建立新的關鍵字檔案：
```bash
cp keywords/real_estate.json keywords/new_business.json
# 編輯 keywords/new_business.json
# 在 main_monitor.py 中添加業務名稱
```

### Q: 如何查看實時監控狀態？

A: 檢查 `data/reports/monitoring_summary.json` 檔案

### Q: 如何導出成 HTML 報告？

A: 使用 `report_generator.py` 中的 `export_html_report()` 方法

### Q: 如何整合到 Cron？

A: 
```bash
# 編輯 crontab
crontab -e

# 添加執行排程
0 8 * * * /path/to/run_monitoring.sh full
0 */6 * * * /path/to/run_monitoring.sh quick
```

## 日誌和調試

### 啟用詳細日誌

```bash
# 修改 main_monitor.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 查看錯誤日誌

```bash
tail -f data/reports/*.log
```

## 部署指南

### Docker 部署

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python3", "schedule_monitoring.py"]
```

### 建立容器

```bash
docker build -t market-monitor .
docker run -d market-monitor
```

## 支援和反饋

如有問題或建議，請聯繫開發團隊。

---

最後更新：2026-02-13
