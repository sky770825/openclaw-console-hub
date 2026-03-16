# 知識庫

`knowledge_base.md` 會在每次對話時注入到 ollama_bot2 的 system prompt，強化 llama3.2 等模型的回答準確度。

## 維護方式

- 直接編輯 `knowledge_base.md`，補充任務板、OpenClaw、Ollama 等相關知識
- 建議使用簡潔的 bullet 格式，方便模型參考
- 修改後重啟 ollama_bot2 才會載入新內容（或下次對話即會讀取最新檔案）
- 注意：內容會佔用 context，不宜過長（約 1–2K tokens 內為佳）
