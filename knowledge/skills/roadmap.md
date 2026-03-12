# OpenClaw_roadmap

## 能力描述
建立與管理專案路線圖，追蹤長期進度與里程碑。

## 輸入參數
- mode: 'create' / 'status' / 'update' / 'list' (必填)
- name: 專案名稱
- weeks: 週次預算
- milestones: 里程碑陣列

## 執行規範
- 自動化：配合 plan_project 實現從目標到任務的自動追蹤。
- 視覺化：提供週次進度摘要。

## 輸出預期
路線圖狀態 JSON 或列表。