# RAG 定時更新說明

**目前狀態：已關閉**（Ollama 自動化任務已先關閉。要重新啟用請執行下方「載入」指令。）

## 機制

- **consolidate_knowledge.py**：掃描 `docs/*.md`，萃取各檔摘要，寫入 `knowledge/knowledge_auto.md`
- **ollama_bot2**：每次對話載入 `knowledge_base.md` + `knowledge_auto.md` 作為知識庫注入

## 定時執行

LaunchAgent `ai.ollama.rag-update` 每 24 小時執行一次 consolidate。

```bash
# 載入
launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.ollama.rag-update.plist

# 卸載
launchctl bootout gui/501/ai.ollama.rag-update

# 手動立即執行
python3 scripts/consolidate_knowledge.py
```

## 日誌

- `rag_update.log` / `rag_update.err.log`（專案根目錄）
