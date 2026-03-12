# Agent 配置变更记录

**日期**: 2026-02-15  
**类型**: 重要决策

## 变更内容

### 1. Gemini API 配置
- 额度：300 USD
- 用途：子代理开模型、Windows 备援
- 位置：`~/.openclaw/secure/google-api.key`

### 2. Agent 职责调整
- **Codex**: 暂离（临时不可用）
- **Claude**: 暂时代理 Codex 的工作
  - 代理范围：代码开发、技术任务
  - 临时措施，直到 Codex 恢复

### 3. 模型优先级
1. Kimi K2.5 - 主力（日常对话）
2. Gemini Free - 备援（监控报告）
3. Claude - 开发任务（代理 Codex）
4. Ollama 本地 - 简单任务

## 原因
- 成本优化
- Codex 暂时不可用
- 保持服务连续性

## 影响
- 开发任务由 Claude 接手
- Gemini 300 USD 可用于子代理
- 整体成本可控

---
**永久记录 - 不可删除**
