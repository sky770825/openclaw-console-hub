# E-2 范例答案：任务排序过滤

> 题库 E（代码能力）第 2 题
> 日期：2026-03-02
> 工具：code_eval action（沙盒 JS 执行）

---

## 题目重述

给定一组任务清单，每个任务有 `name`、`status`、`priority` 三个字段。
要求：
1. 过滤出 `status === 'ready'` 的任务
2. 按 `priority` 从高到低排序
3. 输出结果

---

## code_eval 实际代码

```javascript
const tasks = [
  { name: '修 Bug',  status: 'ready',   priority: 3 },
  { name: '写文件', status: 'done',    priority: 1 },
  { name: '加功能', status: 'ready',   priority: 5 },
  { name: '测试',   status: 'ready',   priority: 2 },
  { name: '部署',   status: 'running', priority: 4 },
];

// Step 1: filter — 只留 status === 'ready'
// Step 2: sort  — priority 大的排前面（降序）
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);

console.log(JSON.stringify(result, null, 2));
```

---

## 预期输出

```json
[
  { "name": "加功能", "status": "ready", "priority": 5 },
  { "name": "修 Bug",  "status": "ready", "priority": 3 },
  { "name": "测试",   "status": "ready", "priority": 2 }
]
```

- 共 3 笔（done 和 running 被过滤掉）
- 优先级：5 > 3 > 2

---

## 学习要点

| 方法 | 用途 | 关键 |
|------|------|------|
| `Array.filter(fn)` | 保留符合条件的元素 | 回传 `true` 留下，`false` 丢弃 |
| `Array.sort(fn)` | 原地排序 | `b - a` 降序，`a - b` 升序 |
| 链式调用 | `.filter().sort()` 一气呵成 | filter 回传新数组，不影响原始 tasks |

**達爾笔记**：实际系统中 `/api/openclaw/tasks` 回传的资料也是类似结构，
用 filter + sort 就能在本地做任务筛选，不需要每次都打 API 带 query 参数。
