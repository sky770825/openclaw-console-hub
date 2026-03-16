# 開機自動啟動 Ollama（macOS）

已幫你建立 **LaunchAgent**，登入後會自動執行 `ollama serve`，不需手動開 Ollama app。

---

## 已建立的檔案

- **Plist**：`~/Library/LaunchAgents/ai.ollama.serve.plist`
- **日誌**：`~/.ollama/logs/serve.log`、`serve.err.log`

---

## 目前狀態

- LaunchAgent **已載入**，下次**重新開機／重新登入**時會自動跑 `ollama serve`。
- 若你**現在**有開 Ollama app，本機已經有一份 Ollama 在跑（port 11434），LaunchAgent 的 `ollama serve` 會因 port 被佔用而退出，這是正常的；**關掉 Ollama app 後，重開機就會只靠 LaunchAgent 自動啟動**。

---

## 常用指令

| 動作 | 指令 |
|------|------|
| **手動啟動**（登入後若沒在跑可執行） | `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.ollama.serve.plist` |
| **手動停止** | `launchctl bootout gui/$(id -u)/ai.ollama.serve` |
| **看有沒有在跑** | `launchctl list \| grep ollama` |
| **確認本機有在聽** | `curl -s http://127.0.0.1:11434/api/tags` 有回 JSON 就代表正常 |

---

## 若想改成「用 Ollama app 開機自動開」

1. 停用 LaunchAgent：  
   `launchctl bootout gui/$(id -u)/ai.ollama.serve`
2. 到 **系統設定 → 一般 → 登入項目**，把 **Ollama** 加入「在登入時開啟」。

二選一即可，不必同時用。
