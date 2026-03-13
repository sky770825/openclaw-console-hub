# 市場需求監控機制 (TASK-006)

## 📋 專案概述

針對主人的三項業務建立智能市場需求監控系統，實時追蹤市場趨勢、競品動態和消費者情感，提供數據驅動的決策支持。

**監控業務：**
- 🏠 住商不動產
- 🥤 飲料店
- 🪟 普特斯防霾紗窗

## 🎯 核心功能

### 1. 數據收集層
- **Google Trends** - 搜尋趨勢監控
- **社群爬蟲** - PTT/Dcard 討論監控
- **新聞 API** - 產業新聞追蹤
- **競品監控** - 競品動態分析

### 2. 數據分析層
- **情感分析** - 正負面聲量評估
- **趨勢計算** - 週期性和異常檢測
- **關鍵字萃取** - 熱門話題識別
- **競品對比** - 市場地位分析

### 3. 警示系統
- 搜尋量異常提醒 (30% 波動)
- 負面聲量預警 (40% 超標)
- 競品活動快速通知
- 季節性觸發提示

### 4. 報告生成
- 每日數據總結
- 週報分析
- 月度深度報告
- HTML 可視化報告

## 📁 目錄結構

```
TASK-006/
├── README.md                      # 本檔案
├── architecture.md                # 系統架構設計
├── CONFIG.md                      # 配置指南
├── requirements.txt               # 依賴清單
├── run_monitoring.sh             # 執行指令
├── schedule_monitoring.py         # 排程系統
│
├── keywords/                      # 監控關鍵字
│   ├── real_estate.json          # 房地產監控清單
│   ├── beverage.json             # 飲料店監控清單
│   └── puratex.json              # 防霾紗窗監控清單
│
├── scripts/                       # 主要腳本
│   ├── main_monitor.py           # 主程式
│   │
│   ├── crawler/                  # 數據收集
│   │   └── trends_collector.py   # 趨勢數據收集
│   │
│   ├── analyzer/                 # 數據分析
│   │   └── sentiment_analyzer.py # 情感分析器
│   │
│   ├── alerts/                   # 警示系統
│   │   └── alert_system.py       # 警報管理
│   │
│   └── dashboard/                # 報告生成
│       └── report_generator.py   # 報告生成器
│
└── data/                          # 數據存儲
    ├── raw/                       # 原始數據
    ├── processed/                 # 處理後數據
    └── reports/                   # 報告輸出
```

## 🚀 快速開始

### 環境準備
```bash
# 1. 建立虛擬環境
python3 -m venv venv
source venv/bin/activate

# 2. 安裝依賴
pip install -r requirements.txt
```

### 執行監控
```bash
# 完整監控（收集 → 分析 → 警示 → 報告）
python3 scripts/main_monitor.py

# 或使用 shell 腳本
./run_monitoring.sh full

# 快速監控（僅收集）
./run_monitoring.sh quick

# 僅生成報告
./run_monitoring.sh report
```

### 啟動自動排程
```bash
# 啟動排程系統（後台自動執行）
python3 schedule_monitoring.py
```

## 📊 監控清單詳情

### 住商不動產 (real_estate.json)
- **品牌監控**：住商不動產、台灣房屋、信義房屋、永慶房屋
- **市場信號**：房價、買房、賣房、房貸、打炒房
- **數據來源**：Google Trends、PTT 房屋板、591 房屋網

### 飲料店 (beverage.json)
- **品牌監控**：50嵐、清心福全、CoCo都可、迷客夏
- **產品趨勢**：珍珠奶茶、鮮奶茶、水果茶、無糖飲料
- **數據來源**：Google Trends、PTT 飲料板、Dcard

### 普特斯防霾紗窗 (puratex.json)
- **品牌監控**：3M、藍鯨、淨靜防霾紗窗
- **觸發因素**：空氣汙染、PM2.5、紫爆、霧霾
- **季節性**：冬季 (11-4月) 為銷售高峰
- **數據來源**：Google Trends、環保署、PTT 居家板

