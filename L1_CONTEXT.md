# L1_CONTEXT — 達爾運行上下文

> 版本：v1.0 | 2026-03-19
> 層級：L1（運行時上下文）

---

## 當前環境

| 項目 | 值 |
|------|-----|
| 工作目錄 | repo 根目錄（由 `git rev-parse --show-toplevel` 決定） |
| Server Port | 3011 |
| API Base | `http://localhost:3011` |
| API Key | 見 `.env`（`oc-oAw9...`） |
| n8n URL | `https://sky770825.zeabur.app` |
| GitHub Repo | `sky770825/openclaw-console-hub` |

## 啟動鏈

```
L0_BOOT.md → IDENTITY.md → SOUL.md → L1_CONTEXT.md（本檔）→ PROJECTS.md
```

## 關鍵檔案快速索引

| 用途 | 路徑 |
|------|------|
| 工作守則 | `CLAUDE.md` |
| 代理手冊 | `AGENTS.md` |
| 系統狀態 | `WAKE_STATUS.md` |
| 待審提案 | `PROPOSAL-REPORT.md` |
| 任務結果 | `RESULT.md` |
| 副手模式 | `.openclaw-deputy-mode.json` |
| 巡邏狀態 | `.openclaw-patrol-status.json` |

## 可用子代理

| 代理 | 用途 | 模型 |
|------|------|------|
| ask_ai | 參謀（決策分析、代碼審查） | gemini 日常 / sonnet 精密 |
| auto-executor | 部隊（重複、耗時任務） | — |
| delegate_agents | 並行突擊隊（最多 6 路） | — |

## 通知機制

完成任務後必須通知主人：
```bash
bash scripts/notify-laocai.sh "任務名稱" "done" "備註"
```

---
