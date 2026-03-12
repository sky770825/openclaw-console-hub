# MLX/Ollama 架構評估結論

## 評估對象
- **硬體**: Apple Studio (M3 Ultra)
- **軟體棧**: Ollama (Backend) + MLX (High Performance Inference)

## 核心結論
1. **效能**: M3 Ultra 的 800GB/s 記憶體頻寬非常適合 LLM。Llama3-70B (4-bit) 預計可達到 15-20 tps。
2. **記憶體管理**: 128GB 統一記憶體允許同時加載多個模型（如 Mistral + Llama3），並共享給 GPU/CPU 使用。
3. **穩定性**: Ollama 提供成熟的 REST API，與現有前端看板無縫接軌。
