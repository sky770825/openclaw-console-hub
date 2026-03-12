# 主動式 Agent 自我修復與智能預警系統 (Proactive Agent Self-Healing & Intelligent Alerting)

## 1. 系統願景
建立一個具備「感知 (Perception)」、「診斷 (Diagnosis)」、「修復 (Repair)」與「通知 (Notification)」閉環的自癒系統，降低人工干預頻率，確保 OpenClaw 環境的高可用性。

## 2. 核心組件
### A. 主動診斷器 (Active Diagnoser)
- **邏輯層級**：
  - **L1 (心跳)**：進程與端口存活檢查 (Health Check)。
  - **L2 (資源)**：磁碟空間、內存、API 配額。
  - **L3 (數據)**：檔案完整性、知識庫質量、Session 膨脹。
  - **L4 (行為)**：Agent 假報告、自幹行為。

### B. 自修復引擎 (Healing Engine)
- **綠燈修復 (Auto)**：
  - 清理根目錄污染。
  - 重置超時任務。
  - 補齊非核心缺失檔案 (如 README 範本)。
- **紅燈修復 (Managed)**：
  - 重啟 Docker 容器。
  - 重啟 Gateway。
  - 核心組件修復。

### C. 智能預警 (Intelligent Alerting)
- **Context 注入**：不僅僅是 "API Down"，而是提供 "API Down (Since 10min ago, affecting Task #123, Error: ECONNREFUSED)"。
- **降級處理**：當自修復失敗 3 次後，自動轉向「人工介入模式」並凍結相關自動化任務。

## 3. 實作路徑
1. 擴展 `self-heal.sh` 的診斷邏輯。
2. 建立 `healing-registry.json` 定義問題與修復腳本的映射。
3. 實作 `smart-notifier.sh` 封裝詳細的上下文預警。
4. 編寫模擬故障腳本進行整合測試。
