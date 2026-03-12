# 摘要記憶機制 (Session Context & Memory Management)

## 1. 每輪新對話的基本檢查條件

### 1.1 系統初始化檢查表

```
□ 基本環境
  ├─ 工作目錄確認
  ├─ 文件系統訪問正常
  ├─ 時區/時間準確
  └─ 工具可用性確認

□ 記憶系統
  ├─ 上次對話記憶可讀取
  ├─ 任務板結構完整
  ├─ 進度文件有效
  └─ 決策日誌可訪問

□ 項目狀態
  ├─ 所有活動任務有最新進度
  ├─ 無孤立任務（無owner）
  ├─ 優先級排序有效
  └─ 依賴關係一致

□ 準備啟動
  ├─ 用戶上文明確
  ├─ 優先級清單已生成
  ├─ 子代理狀態已檢查
  └─ 準備接收新指令
```

### 1.2 環境快速檢查腳本

```bash
#!/bin/bash
# quick-init-check.sh

echo "=== 環境檢查 ==="

# 1. 基本路徑
test -d "taskboard" && echo "✓ taskboard目錄存在" || echo "✗ 缺少taskboard"
test -d "taskboard/running" && echo "✓ running目錄存在" || echo "✗ 缺少running"
test -d "taskboard/done" && echo "✓ done目錄存在" || echo "✗ 缺少done"
test -d "taskboard/pending" && echo "✓ pending目錄存在" || echo "✗ 缺少pending"

# 2. 關鍵文件
test -f "taskboard/self-check.md" && echo "✓ self-check.md 存在"
test -f "taskboard/auto-task-rules.md" && echo "✓ auto-task-rules.md 存在"
test -f "taskboard/session-start-checklist.md" && echo "✓ session-start-checklist.md 存在"

# 3. 記憶文件
if [ -f "taskboard/session-context-latest.json" ]; then
    echo "✓ 發現上次對話記憶"
    age=$(( $(date +%s) - $(stat -c %Y "taskboard/session-context-latest.json") ))
    echo "  ├─ 年齡: $((age/3600)) 小時前"
else
    echo "⚠️  無上次對話記憶（新會話）"
fi

# 4. 任務統計
running_count=$(ls -1 taskboard/running/ 2>/dev/null | wc -l)
pending_count=$(ls -1 taskboard/pending/ 2>/dev/null | wc -l)
done_count=$(ls -1 taskboard/done/ 2>/dev/null | wc -l)

echo ""
echo "=== 任務統計 ==="
echo "進行中: $running_count"
echo "待分配: $pending_count"
echo "已完成: $done_count"

# 5. 最近活動
echo ""
echo "=== 最近活動 ==="
if [ -f "taskboard/running/.last-update" ]; then
    echo "最後更新: $(cat taskboard/running/.last-update)"
fi
```

---

## 2. 上下文延續的關鍵信息摘要格式

### 2.1 會話上下文 JSON 模板

```json
{
  "session_metadata": {
    "session_id": "agent:main:subagent:xxx",
    "timestamp": "2026-02-13T07:58:00Z",
    "previous_session": "agent:main:subagent:yyy",
    "previous_timestamp": "2026-02-13T05:00:00Z",
    "duration_since_last": "2h 58m",
    "timezone": "Asia/Taipei"
  },
  
  "system_state": {
    "health_status": "HEALTHY|WARNING|CRITICAL",
    "last_health_check": "2026-02-13T07:50:00Z",
    "health_score": 85,
    "changes_since_last_session": [
      "2 tasks completed",
      "1 task escalated to BLOCKED",
      "1 new task added"
    ]
  },
  
  "priority_tasks": [
    {
      "task_id": "TASK-001",
      "title": "任務標題",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "assigned_to": "Person-A",
      "progress": 60,
      "estimated_completion": "2026-02-13T10:00:00Z",
      "blockers": [],
      "last_update": "2026-02-13T07:45:00Z",
      "next_action": "等待代碼審查"
    },
    {
      "task_id": "TASK-002",
      "title": "...",
      "priority": "MEDIUM",
      "status": "BLOCKED",
      "assigned_to": "TBD",
      "progress": 0,
      "blocker_reason": "資訊缺失",
      "blocker_task": "TASK-002-RESEARCH"
    }
  ],
  
  "decisions_pending": [
    {
      "decision_id": "DEC-001",
      "question": "是否使用 Framework A 還是 Framework B?",
      "context": "選型評估",
      "options": [
        "Framework A: 高性能，學習曲線陡",
        "Framework B: 易用，性能中等"
      ],
      "decision_deadline": "2026-02-14",
      "impact": "影響 5 個任務的技術棧"
    }
  ],
  
  "key_insights": {
    "main_bottleneck": "TASK-002 因資訊缺失被阻塞",
    "risk_alerts": [
      "如果 API 集成不在今天完成，將延遲 3 個下游任務"
    ],
    "accomplishments": [
      "TASK-001 完成度已達 60%",
      "發現並解決了 3 個技術問題"
    ],
    "upcoming_challenges": [
      "下周需要進行性能測試（需要 GPU 資源）"
    ]
  },
  
  "project_progress": {
    "total_tasks": 15,
    "completed": 6,
    "in_progress": 5,
    "blocked": 2,
    "pending": 2,
    "completion_rate": 40,
    "estimated_project_completion": "2026-02-28"
  },
  
  "action_items": [
    {
      "order": 1,
      "action": "繼續 TASK-001 開發",
      "owner": "Person-A",
      "deadline": "2026-02-13T10:00:00Z"
    },
    {
      "order": 2,
      "action": "生成 TASK-002 資訊蒐集任務並執行",
      "owner": "自動",
      "deadline": "今天"
    },
    {
      "order": 3,
      "action": "決策: Framework 選型",
      "owner": "決策者",
      "deadline": "2026-02-14"
    }
  ],
  
  "memory_notes": [
    "團隊成員信息：Person-A 擅長後端，Person-B 擅長前端",
    "進行中的技術討論：需要在 2 月 15 日前決定數據庫架構",
    "外部依賴：等待第三方 API 的 key，預計 2026-02-14 提供",
    "文化與流程：團隊傾向於迭代開發，每周一進度同步"
  ]
}
```

