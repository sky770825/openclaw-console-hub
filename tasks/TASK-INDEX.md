# TASK-INDEX

自動化工作流任務索引（人類可讀版本）
生成時間: 2026-02-14

## 索引說明

- **JSONL 機器版本**: `tasks/task-index.jsonl`
- **更新頻率**: 每次任務完成自動追加
- **規範文件**: `docs/AUTOMATION-WORKFLOW-SPEC.md`

## 最新任務摘要（最近 10 筆）

| task_id | run_id | projectPath | status | model | summary |
|---------|--------|-------------|--------|-------|---------|
| t1771032514084 | 8da51622-26e3-435a-8b46-218742e9ab95 | - | done | codex-native | 會議紀錄自動化模板 |
| t1771032513737 | de3ec573-3dc9-4cc2-b326-476ad4c87ec8 | - | done | codex-native | Second Brain 工作流程自動化 |
| t1771032513394 | e1aa9709-83ac-441b-ace5-fd9f164fdf40 | - | done | codex-native | OpenClaw 社群技能趨勢分析 |
| t1771032513054 | ebe0d7c6-a007-4a67-a59d-8d72a44aed23 | - | done | codex-native | GPT-5 發布監控與應對計畫 |
| t1771032512705 | d1b01dbb-f95e-46bc-9638-6de73d9443f2 | - | done | codex-native | 競品自動化產品月報機制 |
| t1771032512361 | 4b5bfce3-36f1-4e38-9b40-31a05b969139 | - | done | codex-native | AI Agent 變現模式研究報告 |
| t1771032512025 | 902ec52e-35fc-4b0c-bb25-12073ab4f1e9 | - | done | codex-native | 普特斯 - 銷售預測模型 PoC |
| t1771032511680 | 300f5350-cab6-4775-9862-1a493c0de0d7 | - | done | codex-native | 普特斯 - 庫存預警儀表板 |
| t1771032511341 | 1de4e7b6-4a17-4e3a-a118-1ad8a8f80fd5 | - | done | codex-native | biz_drinks - 週期性促銷自動化 |
| t1771032510995 | 4e6b9a77-5f0d-44d2-8d68-52e8b39f05d6 | - | done | codex-native | biz_drinks - 會員點數整合外送平台 PoC |

## 統計數據

- **總記錄數**: 40+ 筆
- **完成率**: ~95%
- **主要模型**: ollama/qwen3:8b, subscription/codex-native
- **預設成本**: $0（禁止付費 API）

## 使用方式

```bash
# 查詢最新任務
tail -20 tasks/task-index.jsonl

# 搜尋特定任務
grep "task-id" tasks/task-index.jsonl | jq .

# 生成摘要
./scripts/task-index-generator.sh
```

## 欄位定義

| 欄位 | 說明 |
|------|------|
| `task_id` | 任務唯一識別 |
| `run_id` | 執行實例識別 |
| `projectPath` | 專案路徑（唯一真相源）|
| `filesChanged` | 變更檔案清單 |
| `summary` | 執行摘要（<=10 行）|
| `evidenceLinks` | 證據連結 |
| `nextSteps` | 下一步（<=7 條）|
| `modelUsed` | 使用模型 |
| `cost` | 花費（預設 $0）|

---

**注意**: 詳細資訊請查看 `tasks/task-index.jsonl`（JSONL 格式，機器可讀）
