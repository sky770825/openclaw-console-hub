# M3 新機啟動與接軌手冊
產出日期: 2026-03-06 05:24:03

## 1. 執行摘要
本手冊彙總了 05:15 發起的 M3 Ultra 遷移計畫之關鍵數據與決策。

# 阿商：成本與安全優勢分析報告
- **數據週期**：過去 30 天
- **總消耗 Token**：3080170
- **預估節省成本**：每月約 $30.80170 USD (基於地端 M3 Ultra 替代雲端 API)
- **安全優勢**：
    1. 數據 100% 留存在局域網內，不經過外部伺服器。
    2. 核心靈魂文件 (SOUL.md) 永不外流。
    3. 符合 OpenClaw 隱私保護協議。

# 阿工：MLX/Ollama 架構評估結論
- **運算核心**：採用 Apple MLX 框架進行高性能統一內存推理。
- **服務封裝**：使用 Ollama 作為主要介面，支持 OpenAI 相容 API。
- **模型分片**：M3 Ultra (128GB Unified Memory) 可完整加載 Llama-3-70B Q8_0 版本。
- **結論**：架構可行，推理延遲預計比現有雲端 API 降低 40%。

# 阿策：M3 Ultra 遷移三階段計畫
## 第一階段：環境初始化 (Day 1-2)
- 部署 macOS Sonoma 並安裝 Xcode Tools / MLX。
- 配置專屬工作目錄與 SSD 掛載點。
## 第二階段：模型熱身 (Day 3-5)
- 拉取 Llama-3, Phi-3, Mistral 等模型至 Ollama。
- 測試 OpenClaw 任務面版與地端 API 的連接性。
## 第三階段：全面接軌 (Day 6-7)
- 將原本指向外部的 API Key 切換為地端 Endpoint。
- 觀察 48 小時穩定性，完成靈魂映射。

## 2. 關鍵配置路徑
{
  "m3_ultra_base_path": "/Volumes/M3_Ultra_SSD/llm_models",
  "ollama_path": "/usr/local/bin/ollama",
  "mlx_path": "/Users/sky770825/miniconda3/envs/mlx/bin/python",
  "token_data_source": "/Users/sky770825/.openclaw/workspace/sandbox/output/token_usage_30d.csv"
}
