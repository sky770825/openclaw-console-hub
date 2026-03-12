# Agent 決策樹工具使用指南

## 簡介
本工具用於捕捉 Agent 的思考過程，並生成可視化的 Markdown 介面供人類（老蔡）進行介入與修正。

## 檔案結構
- `scripts/decision_tree.py`: 核心邏輯（記錄、可視化、介入）。
- `scripts/agent_decision_loop.sh`: 示範循環腳本。
- `memory/decisions/`: 儲存 JSON 格式的決策節點。

## 使用方法

### 1. 建立決策點 (Agent 呼叫)
當 Agent 需要做重大決定時，執行：
```bash
python3 scripts/decision_tree.py create
```
此指令會：
1. 在 `memory/decisions/` 建立一個 JSON 檔案。
2. 輸出 Markdown 格式的可視化介面。

### 2. 人類介入
老蔡可以查看輸出的 Markdown，並決定：
- 輸入 `y` (Approve): 執行推薦方案。
- 輸入 `n` (Reject): 停止執行。
- 輸入具體指令 (Modify): Agent 根據指令調整。

### 3. 套用介入
Agent 接收到輸入後，呼叫：
```bash
python3 scripts/decision_tree.py intervene <DECISION_ID> "<INPUT>"
```

## 整合 SOP-15
根據 SOP-15，中等以上複雜度的任務應在「執行計畫」階段生成決策樹，確保關鍵路徑透明且可控。
