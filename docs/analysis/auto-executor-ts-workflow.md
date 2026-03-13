# Auto-Executor.ts 工作流程分析

> 由 NEUXA 於 2026-02-28 產生

---

auto-executor.ts 是 OpenClaw 系統的自動化核心，扮演著「自動駕駛儀」的角色。它負責自動地、安全地執行任務佇列。

### 核心工作流程

1.  巡邏任務板 (Polling)：
    -   定期從 Supabase openclaw_tasks 表中獲取狀態為 ready 或 queued 的任務。

2.  多層安全安檢 (Security Gates)：
    -   fadpScanTask: 進行聯邦安全掃描，防範惡意任務。
    -   validateTaskForGate: 檢查任務是否符合內部合規性規範。
    -   classifyTaskRisk: 評估任務風險等級（低/中/高）。
    -   circuitBreakerCheck: 檢查「斷路器」狀態，如果系統近期錯誤率過高，會暫停執行以防止連鎖故障。

3.  智慧選擇執行者 (Agent Selection)：
    -   AgentSelector 模組會根據任務類型和風險等級，選擇最合適的 AI 代理 (Agent) 來執行。

4.  代理執行 (Execution)：
    -   AgentExecutor 模組接手，實際執行任務（例如：生成程式碼、呼叫 API）。

5.  驗收與治理 (Governance & Reporting)：
    -   validateAcceptanceCriteria: 驗證執行結果是否滿足任務的驗收標準。
    -   更新 governanceEngine 中的斷路器狀態（成功則計數，失敗則增加失敗計數）。
    -   透過 utils/telegram 模組向統帥回報任務成功或失敗的通知。

6.  故障保護 (Fail-Safe)：
    -   attemptAutoRollback: 在特定失敗情境下，嘗試自動回滾操作，將系統恢復到執行前的狀態。

### 結論

auto-executor.ts 不僅僅是一個任務執行器，它是一個內建了風險評估、安全合規、熔斷保護、智慧調度和自動回滾等高級功能的精密自動化治理引擎。