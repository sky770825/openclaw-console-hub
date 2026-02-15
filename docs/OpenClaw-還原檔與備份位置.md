# OpenClaw 還原檔／備份檔位置

## 會影響設定的備份（建議刪除以免被還原）

| 路徑 | 說明 |
|------|------|
| **`~/.openclaw/openclaw.json.bak.20260212_124930`** | `openclaw.json` 的自動備份。若 OpenClaw 有「從 .bak 還原」或 merge 邏輯，可能用這份覆寫目前設定。**建議刪除**，避免之後又被還原成含 Google/Anthropic 的舊版。 |

## 其他備份（與主設定無關，可選保留）

| 路徑 | 說明 |
|------|------|
| `~/.openclaw/cron/jobs.json.bak` | 排程備份。 |
| `~/.openclaw/agents/main/sessions/sessions.json.bak-*` | Session 快照備份。 |
| `~/.openclaw/browser/.../Bookmarks.bak` | 瀏覽器書籤備份。 |

## 已刪除的還原檔（先前已處理）

- `~/.openclaw/openclaw.json.repaired` — 舊的修復用備份（內含 google/gemini），已刪除。
