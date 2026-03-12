# NEUXA 可視化 v2 實作報告

## 專案概述
本專案已成功建立一個動態 AI 群體生活儀表板，取代了單一的 Live2D 模型。

## 核心功能
- **多角色同步顯示**: 包含「小蔡 (Lead)」、「auto-executor」及「delegate_agents」。
- **即時狀態可視化**: 
  - **Thinking**: 紫色呼吸燈特效。
  - **Executing**: 綠色掃描線進度特效。
  - **Idle**: 靜態灰色待機模式。
- **任務流追蹤**: 即時顯示每個 AI 正在執行的具體任務。
- **資源負載監控**: 動態呈現各角色的處理負載 (Load Distribution)。

## 檔案分佈
- **Dashboard UI**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/neuxa_dashboard/index.html`
- **State Simulator**: `/Users/caijunchang/.openclaw/workspace/scripts/ai_state_simulator.py`
- **Runner Script**: `/Users/caijunchang/.openclaw/workspace/scripts/start_neuxa_dashboard.sh`

## 使用說明
執行 `bash /Users/caijunchang/.openclaw/workspace/scripts/start_neuxa_dashboard.sh` 啟動模擬器，然後在瀏覽器中開啟 `index.html`。
