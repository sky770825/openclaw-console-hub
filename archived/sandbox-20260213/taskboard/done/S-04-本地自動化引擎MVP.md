---
id: S-04
type: development
title: 本地自動化引擎 MVP
phase: Phase 1
priority: P1
estimated_hours: 20
dependencies: ["S-01"]
created_at: 2026-02-13
status: pending
source: opus-strategy
---

## 任務目標
開發本地優先的排程與觸發引擎，支援 webhook + cron。

## 預期產出
- Docker 一鍵部署套件
- 排程引擎
- Webhook 接收器
- 管理介面

## 驗收條件
- [ ] Docker Compose 可一鍵啟動
- [ ] 支援 cron 表達式
- [ ] 支援 webhook 觸發
- [ ] 可整合 Skills 執行
