# SLM 效能測試框架

## 測試模型
- Qwen-2.5-7B (Ollama/Cloud)
- Phi-4 (Microsoft)

## 測試維度
1. 回應速度 (Latency)
2. 指令遵循度 (Instruction Following)
3. 程式碼生成正確性 (Coding)

## 執行腳本預想
- 使用 run_script 批次發送測試 prompt
- 紀錄 exitCode 和品質評分