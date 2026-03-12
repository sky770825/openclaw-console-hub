# LLM 成本优化策略

## 一句话结论
通过提示词优化、上下文缓存和模型路由策略，可降低 LLM API 成本 60-80%，Anthropic prefix caching 可实现 90% 成本降低。

## 核心策略

### 1. 提示词工程优化（Prompt Engineering）

#### 消除冗余
| 优化前 | 优化后 | 节省 |
|--------|--------|------|
| 127 tokens | 38 tokens | **70%** |

**示例**:
- ❌ "You are a helpful assistant. Please help me with the following task..."
- ✅ "Summarize the key points:"

#### 使用结构化格式
- JSON 和结构化输出减少自然语言的 token 浪费
- 示例: `Extract to JSON: {name, age, occupation}`

#### Few-Shot 学习优化
- 使用最少需要的示例（通常 1-3 个足够）
- 保持示例简洁，移除不必要的词
- 共享共同前缀减少重复指令

### 2. 上下文缓存策略（Context Caching）

#### 效果
| 提供商 | 成本降低 | 延迟降低 |
|--------|----------|----------|
| Anthropic prefix caching | 90% | 85% |
| OpenAI automatic caching | 50% | - |

#### 工作原理
- 缓存跨多个请求重复的提示前缀
- 缓存部分成本比常规 token 低 50-90%

#### 实施要求
| 提供商 | 最小可缓存内容 | 缓存 TTL |
|--------|----------------|----------|
| OpenAI | 1024 tokens | 5-60 分钟 |
| Anthropic | 2048 tokens | 5-60 分钟 |

#### 最佳实践
```python
SYSTEM_PROMPT = """You are a customer service AI for TechCorp.
Company policies:
[Large policy document - 2000 tokens]
"""

# 系统消息自动缓存，后续调用只需支付用户消息+输出费用
```

### 3. 模型选择策略（Model Routing）

#### 2025 年定价对比
| 模型 | Input | Output | 适用场景 |
|------|-------|--------|----------|
| **GPT-4 Turbo** | $0.01/1K | $0.03/1K | 复杂推理 |
| **GPT-4o** | $0.005/1K | $0.015/1K | 平衡性能 |
| **GPT-3.5 Turbo** | $0.0005/1K | $0.0015/1K | 简单任务 |
| **Claude 3 Opus** | $0.015/1K | $0.075/1K | 高质量输出 |
| **Claude 3 Haiku** | $0.00025/1K | $0.00125/1K | 快速响应 |

#### 关键洞察
**输出 token 成本是输入的 2-5 倍** — 限制输出长度对成本影响巨大

### 4. 缓存层级设计

| 缓存类型 | 用途 | Key 设计 |
|----------|------|----------|
| **Prompt Cache** | 系统提示、工具定义 | model + system prompt + user prompt + tools |
| **Retrieval Cache** | RAG 查询结果 | query → hits → reranked results (TTL) |
| **Embedding Cache** | 重复文档去重 | identical strings and documents |

### 5. 批处理策略（Batching）
- 合并多个请求进行批处理
- 利用 retrieval-augmented generation 处理重复查询

## 实施优先级

| 阶段 | 策略 | 预期节省 | 实施难度 |
|------|------|----------|----------|
| **立即** | 提示词优化 + 缓存 | 60-80% | 低 |
| **中期** | 模型级联（cascading） | 额外 20-30% | 中 |
| **长期** | 自托管（高容量时） | 长期成本降低 | 高 |

## 可套用到 OpenClaw 的点

1. **Gateway 层缓存**: 在 Gateway 实现 prompt cache，自动缓存系统提示和工具定义

2. **模型路由**: 根据任务复杂度自动选择模型（简单任务 → GPT-3.5/Haiku，复杂任务 → GPT-4/Opus）

3. **输出限制**: 为每个任务类型设置默认 max_tokens，避免意外高成本

4. **成本追踪**: 实现 per-task 成本追踪，识别高成本任务并优化

5. **Embedding 缓存**: 对知识库查询结果进行缓存，减少重复 embedding 调用

## 引用来源
- Glukhov Token Optimization: https://www.glukhov.org/post/2025/11/cost-effective-llm-applications/
- Introl Prompt Caching: https://introl.com/blog/prompt-caching-infrastructure-llm-cost-latency-reduction-guide-2025
- Koombea Cost Optimization: https://ai.koombea.com/blog/llm-cost-optimization
- AI Tools Business Caching: https://aitoolsbusiness.com/ai-cost-optimization/
- Latitude Batch Processing: https://latitude-blog.ghost.io/blog/scaling-llms-with-batch-processing-ultimate-guide/

---
*搜集时间: 2026-02-14*
