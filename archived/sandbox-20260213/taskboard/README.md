# Taskboard 任務板系統

## 系統概述

Taskboard 是一個輕量級的任務管理與執行中控系統，專為 AI Agent 設計，用於高效排程與執行大量小型任務。

## 核心特性

- **高效率**：1小時可處理 60 個任務（1分鐘/任務）
- **並行執行**：支援同時執行多個獨立任務
- **成本優化**：優先使用免費的 Ollama 本地模型
- **清晰追蹤**：明確的任務狀態流轉機制

## 目錄結構

```
taskboard/
├── rules.md          # 系統規則與運作原則
├── README.md         # 本文件
├── pending/          # 待處理任務
├── running/          # 執行中任務
├── completed/        # 已完成任務
└── failed/           # 失敗任務
```

## 任務生命週期

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   pending   │────▶│   running   │────▶│  completed   │
│  (待處理)   │     │  (執行中)   │     │  (已完成)    │
└─────────────┘     └──────┬──────┘     └──────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   failed    │
                     │  (失敗)     │
                     └─────────────┘
```

### 狀態說明

1. **pending/** - 待處理任務
   - 新任務存放處
   - 等待被執行
   - 可設定優先級

2. **running/** - 執行中任務
   - 正在執行的任務
   - 避免重複執行
   - 記錄開始時間

3. **completed/** - 已完成任務
   - 成功執行的任務
   - 記錄完成時間與結果
   - 可供日後參考

4. **failed/** - 失敗任務
   - 執行失敗的任務
   - 記錄錯誤原因
   - 標示是否可重試

## 任務檔案格式

每個任務為獨立 Markdown 檔案，檔名格式：`{序號}-{任務名稱}.md`

### 範例

```markdown
---
title: "分析使用者回饋"
priority: high
status: pending
model: ollama/llama3.2
description: "分析過去一週的使用者回饋，找出常見問題"
created_at: 2026-02-13T07:50:00+08:00
started_at: null
completed_at: null
---

## 執行步驟

1. 讀取 feedback/ 目錄下所有檔案
2. 分析常見關鍵字
3. 生成摘要報告

## 預期輸出

- 問題分類統計
- 建議改進項目
```

## 執行流程

### 1. 建立任務
```bash
# 建立新任務檔案於 pending/
echo "---
title: '新任務'
priority: medium
status: pending
model: ollama/llama3.2
description: '任務描述'
created_at: $(date -Iseconds)
---" > taskboard/pending/001-新任務.md
```

### 2. 執行任務
```bash
# 1. 從 pending/ 選取任務
# 2. 移動至 running/
# 3. 更新 status 為 running
# 4. 設定 started_at
# 5. 執行任務
# 6. 根據結果移動至 completed/ 或 failed/
```

### 3. 監控進度
- 檢查各目錄檔案數量
- 統計完成率
- 識別瓶頸任務

## 模型選擇指南

| 模型 | 適用場景 | 成本 |
|------|---------|------|
| ollama/llama3.2 | 一般分析、文字處理 | 免費 |
| ollama/qwen2.5 | 中文相關任務 | 免費 |
| ollama/gemma2 | 輕量級任務 | 免費 |
| claude-sonnet-4.5 | 複雜推理、研究 | 付費 |
| gemini-flash | 長文本處理 | 付費 |

## 效能指標

- **理論吞吐量**：60 任務/小時
- **並行度**：依資源決定（建議 3-5 個並行）
- **平均處理時間**：1 分鐘/任務

## 使用範例

### 批次建立任務

```bash
# 建立 5 個待處理任務
for i in {1..5}; do
  cat > taskboard/pending/$(printf "%03d" $i)-分析任務-$i.md << EOF
---
title: "分析文件 $i"
priority: medium
status: pending
model: ollama/llama3.2
description: "分析第 $i 份文件內容"
created_at: $(date -Iseconds)
---
EOF
done
```

### 查看任務狀態

```bash
# 統計各狀態任務數量
echo "待處理: $(ls taskboard/pending/ | wc -l)"
echo "執行中: $(ls taskboard/running/ | wc -l)"
echo "已完成: $(ls taskboard/completed/ | wc -l)"
echo "失敗: $(ls taskboard/failed/ | wc -l)"
```

## 注意事項

1. **任務粒度**：每個任務應控制在 1 分鐘內可完成
2. **資源管理**：避免同時執行過多任務導致資源耗盡
3. **錯誤處理**：失敗任務應記錄原因，便於除錯
4. **定期清理**：completed/ 和 failed/ 應定期歸檔

## 擴展規劃

- [ ] 自動化腳本：任務排程與執行
- [ ] Web 介面：視覺化任務看板
- [ ] 統計報表：任務完成率與效率分析
- [ ] 優先級自動調整：基於任務特性動態排序

---

**建立時間**：2026-02-13  
**版本**：v1.0
