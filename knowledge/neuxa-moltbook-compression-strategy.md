# NEUXA x Moltbook: 漸進式揭示與語義摘要壓縮策略

## 1. 核心機制：預判式過濾 (Pre-Judgment)
- 實現檔案: server/src/services/pre-judge.ts
- 策略: 在呼叫大模型前，先由本地輕量化模型 (Qwen3:4b) 進行任務掃描。
- 效果: 僅將「推薦工具」及其對應文檔注入 Context，大幅減少 Token 浪費。

## 2. 元認知監控：反射校準 (Reflection Middleware)
- 實現檔案: server/src/services/reflection.ts
- 策略: 攔截所有寫入操作 (POST/PUT/PATCH)，強制進行意圖解析與思考路徑記錄。
- 效果: 產生「語義摘要」存入 thoughtChain，為長序列任務提供清晰的邏輯錨點。

## 3. 知識嫁接引擎 (Data Grafting Engine)
- 實現檔案: server/src/services/grafting/index.ts
- 策略: 跨專案搜尋並動態建立 KnowledgeBridge。
- 效果: 實現知識的「按需加載」，而非全量載入，保持 Context 核心區域的純淨度。

## 4. 執行 SOP 建議
1. 診斷階段: 呼叫 pre-judge 確定戰術方向。
2. 校準階段: 透過 reflection 產生當前步驟的語義摘要。
3. 獲取階段: 若涉及跨專案，使用 grafting 抓取精確橋接點。
4. 匯總階段: 僅回報摘要與關鍵變動，維持熱記憶 (NOW.md) 的輕量化。