---
id: S-01
type: development
title: Skill 開發框架與範本
phase: Phase 1
priority: P0
estimated_hours: 8
dependencies: []
created_at: 2026-02-13
completed_at: 2026-02-13
status: completed
source: opus-strategy
---

## 任務目標
建立統一的 Skill 開發框架與範本，降低後續 Skills 開發成本。

## 預期產出
- [x] 統一 skill 腳手架
- [x] 測試模板
- [x] 文件規範
- [x] 部署指南

## 驗收條件
- [x] 框架文件完成
- [x] 範本可用於後續 S-02、S-03
- [x] 文件清晰可讓外包人員使用

## 完成產出

### 1. Skill 範本 (`templates/skill-template/`)

| 檔案 | 說明 |
|------|------|
| `SKILL.md` | Skill 定義文件範本（含 frontmatter） |
| `README.md` | 使用者說明文件範本 |
| `index.js` | Node.js 入口點範本 |
| `main.py` | Python 入口點範本 |
| `package.json` | Node.js 依賴設定範本 |
| `requirements.txt` | Python 依賴設定範本 |
| `scripts/example_script.py` | Python 腳本範本 |
| `scripts/helper.sh` | Bash 輔助腳本範本 |
| `references/api-reference.md` | API 參考文件範本 |
| `assets/template.txt` | 資源檔案範本 |
| `tests/run_tests.sh` | Bash 測試腳本範本 |
| `tests/test_skill.py` | Python 單元測試範本 |

### 2. 開發者文件 (`docs/skill-development-guide.md`)

包含章節：
- 快速開始
- Skill 結構規範
- 檔案撰寫規範（SKILL.md、README.md）
- 開發流程（4 步驟）
- 測試規範
- 部署指南
- 最佳實踐（DO/Don't）
- 附錄（模板變數、程式碼片段）

## 摘要

已完成統一的 Skill 開發框架，包含：
1. **標準化目錄結構**：清晰分離 scripts、references、assets、tests
2. **完整範本檔案**：Node.js 與 Python 雙版本支援
3. **自動化測試框架**：Bash 與 Python 測試範本
4. **詳細開發指南**：可供外包人員使用的完整文件
