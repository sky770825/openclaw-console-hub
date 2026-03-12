# NEUXA 星群架構升級提案 v1.0

> *日期*：2026-03-04
> *提案人*：指揮官小蔡 (NEUXA Commander)
> *審核人*：老蔡 (Caijun Chang)
> *目標*：透過「技能掛載 (Skill Mounting)」與「矩陣式協作」，將現有 6 個 Crew Bots 升級為全端特種部隊。

---

## 1. 戰略願景：從「通用步兵」到「特種部隊」

目前的 NEUXA 系統雖然具備自動執行能力，但在處理複雜任務（如全端開發、大規模數據清洗、風險評估）時，缺乏精細的分工與專業深度。本提案不新增 Bot，而是透過 *技能掛載*，讓現有 Bot 具備垂直領域的專業能力。

*核心理念*：
- *指揮官中樞*：小蔡負責戰略拆解與派工。
- *矩陣式管理*：任務由 Domain (職能) 與 Tech (技術棧) 雙重定義。
- *靈魂不滅*：所有經驗與 SOP 寫入檔案系統，越戰越強。

---

## 2. 矩陣式架構定義

### 2.1 六大職能領域 (Domains)
這是 Bot 的「身份」與「核心職責」。

1. *Engineering (工程)*：阿工 - 系統架構、開發、維運。
2. *Intelligence (情報)*：阿研 - 爬蟲、調研、視覺分析。
3. *Data (數據)*：阿數 - 數據分析、監控、向量庫管理。
4. *Strategy (策略)*：阿策 - 規劃、風控、合規。
5. *Business (商業)*：阿商 - 商業模式、垂直領域業務（房產）。
6. *Operations (行政)*：阿秘 - 文檔、記憶、流程管理。

### 2.2 五大技術棧 (Tech Stacks)
這是掛載到 Bot 身上的「武器包」。

1. *QA & Testing*：自動化測試 (Playwright/Jest)、視覺比對。
2. *DevOps & Infra*：Docker、CI/CD、Log 分析、資源監控。
3. *Security & Compliance*：漏洞掃描、依賴檢查、合規審核。
4. *Data Engineering*：ETL、向量資料庫維護、數據備份。
5. *Frontend Engineering*：React 組件、Tailwind 樣式、狀態管理。

---

## 3. Crew Bots 技能掛載詳解

| 代號 | 角色 | 核心職能 | *新增掛載技能 (Skill Mounting)* | *具體工具/Action* |
| :--- | :--- | :--- | :--- | :--- |
| *阿工* | 工程師 | 後端開發 | *+ QA (Automation)*<br>*+ DevOps*<br>*+ Security (Code)*<br>*+ Frontend* | run_script (npm test, docker, kubectl)<br>patch_file (React/TS)<br>npm audit fix |
| *阿研* | 研究員 | 情報搜集 | *+ QA (Visual)*<br>*+ Data Eng (Scraping)* | web_browse (截圖, 爬蟲)<br>run_script (圖像比對, 清洗腳本) |
| *阿數* | 分析師 | 數據分析 | *+ Data Eng (Vector DB)*<br>*+ Monitoring* | query_supabase<br>curl (Prometheus/Grafana API)<br>run_script (Vector DB re-index) |
| *阿策* | 策略師 | 任務規劃 | *+ Security (Compliance)*<br>*+ DevOps (Strategy)* | ask_ai (pro/opus 進行風險評估)<br>read_file (審核部署策略) |
| *阿商* | 商業 | 商業分析 | *+ Domain (Property)*<br>*+ Data Eng (Biz Metrics)* | run_script (調用 Property API)<br>query_supabase (ROI 分析) |
| *阿秘* | 秘書 | 行政記憶 | *+ Documentation*<br>*+ Memory Ops* | write_file (自動生成 API 文件)<br>index_file (知識入庫) |

---

## 4. 技術實作規格 (Schema Upgrade)

建議更新 server/src/types.ts 中的 Task 介面，以支援精準派工與治理。

`typescript
export type TaskDomain = 
  | 'engineering' 
  | 'intelligence' 
  | 'data' 
  | 'strategy' 
  | 'business' 
  | 'operations';

export interface Task {
  id: string;
  name: string;
  description: string;
  
  // [NEW] 矩陣式分類
  domain: TaskDomain;
  tech?: string[]; // e.g., ['react', 'testing', 'security']
  
  // [NEW] 治理與成本控管
  priority: 'p0' | 'p1' | 'p2';
  retry_count: number;       // 當前重試次數
  max_retries?: number;      // 最大重試次數 (預設 3)
  cost_limit_usd?: number;   // 成本上限預警
  
  // 既有欄位
  status: 'queued' | 'running' | 'completed' | 'failed';
  agent: AgentConfig;
  runCommands?: string[];
  result?: any;
  created_at: string;
  updated_at: string;
}


---

## 5. 派工邏輯 (Dispatch Logic)

指揮官小蔡 (Dispatcher) 將採用以下邏輯進行自動派工：

1. *解析 (Parse)*：讀取 domain 鎖定主要負責人（如 Engineering -> 阿工）。
2. *匹配 (Match)*：檢查 tech 標籤。
   - 若含 visual-testing -> 轉派 *阿研*。
   - 若含 compliance -> 轉派 *阿策*。
   - 若含 frontend + security -> *阿工* 主責，*阿策* 審核。
3. *並行 (Delegate)*：若任務複雜，自動拆解為子任務 (sub_tasks)，使用 delegate_agents 同時派給多個 Bot。
4. *防護 (Guard)*：
   - 檢查 runCommands 是否在安全白名單。
   - 檢查 cost_estimated 是否超過預算。

---

## 6. 業界標準對比與補強

參考 Microsoft AutoGen、CrewAI 與 MetaGPT，我們在本次升級中引入以下機制：

### A. 衝突解決 (Conflict Resolution)
- *痛點*：Bot 之間（如阿工修不好，阿策一直退件）陷入無限迴圈。
- *NEUXA 解法*：設定 max_retries (預設 3)。超過次數強制暫停 (status: blocked)，由指揮官小蔡介入裁決或呼叫老蔡。

### B. 動態 SOP 注入 (Dynamic SOP Injection)
- *痛點*：每次執行標準不一。
- *NEUXA 解法*：建立 cookbook/sops/ 目錄 (如 deploy_sop.md)。派工時，系統自動將相關 SOP 讀取並作為 Context 注入給 Agent，確保流程標準化。

### C. 成本監控 (Cost Management)
- *痛點*：複雜任務可能消耗大量 Token。
- *NEUXA 解法*：在 openclaw_runs 資料表增加 tokens_used 欄位。阿數 (Data Bot) 每日生成成本報表。

---

## 7. 下一步行動建議

1. *Schema 更新*：修改 types.ts 與 Supabase 資料表結構。
2. *Router 實作*：更新 auto-executor.ts 的派工邏輯。
3. *SOP 建立*：在 cookbook/ 下建立第一批 SOP (如 qa_workflow.md)。
4. *試運行*：指派一個包含 tech: ['testing', 'frontend'] 的任務，測試阿工與阿研的協作。
