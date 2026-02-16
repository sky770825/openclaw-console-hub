# OpenClaw 任務板 Skill 安裝說明

讓 OpenClaw 在收到 Telegram 等管道訊息時，自動建立/查詢/執行任務板上的任務。

---

## 一、安裝 Skill

### 1.1 複製 Skill 到 OpenClaw workspace

```bash
# 建立目錄（若不存在）
mkdir -p ~/.openclaw/workspace/skills/openclaw-taskboard

# 從本專案複製 SKILL.md
cp docs/openclaw-taskboard-skill/SKILL.md ~/.openclaw/workspace/skills/openclaw-taskboard/
```

### 1.2 設定 API 網址

編輯 `~/.openclaw/openclaw.json`，加入：

```json
{
  "skills": {
    "entries": {
      "openclaw-taskboard": {
        "enabled": true,
        "env": {
          "OPENCLAW_TASKBOARD_URL": "http://localhost:3011"
        }
      }
    }
  }
}
```

- **本機開發**：`http://localhost:3011`（任務板後端 port）
- **正式環境**：`https://你的-api-網址`（不含尾端 `/api`）

### 1.3 加入 AGENTS 提示

將 `AGENTS-SNIPPET.md` 的內容貼到 `~/.openclaw/workspace/AGENTS.md` 中，或手動加入任務管理相關說明。

---

## 二、確保任務板後端在跑

```bash
cd /path/to/openclaw-console-hub
cd server && npm run dev
```

後端需在 `OPENCLAW_TASKBOARD_URL` 所指的網址提供 API。

---

## 三、重啟 OpenClaw

```bash
# 重啟 Gateway
openclaw gateway --port 18789
```

或關閉再重新開啟 OpenClaw 應用。

---

## 四、測試

在 Telegram 對 bot 發送：

- 「建立任務：修復登入 bug」
- 「任務列表」
- 「執行下一個任務」
- **「/stop」或「停止」** → 緊急終止所有執行中的任務（需已加入 SKILL 與 AGENTS 提示）

OpenClaw 應會呼叫 API 並回覆結果。

若你已安裝過此 Skill，請重新複製 `SKILL.md` 以取得 /stop 緊急終止支援。
