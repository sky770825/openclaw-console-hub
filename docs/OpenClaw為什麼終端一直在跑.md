# 為什麼 OpenClaw 終端一直在讀寫／運行？

## 結論：有，OpenClaw 正在執行

你的環境裡 **OpenClaw Gateway 是常駐程式**，會一直跑、持續做連線與寫入，所以對應的那個終端會看起來「一直在動」。

---

## 目前正在跑的與會造成讀寫的項目

### 1. OpenClaw Gateway（主因）

- **行程**：`openclaw-gateway`（與上層 `openclaw`）
- **在做的事**：
  - 監聽 **port 18789**（本機連線）
  - **Telegram** 長輪詢（連到 Telegram 伺服器）
  - **Heartbeat** 定時跑（例如依 HEARTBEAT.md 的邏輯）
  - 寫 **log**（若用前景執行，會直接印在終端；也會寫到 log 檔）
  - 讀寫 **SQLite**：`~/.openclaw/openclawguard.db`（及 .db-wal）— 會持續有磁碟 I/O
  - 讀取設定與 skills（例如 `openclaw.json`、`workspace/skills/`）

所以：**跑 Gateway 的那個終端**會一直有輸出與讀寫，是正常現象。

### 2. 任務板（openclaw-console-hub）— 若你有開

- **Vite**（前端 dev server）、**tsx watch**（後端）會監聽檔案變化，有改檔就會重新編譯，終端也會有輸出與 I/O。
- 若你沒在用任務板，可以關掉對應的 `npm run dev` 終端。

### 3. Cron 排程（每天一次）

- 「Daily Token Usage Alert」：每天 00:00（Asia/Taipei）
- 「Daily OpenClaw Memory Backup」：每 24 小時

這兩項是定時跑，**不是**「一直」在動的主要原因；主要還是上面的 Gateway。

---

## 若不想讓「終端一直動」

### 選項 A：Gateway 改背景跑，終端就不會一直刷

在**別的**終端執行（不要用你現在在用的那個）：

```bash
# 背景執行，log 寫到檔案
nohup openclaw gateway run >> ~/.openclaw/logs/gateway.log 2>&1 &
```

之後關掉「跑 openclaw」的那個終端也可以，Gateway 會繼續在背景跑。要停掉時：

```bash
pkill -f openclaw-gateway
```

### 選項 B：用 macOS 開機自動跑（LaunchAgent）

若已用 `openclaw configure` 或官方方式裝過 LaunchAgent，Gateway 會用 **launchd** 在背景跑，不會佔用一個「一直動」的終端。可檢查：

```bash
launchctl list | grep -i openclaw
# 或
launchctl list | grep -i molt
```

有列出來就代表是系統在管，不是手動在終端裡跑。

### 選項 C：保留現狀（前景跑）

若你想**隨時在終端看 log**，就維持現在這樣；終端一直有讀寫是預期行為。

---

## 如何確認「哪個終端是 OpenClaw」

- 看終端標題或內容：通常會看到 `openclaw`、`gateway`、`listening on ws://...18789`、`[telegram]`、`[heartbeat]` 等字樣。
- 或執行：

```bash
ps aux | grep openclaw
```

有 `openclaw-gateway` 就代表 Gateway 正在跑；若該行程的終端是某一個視窗，那就是「一直在讀寫」的那個。

---

## 小結

| 問題 | 答案 |
|------|------|
| OpenClaw 有在執行嗎？ | **有**，Gateway 正在跑（port 18789、Telegram、heartbeat、SQLite）。 |
| 為什麼終端一直在讀寫？ | 跑 Gateway 的終端會持續印 log、做網路與資料庫 I/O，所以會一直動。 |
| 可以不要一直動嗎？ | 可以：改為背景跑（`nohup ... &`）或用 LaunchAgent，該終端就不會再刷。 |
