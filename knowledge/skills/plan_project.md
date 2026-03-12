# OpenClaw_plan_project

## 能力描述
將模糊的大目標拆解為結構化的專案計畫，自動生成任務草稿。

## 輸入參數
- goal: 專案總體目標 (必填)
- weeks: 預計週數 (預設 4)
- detail_level: low/medium/high

## 執行規範
- 邏輯拆解：將目標分為分析、開發、測試、部署階段。
- 任務生成：自動在任務板建立 status=draft 的任務。

## 輸出預期
專案甘特圖摘要與生成的任務 ID 清單。