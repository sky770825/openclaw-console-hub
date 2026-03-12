# MULTI-AGENT-INDEX.md - Multi-Agent 完整關鍵字索引

## 關鍵字索引（快速查找）

Multi-Agent、多 Agent 系統、記憶體管理、Context Window、分層記憶體、Hot Memory、Warm Memory、Cold Memory、Session 孤兒、Context Poisoning、Memory Leak、Cold Start、Token 成本失控、Circuit Breaker、熔斷機制、Task Idempotency、任務冪等、Adaptive Rate Limiting、自適應限流、Agent Performance Registry、Incremental Context Sharing、增量上下文、節省 Token、OpenRouter、Kimi K2.5、零成本方案、免費模型、BullMQ、liteLLM、Langfuse、Cursor、Qodo、工作排程化、中控任務系統、自動開發流程、多模型策略、混合編排、Hierarchical、Mesh、Hub-and-Spoke、智能路由、Ollama 優化、Mac M 系列、16GB RAM、子 Agent 並發、Context 壓縮、Checkpoint、Memory Pool、Shared State Store、Pub/Sub、Prefect、Temporal、GitHub Actions CI/CD、代碼審查自動化、測試生成、安全掃描、監控回滾、LangGraph、CrewAI、AutoGen、OpenAI Swarm、Prometheus、Grafana、Gemini 2.5 Flash、Claude Sonnet、DeepSeek R1、Llama 4、自動路由、fallback、模型降級、Session 生命週期、Token 追蹤、視覺化 Dashboard、告警系統、分散式追蹤、成本優化、效能分析

## 相關文件

- 整合報告：`docs/MULTI-AGENT-STRATEGY.md`（核心策略文件，2,950 字精華版）
- 原始報告：
  - Alpha：`research-alpha-multi-agent-infrastructure.md`（記憶體+系統底層+監控）
  - Beta：`research-beta-orchestration-report.md`（排程+編排+自動化開發）
  - Gamma：`research-gamma-multi-model-strategy.md`（OpenRouter+多模型+硬體需求）

## 立即行動清單（Phase 1）

- [ ] 註冊 OpenRouter（https://openrouter.ai）
- [ ] 編輯 `~/.openclaw/openclaw.json` 加入 OpenRouter provider
- [ ] 充值 $10 提升日限至 1000 次（可選）
- [ ] 實作 Token 使用記錄（`token-usage.jsonl`）
- [ ] 建立監控腳本（`scripts/monitor-performance.sh`）

## 零成本配置

主力 Kimi K2.5 + 備用 OpenRouter Free（充值 $10 日限↑20倍）+ 本地 Ollama

## 執行路線圖

Phase 1 基礎設施（Week 1-2）→ Phase 2 編排與排程（Week 3-4）→ Phase 3 優化與穩定（Week 5-8）→ Phase 4 規模化（Month 3+）
