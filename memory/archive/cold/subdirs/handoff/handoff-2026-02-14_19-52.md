# Handoff (for /new)

- generatedAt: 2026-02-14 19:52
- memoryLastUpdated: 2026-02-14 19:30

## NOW.md (State Bridge)
- path: `/Users/caijunchang/.openclaw/workspace/NOW.md`

```text
# NOW.md — 當前狀態

> 更新：2026-02-14 19:52

## 🎯 當前焦點（請在 /new 後先讀這裡）
- currentFocus: (待填) 例如：修復 task-gen / 讓任務可執行 / 交付 easyclaw-pro
- next3:
  - (1) 先跑 Generate-Handoff.command
  - (2) /new
  - (3) 只載入 memory/handoff/latest.md + NOW.md

## 🧠 記憶狀態
- MEMORY.md lastUpdated: 2026-02-14 19:30
- handoff: memory/handoff/latest.md

## 🧾 任務板（3011）
{
  "total": 489,
  "ready": 46,
  "running": 1,
  "blocked": 0,
  "review": 0,
  "done": 442
}

{
  "ok": true,
  "ready": 46,
  "compliantReady": 4,
  "noncompliantReady": 42
}

{
  "ok": true,
  "isRunning": false,
  "pollIntervalMs": 10000,
  "maxTasksPerMinute": null,
  "lastExecutedAt": null
}

## 🧰 系統狀態（摘要）
- gateway: 15:Runtime: running (pid 4139, state active) 16:RPC probe: ok 
- telegram: 3:- Telegram default: enabled, configured, running, in:just now, out:1m ago, mode:polling, bot:@xiaoji_cai_bot, token:config, groups:unmentioned, works, audit ok

## 🔗 快捷操作
- Rescue: Desktop/OpenClaw-Rescue+AutoFix.command
- Generate handoff: Desktop/Generate-Handoff.command
- Memory sync: Desktop/Nightly-Memory-Sync.command
```

## What To Load
- SSoT: `/Users/caijunchang/.openclaw/workspace/MEMORY.md`
- Index: `/Users/caijunchang/.openclaw/workspace/memory/INDEX-v2.md`
- This handoff: `/Users/caijunchang/.openclaw/workspace/memory/handoff/latest.md`

## Current Policies (Short)
- projectPath: `projects/<project>/modules/<module>/`
- runPath: `projects/<project>/runs/<YYYY-MM-DD>/<run_id>/`
- Telegram: index-only (task_id/run_id/projectPath/runPath + short summary/nextSteps)
- Full output: write to `<run_path>/RESULT.md` + `ARTIFACTS/`
- Avoid paid APIs unless approved (prefer Ollama + subscription Codex/Cursor)

## SOP Hard Rules (Excerpt)
| **專案路徑** | `projects/<project>/modules/<module>/` 唯一真相 |
| **任務卡必填** | project_path(projectPath)、run_path(runPath)、idempotencyKey、deliverables、runCommands、acceptanceCriteria、rollbackPlan、riskLevel、assignedAgent、executionProvider、allowPaid、modelPolicy |
| **Codex/Cursor交付** | README.md、.env.example、docs/runbook.md、src/、驗收結果 |
| **Ollama工作** | nextSteps、summary + evidenceLinks、docs/updates/YYYY-MM-DD.md |
| **回報分層** | Telegram 只回索引級（task_id/run_id/project_path/run_path + 短摘要/nextSteps），全量內容寫到 run_path/RESULT.md + ARTIFACTS/ |
| **禁止假網址** | 文件與回報禁止使用 `http://*.md/` 這種假網址；一律使用本地路徑（例如 `run_path/RESULT.md`）或真實可存取 URL |
| **小蔡巡檢** | 一般進度寫回任務卡（❌不發TG）、Milestone/阻塞才發TG |
| **防重複** | 同一projectPath僅1個running、task_id+run_id+idempotencyKey |
| **模型政策** | ollama/*預設、codex/cursor允許、kimi/opus需高風險+老蔡確認 |

## Fast Lookup (Top)
| 主題 | 位置 |
|------|------|
| ⭐ **Codex/Cursor I/O 閉環 v1.1** | `memory/2026-02-14-codex-cursor-io-loop.md` |
| 💰 **成本優化方案** | `memory/2026-02-14-cost-optimization.md` |
| 💼 **商業模式盤點** | `memory/2026-02-14-business-model.md` |
| 📊 **商業模式分析** | `memory/2026-02-14-business-model-analysis.md` |
| 🎯 **標準閉環SOP v1.0** | 見下方SOP區 |
| 🔧 **OpenClaw修復摘要** | `memory/2026-02-14-openclaw-recovery.md` |
| ⚠️ **穩定性核心記憶** | `memory/2026-02-14-core-stability.md` |
| 🚫 **避免踩雷** | `memory/2026-02-14-core-cautions.md` |
| 🔄 **系統總覽** | `docs/SYSTEM-OVERVIEW.md` |
| 🧠 **Multi-Agent策略** | `docs/MULTI-AGENT-STRATEGY.md` |

## Runtime Snapshot
- models.default: kimi/kimi-k2.5
- models.fallbacks: xai/grok-4-1-fast, anthropic/claude-haiku-4-5-20251001, google/gemini-2.5-flash, kimi/kimi-k2-turbo-preview

### Cron (enabled sample)
(cron list unavailable)

### Taskboard (3011)
- /health: `{"ok":true,"service":"openclaw-server"}`
- auto-executor/status: `{"ok":true,"isRunning":false,"pollIntervalMs":10000,"lastPollAt":null,"lastExecutedTaskId":null,"lastExecutedAt":null,"totalExecutedToday":0,"nextPollAt":null} `
- tasks/compliance: `{"ok":true,"total":489,"ready":46,"compliantReady":4,"noncompliantReady":42,"sample":[{"id":"t1771044697020","name":"新任務","missing":["projectPath","agent.type","riskLevel","rollbackPlan","acceptanceCriteria","deliv`

## Next Steps (Default)
1. If context feels big: run `/new`, then load `memory/handoff/latest.md` only.
2. If tasks are not progressing: ensure auto-executor is running and block noncompliant ready tasks.
3. If XiaoCai stops replying: run desktop `OpenClaw-Rescue+AutoFix.command`.