## 🚨 警示機制

| 級別 | 符號 | 觸發條件 | 通知方式 |
|------|------|----------|----------|
| 信息 | 🟦 | 日常更新 | 不通知 |
| 警告 | 🟨 | 波動 20-30% | 報告標註 |
| 重警 | 🟥 | 波動 >30% | 立即通知 |

**觸發條件：**
- 搜尋量單日波動 ±30%
- 負面聲量超過 40%
- 競品新品發布
- 產業熱點進入排行

## 📈 報告類型

### 日報
- 關鍵字搜尋量變化
- 社群討論熱度
- 實時警報提示

### 週報
- 趨勢分析
- 情感分布
- 競品對比
- 本週洞察

### 月報
- 長期趨勢
- 市場走勢
- 策略建議
- 下月預測

## 🛠️ 配置選項

### 修改監控頻率
```python
# schedule_monitoring.py
schedule.every().day.at("09:00").do(task)  # 改為 09:00
schedule.every(4).hours.do(task)           # 改為 4 小時
```

### 調整警示閾值
```json
// keywords/real_estate.json
{
  "alert_thresholds": {
    "search_volume_spike": 40,      // 改為 40%
    "negative_sentiment": 45        // 改為 45%
  }
}
```

### 新增監控業務
1. 建立 `keywords/new_business.json`
2. 定義關鍵字和數據源
3. 在 `main_monitor.py` 中添加業務名稱

## 📌 重要提示

- ⚠️ **API 速率限制**：Google Trends 有請求限制，建議間隔 >2 秒
- 🔒 **數據隱私**：爬蟲遵守各網站 robots.txt
- 💾 **存儲管理**：每月自動清理 30 天前的原始數據
- 🌐 **時區設定**：已預設為 GMT+8 (台灣時區)

## 🔄 執行流程

```
開始 → 數據收集 → 數據清洗 → 情感分析 → 警示檢查 → 報告生成 → 完成
       ↓          ↓         ↓         ↓          ↓
      收集關鍵字  標準化    判斷正負  觸發警報   存儲報告
```

## 📞 支援和維護

### 常見問題
- Q: 報告在哪裡？
  A: `data/reports/` 目錄

- Q: 如何修改監控的時間？
  A: 編輯 `schedule_monitoring.py` 的排程設定

- Q: 能否新增自己的關鍵字？
  A: 編輯 `keywords/*.json` 檔案

### 日誌查看
```bash
# 查看最近的報告
ls -lt data/reports/ | head -10

# 查看監控摘要
cat data/reports/monitoring_summary.json | python3 -m json.tool
```

## 📄 檔案清單

| 檔案 | 說明 | 大小 |
|------|------|------|
| architecture.md | 系統架構設計 | 1.2K |
| CONFIG.md | 配置指南 | 3.1K |
| keywords/ | 監控清單 (3 個業務) | 3.2K |
| scripts/ | 核心腳本 | 19.9K |
| requirements.txt | Python 依賴 | 0.3K |
| run_monitoring.sh | 執行指令 | 1.5K |
| schedule_monitoring.py | 排程系統 | 3.5K |

## ✅ 完成清單

- ✅ 系統架構設計
- ✅ 關鍵字/競品監控清單 (3 業務)
- ✅ 數據收集模組 (Trends, 爬蟲)
- ✅ 情感分析和警示機制
- ✅ 報告生成和儀表板
- ✅ 排程自動化系統
- ✅ 配置指南和文檔
- ✅ 易用執行腳本

## 🎓 下一步

1. **微調配置**：根據實際業務調整關鍵字和閾值
2. **API 整合**：連接實際的 Google Trends API 和新聞 API
3. **可視化增強**：開發 Web 儀表板
4. **機器學習**：加入預測模型
5. **跨平台**：支援 Line、Email 通知

---

**版本**：1.0  
**建立日期**：2026-02-13  
**狀態**：✅ 可用  
**建議用戶**：主人及其團隊
