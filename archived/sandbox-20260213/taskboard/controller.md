# 主控腳本框架 (Master Controller Framework)

## 1. 系統架構概覽

```
┌──────────────────────────────────────────────────────────────┐
│                     主代理 (Main Agent)                        │
│                  ↓ 決策點 / 指揮中心                           │
└─────────────────────────┬──────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ↓                 ↓                 ↓
   ┌─────────┐      ┌──────────┐     ┌──────────┐
   │ 子代理 A │      │ 子代理 B │     │ 子代理 C │
   │         │      │          │     │          │
   │ 自檢    │      │ 任務執行 │     │ 決策分析 │
   └─────────┘      └──────────┘     └──────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ↓
               ┌──────────────────────┐
               │   任務板 (TaskBoard) │
               │  - running/          │
               │  - pending/          │
               │  - done/             │
               │  - decisions/        │
               └──────────────────────┘
```

---

## 2. 主控流程與決策樹

### 2.1 完整控制流程圖

```
開始新會話
    ↓
┌─────────────────────────────────────────┐
│ 執行會話初始化檢查                       │
│ (session-start-checklist.md)            │
└────────────┬────────────────────────────┘
             ↓
         ┌───────────────────────────────┐
         │  加載上次會話記憶             │
         │  分析系統健康度               │
         └───────────┬───────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ↓            ↓            ↓
     HEALTHY      WARNING      CRITICAL
        │            │            │
    [情景 A]      [情景 B]      [情景 C]
        │            │            │
        ├────┬───────┼────┬───────┤
        │    │       │    │       │
        ↓    ↓       ↓    ↓       ↓
    分析  判斷  生成  自動  啟動
    優先  是否  解除  執行  子代理
    級    需要  阻塞  重大  並行
    任務  子代  任務  決策  處理
         理
        │    │       │    │       │
        └────┴───────┴────┴───────┘
             │
             ↓
    ┌─────────────────────────────┐
    │  獲取用戶指令               │
    │  或自動執行（如授權）       │
    └────────────┬────────────────┘
             │
             ↓ (如需子代理)
    ┌─────────────────────────────┐
    │  生成任務並 spawn 子代理    │
    │  子代理執行 → 回報結果      │
    └────────────┬────────────────┘
             │
             ↓
    ┌─────────────────────────────┐
    │  收集子代理報告             │
    │  更新任務板和記憶           │
    └────────────┬────────────────┘
             │
             ↓
    ┌─────────────────────────────┐
    │  向用戶呈現結果             │
    │  保存會話記憶               │
    │  等待下一個指令             │
    └─────────────────────────────┘
```

### 2.2 決策樹詳細版

```
┌─ 會話開始 ──┐
│             │
│ A. 檢查系統狀態
│    ├─ 有多少任務在進行中？
│    ├─ 有多少任務被阻塞？
│    ├─ 有多少任務未分配？
│    └─ 最後更新時間是？
│
│ B. 計算健康度
│    ├─ 完成率 = done / (done + running + pending)
│    ├─ 阻塞率 = blocked / (done + running + blocked)
│    ├─ 分配率 = assigned / (all pending)
│    └─ 健康度 = (完成率 × 60%) + ((1 - 阻塞率) × 40%)
│
└─ 決策分支 ──┐
             │
    ┌────────┴────────────────┐
    │                         │
    是否有子代理              是否無任務
    正在運行？               在進行中？
    │                         │
    ├─是                      ├─是
    │  │                      │  │
    │  └─等待報告            │  └─建議啟動新任務
    │                        │
    └─否                      └─否
       │                        │
       ├─檢查健康度              │
       │  │                      │
       │  ├─HEALTHY              │
       │  │  ├─檢查優先級任務    └─列出優先任務清單
       │  │  ├─是否有待決策      ├─其中有阻塊嗎？
       │  │  ├─呈現狀態          │  │
       │  │  └─等待指令          │  ├─有
       │  │                      │  │  ├─分析阻塊原因
       │  ├─WARNING              │  │  ├─生成解除任務
       │  │  ├─識別 1-2 個問題  │  │  ├─詢問是否啟動子代理
       │  │  ├─生成解除任務      │  │  └─等待決策
       │  │  ├─評估優先順序      │  │
       │  │  ├─詢問是否啟動      │  └─無
       │  │  │  子代理           │     ├─呈現清單
       │  │  └─等待決策          │     ├─等待用戶選擇
       │  │                      │     └─按指令執行
       │  └─CRITICAL             │
       │     ├─警報              │
       │     ├─自動啟動子代理    │
       │     ├─全面自檢          │
       │     ├─生成多個解除      │
       │     │  阻塊任務         │
       │     └─請求用戶決策      │
       │                        │
       └────────────────────────┘
```

