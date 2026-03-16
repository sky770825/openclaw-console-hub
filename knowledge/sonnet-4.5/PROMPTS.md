# Sonnet 4.5 Best Prompts & Modes (2026)

## Zero-Error Coding
```
model=claude-sonnet-4.5
Task: "Edit src/utils.ts add retry logic"
→ 0% edit errors, safe multi-file refactor
```

## Extended Thinking (比 Opus 4.5 更省)
```
budget_tokens=4000
Task: "分析這個架構的潛在問題"
→ Opus 級推理，Sonnet 成本
```

## Agentic Session
```
"幫我修這個 bug：先讀相關檔案 → 定位 → 修 → 測試"
- SWE-bench 77.2% (parallel 82%)
- Code 2.0 + GitHub Copilot 整合
```

## Claude Code Mode
```
sessions_spawn task="修 React bug" agentId="claude"
→ L2 主力，日常 coding 首選
```

## Speed vs Quality
```
Quick: Sonnet 4.5 (Arena #1)
Deep: Opus 4.6 (100萬 context)
→ AGENTS.md 路由規則
```

來源：Anthropic API, anthropic.com (2026-02)