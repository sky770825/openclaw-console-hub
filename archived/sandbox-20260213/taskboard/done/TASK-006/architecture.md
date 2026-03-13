# 市場需求監控系統架構

## 系統概述

本監控系統針對主人的三項業務進行市場需求趨勢監控，提供即時數據分析與趨勢預警。

## 監控業務範圍

| 業務 | 產業類別 | 主要監控面向 |
|------|----------|--------------|
| 住商不動產 | 房地產仲介 | 房價趨勢、交易量、區域熱度 |
| 飲料店 | 餐飲零售 | 品牌聲量、新品趨勢、消費者偏好 |
| 普特斯防霾紗窗 | 建材/空氣品質 | 空汙議題、競品動態、安裝需求 |

## 技術棧

| 層級 | 技術選型 |
|------|----------|
| 數據收集 | Python + Requests |
| 數據儲存 | JSON / CSV |
| 數據處理 | Python + Pandas |
| 情感分析 | Python + 自訂詞典 |
| 視覺化 | Python + Matplotlib |
| 排程 | Python Schedule / Cron |

## 執行頻率

| 任務 | 頻率 | 說明 |
|------|------|------|
| Google Trends 抓取 | 每日 | 自動化趨勢數據 |
| 社群爬蟲 | 每 6 小時 | PTT/論壇話題監控 |
| 新聞監控 | 每日 | 產業相關新聞 |
| 趨勢分析 | 每週 | 產生週報 |
| 完整報告 | 每月 | 產生月報 |

## 目錄結構

```
./taskboard/running/TASK-006/
├── architecture.md          # 系統架構
├── keywords/                # 關鍵字清單
│   ├── real_estate.json     # 住商不動產
│   ├── beverage.json        # 飲料店
│   └── puratex.json         # 普特斯防霾紗窗
├── scripts/                 # 執行腳本
│   ├── crawler/             # 爬蟲模組
│   ├── analyzer/            # 分析模組
│   ├── dashboard/           # 儀表板
│   └── alerts/              # 警示系統
├── data/                    # 數據儲存
│   ├── raw/                 # 原始數據
│   ├── processed/           # 處理後數據
│   └── reports/             # 報告輸出
└── requirements.txt         # Python 依賴
```
