# M3 Ultra 遷移三階段詳細計畫

## 第一階段：基礎設施部署 (D-Day to D+3)
- 安裝 macOS Sonoma 並優化核心參數。
- 部署 Docker 與 Ollama 容器環境。
- 執行硬體跑分驗證 (MLX Benchmarks)。

## 第二階段：模型調優與對接 (D+4 to D+10)
- 導入 30 天 Token 數據進行基準測試。
- 調整 Prompt Template 以適配地端量化模型。
- 完成向量數據庫 (Vector DB) 的本地鏡像遷移。

## 第三階段：正式切換與驗證 (D+11 to D+14)
- 實施藍綠佈署 (Blue-Green Deployment)，逐步將流量導向 M3 Ultra。
- 監控推論延遲與輸出質量。
- 正式關閉高成本雲端 API 訂閱。
