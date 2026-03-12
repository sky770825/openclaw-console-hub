# LEARNING-RESOURCES.md - 進階程式設計學習資源

## 5個商業專案技術需求分析

| 專案 | 核心技術需求 | 設計模式 | 進階主題 | 優先學習順序 |
|------|-------------|---------|---------|-------------|
| **SkillForge** | Plugin 架構、TypeScript 泛型、CLI 工具 | Factory, Builder, Strategy, Plugin | 程式碼混淆、授權驗證 | P1 - 立即 |
| **EliteGuard** | AST 分析、靜態掃描、Pattern Matching | Visitor, Chain of Responsibility | Semgrep/ESLint API、CWE 對映 | P1 - 立即 |
| **MemCore** | Vector DB、Embedding、快取策略 | Repository, Unit of Work | HNSW 演算法、近似搜尋 | P2 - 中期 |
| **AgentHub** | 多租戶、權限系統、撮合演算法 | Multi-tenancy, RBAC | 智能合約、零知識證明 | P3 - 後期 |
| **AutoWealth** | DeFi 協議、風險模型、鏈上安全 | Strategy, Observer | 閃電貸防護、MEV 保護 | P3 - 後期 |

## TypeScript 設計模式與架構

- **Refactoring.Guru TypeScript Patterns**: https://refactoring.guru/design-patterns/typescript
- **Fireship TypeScript Design Patterns**: https://fireship.io/lessons/typescript-design-patterns/
- **Reddit r/typescript 設計模式合集**: https://www.reddit.com/r/typescript/comments/17721ht/a_collection_of_useful_design_patterns/

## 靜態程式碼分析與安全性

- **GitLab SAST 文件**: https://docs.gitlab.com/user/application_security/sast/
- **Snyk SAST 指南**: https://snyk.io/articles/application-security/static-application-security-testing/
- **Aikido SAST 平台**: https://www.aikido.dev/blog/ultimate-sast-guide-static-application-security-testing
- **Oligo Security 靜態分析**: https://www.oligo.security/academy/static-code-analysis

## 學習路線圖

1. **Phase 1 (現在)**：TypeScript Plugin 架構 + AST 基礎
2. **Phase 2 (SkillForge 上線後)**：Vector DB 優化 + Embedding 技術
3. **Phase 3 (資金累積後)**：多租戶架構 + DeFi 安全
