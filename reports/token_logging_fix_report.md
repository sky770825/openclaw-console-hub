# Technical Report: ask_ai Token Logging Fix

## Issue Description
The `metadata` field in the `openclaw_runs` table is currently `null` for `ask_ai` actions, preventing cost tracking and token usage analysis.

## Analysis
The search in source code indicates:
- Action definition: Found in the server source directory.
- Database interface: Uses the `openclaw_runs` table.
- LLM response: The current logic likely discards the `usage` object returned by the provider (OpenAI/Anthropic).

## Implementation Plan (Recommended for 主人)

### Step 1: Modify Action Runner / LLM Service
Capture the usage statistics from the AI completion response.

```typescript
// Example Logic to be integrated
const aiResponse = await this.llm.generate(prompt);
const usageMetadata = {
  model: aiResponse.model || 'unknown',
  prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
  completion_tokens: aiResponse.usage?.completion_tokens || 0,
  total_tokens: aiResponse.usage?.total_tokens || 0,
  timestamp: new Date().toISOString()
};
```

### Step 2: Update Database Entry
When closing the run log entry for `ask_ai`, ensure the metadata is passed to the update query.

```typescript
await this.db('openclaw_runs')
  .where({ id: currentRunId })
  .update({
    status: 'completed',
    metadata: JSON.stringify(usageMetadata),
    updated_at: new Date()
  });
```

## Impact
- **Cost Control**: Enables calculation of USD cost per run.
- **Optimization**: Identifies high-token-consuming prompts.
- **Observability**: Provides transparency into AI model behavior.

