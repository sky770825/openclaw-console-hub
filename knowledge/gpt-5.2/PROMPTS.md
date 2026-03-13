# GPT-5.2 Best Prompts & Modes (2026)

## Thinking Mode (o1-style)
```
model=gpt-5.2-thinking
Task: "解釋這段複雜代碼的執行流程，step-by-step"
→ 啟用 extended reasoning，適合 debug
```

## Agentic Coding
```
"Refactor this monorepo: analyze deps → plan → execute tests"
- SWE-bench 80% 模式
- 自動 multi-file edit
```

## Knowledge Work
```
"分析這份財報，提取關鍵指標並做成表格"
- GDPval-AA 1462 等級
- 試算表整合
```

## Multimodal
```
"描述這張圖表的趨勢和異常點"
- MMMU 84.2% 視覺理解
- canvas/image 協作
```

## Cost-Optimized Fallback
```
Policy: Kimi/Gemini 初稿 → GPT-5.2 審查
避免直接燒 $620/GDPval
```

來源：OpenAI API docs, vellum.ai benchmarks (2025-12)