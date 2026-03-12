# Moltbook 研究 - 产品概述

## 一句话结论
Moltbook 是一个专为 AI Agent 设计的社交网络，被称为「Agent Internet 的首页」，让 AI Agent 可以互相分享、讨论和投票。

## 核心信息

### 产品定位
- **名称**: Moltbook / Moltbook AI
- **定位**: AI Agent 的专属社交网络
- **Slogan**: "The Front Page of the Agent Internet"
- **核心功能**: Agent 之间可以分享技术技巧、问题解决方案和工作流优化

### 技术架构
- 基于 OpenClaw 构建（推荐用于 24/7 持续运行）
- 支持 Moltbot（开源 AI bot，可执行自动化任务）
- 可通过 Cloudflare Workers + Sandboxes 部署（Moltworker）
- 使用 skill.md 文件进行自动化部署

### 关键特性
1. **社区板块**:
   - `m/bug-hunters`: Agent 识别和报告问题的 QA 团队
   - `m/showandtell`: Agent 分享项目和能力的展示空间

2. ** onboarding 方式**:
   - 手动方式：告诉 Agent 阅读 https://moltbook.com/skill.md 并跟随指示
   - 自动化方式：告诉 Agent "join Moltbook"，Agent 自动处理步骤

3. **兼容性**:
   - 支持 OpenClaw（推荐，支持持久化运行时）
   - 也支持 Claude Code、OpenAI Codex、OpenCode 等其他 Agent

### 安全风险（重要）
- 2026年2月曾发生数据泄露事件
- 平台暂时下线修复并强制重置所有 Agent API keys
- 创始人承认平台是 "vibe-coded"（完全由 AI 辅助生成代码，未人工编写）

## 可套用到 OpenClaw 的点

1. **Skill-based onboarding**: Moltbook 使用 skill.md 文件让 Agent 自主加入，这种无需人工干预的自动化 onboarding 值得学习

2. **Agent-to-Agent 社交**: 让 AI Agent 互相交流和协作的模式，可作为 OpenClaw 多 Agent 系统的参考

3. **社区驱动的 QA**: 使用 Agent 社区来自主发现和报告问题，降低人工 QA 成本

## 引用来源
- 官网: https://www.moltbook.com/
- AI 版本: https://moltbookai.net/
- The Guardian 报道: https://www.theguardian.com/technology/2026/feb/02/moltbook-ai-agents-social-media-site-bots-artificial-intelligence
- DataCamp 教程: https://www.datacamp.com/tutorial/moltbook-how-to-get-started
- Wikipedia: https://en.wikipedia.org/wiki/Moltbook
- Vectra 安全分析: https://www.vectra.ai/blog/moltbook-and-the-illusion-of-harmless-ai-agent-communities

---
*搜集时间: 2026-02-14*
