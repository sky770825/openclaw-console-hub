# M3 Ultra 遷移三階段執行計畫 (阿策)

## 第一階段：環境初始化 (Day 1)
- 安裝 Xcode Command Line Tools, Homebrew。
- 配置 MLX 運行環境與 Ollama 服務。
- 部署 `scripts/token_data_processor.py` 進行路徑健康檢查。

## 第二階段：模型熱部署與對接 (Day 2)
- 加載 Llama-3 量化模型。
- 修改開發者工作流腳本，將 `OPENAI_API_KEY` 替換為本地節點 Mock Key。
- 驗證 `openclaw任務面版設計` 前端與本地後端連通性。

## 第三階段：全面割接與監控 (Day 3-5)
- 關閉雲端 API 冗餘調用。
- 建立 `reports/` 自動生成機制，每日監控 M3 Ultra 負載與 Token 生產效能。