### 2.2 簡化摘要版本 (快速加載)

```json
{
  "session_id": "...",
  "timestamp": "...",
  "health": "HEALTHY",
  "top_3_tasks": [
    {"id": "TASK-001", "status": "IN_PROGRESS", "progress": 60},
    {"id": "TASK-002", "status": "BLOCKED", "reason": "INFO_GAP"},
    {"id": "TASK-003", "status": "PENDING", "assigned": false}
  ],
  "blockers": [
    {"task": "TASK-002", "cause": "資訊缺失"}
  ],
  "next_step": "完成資訊蒐集並解除 TASK-002 阻塞",
  "decisions": [
    {"id": "DEC-001", "deadline": "2026-02-14"}
  ]
}
```

---

## 3. 記憶長度控制與 Context 管理

### 3.1 Context 使用量監控

```
Context 層次劃分：
- 系統消息 (System): 2-3 KB (固定)
- 工具定義 (Tools): 3-5 KB (固定)
- 當前任務 (Current): 5-10 KB (可變)
- 會話記憶 (Memory): 10-20 KB (可變)
- 額外上下文 (Extra): 可選

目標預算：
- 輕量級會話: 15-20 KB (記憶最少)
- 標準會話: 20-30 KB (記憶適中)
- 複雜會話: 30-50 KB (充分記憶)
```

### 3.2 何時保存詳細記憶 vs 簡化記憶

```
保存詳細記憶 (4.1 格式):
✓ 複雜項目，多個相互依賴的任務
✓ 長期進行的項目（> 1 周）
✓ 有多人協作的項目
✓ 有外部依賴的項目
✓ 涉及重大決策的項目

└─ 存檔位置: taskboard/session-context-{session_id}.json
└─ 保留時間: 30 天或項目結束

保存簡化記憶 (2.2 格式):
✓ 簡單單個任務
✓ 短期項目（< 3 天）
✓ 明確的目標和範疇
✓ 無複雜依賴

└─ 存檔位置: taskboard/session-context-latest.json
└─ 保留時間: 最新一次，被新會話覆蓋
```

### 3.3 記憶清理與歸檔策略

```
自動清理規則：

1. 已完成的項目
   - 執行時間: 項目完成後 30 天
   - 保留位置: taskboard/archive/{project_id}/
   - 保留內容: 最終報告 + 經驗教訓

2. 已棄置的任務
   - 執行時間: 任務標記為 CANCELLED 後 7 天
   - 檢查: 是否有依賴此任務的其他任務
   - 清理: 移至 taskboard/archive/cancelled/

3. 過期的決策記錄
   - 執行時間: 決策完成後 60 天
   - 保留: 決策摘要 + 執行結果
   - 清理: 刪除詳細討論過程

4. 過期的臨時數據
   - 執行時間: 會話結束後 7 天
   - 清理: taskboard/running/ 中的臨時文件
   - 保留: 重要的進度信息
```

### 3.4 Context 爆炸時的應急方案

```
警告: Context 使用量 > 70%
├─ 立即行動：
│  ├─ 保存詳細記憶到文件
│  ├─ 清除非關鍵信息
│  └─ 記錄上下文檢查點
│
└─ 恢復流程：
   ├─ 在下個會話中，先加載檢查點
   ├─ 刪除不必要的歷史信息
   ├─ 重新組織記憶結構
   └─ 使用簡化記憶格式
```

---

## 4. 記憶延續檢查清單

