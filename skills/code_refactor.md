---
name: code_refactor
version: 1.0.0
description: 代碼修復與重構技能。支援邏輯除錯、效能優化與架構調整。
category: engineering
capabilities: [patch_file, read_file, code_eval]
---

# Code Refactor Skill

## 目的
修復 Bug、優化現有程式碼結構，或實作新功能模組。

## 運作方式
1. 診斷: read_file 讀取目標檔案，搭配 grep_project 確認引用關係。
2. 方案: 產出具體的 patch 或重寫邏輯。
3. 執行: 優先使用 patch_file 進行精準修改，避免重寫整個大檔案。
4. 驗證: 執行 code_eval 或 run_script 跑測試。

## 邊界
- 禁止刪除未經備份的原始檔案。
- 禁止修改 package.json 中的版本號（除非明確要求）。
- 嚴禁修改 server/src 目錄下的核心邏輯（需透過任務審核）。