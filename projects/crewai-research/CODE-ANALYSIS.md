# CrewAI 範例程式碼分析

> 範例檔案: example_basic_crew.py

---

## 程式碼結構拆解

整個流程可以分為四個清晰的區塊：

1.  定義 Agents: 實例化 Agent 物件。每個 Agent 都有 role, goal, backstory 這些用自然語言描述的屬性。這本質上是在為底層的 LLM 設定一個非常具體的 System Prompt。
2.  定義 Tasks: 實例化 Task 物件。每個 Task 都有 description 和 expected_output，並且最關鍵的是，它透過 agent 參數直接綁定到一個 Agent 身上。
3.  定義 Crew: 實例化 Crew 物件。它像一個容器，把定義好的 agents 和 tasks 裝進去。process 參數（例如 Process.sequential）則定義了任務的執行策略。
4.  啟動 (Kickoff): 呼叫 crew.kickoff() 方法，啟動整個工作流。這是一個單一的入口點，之後的所有內部協調都由 CrewAI 處理。

## NEUXA 的洞察：與 OpenClaw 的對比

-   抽象層級: CrewAI 的抽象層級非常高。開發者思考的是「團隊角色」和「任務流程」，而不是像我們在 executor-agents.ts 中那樣，需要處理任務的狀態（queued, in_progress）、執行結果的解析、以及手動呼叫下一個步驟。這是「業務流程設計師」和「系統工程師」的思維差異。

-   狀態管理: 在 CrewAI 中，任務之間的上下文（例如研究員的報告）是如何傳遞給作家的，這部分是隱含在 Process.sequential 裡的。它自動處理了狀態的傳遞。而在 OpenClaw 中，如果一個任務需要另一個任務的結果，我們需要手動設計，例如將結果寫入檔案或資料庫，再讓下一個任務去讀取。

-   可擴展性: CrewAI 的模式非常容易擴展。要增加一個「編輯」角色來校稿？只需要再定義一個 editor Agent 和一個 editing_task，然後把它們加入 crew 的列表裡就行了。我們的系統要做到這一點，需要修改 AgentSelector 和任務分派的邏輯，耦合度更高。

-   我們的優勢: OpenClaw 的 run_script 和直接的檔案系統操作（write_file, read_file）提供了更強大、更底層的「雙手」能力。CrewAI 的 Agent 通常需要透過額外配置的「Tools」來與外部世界互動，我們的 action 機制在靈活性和直接性上目前更勝一籌。

## 下一步建議

我們不一定要全盤替換。可以考慮在 OpenClaw 中引入一個「Crew 模式」。當接到一個複雜任務時，我可以不再是自己一步步執行，而是動態地定義一個虛擬的 Crew（研究員 NEUXA、程式員 NEUXA、測試員 NEUXA），然後在內部模擬 CrewAI 的流程來完成任務。這能極大提升我處理複雜工作的自主性和條理性。