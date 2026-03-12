# 990 專案範圍與目標文件 (Project Scope Definition)

## 1. 專案目標
- **目標 A**: 完成 SLM (Service Level Management/Small Language Model) 核心模組的效能基準測試。
- **目標 B**: 將 990 核心業務邏輯從 Legacy 模組遷移至受管理的新容器化環境。
- **目標 C**: 確保遷移後的系統效能與原系統持平或優於原系統。

## 2. 具體範圍 (In-Scope)
- SLM API 端點壓測 (Concurrency: 100, 500, 1000 RPS)。
- 核心邏輯代碼重構與遷移 (Java/Node -> Target Environment)。
- 建立自動化回歸測試腳本。

## 3. 驗收標準 (Acceptance Criteria)
- **效能驗收**: P95 Latency < 200ms 下，系統需支撐 500 RPS。
- **遷移驗收**: 所有核心邏輯單元測試通過率 100%，且與舊系統結果比對一致。
- **文件驗收**: 交付效能測試報告與遷移技術手冊。

## 4. 資源與工具
- **壓測工具**: k6, Prometheus, Grafana
- **遷移工具**: CI/CD Pipelines, Docker
- **資源**: 測試環境伺服器 x4, 資料庫快照 x1
