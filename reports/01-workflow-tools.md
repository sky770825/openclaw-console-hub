# Workflow Orchestration 工具对比

## 一句话结论
Temporal 适合需要状态持久化和可靠执行的长流程，Celery 适合简单的任务队列；n8n 以自托管和按执行计费在成本上挑战 Zapier 的按任务计费模式。

## Temporal vs Celery

### 架构差异
| 特性 | Celery | Temporal |
|------|--------|----------|
| 模型 | 传统任务队列，fire-and-forget | 代码即工作流，自动 checkpoint |
| 状态管理 | 无内置状态持久化 | 内置状态持久化，可精确恢复 |
| 重试机制 | 基础重试 | 内置指数退避和抖动 |
| 可见性 | Flower (基础) | 完整的可见性和监控 |
| 分布式工作流 | 不支持 | 原生支持 |
| 有状态 Agent | 不支持 | 原生支持 |

### 适用场景
- **Celery**: 短期任务、后台作业、简单的异步处理
- **Temporal**: 
  - 长运行业务流程（如订单处理、入职流程）
  - 需要可靠执行的复杂工作流
  - 需要状态恢复的场景
  - Agent 编排

### 关键概念
**Temporal 的 Replay 机制**:
- 工作流代码必须对相同输入和历史产生相同的 API 调用序列
- 外部依赖操作（网络 I/O、文件 I/O、随机数等）必须推送到 Activities
- 工作流本身只专注于编排逻辑

### 学习曲线
> "Temporal 的学习曲线很陡峭。它需要完全改变从基于任务的系统（如 Celery）的心智模型。" — Procycons

## Zapier vs n8n 定价对比

### 计费模式
| 工具 | 计费单位 | 免费版 | 入门付费 | 特点 |
|------|----------|--------|----------|------|
| **Zapier** | 按任务 (Task) | 100 tasks/月 | ~$19.99/月起 | 简单易用，6000+ 集成 |
| **n8n** | 按工作流执行 | 自托管免费 | $4.99/月起 (托管) | 开源，可自托管，无限制工作流 |
| **Make** | 按操作 (Operation) | 1,000 ops/月 | ~$9/月起 | 可视化流程构建 |

### 关键差异
1. **自托管优势**: n8n 可自托管，Community Edition 完全免费
2. **计费透明度**: 
   - Zapier: 按任务计费，多步骤 Zap 或高级应用需升级
   - n8n: 按工作流执行计费，对低量或实验性自动化更友好
3. **AI 能力**: n8n 被视为 "no-code AI agent builder platform"，在构建 AI Agent 方面比 Power Automate 更简单便宜

### 趋势观察
- Zapier 2025 年更新暗示 "更多灵活性、效率和可靠性"，可能包括新的定价选项
- n8n 的执行模型可能影响行业考虑按工作流的固定或分层计费

## 可套用到 OpenClaw 的点

1. **计费单位选择**: 
   - 参考 n8n 的 "按执行计费" vs Zapier 的 "按任务计费"
   - 考虑 OpenClaw 的 "按任务/按 Token/按执行时间" 哪种对用户更友好

2. **自托管选项**:
   - n8n 的成功证明开发者愿意自托管以降低成本
   - OpenClaw 可考虑提供自托管企业版

3. **状态持久化**:
   - Temporal 的 checkpoint 机制对长任务很重要
   - OpenClaw 的 Cron 和任务系统可考虑类似机制

4. **开源策略**:
   - n8n 的 Sustainable Use License 平衡了开源和商业
   - 可作为 OpenClaw 技能市场的参考

## 引用来源
- Celery vs Temporal: https://pedrobuzzi.hashnode.dev/celery-vs-temporalio
- Workflow Orchestration Platforms: https://procycons.com/en/blogs/workflow-orchestration-platforms-comparison-2025/
- Queueing Architectures: https://medium.com/@pranavprakash4777/modern-queueing-architectures-celery-rabbitmq-redis-or-temporal-f93ea7c526ec
- n8n vs Zapier: https://n8n.io/vs/zapier/
- n8n vs Zapier Review: https://thedigitalprojectmanager.com/tools/zapier-vs-n8n/
- Zapier vs n8n Enterprise: https://zapier.com/blog/n8n-vs-zapier/

---
*搜集时间: 2026-02-14*
