# SLM 效能分析報告
生成時間: Mon Mar  2 22:26:59 CST 2026
數據來源: /Users/caijunchang/.openclaw/workspace/sandbox/output/slm_perf_results.json

## 1. 核心指標概覽
- **平均首字延遲 (Avg TTFT):** 341.00 ms
- **最高首字延遲 (Max TTFT):** 890.00 ms (注意: 超過 500ms 即視為延遲)
- **平均吞吐量 (Avg TPS):** 31.16 tokens/sec
- **最低吞吐量 (Min TPS):** 5.20 tokens/sec
- **平均記憶體佔用:** 2524.00 MB

## 2. 效能瓶頸識別
- [OK] 吞吐量符合初步預期。
- [!] **首字延遲峰值:** 存在顯著的冷啟動或處理抖動問題。

## 3. 異常行為清單
- ISSUE|ID:4|TTFT:890|TPS:5.2|Status:degraded
