# Workflow 编排工具详细对比 2025

## 一句话结论
Airflow 仍是批处理工作流的默认选择，Dagster 在数据/ML 管道中胜出，Temporal 是长流程和 AI Agent 的最佳选择。

## 市场地位

### 2025 年开源编排生态
| 排名 | 工具 | 市场地位 | 特点 |
|------|------|----------|------|
| 1 | **Airflow** | 主导力量 | 最活跃的开源项目 |
| 2 | **Dagster** | 第二流行 | 资产为中心的方法 |
| 3 | **Temporal** | 快速增长 | 状态化工作流引擎 |
| 4 | **Prefect** | 稳步发展 | Python-native |
| 5 | **Kestra** | 新兴 | YAML-based |

### 历史背景
- 2018 年：选择很简单（Airflow vs Luigi vs Azkaban）
- 2024 年：超过 10 个活跃项目，包括 Netflix 开源的 Maestro
- 2025 年：AI/LLM 时代，不同工具适用不同场景

## 详细对比

### Apache Airflow - 经典批处理调度器
**定位**: 批处理 ETL 的默认选择

**优势**:
- 成熟的生态系统（providers、plugins、托管服务）
- Python-native，易于集成 Python LLM 任务
- 适合定时 ETL、报告生成、数据库加载

**局限**:
- 缺乏对长生命周期/有状态工作流的支持
- 复杂 LLM 任务的重试逻辑较弱

**适用场景**:
- 现有批处理 ETL 工作负载
- 轻量级 LLM 任务（每日内容摄取、批处理推理）

**示例 LLM 管道**:
- 每日抓取财经新闻 → 生成 embedding → 更新向量数据库

---

### Dagster - 资产为中心的现代编排器
**定位**: 数据优先，强调可追溯性和可观测性

**优势**:
- 内置数据可观测性：知道生成了什么数据/模型、何时生成、如何生成
- 资产设计：鼓励模块化、可重用的 LLM 管道
- ML/LLM Ready：适合预处理、微调、评估、部署的多阶段管道
- 优秀的开发者体验：本地开发工具 + Dagster Cloud

**适用场景**:
- 需要清晰度、可追溯性、可观测性的 LLM/ML 管道
- 多步 RAG 工作流

**真实案例**:
- US Foods 使用 Dagster 实现 99.996% 正常运行时间，消除数据过时问题

---

### Temporal - 持久化执行引擎
**定位**: 状态化工作流引擎，保证执行

**优势**:
- 容错性：内置重试、检查点、可恢复性
- 长流程支持：工作流可持续数秒到数天
- UI/可观测性：业界最佳
- 代码即工作流：用常规代码编写工作流

**适用场景**:
- 长运行业务流程（订单处理、客户入职）
- 需要可靠执行的复杂工作流
- AI Agent 编排

**用户反馈**:
> "Temporal 的 UI/可观测性无与伦比。定义 activities 和 workflows 非常愉快。" — Reddit 用户

---

### Prefect - 灵活的 Python-native
**定位**: 分析工作负载，易于集成现有代码

**优势**:
- 与现有代码轻松集成
- 本地托管实例的缓存和并发优势
- Python-first 设计

**局限**:
- 稳定数据管道表现好
- 每次运行需要不同配置的流程较难管理

---

### Kestra - YAML-based 新兴选择
**定位**: ETL 和数据管道

**特点**:
- YAML 配置
- 适合数据工程团队

---

## LLM/AI 时代的选择指南

| 场景 | 推荐工具 | 原因 |
|------|----------|------|
| **批处理 ETL + 轻量 LLM** | Airflow | 成熟稳定，生态丰富 |
| **LLM 训练管道** | Dagster | 资产追踪，可观测性 |
| **多步 RAG 工作流** | Dagster | 数据血缘，版本控制 |
| **AI Agent 编排** | Temporal | 状态持久化，可靠执行 |
| **长流程业务流程** | Temporal | 容错性，可恢复性 |
| **分析工作负载** | Prefect | 缓存，并发，易集成 |

## 技术架构对比

| 特性 | Airflow | Dagster | Temporal | Prefect |
|------|---------|---------|----------|---------|
| **核心模型** | DAG 任务 | 数据资产 | 状态化工作流 | Python 任务 |
| **长流程支持** | ❌ | ⚠️ | ✅ | ⚠️ |
| **数据血缘** | ❌ | ✅ | ⚠️ | ⚠️ |
| **可观测性** | 中等 | 优秀 | 业界最佳 | 良好 |
| **重试机制** | 基础 | 中等 | 强大 | 中等 |
| **LLM 友好度** | 中等 | 优秀 | 优秀 | 良好 |

## 对 OpenClaw 的启示

1. **Cron 系统定位**:
   - 当前类似 Airflow（时间触发）
   - 可考虑增加 Temporal 模式支持长任务

2. **任务状态管理**:
   - 学习 Dagster 的资产追踪
   - 为每个任务记录输入/输出/状态

3. **AI Agent 支持**:
   - Temporal 模式适合 Agent 编排
   - 支持 checkpoint 和恢复

4. **可观测性**:
   - 参考 Temporal 的 UI/追踪
   - 集成 OpenTelemetry

## 引用来源
- Pracdata State of Workflow Orchestration 2025: https://www.pracdata.io/p/state-of-workflow-orchestration-ecosystem-2025
- Datum Labs Orchestration Showdown: https://medium.com/datumlabs/orchestration-showdown-airflow-vs-dagster-vs-temporal-in-the-age-of-llms-758a76876df0
- Prefect Blog: https://www.prefect.io/blog/orchestration-tools-choose-the-right-tool-for-the-job
- Bytebase Top Tools: https://www.bytebase.com/blog/top-open-source-workflow-orchestration-tools/
- Procycons Comparison: https://procycons.com/en/blogs/workflow-orchestration-platforms-comparison-2025/
- Reddit Data Engineering: https://www.reddit.com/r/dataengineering/comments/1cxyvqk/airflow_vs_dagster_vs_prefect_vs/

---
*搜集时间: 2026-02-14*
