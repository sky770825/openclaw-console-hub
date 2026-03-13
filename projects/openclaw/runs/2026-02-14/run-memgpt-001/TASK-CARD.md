# 任务卡：MemGPT 式分層記憶系統整合

**task_id**: task-memgpt-memory-integration  
**run_id**: run-20260214-memgpt-001  
**idempotency_key**: memgpt-memory-v1-20260214  
**project_path**: projects/openclaw/modules/memory-system/  
**run_path**: projects/openclaw/runs/2026-02-14/run-memgpt-001/  
**priority**: P0  
**status**: completed  
**assigned_agent**: codex  
**created_at**: 2026-02-14T20:50:00+08:00  

---

## 背景
整合 MemGPT 分層記憶架構到 OpenClaw，實現智能記憶管理，解決 Context 爆炸和記憶連續性問題。

## 目標
1. 實現三層記憶架構（Core/Recall/Archival）
2. 自動記憶管理（載入/摘要/壓縮）
3. 保持與現有系統相容

## 交付物
- [ ] `skills/memory/memory_manager.py` - 核心管理器
- [ ] `skills/memory/core_memory.py` - 核心記憶
- [ ] `skills/memory/recall_memory.py` - 召回記憶
- [ ] `skills/memory/archival_memory.py` - 存檔記憶
- [ ] `skills/memory/auto_summarize.py` - 自動摘要
- [ ] `README.md` - 架構文檔
- [ ] `docs/runbook.md` - 運維指南

## 驗收標準
- [ ] SOUL/USER/MEMORY.md 固定載入不被洗掉
- [ ] 對話結束自動生成摘要
- [ ] Context 滿載時自動壓縮
- [ ] 記憶召回準確率 >80%

## 模型政策
- **預設**: ollama/*
- **允許**: codex-native
- **禁止**: kimi/*, opus (需主人確認)

## 風險評估
- **等級**: medium
- **風險**: 與現有記憶系統衝突
- **回滾**: 保留原 skills/git-notes-memory/

## 下一步
Codex 完成詳細設計 → 達爾審核 → 實作 → 測試

---
*創建時間: 2026-02-14 20:50*  
*創建者: 達爾*  