---

## 3. 子代理交派任務的標準流程

### 3.1 何時啟動子代理

```
自動觸發情況（無需用戶授權）：
✓ 系統健康度 = CRITICAL
✓ 有 3+ 個任務被阻塊超過 2 小時
✓ 新建立的自檢系統需要驗證運行
✓ 例行定時自檢（如設置了自動化）

需要用戶確認的情況：
✓ 系統健康度 = WARNING
✓ 有 1-2 個任務需要立即處理
✓ 有待決策的項目

用戶明確要求：
✓ 用戶說「執行自檢」
✓ 用戶說「並行處理」
✓ 用戶說「生成任務」
```

### 3.2 子代理任務交派格式

```yaml
# 子代理任務交派單 (Subagent Task Brief)

subagent_session:
  name: "self-check-agent"
  purpose: "執行系統自檢"
  deadline: "1 hour"
  
task_definition:
  task_id: "SUB-TASK-001"
  parent_task: "MAIN-SESSION"
  type: "SELF_CHECK|RESEARCH|EXECUTION|DECISION_ANALYSIS"
  
objective: |
  [明確目標，用用戶能理解的語言]
  
scope:
  - 掃描 taskboard/ 目錄結構
  - 統計各類型任務
  - 識別被阻塊的任務及原因
  - 識別未分配的任務
  - 推薦優先級
  
input_data:
  - taskboard/running/ (任務列表)
  - taskboard/pending/ (待分配列表)
  - taskboard/session-context-latest.json (上次記憶)

output_format:
  type: "JSON"
  structure:
    summary: "簡短摘要"
    findings: [{task_id, status, issue, severity}]
    recommendations: [action_items]
    proposed_tasks: [{new_task_id, type, priority, owner}]
    
expected_output:
  file: "taskboard/self-check-report-{timestamp}.json"
  
success_criteria:
  - [ ] 完整掃描所有任務
  - [ ] 識別 3+ 個潛在缺口
  - [ ] 為每個缺口推薦解決方案
  - [ ] 生成優先級清單
  - [ ] 結果可讀且可操作
  
constraints:
  - 不修改任何原始任務狀態（只讀模式）
  - 5 分鐘內完成快速自檢
  - 或 30 分鐘內完成深度自檢
  - 有任何疑問時標記為 "NEEDS_CLARIFICATION"
  
escalation:
  if_blocked: "自動報告主代理"
  if_question: "提出問題並等待回答"
  if_finding_critical: "立即報警"
```

### 3.3 子代理執行流程

```
子代理收到任務
    ↓
┌──────────────────────────┐
│ 1. 理解任務            │
│    - 讀取任務交派單    │
│    - 確認目標和範疇    │
│    - 檢查輸入數據可用性
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ 2. 執行任務            │
│    - 按流程執行        │
│    - 記錄進度          │
│    - 遇到問題？        │
│      ├─ 可解決 → 解決  │
│      └─ 無法解決 → 標記│
│        NEEDS_CLARIFICATION
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ 3. 生成報告            │
│    - 結構化結果        │
│    - 推薦下一步        │
│    - 任何尚未解決的    │
│      問題              │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ 4. 報告給主代理        │
│    - 發送完整報告      │
│    - 呈現關鍵發現      │
│    - 等待下一個指令    │
└──────────────────────────┘
```

### 3.4 子代理與主代理的通信

