# SOP-1: 標準任務流程

## metadata

```yaml
id: sop-01
name: 標準任務流程
category: 日常操作
tags: [任務, 流程, 任務板, RESULT, 回報, API, run, projectPath]
version: 2.0
created: 2026-02-16
trigger: 每一個任務都必須走這個流程，沒有例外
priority: P0
燈號: 🟢 建任務可直接做 / 🟡 執行前先跟主人說
```

---

## 目的

確保每個任務都有紀錄、有產出、有驗收。沒走完這個流程的任務 = 沒做。

---

## 完整流程

```
收到指令 → 建任務 → 建 Run → 執行 → 寫 RESULT.md → 回報 review → 等主人驗收
```

### Step 1: 建任務

```
POST /api/tasks
Body: {
  "title": "任務名稱",
  "description": "具體描述",
  "projectPath": "projects/openclaw",
  "priority": "medium",
  "status": "pending"
}
```

**必帶 projectPath**，沒帶 = API 會拒絕。

| 任務類型 | projectPath |
|----------|-------------|
| 知識庫寫入 | projects/openclaw/modules/knowledge/ |
| 系統維護 | projects/openclaw/modules/maintenance/ |
| 通用任務 | projects/openclaw/ |

### Step 2: 建 Run

```
POST /api/tasks/{taskId}/run
```

回傳 `runId` 和 `runPath`，記下來。

### Step 3: 執行任務

- 根據任務類型決定自己做還是子派（見自幹防呆規則）
- 所有產出放在 `runPath` 目錄下

### Step 4: 寫 RESULT.md

在 `runPath` 下建立 `RESULT.md`：

```markdown
# RESULT — {任務名稱}

## 完成摘要
- 做了什麼（1-3 句話）

## 產出檔案
- `檔案路徑` (大小)

## evidenceLinks
- [檔案名](相對路徑)

## 驗證
- ls -la 確認檔案存在 ✅
- wc -c 確認 ≥5KB ✅（如適用）
```

### Step 5: 回報 review

```
PATCH /api/tasks/{taskId}/progress
Body: { "status": "review" }
```

### Step 6: 等主人驗收

主人看完說「好」→ 任務完成。主人說「改」→ 修改後重新回報。

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| API 建任務失敗 | 檢查 API 是否在跑（curl localhost:3011/api/health），不行就回報主人 |
| runPath 目錄不存在 | mkdir -p 建立，不要跳過 |
| 執行中出錯 | 停止，回報主人附上錯誤訊息，不要自己亂修 |
| RESULT.md 忘了寫 | 補寫，任務不算完成 |
| evidenceLinks 指向不存在的檔案 | 重新確認路徑，ls -la 驗證 |

---

## 回報格式（給主人的）

```
📋 任務完成回報
任務：{名稱}
狀態：review
產出：{主要檔案} ({大小})
耗時：{時間}
備註：{有的話寫}
```

---

## 常見錯誤

1. **沒帶 projectPath** → API 400 錯誤
2. **先做事後建任務** → 違規，任務板沒紀錄
3. **自己標 done** → 違規，只有主人能標 done
4. **RESULT.md 是空殼** → 違規，必須有真實內容
