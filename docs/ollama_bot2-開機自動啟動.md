# ollama_bot2 開機自動啟動（LaunchAgent）

已建立 **LaunchAgent**，登入後會自動執行 `ollama_bot2.py`，Telegram bot 會常駐。

---

## 已建立的檔案

- **Plist**：`~/Library/LaunchAgents/ai.ollama.bot2.plist`
- **日誌**：專案目錄下 `ollama_bot2_launchd.log`、`ollama_bot2_launchd.err.log`

---

## 常用指令

| 動作 | 指令 |
|------|------|
| **載入並啟動**（登入後執行） | `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.ollama.bot2.plist` |
| **停止** | `launchctl bootout gui/$(id -u)/ai.ollama.bot2` |
| **看有沒有在跑** | `launchctl list \| grep ollama.bot2` |
| **重啟** | 先 bootout 再 bootstrap |

---

## 注意

- 登入後會自動啟動；若手動用終端跑過 `python3 ollama_bot2.py`，請先關掉終端或 `pkill -9 -f ollama_bot2`，避免同一個 bot 跑兩份（Telegram 會 Conflict）。
- 若改過專案路徑或 python3 路徑，需編輯 plist 裡的 `ProgramArguments`、`WorkingDirectory`。
