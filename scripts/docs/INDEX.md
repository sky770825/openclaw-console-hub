# Scripts 文檔索引

## 已完成文檔

### 系統檢查點
- ✅ [checkpoint.sh](checkpoint.md) - 檢查點系統與熔斷器

### 待補完（共 19 個）

#### 監控類 (5 個)
1. **unified-monitor.sh** - 統合監控系統
   - 功能：統一監控所有系統組件
   - 參數：各監控模式、間隔設置
   - 使用例：`./unified-monitor.sh --mode full`

2. **gateway-health-watchdog.sh** - Gateway 健康監控
   - 功能：監控 Gateway 服務狀態
   - 參數：健康檢查間隔、閾值
   - 使用例：`./gateway-health-watchdog.sh`

3. **context-auto-compact.sh** - Context 自動壓縮
   - 功能：自動管理 Context 使用率
   - 參數：壓縮閾值、檢查間隔
   - 使用例：`./context-auto-compact.sh --dry-run`

4. **idle-watchdog.sh** - 空閒監控器
   - 功能：監控系統空閒時間
   - 參數：空閒閾值、檢查間隔
   - 使用例：`./idle-watchdog.sh --threshold 3600`

5. **ollama-task-monitor.sh** - Ollama 任務監控
   - 功能：監控 Ollama 模型執行
   - 參數：模型名稱、超時設置
   - 使用例：`./ollama-task-monitor.sh`

#### 任務管理類 (5 個)
6. **task-board-api.sh** - 任務板 API
   - 功能：本地任務管理
   - 參數：CRUD 操作
   - 使用例：`./task-board-api.sh list-tasks`

7. **execute-task.sh** - 任務執行器
   - 功能：執行單個任務
   - 參數：任務 ID、超時時間
   - 使用例：`./execute-task.sh task-123`

8. **refill-task-pool.sh** - 任務補充器
   - 功能：自動生成新任務
   - 參數：任務類型、數量
   - 使用例：`./refill-task-pool.sh`

9. **cursor-task-launcher.sh** - Cursor 任務啟動
   - 功能：在 Cursor 中啟動任務
   - 參數：任務路徑、參數
   - 使用例：`./cursor-task-launcher.sh`

10. **autopilot-checkpoint.sh** - 自動化檢查點
    - 功能：自動執行檢查點操作
    - 參數：檢查點名稱、操作類型
    - 使用例：`./autopilot-checkpoint.sh --create`

#### 恢復與備份類 (5 個)
11. **recovery/backup.sh** - 系統備份
    - 功能：完整系統備份
    - 參數：備份位置、排除目錄
    - 使用例：`./recovery/backup.sh`

12. **recovery/recovery.sh** - 系統恢復
    - 功能：從備份恢復系統
    - 參數：備份路徑、恢復模式
    - 使用例：`./recovery/recovery.sh`

13. **recovery/health-check.sh** - 健康檢查
    - 功能：系統健康診斷
    - 參數：檢查類型、詳細程度
    - 使用例：`./recovery/health-check.sh`

14. **openclaw-recovery.sh** - 完整恢復流程
    - 功能：完整的系統恢復工作流
    - 參數：恢復模式、備份源
    - 使用例：`./openclaw-recovery.sh`

15. **safe-run.sh** - 安全執行
    - 功能：在保護環境中執行命令
    - 參數：命令、超時設置
    - 使用例：`./safe-run.sh "command"`

#### 管理與成本類 (4 個)
16. **model-cost-tracker.sh** - 成本追蹤
    - 功能：統計模型使用和成本
    - 參數：時間週期、輸出格式
    - 使用例：`./model-cost-tracker.sh --period day`

17. **automation-ctl.sh** - 自動化控制
    - 功能：管理自動化執行
    - 參數：enable/disable/status
    - 使用例：`./automation-ctl.sh status`

18. **auto-executor-lean.sh** - 輕量執行器
    - 功能：簡化的任務執行器
    - 參數：任務 ID、模式
    - 使用例：`./auto-executor-lean.sh`

19. **dashboard-server.sh** - 儀表板伺服器
    - 功能：啟動監控儀表板
    - 參數：端口、模式
    - 使用例：`./dashboard-server.sh --port 8080`

20. **memory_search.sh** - 記憶搜尋
    - 功能：搜索記憶庫
    - 參數：搜尋詞、結果數量
    - 使用例：`./memory_search.sh "關鍵詞"`

## 文檔補充進度

- [x] 主 README.md (6556 bytes)
- [x] checkpoint.sh (3409 bytes)
- [ ] unified-monitor.sh
- [ ] gateway-health-watchdog.sh
- [ ] context-auto-compact.sh
- [ ] idle-watchdog.sh
- [ ] ollama-task-monitor.sh
- [ ] task-board-api.sh
- [ ] execute-task.sh
- [ ] refill-task-pool.sh
- [ ] cursor-task-launcher.sh
- [ ] autopilot-checkpoint.sh
- [ ] recovery/backup.sh
- [ ] recovery/recovery.sh
- [ ] recovery/health-check.sh
- [ ] openclaw-recovery.sh
- [ ] safe-run.sh
- [ ] model-cost-tracker.sh
- [ ] automation-ctl.sh
- [ ] auto-executor-lean.sh
- [ ] dashboard-server.sh
- [ ] memory_search.sh

## 文檔標準模板

每個文檔應包含：

1. **概述** - 腳本用途和核心功能
2. **快速開始** - 最常見的使用方式
3. **詳細用法** - 所有命令選項
4. **環境變數** - 可配置的參數
5. **故障排查** - 常見問題和解決方案
6. **進階配置** - 高級用法
7. **日誌位置** - 調試信息所在位置
8. **限制與注意** - 已知限制

---

更新時間：2026-02-14 02:45 GMT+8
