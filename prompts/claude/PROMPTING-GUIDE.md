# Claude 提示最佳實踐（Opus 4.6 / Sonnet 4.6）

> 來源：Anthropic 官方文件
> 更新：2026-03-13

---

## 核心原則

1. **自然語言**：像跟聰明的同事說話，不需要大寫或特殊格式
2. **解釋為什麼**：告訴它規則背後的原因比列清單更有效
3. **不要大寫強調**：Opus 4.6 會過度解讀 ALL CAPS，導致焦慮式回應
4. **正面指令**：說「做 X」而非「不要做 Y」
5. **結構化但不僵化**：用 Markdown 組織，但段落可以自然流動
6. **具體 > 抽象**：給範例比給規則更有效

## 什麼有效

- 「當主人出現時，優先回應他的訊息」 ✅
- 「CRITICAL: ALWAYS respond to master IMMEDIATELY」 ❌

- 「如果工具報錯，記錄下來然後換個方法試」 ✅
- 「NEVER fail. ALWAYS succeed on first try.」 ❌

## Prompt Caching

- 系統 prompt 的前段放穩定內容（身份、規則）
- 後段放動態內容（當前任務、上下文）
- 這樣 cache hit rate 更高，省 token

## 長對話管理

- 定期用 /compact 壓縮上下文
- 重要資訊存到 memory/ 而非依賴對話歷史
- 每個 Telegram topic 維護獨立 session