```
主代理 → 子代理：
{
  "command": "spawn_subagent",
  "subagent_type": "self-check-agent",
  "task": {...},        // 任務交派單
  "context": {...},     // 項目上下文
  "deadline": "1h",
  "callback": "on_complete"
}

子代理 → 主代理：
{
  "status": "COMPLETE|ERROR|NEEDS_CLARIFICATION",
  "subagent_id": "...",
  "task_id": "SUB-TASK-001",
  "execution_time": "25 minutes",
  "result": {...},      // 完整結果
  "summary": "...",     // 簡短摘要
  "recommendations": [...],
  "timestamp": "2026-02-13T08:30:00Z"
}
```

---

## 4. 主代理核心邏輯 (Pseudocode)

```python
class TaskBoardController:
    """主控制器：管理整個任務自檢和排程系統"""
    
    def __init__(self):
        self.memory = load_memory()
        self.taskboard = load_taskboard()
        self.active_subagents = []
    
    def session_start(self):
        """新會話開始"""
        # Phase 1: 檢查系統狀態
        system_state = self.quick_check()
        health = self.calculate_health()
        
        # Phase 2: 做出決策
        decision = self.decide(health, system_state)
        
        # Phase 3: 執行決策
        if decision == "SPAWN_SUBAGENT":
            subagent_result = self.spawn_subagent(
                task_type=decision.subagent_type,
                deadline=decision.deadline
            )
            # 等待或並行處理
            self.handle_subagent_result(subagent_result)
        
        # Phase 4: 向用戶呈現
        self.present_to_user(health, decision)
        
        # Phase 5: 保存記憶
        self.save_session_memory()
    
    def quick_check(self):
        """5 分鐘的快速系統檢查"""
        running = count_tasks("running/")
        blocked = count_blocked_tasks()
        pending = count_tasks("pending/")
        
        return {
            "running_count": running,
            "blocked_count": blocked,
            "pending_count": pending,
            "stuck_tasks": find_stuck_tasks(threshold="1h")
        }
    
    def calculate_health(self, state):
        """計算系統健康度 (0-100)"""
        completion_rate = self.taskboard.done_count / self.taskboard.total_count
        blocking_rate = state["blocked_count"] / max(1, state["running_count"])
        assignment_rate = 1 - (self.taskboard.unassigned_count / 
                               max(1, self.taskboard.pending_count))
        
        health = (completion_rate * 60) + ((1 - blocking_rate) * 40)
        
        if health > 75:
            return "HEALTHY"
        elif health > 50:
            return "WARNING"
        else:
            return "CRITICAL"
    
    def decide(self, health, system_state):
        """根據健康度做出決策"""
        if health == "HEALTHY":
            if has_priority_tasks():
                return Decision.CONTINUE_NORMAL
            else:
                return Decision.PROMPT_USER
        
        elif health == "WARNING":
            blockers = identify_blockers(system_state)
            if len(blockers) <= 2:
                return Decision.AUTO_FIX_IF_AUTHORIZED
            else:
                return Decision.PROMPT_USER_FOR_DECISION
        
        else:  # CRITICAL
            return Decision.SPAWN_SUBAGENT_URGENT
    
    def spawn_subagent(self, task_type, deadline):
        """啟動子代理"""
        task_brief = self.create_task_brief(task_type)
        
        # 調用子代理框架
        subagent = SubagentAPI.spawn(
            task_brief=task_brief,
            deadline=deadline,
            callback=self.on_subagent_complete
        )
        
        self.active_subagents.append(subagent.id)
        return subagent.id
    
    def handle_subagent_result(self, result):
        """處理子代理返回的結果"""
        if result.status == "COMPLETE":
            # 應用建議
            self.apply_recommendations(result.recommendations)
            
            # 生成新任務
            for task in result.proposed_tasks:
                self.create_task(task)
            
            # 更新記憶
            self.update_memory(result)
        
        elif result.status == "ERROR":
            # 記錄錯誤並報警
            log_error(result)
            self.alert_user("Subagent execution failed")
        
        elif result.status == "NEEDS_CLARIFICATION":
            # 向用戶提出問題
            self.prompt_user_with_questions(result.questions)
    
    def present_to_user(self, health, decision):
        """向用戶呈現狀態和建議"""
        message = f"""
        📊 系統狀態：{health}
        
        當前情況：
        - 進行中：{self.taskboard.running_count} 個任務
        - 被阻塊：{self.taskboard.blocked_count} 個任務
        - 待分配：{self.taskboard.pending_count} 個任務
        
        優先任務：
        {self.get_priority_tasks_str()}
        
        建議：{decision}
        """
        print(message)
    
    def save_session_memory(self):
        """保存會話記憶"""
        memory = {
            "timestamp": now(),
            "session_id": current_session_id(),
            "health": self.last_health,
            "priority_tasks": self.get_priority_tasks(),
            "decisions": self.get_pending_decisions(),
            "key_insights": self.extract_insights()
        }
        save_to_file(memory, "taskboard/session-context-latest.json")
```

