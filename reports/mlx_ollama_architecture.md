# MLX/Ollama 架構評估結論 (阿工)

## 1. 架構選型
- **MLX (Apple Native)**: 用於高性能模型微調與原生推論，充分利用 M3 Ultra 的 Unified Memory (192GB+)。
- **Ollama**: 作為本地 API Gateway 服務，封裝本地模型供前端「任務面版」調用。

## 2. 效能確認
- **吞吐量**: Llama-3-70B 預期可達 15-20 tok/s。
- **兼容性**: 確認相容現有 OpenClaw 的 API 請求格式。
- **併發處理**: 通過 Ollama 的併發隊列管理，支持多 Agent 同時調用。
