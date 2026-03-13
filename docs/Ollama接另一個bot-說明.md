# Ollama 接另一個 Bot — 說明

同一個本機 Ollama 可以接多個 Telegram Bot，或讓其他程式（例如 Discord bot）共用連線。

---

## 架構

- **ollama_client.py**：共用模組，提供 `check_ollama_status()`、`ask_ollama(prompt, model)`，以及 `load_env(env_path)` 讀取 `OLLAMA_URL`、`OLLAMA_MODEL`。
- **ollama_monitor_bot.py**：第一個 Telegram Bot，設定來自 `ollama_monitor_bot.env`。
- **ollama_bot2.py**：第二個 Telegram Bot，設定來自 `ollama_bot2.env`。

兩個 bot 都連到同一台本機 Ollama（預設 `http://127.0.0.1:11434`），只是使用不同的 Telegram Bot Token。

---

## 第二個 Telegram Bot 使用方式

1. **複製範例設定**
   ```bash
   cp ollama_bot2.env.example ollama_bot2.env
   ```

2. **編輯 ollama_bot2.env**
   - 必填：`TELEGRAM_BOT_TOKEN=你的第二個機器人 token`
   - 選填：`OLLAMA_URL`、`OLLAMA_MODEL`（不寫則用預設 127.0.0.1:11434、mistral）

3. **執行第二個 bot**（與第一個 bot 可同時跑，不同終端或背景）
   ```bash
   python3 ollama_bot2.py
   ```

4. **日誌**：`ollama_bot2.log`

---

## 其他平台（例如 Discord）接同一個 Ollama

在別的 bot 裡直接使用共用模組即可：

```python
import ollama_client

# 可選：從自己的 .env 載入 OLLAMA_URL / OLLAMA_MODEL
ollama_client.load_env(Path("你的.env"))

# 查狀態
ok, msg = ollama_client.check_ollama_status()

# 發問
ok, reply = ollama_client.ask_ollama("你好", model=None)  # None 用預設模型
```

同一台機器的多個 bot 都會打到同一個 `ollama serve`。
