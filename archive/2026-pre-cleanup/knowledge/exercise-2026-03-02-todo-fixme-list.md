# 练习：server/src/ 全量 TODO/FIXME/HACK 待修清单
> 日期：2026-03-02
> 题库：D-1（grep 实战 + 系统巡逻）
> 搜索范围：server/src/**/*.ts
> 搜索命令：`grep -rn "TODO\|FIXME\|HACK" server/src/`

---

## 搜索结果

### 真实 TODO 注释（需要处理）

共找到 **2 条**真实的 TODO 注释：

| # | 文件 | 行号 | 类型 | 内容 | 严重度 | 建议处理方式 |
|---|------|------|------|------|--------|-------------|
| 1 | `server/src/anti-stuck.ts` | 224 | TODO | `// TODO: 實作資料庫更新` | 中 | 实作 fallback history 写入 Supabase |
| 2 | `server/src/middlewares/firewall.ts` | 78 | TODO | `// TODO: 整合 n8n 或 Telegram 發送警報` | 高 | 接入 n8n webhook 或 Telegram notify |

### 非注释命中（误报，排除）

| # | 文件 | 行号 | 说明 |
|---|------|------|------|
| 1 | `server/src/routes/auto-executor.ts` | 238 | 这是 AI prompt 字符串里提到「TODO/FIXME」作为搜索指令的一部分，不是代码注释 |

---

## 详细分析

### TODO #1：anti-stuck.ts:224 — 缺少 fallback history 持久化

**位置**：`server/src/anti-stuck.ts` 第 224 行
**函数**：`recordFallback(runId, from, to, reason)`
**上下文**：

```typescript
const fallbackRecord = {
  from,
  to,
  reason,
  timestamp: new Date().toISOString(),
};

log.info({ fallbackRecord }, `[AntiStuck] Fallback recorded for run ${runId}`);

// TODO: 實作資料庫更新
// await updateRunInDatabase(runId, {
//   fallbackHistory: [...existingFallbacks, fallbackRecord]
// });
```

**问题**：AntiStuck 模块在模型 fallback 时只写 log，没有持久化到数据库。如果 server 重启，fallback 历史就丢失了。

**影响**：中等 -- 目前只丢失诊断数据，不影响核心功能。但长期来看，无法分析哪些模型经常需要 fallback。

**建议修复**：
1. 在 Supabase 建一个 `anti_stuck_fallbacks` 表
2. 把 `updateRunInDatabase` 实作出来，把 fallbackRecord insert 进去
3. 加个 dashboard API 端点查询 fallback 统计

---

### TODO #2：firewall.ts:78 — 防火墙警报未接入通知

**位置**：`server/src/middlewares/firewall.ts` 第 78 行
**函数**：`sendAlert(eventType, origin)`
**上下文**：

```typescript
const sendAlert = async (eventType: string, origin: string): Promise<void> => {
  // TODO: 整合 n8n 或 Telegram 發送警報
  log.warn({ eventType, origin }, 'FIREWALL ALERT: Unauthorized postMessage blocked');

  // 這裡可以擴展為實際的警報發送邏輯
  // 例如：呼叫 n8n webhook 或發送 Telegram 通知
};
```

**问题**：postMessage 防火墙拦截到恶意请求时，只写 log.warn，不会通知老蔡。如果有人在攻击，老蔡不会即时知道。

**影响**：高 -- 安全事件没有即时通知，可能延误应急响应。

**建议修复**：
1. 调用 `POST http://localhost:3011/internal/notify` 发 Telegram 给老蔡
2. 或调用 n8n webhook `http://localhost:5678/webhook/security-alert`
3. 加上频率限制（同一个 origin 5 分钟内只通知一次，避免刷屏）

---

## FIXME / HACK 搜索结果

**FIXME**：0 条
**HACK**：0 条

代码库中没有任何 FIXME 或 HACK 注释，说明代码质量意识不错，没有遗留已知的 hack 或需要紧急修复的标记。

---

## 小结

| 统计项 | 数量 |
|--------|------|
| 真实 TODO | 2 |
| 误报（prompt 字符串） | 1 |
| FIXME | 0 |
| HACK | 0 |
| **待处理总计** | **2** |

**优先级排序**：
1. **高优先**：firewall.ts 警报通知 -- 安全相关，应尽快接入
2. **中优先**：anti-stuck.ts 数据持久化 -- 诊断数据，不紧急但有价值

**给小蔡的建议**：这 2 个 TODO 都可以作为 create_task 派工的候选任务。firewall 那个可以先做，因为涉及安全。anti-stuck 那个可以等老蔡确认是否需要建新的 Supabase 表。
