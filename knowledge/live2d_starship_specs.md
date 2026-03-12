# Live2D 星艦主題技術規範

## 配置參數建議
- 模型標準高度：1024px
- 紋理集：2048x2048 (1張)
- 動作同步：使用 WebSocket 接收任務狀態並映射至 Live2D Parameter ID.

## 狀態映射表
| 任務狀態 | Live2D 動作 | 臉部表情 |
| :--- | :--- | :--- |
| PENDING | Idle | Neutral |
| PROCESSING | Working | Focused |
| COMPLETED | Success | Happy |
| FAILED | Warning | Worried |
