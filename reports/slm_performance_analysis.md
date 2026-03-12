# SLM 效能分析報告 (Performance Analysis)

## 1. 執行概觀
- 測試總數: 6
- 成功率: 83.33%
- 平均延遲: 3532.00 ms
- 平均吞吐量 (TPS): 14.00 tokens/s
- 峰值記憶體佔用: 4100 MB

## 2. 效能瓶頸與異常識別
- [!] High latency spike: 4500ms for prompt length 1000
- [!] High latency spike: 10500ms for prompt length 2000

## 3. 潛在改進建議
- **KV Cache 優化**: 對於長文本輸入，應考慮啟用 KV Cache 壓縮或分頁技術。
- **記憶體管理**: SLM 在記憶體接近 4GB 時出現 OOM，應限制最大 Context Window 或採用 4-bit 量化。
- **硬體加速**: 目前 TPS 在長文本下掉速嚴重，檢查是否觸發了 CPU fallback。
