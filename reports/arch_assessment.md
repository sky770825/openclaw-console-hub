# MLX/Ollama 混合架構評估結論

## 1. 核心組件
- **推論引擎**: Ollama (提供易用的 REST API 與模型管理)
- **加速框架**: Apple MLX (針對 Apple Silicon 優化，處理高負載自定義模型任務)
- **內存分配**: M3 Ultra 128GB/192GB 統一內存，分配 75% 給 GPU 核心。

## 2. 部署策略
- 大規模通用任務：使用 Ollama 跑 Llama 3 / Mistral。
- 特定科研/微調任務：使用 MLX 框架直接操作數組加速。

## 3. 性能預期
- Llama 3 70B: 預計可達 15-20 tok/s。
- 全量緩存：支持同時掛載 3-4 個大型模型。
