# Wave8 新增技能與系統強化摘要

> 更新：2026-03-03 | 版本 v2.4.6

## 新裝 ClawHub 技能（4 個）

### 1. bug-fixing（Zero-Regression Bug Fix）
- 17 條鐵律，6 階段流程：Reproduce → Root Cause → Scope → Impact Prediction → Fix → Regression Verify
- Impact Chain Analysis（影響鏈追蹤 A→B→C）
- Similar Issue Scanning（全檔案相似問題掃描）
- 自我反思評分 + bug-records.md 歷史記錄
- 路徑：~/.openclaw/workspace/skills/bug-fixing/

### 2. memory-master（精準記憶系統）
- Tag-based 索引：用 #tag 標記記憶，不用向量搜尋
- 雙向同步：寫一次，索引自動更新
- 零 token 浪費：按需讀取
- 三支柱：Tag Architecture + Daily Index + Knowledge Index
- 路徑：~/.openclaw/workspace/skills/memory-master/

### 3. memory-organizer（記憶壓縮整理）
- 掃描 memory/ 目錄所有記憶檔
- 分類、找冗餘、壓縮（標題/激進模式）
- 指令：scan / classify / redundant / compress / discard
- 路徑：~/.openclaw/workspace/skills/memory-organizer/

### 4. macro-pipeline（多步 Pipeline 管理）
- 雙檔案模式：PIPELINE.md（repo 內，可變狀態）+ HEARTBEAT.md（workspace，唯讀指令）
- Step 狀態：PENDING / RUNNING / COMPLETED / FAILED / BLOCKED
- 支持 depends_on 依賴、verify 驗證指令
- Git 追蹤進度，防止 zombie steps
- 路徑：~/.openclaw/workspace/skills/macro-pipeline/

## 系統強化

### Wilson Score 排名算法（task-ranking.ts）
- 新增 'best' 排序模式
- Wilson Score 信賴區間：解決少票時排名不公平問題
- 公式：upvotes=priority, downvotes=失敗任務按 6-priority 計算
- 使用：GET /api/openclaw/tasks?sort=best

### Cost-based 限速（action-rate-limiter.ts）
- AI 操作（ask_ai/proxy_fetch/delegate_agents）cost=5
- 寫入/執行操作 cost=3
- 分析/知識操作 cost=2
- 讀取操作 cost=1
- 單次 ask_ai 消耗 5 配額，read_file 只消耗 1 配額

### 步數升級（bot-polling.ts）
- 對話 chain：3→6 步，一口氣完成查+分析+執行+驗證
- selfDrive：1→3 輪
- 心跳：1→3 步（查健康+查任務板+做練習）

## 可用排序模式（共 6 種）
hot | rising | controversial | top | new | best
