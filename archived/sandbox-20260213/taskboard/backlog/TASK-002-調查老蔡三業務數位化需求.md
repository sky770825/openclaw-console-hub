---
id: TASK-002
type: research
gap_source: GAP-001
priority: P1
created_at: 2026-02-13T08:07:00+08:00
model: ollama/llama3.2
---

## 標題
調查主人三業務數位化需求

## 背景
為了解決 INFO_GAP-001（缺乏業務數位化需求資訊），需要深入了解住商不動產、飲料店、普特斯防霾紗窗三個業務的日常工作流程和可能的自動化機會。

## 目標
1. 了解各業務目前的日常工作內容
2. 識別重複性、可自動化的任務
3. 列出各業務使用的軟體/平台
4. 收集主人對 AI 協助的期望

## Acceptance Criteria
- [ ] 住商不動產業務流程調查完成
- [ ] 飲料店業務流程調查完成
- [ ] 普特斯防霾紗窗業務流程調查完成
- [ ] 產出業務自動化機會清單
- [ ] 更新 MEMORY.md 加入業務細節

## 執行步驟
1. 讀取現有 MEMORY.md 了解已知資訊
2. 設計業務調查問題清單
3. 透過 Telegram 向主人詢問各業務細節
4. 整理回覆並識別自動化機會
5. 更新記憶檔案

## 預估工時
- 時間：30-45 分鐘
- 複雜度：MEDIUM
- 必需資源：Ollama 本地模型、Telegram 對話

## 優先級計算
- BLOCKER_SCORE: 2 (影響後續業務技能開發)
- URGENCY_SCORE: 3 (本週內完成)
- VALUE_SCORE: 5 (核心業務相關)
- EFFORT_SCORE: 3 (中等工作量)
- PRIORITY_SCORE: 3.0 (P1)

## 相關資源
- 缺口報告：GAP-001
- 參考文件：MEMORY.md、USER.md