---

## 5. 整合流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                  用戶與系統的完整交互                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────┐
│ 主代理開始新會話                         │
│ 執行 session_start_checklist.md         │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│ 加載記憶 & 檢查系統                      │
│ 讀取 self-check.md 進行診斷             │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│ 使用 auto-task-rules.md 自動生成任務    │
└────────────┬────────────────────────────┘
             │
             ├─ 無缺口？ ───────→ 呈現優先清單
             │
             └─ 有缺口？ ───────→ 分析缺口類型
                                 │
                                 ├─ INFO_GAP    → 自動蒐集
                                 ├─ SKILL_GAP   → 人員調整
                                 ├─ PROCESS_GAP → 流程設計
                                 └─ DEPENDENCY  → 資源規劃
                                 │
                                 ↓
                              生成新任務
                                 │
                        是否需要並行處理？
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                  是 (多個)                  否 (單個)
                    │                         │
                    ↓                         ↓
            啟動子代理          添加到 pending/
            並行執行多個       等待用戶分配
            任務
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ↓
                    使用 session-context-template.md
                         保存會話記憶
                                 │
                                 ↓
                         向用戶呈現狀態
                         等待下一個指令
```

---

## 6. 實現檢查清單

```
□ 實現 TaskBoardController 類
  ├─ __init__ 方法
  ├─ session_start 方法
  ├─ quick_check 方法
  ├─ calculate_health 方法
  ├─ decide 方法
  ├─ spawn_subagent 方法
  └─ handle_subagent_result 方法

□ 實現 SubagentAPI
  ├─ spawn 方法
  ├─ wait_for_result 方法
  └─ cancel 方法

□ 整合 4 個核心檔案
  ├─ self-check.md → quick_check() + 診斷
  ├─ auto-task-rules.md → 缺口分析 + 任務生成
  ├─ session-start-checklist.md → session_start()
  └─ session-context-template.md → save/load_memory()

□ 測試
  ├─ 單元測試：每個方法
  ├─ 集成測試：完整流程
  ├─ 情景測試：A/B/C 三種情況
  └─ 邊界情況：無任務、全部阻塊等
```

---

## 7. 日常運維命令

```bash
# 手動觸發自檢
./scripts/run-self-check.sh

# 查看最新狀態
cat taskboard/self-check-report-latest.json | jq '.'

# 列出優先任務
cat taskboard/session-context-latest.json | jq '.priority_tasks'

# 查看被阻塊的任務及原因
./scripts/show-blockers.sh

# 生成決策日誌摘要
cat taskboard/decision-log.json | jq 'group_by(.status) | map({status: .[0].status, count: length})'

# 清理過期記憶（30 天以上）
./scripts/cleanup-old-memory.sh

# 備份重要數據
./scripts/backup-taskboard.sh
```

---

## 8. 故障排查

```
症狀: 子代理未報告結果
→ 檢查: 是否超過 deadline？是否有錯誤日誌？
→ 行動: 手動查詢子代理狀態或重新啟動

症狀: 記憶文件損壞
→ 檢查: JSON 格式是否有效？
→ 行動: 使用備份檔案或從 done/ 目錄重建

症狀: 自動任務生成了太多冗餘任務
→ 檢查: auto-task-rules.md 的優先級邏輯是否正確？
→ 行動: 調整優先級公式或手動刪除低價值任務

症狀: 系統健康度波動太大
→ 檢查: 是否有大量任務同時完成或被阻塊？
→ 行動: 檢查任務依賴，確保流程順暢
```