```markdown
# 新會話記憶延續檢查

## 會話初始化
□ 檢查是否存在上次會話的記憶文件
□ 驗證記憶文件的完整性和可讀性
□ 提取關鍵信息 (優先任務、決策、風險)
□ 加載專案進度狀態

## 記憶驗證
□ 記憶中的任務狀態 vs 實際狀態是否一致？
□ 是否有新增或已完成的任務？
□ 決策是否已執行？
□ 有無新的阻塊或風險？

## 記憶更新
□ 更新最新進度
□ 記錄新的決策或發現
□ 刪除已解決的問題
□ 調整優先順序

## 記憶保存
□ 將更新的記憶保存到最新版本文件
□ 備份重要決策到決策日誌
□ 歸檔完成的任務信息
□ 清理過期的臨時數據

## 準備就緒
□ 向用戶呈現延續的上下文
□ 確認用戶對當前狀態的理解
□ 取得用戶關於下一步的指示
```

---

## 5. 記憶使用範例

### 例 1: 複雜項目的詳細記憶延續

```
會話 1 (初始化):
- 創建項目
- 生成 10 個任務
- 分配人員
→ 保存詳細記憶 (session-context-001.json)

會話 2 (一天後):
- 加載記憶
- 檢查進度：3 個完成，5 個進行中，2 個阻塞
- 發現新的資訊缺口
- 生成 2 個新的研究任務
→ 更新並保存記憶

會話 3 (一周後):
- 加載記憶
- 發現項目有重大方向調整
- 更新優先級
- 重新規劃剩餘任務
→ 保存新版本記憶
```

### 例 2: 簡單任務的快速記憶

```
會話 1 (新建單個任務):
- 用戶: "幫我整理文件"
- 系統: 生成簡化記憶
→ 保存最新簡化記憶 (session-context-latest.json)

會話 2 (繼續工作):
- 加載最新簡化記憶
- 繼續 60% 進度
- 完成任務
→ 移至 taskboard/done/, 清除記憶
```

---

## 6. 記憶文件位置與生命周期

```
taskboard/
├── session-context-latest.json
│   ├─ 用途: 最新會話的快速加載
│   ├─ 格式: 簡化版本
│   ├─ 大小: 2-5 KB
│   ├─ 更新: 每個會話結束
│   └─ 保留: 最新一份（被新會話覆蓋）
│
├── session-contexts/
│   ├─ session-context-{session_id}.json
│   │  ├─ 用途: 完整會話記錄
│   │  ├─ 格式: 詳細版本
│   │  ├─ 大小: 10-30 KB
│   │  ├─ 更新: 會話期間或會話結束
│   │  └─ 保留: 30 天
│   │
│   └─ session-context-{session_id}.metadata
│      ├─ 記錄: 會話開始時間、完成時間
│      ├─ 記錄: 執行的任務列表
│      └─ 記錄: 生成的決策列表
│
├── decision-log.json
│   ├─ 用途: 所有決策的永久記錄
│   ├─ 結構: {decision_id, timestamp, options, decision, reason, impact}
│   └─ 保留: 永久
│
├── lessons-learned.md
│   ├─ 用途: 已完成項目的經驗總結
│   ├─ 內容: 成功經驗、失敗教訓、改進建議
│   └─ 保留: 永久
│
└── archive/
    ├── projects/{project_id}/
    │  └─ 已完成項目的完整記錄
    ├── sessions/{session_id}/
    │  └─ 舊會話的備份
    └── cancelled/
       └─ 已棄置任務的記錄
```

---

## 7. Context 爆炸的預防

### 7.1 記憶精簡策略

```
如果記憶文件 > 50 KB:

1. 分離長文本
   - 將詳細描述移至單獨文件
   - 記憶中保留摘要 + 文件鏈接

2. 分層存儲
   - 活動任務: 詳細信息
   - 已完成任務: 摘要 + 結果
   - 相關項目: 只記錄關鍵決策

3. 時間窗口
   - 只保留最近 2 周的會話記憶
   - 更早的記憶歸檔或刪除

4. 信息聚合
   - 將相似任務合併為類別
   - 替代: 5 個任務 → "前端開發 (5 tasks)"
```

### 7.2 監控與告警

```bash
# Context 使用量監控
context_used=$(echo "$conversation_history" | wc -c)
context_limit=200000

if [ $context_used -gt 140000 ]; then
    echo "⚠️  警告: 已使用 70% Context 預算"
    trigger_memory_cleanup
elif [ $context_used -gt 180000 ]; then
    echo "🔴 危急: Context 已滿 90%"
    save_checkpoint_and_reset
fi
```

---

## 8. 快速開始: 如何使用這個系統

```bash
# 新會話開始
1. 執行會話初始化檢查
   → bash quick-init-check.sh

2. 檢查是否有記憶文件
   → test -f taskboard/session-context-latest.json

3. 如有記憶，加載並呈現
   → cat taskboard/session-context-latest.json | jq '.priority_tasks'

4. 執行會話啟動檢查清單
   → 參考 session-start-checklist.md

5. 根據健康度決定下一步
   → 如果 HEALTHY: 按優先任務繼續
   → 如果 WARNING: 生成解除阻塞任務
   → 如果 CRITICAL: 啟動子代理全面自檢

6. 會話結束時保存記憶
   → 生成新的 session-context-{session_id}.json
   → 更新 session-context-latest.json
   → 記錄決策到 decision-log.json
```
