# Model Routing Configuration

## Overview
This document defines the routing logic and supported models for the AI gateway. It ensures requests are directed to the most appropriate model based on task complexity, cost, and latency requirements.

## Change Log (Latest Updates)
- **Commit 92d509c4**: Added support for **DeepSeek V3** (`deepseek-chat`).
- **Commit 04986618**: Added support for **DeepSeek R1** (`deepseek-reasoner`).
- **Commit 8d6bb60c**: Removed deprecated legacy models (GPT-3.5 series and older Claude variants).

## Supported Models

| Model ID | Provider | Tier | Description |
| :--- | :--- | :--- | :--- |
| `deepseek-chat` | DeepSeek | Production | **DeepSeek V3**: General purpose, high-efficiency MoE model. |
| `deepseek-reasoner` | DeepSeek | Production | **DeepSeek R1**: Specialized reasoning and CoT (Chain of Thought). |
| `gpt-4o` | OpenAI | Premium | Multi-modal high-performance model. |
| `claude-3-5-sonnet` | Anthropic | Premium | Balanced performance and coding capabilities. |

## Routing Strategies

### 1. Default Routing (General Tasks)
Standard conversational queries that do not require deep reasoning are routed to **DeepSeek V3**.
- **Rule**: `intent == "general"` or `undefined`
- **Target**: `deepseek-chat`

### 2. Reasoning Routing (Complex Tasks)
Queries involving math, logic, complex coding architectures, or explicit "reasoning" requests are routed to **DeepSeek R1**.
- **Rule**: `intent == "reasoning"` or `tags.contains("complex-logic")`
- **Target**: `deepseek-reasoner`

### 3. High-Precision Fallback
If the primary DeepSeek models return rate limits (429) or server errors (5xx), the system falls back to the Premium tier.
- **Primary**: DeepSeek V3 / R1
- **Secondary**: GPT-4o / Claude 3.5 Sonnet

## Removed Models
The following models have been decommissioned as of commit **8d6bb60c**:
- `gpt-3.5-turbo`
- `gpt-3.5-turbo-16k`
- `claude-2.1`

---
*Last updated: 2026-03-01 based on system configuration audit.*
