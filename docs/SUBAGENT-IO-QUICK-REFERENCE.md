# Subagent I/O 閉環模式 - 快速參考卡片 (v2.1)

> 最後更新: 2026-02-14 02:31
> 適用: Codex + Cursor Agent

---

## 🎯 核心流程

```
老蔡指令 → 小蔡生成(task_id + run_id) → Subagent 執行 → 回報 → 老蔡 ACK
```

---

## 📋 必填欄位（所有回報都要有）

| 欄位 | 格式 | 說明 |
|------|------|------|
| `task_id` | `task_$(date +%s)_name` | 任務唯一識別 |
| `run_id` | `run_$RANDOM` | **v2.1 新增** 執行次數識別 |
| `status` | `success\|failed\|timeout` | 執行結果 |
| `summary` | 50-100 字摘要 | 結果說明 |
| `consecutive_failures` | 1/2\|1/3 | **失敗時必填** 連續失敗次數 |

---

## 🔐 Idempotency Key（防重複）

```bash
IDEMPOTENCY_KEY="${TASK_ID}:${RUN_ID}"
# 例: task_1771007460_external-intel:run_2861

# 檢查是否已處理
grep -q "^${IDEMPOTENCY_KEY}|" ~/.openclaw/automation/processed_tasks.log

# 記錄已處理
echo "${IDEMPOTENCY_KEY}|success|$(date '+%Y-%m-%d %H:%M:%S')" >> \
  ~/.openclaw/automation/processed_tasks.log
```

---

## ⚠️ 自動升級條件（立即停止重試）

### Codex
- ❌ 連續 2 次 timeout
- ❌ 連續 3 次 failed

### Cursor
- ❌ 連續 1 次 syntax error（代碼問題嚴重）
- ❌ 連續 2 次 test failed
- ❌ 連續 2 次 timeout
- ❌ 連續 3 次 git conflict

**升級格式：**
```
[ESCALATE_Codex] task_id / run_id / 失敗原因
或
[ESCALATE_Cursor] task_id / run_id / 失敗原因
```

---

## 🚀 Cursor 專用規則

| 場景 | 做 | 不做 |
|------|----|----|
| 程式改碼 | ✅ Cursor | ❌ Codex |
| 代碼審查 | ✅ Cursor | ❌ Codex |
| UI 改進 | ✅ Cursor | ❌ Codex |
| 專案重構 | ✅ Cursor | ❌ Codex |
| 搜尋整合 | ❌ Cursor | ✅ Codex |
| 系統分析 | ❌ Cursor | ✅ Codex |

---

## 📝 標準回報範本

```
【小蔡執行-TASK_NAME】
task_id: task_1771007460_external-intel
run_id: run_2861
status: success
retry: 0
time: 2026-02-14 02:30:00
summary: |
  掃描完成
  發現: N 個重點
  建議: M 個任務
consecutive_failures: 0
✅ 任務完成
```

---

## 📂 記錄檔位置

| 檔案 | 用途 | 位置 |
|------|------|------|
| `processed_tasks.log` | Idempotency 記錄 | `~/.openclaw/automation/processed_tasks.log` |
| `task_failures.json` | 升級條件追蹤 | `~/.openclaw/automation/task_failures.json` |
| 規則文檔 | 完整規則 | `memory/2026-02-14-codex-io-loop.md` |

---

## ✅ 檢查清單（發派任務前）

- [ ] 生成 task_id: `task_$(date +%s)_name`
- [ ] 生成 run_id: `run_$RANDOM`
- [ ] 明確分配給 Codex 或 Cursor
- [ ] 設定合理 timeout
- [ ] 準備好標準回報格式
- [ ] 提醒 Subagent 帶上 task_id + run_id

---

🐣 小蔡 | v2.1 快速參考 | 2026-02-14 02:31
