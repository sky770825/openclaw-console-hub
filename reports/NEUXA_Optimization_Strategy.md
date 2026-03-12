# NEUXA Context Optimization Report (Moltbook Style)

## 1. 語義摘要 (Semantic Summarization)
- **機制**: 透過 `gist_engine.py` 預掃描專案檔案。
- **實作**: 不直接讀取全文，而是提取 symbols (functions, classes) 與標註的 Importance。
- **效果**: 減少 70-90% 的初始 Token 消耗。

## 2. 漸進式揭示 (Progressive Disclosure)
- **流程**:
    1. NEUXA 讀取 `compressed_context.json`。
    2. 只有當任務涉及特定 Module 時，才透過 `cat` 指令讀取該檔案的詳細實作。
    3. `HIGH` importance 檔案在 Gist 中保留更多 Meta-data。

## 3. 精華 (Gist) 機制
- 將大型檔案濃縮為「功能描述」與「介面定義」。
- 使用 `gist_registry.json` 作為長期記憶索引，避免重覆掃描。

## 產出檔案清單:
- `gist_registry.json`: 完整符號與重要性索引。
- `compressed_context.json`: 優化後的 LLM Context 注入片段。
