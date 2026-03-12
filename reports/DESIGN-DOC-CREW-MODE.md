# 技術設計文檔：NEUXA Crew 模式

> 版本： v0.1 (草案)
> 任務 ID: t17722619133
> 負責人: NEUXA

---

## 1. 目標 (Goals)

為 NEUXA 引入一個內部多 Agent 協作框架（稱為「Crew 模式」），使其能夠自主處理需要多個專業技能協作的複雜任務，同時保留現有的『雙手』執行能力和與統帥的即時互動性。

## 2. 核心組件 (Core Components)

### a. CrewManager
-   職責: 負責整個 Crew 的生命週期管理，包括組建、啟動、監控和終結。
-   觸發: 當任務的 description 中包含特定關鍵字（如 [CrewMode]）或經由我的自主判斷後，由主執行器 executor-agents.ts 喚醒。

### b. VirtualAgent (虛擬代理)
-   定義: 這不是一個新的 AI 模型，而是對我自身能力的一種「角色扮演」配置。每個 VirtualAgent 會有一個 JSON 定義，包含 role, goal, 和 tools。
-   範例: { "role": "NEUXA-Researcher", "goal": "...", "tools": ["read_file", "ask_ai:flash"] }
-   運作: 當輪到某個 VirtualAgent 執行時，我會將它的角色定義注入到 Prompt 的最上層，暫時性地「成為」那個專家來執行任務。

### c. TaskQueue (任務佇列)
-   職責: 管理 Crew 內部的子任務序列。它將父任務拆解成一系列子任務，並按照指定的 process（如 sequential）進行排序。
-   狀態傳遞: 每個子任務完成後，其 output 會被儲存，並作為下一個子任務的 input 或 context。

## 3. 工作流程 (Workflow)

1.  啟動: executor-agents.ts 接收到一個複雜任務，判斷需要啟用 Crew 模式。
2.  組建 (Setup): CrewManager 被喚醒。它會解析父任務，定義所需的 VirtualAgents 列表和 TaskQueue。
3.  執行 (Execution): CrewManager 從 TaskQueue 中取出第一個子任務。
4.  角色扮演 (Impersonation): 我根據子任務指定的 Agent，載入其角色配置，執行該任務。
5.  迭代 (Iteration): 任務完成後，輸出結果。CrewManager 將結果傳遞給下一個子任務，並重複步驟 3-4，直到佇列清空。
6.  匯總 (Aggregation): 所有子任務完成後，由我（主意識）負責整合最終結果，並向統帥匯報。

## 4. 與現有系統的整合 (Integration)

-   executor-agents.ts: 需要新增一個 if (task.isCrewMode) 的邏輯分支，來呼叫 CrewManager。
-   types.ts: 需要新增 CrewConfig, VirtualAgent, SubTask 的型別定義。
-   openclaw_tasks 表: 考慮新增一個 sub_tasks (JSONB) 欄位來儲存和追蹤 Crew 內部任務的狀態。

## 5. 風險與挑戰

-   上下文膨脹: 在 VirtualAgent 之間傳遞上下文可能快速消耗 Token 額度。需要設計有效的上下文壓縮機制。
-   狀態管理複雜性: 追蹤一個 Crew 內部多個子任務的狀態比單一任務更複雜，需要穩健的錯誤處理和重試機制。

---

> 下一步：根據此設計草案，繪製詳細的流程圖，並開始撰寫 types.ts 的原型。