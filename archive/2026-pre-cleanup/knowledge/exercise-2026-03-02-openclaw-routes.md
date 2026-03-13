# 练习：OpenClaw 任务板路由定义总表
> 日期：2026-03-02
> 题库：B-2（grep 搜寻实战）
> 来源：server/src/routes/openclaw-tasks.ts（302 行）

---

## 路由总览

基础路径：`/api/openclaw/tasks`（挂载在 openclawTasksRouter 上）

| # | 方法 | 路径 | 行号 | 功能 | 认证 | 回传格式 |
|---|------|------|------|------|------|----------|
| 1 | GET | `/` | 69 | 列出所有任务 | API Key | JSON 数组（映射后的看板格式） |
| 2 | POST | `/` | 100 | 新增任务 | API Key | 201 JSON（新建的任务） |
| 3 | PATCH | `/:id` | 208 | 更新指定任务 | API Key | JSON（更新后的任务） |
| 4 | POST | `/archive-done` | 252 | 批次删除所有 done 任务 | API Key | JSON `{ archived: number }` |
| 5 | DELETE | `/:id` | 284 | 删除指定任务 | API Key | 204 No Content |

---

## 各路由详细分析

### 1. GET /api/openclaw/tasks（第 69 行）

**功能**：列出所有 OpenClaw 任务，带 in-memory fallback。

**处理流程**：
1. 检查 Supabase 连线 -- 没连回 503
2. 调用 `fetchOpenClawTasks()` 从 Supabase 拉数据
3. 若 Supabase 空且内存有任务 -> fallback 到 in-memory `tasks` 数组
4. 用 `mapToBoard()` 映射成前端看板格式

**状态映射**（OC_STATUS_TO_BOARD）：
| OpenClaw status | 看板 status |
|-----------------|-------------|
| queued | ready |
| in_progress | running |
| done | done |

**回传字段**：基础 Task 字段 + title, subs, progress, cat, thought, from_review_id, result, qualityScore, qualityGrade

---

### 2. POST /api/openclaw/tasks（第 100 行）

**功能**：新增任务，含多重防护。

**防护层（按顺序）**：
1. **Supabase 检查** -- 503 if not connected
2. **Stub 检测** -- 没有 compliance 字段（projectPath, rollbackPlan 等）视为 stub
   - 空白卡片（无标题无描述无子任务）-> 204 静默丢弃
   - 有内容但无 compliance -> 400 拒绝（除非 `?allowStub=1`）
3. **提示词防护** -- `scanTaskPayload()` 扫描 name/title/description/runCommands
   - 命中 BLOCK 规则 -> 400 + `PROMPT_GUARD_BLOCK` 错误码

**特殊参数**：
- `?allowStub=1` -- 允许達爾等代理建简易任务（跳过 compliance 检查）
- `body.fromR` / `body.from_review_id` -- 标记任务来源（从 review 衍生）

**ID 生成**：`body.id ?? 't' + Date.now()`

---

### 3. PATCH /api/openclaw/tasks/:id（第 208 行）

**功能**：更新指定任务。

**处理流程**：
1. 检查 Supabase
2. 先 fetch 所有任务，找到对应 ID 的任务
3. 找不到 -> 404
4. 合并 body 到现有任务（spread 覆盖）
5. upsert 回 Supabase

**注意**：title 和 subs 有独立合并逻辑（不走 taskToOpenClawTask 映射）

---

### 4. POST /api/openclaw/tasks/archive-done（第 252 行）

**功能**：批次删除所有状态为 done 的任务（归档清理）。

**处理流程**：
1. 先计数：SELECT id FROM openclaw_tasks WHERE status = 'done'
2. 0 条 -> 回传 `{ archived: 0 }`
3. 批次 DELETE WHERE status = 'done'
4. 回传 `{ archived: count }`

**风险**：这是硬删除，不是软删除。删了就没了。

---

### 5. DELETE /api/openclaw/tasks/:id（第 284 行）

**功能**：删除单一指定任务。

**处理流程**：直接 DELETE FROM openclaw_tasks WHERE id = :id

**回传**：204 No Content（成功无回传内容）

---

## 辅助函数

| 函数 | 行号 | 用途 |
|------|------|------|
| `mapToBoard(oc)` | 38 | 映射 OpenClaw 任务到前端看板格式，含 qualityScore 解析 |
| `OC_STATUS_TO_BOARD` | 31 | 状态映射常量（queued->ready, in_progress->running, done->done） |

## 依赖模块

| 模块 | 引入 | 用途 |
|------|------|------|
| `../supabase.js` | hasSupabase, supabase | Supabase 客户端和连线检查 |
| `../openclawSupabase.js` | fetchOpenClawTasks, upsertOpenClawTask | OpenClaw 任务 CRUD |
| `../openclawMapper.js` | openClawTaskToTask, taskToOpenClawTask | 数据格式转换 |
| `../store.js` | tasks | in-memory 任务数组（fallback 用） |
| `../promptGuard.js` | scanTaskPayload | 提示词注入防护 |

---

## 小结

- 共 **5 个路由**：1 GET + 2 POST + 1 PATCH + 1 DELETE
- **数据源**：主 Supabase，备 in-memory（仅 GET 有 fallback）
- **防护机制**：Stub 检测 + 提示词防护（POST 独有）
- **所有路由**都有 try-catch 和 Supabase 连线检查
- **archive-done 是硬删除**，使用时需注意
