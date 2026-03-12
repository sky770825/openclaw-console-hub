# M3 Ultra 遷移三階段計畫

## 第一階段：環境初始化 (Day 1-2)
- 硬體開箱與系統更新 (macOS Sonoma+)。
- 安裝 Xcode Command Line Tools, Homebrew, Conda。
- 部署 Ollama 與 MLX 運行環境。

## 第二階段：模型遷移與驗證 (Day 3-5)
- 從雲端 API 遷移至本地提示詞模板。
- 進行 Token 輸出一致性校準。
- 壓力測試：並行請求下的內存壓力觀察。

## 第三階段：全面接軌與監控 (Day 6-10)
- 修改應用端 API 端點指向本地 Proxy。
- 建立 Prometheus/Grafana 監控模型推論延遲。
- 定期同步本地向量數據庫。
