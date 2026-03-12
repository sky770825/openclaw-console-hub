# 技術研究報告：LangGraph 與 CrewAI 框架分析

## 1. LangGraph 深度分析：圖形化編排邏輯
LangGraph 將代理工作流視為一個 **Stateful Graph (有狀態圖)**。

### 核心優點：
- **循環能力 (Cycles)：** 不同於傳統的 DAG (有向無環圖)，LangGraph 允許節點之間的循環，這對於「執行 -> 檢查 -> 修正」的迭代過程至關重要。
- **細粒度控制：** 開發者可以精確定義節點 (Nodes) 和邊 (Edges)，包含條件邊 (Conditional Edges)，實現複雜的邏輯判斷。
- **狀態管理 (Persistence)：** 內建 Checkpointer，支持「中斷-恢復」機制，非常適合需要 Human-in-the-loop (人工介入) 的長流程。

## 2. CrewAI 深度分析：內建測試與角色編排
CrewAI 專注於 **Role-Based (基於角色)** 的協作，模擬真實團隊運作。

### 核心優點：
- **內建測試機制 (crew.test())：** 
    - 提供了自動化測試工具，可以針對特定任務執行多次迭代，評估輸出的穩定性與質量。
    - 支持對 Agent 性能進行評分，幫助開發者優化 Prompt。
- **過程導向 (Process Management)：** 支持 Sequential (順序)、Hierarchical (層級) 等預設流程，降低編排門檻。
- **任務授權 (Task Delegation)：** Agent 之間可以自動授權任務，具備高度自主性。

## 3. 對比總結
| 特性 | LangGraph | CrewAI |
| :--- | :--- | :--- |
| **核心抽象** | 狀態圖 (Graph) | 團隊角色 (Crew/Agent) |
| **控制靈活性** | 極高 (自定義節點與邊) | 中 (受限於 Process 模型) |
| **易用性** | 較低 (需手動構建圖邏輯) | 高 (宣告式定義) |
| **測試支援** | 需搭配 LangSmith | 內建 Test Suite |
| **適用場景** | 複雜邏輯、非線性流程 | 標準化團隊協作、快速原型 |

