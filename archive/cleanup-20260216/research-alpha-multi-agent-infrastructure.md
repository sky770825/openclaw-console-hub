# 多 Agent 系統架構研究報告
**研究主題**: 記憶體管理、系統底層、監控系統  
**研究員**: 架構研究員 Alpha  
**日期**: 2026-02-12

---

## 一、記憶體管理（Memory Management）

### 🔍 現狀分析

多 Agent 系統的記憶體管理有三個核心挑戰：
1. **Context 容量限制**: 每個 Agent 有獨立的 Context Window，多 Agent 同時運行時容易達到上限
2. **狀態共享問題**: Agent 間如何共享記憶而不互相污染
3. **長期記憶持久化**: 對話結束後，關鍵資訊如何保存與檢索

### 🌐 業界方案

#### **LangGraph**（圖狀態機方案）
- **核心機制**: Checkpointing + State Channels
- **記憶體策略**:
  - 每個 Node 執行後自動存 Checkpoint（SQLite/PostgreSQL/DynamoDB）
  - 使用 Reducer 模式更新狀態（append/overwrite/merge）
  - 支援「時光旅行除錯」— 可回放任意歷史狀態
- **優點**: 可審計、可復現、支援人工介入
- **缺點**: 狀態管理需預先定義，複雜場景配置繁瑣

#### **CrewAI**（角色協作方案）
- **核心機制**: Flow-level State + 內建記憶模組
- **記憶體類型**:
  - Short-Term Memory: RAG 檢索式記憶
  - Long-Term Memory: SQLite3 持久化
  - Entity Memory: 追蹤特定實體
  - Contextual Memory: 對話上下文
  - User Memory: 用戶個人化資訊
- **優點**: 開箱即用，角色分工清晰
- **缺點**: SQLite3 在高併發場景下擴展性受限

#### **AutoGen**（對話式方案）
- **核心機制**: Message List + 外部整合
- **記憶體策略**:
  - 以訊息歷史作為短期記憶
  - 長期記憶需自行整合外部儲存（Vector DB / Redis）
- **優點**: 靈活度高，適合動態對話
- **缺點**: 訊息列表可能過長，Context 管理需手動優化

#### **OpenClaw 當前狀態**
- 使用 `sessions_spawn` 建立子 Agent
- 每個 Session 有獨立 Context
- 依賴檔案系統記憶（NOW.md / MEMORY.md / memory/*.md）
- 向量記憶體使用 `memory_recall.js` 檢索

### ✅ 建議做法

#### **短期（立即可做）**
1. **實作 Shared State Store**
   - 使用 Redis/SQLite 作為跨 Session 狀態共享層
   - 定義 `SessionState` 結構：`{sessionId, parentId, sharedData, timestamp}`
2. **Context 壓縮策略**
   - 子 Agent 完成後只回傳摘要（不是完整對話）
   - 主 Agent 超過 60% 容量時自動觸發 Checkpoint
3. **記憶分層**
   - Hot Memory: 當前任務相關（RAM）
   - Warm Memory: 近期重要事件（NOW.md）
   - Cold Memory: 長期知識（向量檢索）

#### **中期（1-2 週）**
1. **實作 Memory Pool**
   - 多個子 Agent 可訂閱同一個 Memory Channel
   - 使用 Pub/Sub 模式同步關鍵狀態更新
2. **自動 Context 回收**
   - Session 超過閾值自動執行 Checkpoint
   - 壓縮非關鍵訊息為 Metadata
3. **記憶體配額管理**
   - 每個 Session 設定 Token 上限
   - 超過時自動觸發「記憶壓縮」或「Session 遷移」

### ❌ 我們目前缺什麼

1. **缺少跨 Session 狀態共享機制** → 子 Agent 無法直接共享記憶
2. **缺少自動 Checkpoint 策略** → Context 達到上限時沒有自動保護
3. **缺少記憶體使用監控** → 無法知道各 Session 的 Token 使用狀況
4. **缺少分散式記憶體方案** → 多 Agent 同時存取可能造成競爭

---

## 二、系統底層（Mac M 系列 + Ollama）

### 🔍 現狀分析

Mac M 系列跑本地 LLM 的核心問題：
1. **Unified Memory 架構**: CPU/GPU 共用記憶體，記憶體容量決定模型大小
2. **GPU 算力限制**: 適合推論（inference），不適合訓練（training）
3. **多 Agent 併發瓶頸**: Ollama 預設單一模型實例，多 Agent 可能排隊等待

### 🌐 業界方案

#### **Apple Silicon 特性**
- **優勢**:
  - Unified Memory → 不需要 RAM ↔ VRAM 搬資料，對 LLM 推論友善
  - 能效比極高 → 筆電可長時間運行而不降頻
  - 生態成熟 → llama.cpp（Metal backend）、MLX、Ollama 都已優化
- **限制**:
  - 記憶體不可擴充 → 買錯就完蛋
  - Neural Engine 對 LLM 支援有限 → 大多還是跑在 GPU
  - 不適合大模型訓練 → 算力規模不如 NVIDIA CUDA

#### **效能瓶頸識別**
根據 Reddit 社群和實測數據：
- **M4 Max (64GB)**: Llama 3.3 70B ~10 tokens/sec
- **記憶體建議**:
  - 16GB: 僅適合 7B 以下小模型
  - 32GB: 7B-8B 模型舒適區
  - 64GB+: 可跑 13B 量化模型

#### **多 Agent 優化方案**
1. **模型實例池化**
   - Ollama 可同時載入多個模型（需足夠 RAM）
   - 使用 `ollama list` 查看已載入模型
   - 多 Agent 共用同一模型實例可減少記憶體佔用
2. **請求佇列管理**
   - 實作 Request Queue 避免 Ollama 過載
   - 使用 Rate Limiting 控制併發數
3. **模型量化**
   - Q4_0 / Q5_K_M 量化可減少 50-70% 記憶體使用
   - 速度與品質權衡：Q4 快但品質略降
4. **動態模型載入**
   - 只載入當前需要的模型
   - 閒置超過 N 分鐘自動卸載

### ✅ 建議做法

#### **短期**
1. **監控 Ollama 狀態**
   - 定期檢查 `ollama ps` 了解模型載入狀況
   - 追蹤記憶體使用 `vm_stat` / `top`
2. **限制併發 Agent 數量**
   - 根據可用記憶體計算最大併發數
   - 實作 Agent Pool（類似執行緒池）
3. **使用更小的模型**
   - 非核心任務用 Qwen2.5:7b / Llama3.2:3b
   - 重要任務才用 Llama3:70b

#### **中期**
1. **實作 Ollama Load Balancer**
   - 多個 Agent 請求時智能分配
   - 優先使用已載入的模型
2. **Context Caching**
   - Ollama 支援 Context Reuse
   - 相似請求可重用 Context 減少計算
3. **混合部署**
   - 輕量任務用本地 Ollama
   - 重量任務調用雲端 API（Claude / GPT-4）

### ❌ 我們目前缺什麼

1. **缺少 Ollama 健康檢查** → 無法知道模型是否過載
2. **缺少請求佇列機制** → 多 Agent 同時請求可能 Timeout
3. **缺少記憶體預警系統** → 記憶體不足時沒有提前警告
4. **缺少動態模型切換** → 無法根據任務複雜度自動選模型

---

## 三、監控系統（Observability）

### 🔍 現狀分析

多 Agent 系統的監控挑戰：
1. **健康狀態**: 如何知道哪個 Agent 卡住了？
2. **Token 使用**: 各 Agent 的成本如何追蹤？
3. **任務進度**: 子任務完成度如何可視化？
4. **錯誤追蹤**: Agent 失敗時如何快速定位根因？

### 🌐 業界方案

#### **LangGraph + LangSmith**
- **核心功能**:
  - 自動追蹤每個 Node 執行
  - 記錄 LLM 呼叫的 Input/Output/Tokens
  - 可視化 DAG 執行流程
  - 支援 Time-travel Debugging
- **整合方式**: 設定環境變數 `LANGCHAIN_TRACING_V2=true`
- **價格**: 有免費額度，超過需付費

#### **Langfuse**（開源替代）
- **核心功能**:
  - 開源 LLM Observability 平台
  - 支援 LangGraph / AutoGen / CrewAI
  - 追蹤 Token 使用、延遲、成本
  - 提供 Trace / Span / Event 三層追蹤
- **整合方式**: 透過 SDK 或 OpenTelemetry
- **優點**: 自架可控、無資料外流風險

#### **AutoGen + Logging**
- AutoGen 提供 `log_handler` 記錄對話
- 可整合 Elasticsearch / Prometheus
- 社群有第三方 Dashboard 專案

#### **CrewAI + 內建 Logging**
- CrewAI 內建日誌系統
- 可輸出 JSON 格式供外部工具分析
- 支援自訂 Callbacks 追蹤事件

#### **OpenTelemetry 標準**
- 業界標準追蹤協議
- 可整合 Jaeger / Zipkin / Datadog
- 支援分散式追蹤（Distributed Tracing）

### ✅ 建議做法

#### **短期（最小可行方案）**
1. **Session 狀態監控**
   ```bash
   # 實作 session_status 增強版
   openclaw session-status --all --json > session-monitor.json
   ```
2. **Token 使用追蹤**
   - 每次 LLM 呼叫記錄到 `token-usage.jsonl`
   - 格式：`{timestamp, sessionId, model, input_tokens, output_tokens, cost}`
3. **健康檢查端點**
   - 新增 `/health` API 回傳所有 Session 狀態
   - 格式：
     ```json
     {
       "sessions": [
         {
           "id": "agent:main:subagent:xxx",
           "status": "running",
           "context_usage": 0.65,
           "last_activity": "2026-02-12T13:50:00Z"
         }
       ]
     }
     ```

#### **中期（完整方案）**
1. **整合 Langfuse**
   - 自架 Langfuse Server
   - 在 OpenClaw 中加入 Tracing 中介層
   - 所有 LLM 呼叫自動上報
2. **實作 Dashboard**
   - 使用 Grafana + Prometheus
   - 監控指標：
     - Agent 數量與狀態
     - Token 使用率（每小時/每日）
     - 平均回應時間
     - 錯誤率
3. **告警系統**
   - Context 使用率 > 80% → Slack 通知
   - Agent 超過 5 分鐘無回應 → 自動重啟
   - Token 使用超過預算 → 暫停低優先級任務

#### **長期（企業級）**
1. **分散式追蹤**
   - 整合 OpenTelemetry
   - 支援跨系統追蹤（OpenClaw → Ollama → External API）
2. **成本優化分析**
   - 追蹤每個任務的 Token 成本
   - 自動生成「成本報告」
   - 建議哪些任務可用更小模型
3. **效能分析**
   - 識別最慢的 Agent
   - 分析 Context 膨脹原因
   - 自動建議優化點

### ❌ 我們目前缺什麼

1. **缺少 Session 生命週期監控** → 不知道哪個 Session 還活著
2. **缺少 Token 使用追蹤** → 不知道各任務的成本
3. **缺少視覺化 Dashboard** → 只能靠 CLI 手動查詢
4. **缺少告警機制** → 系統異常時無法主動通知
5. **缺少分散式追蹤** → 多 Agent 協作時看不清全貌

---

## 四、我們沒注意到的盲點清單

### 🚨 架構盲點

1. **Session 孤兒問題**
   - **現象**: 主 Agent 崩潰後，子 Agent 可能繼續運行變成殭屍 Session
   - **風險**: 浪費資源、無法清理
   - **解法**: 實作 Parent-Child Session Tree + 定期 GC

2. **Context Poisoning**
   - **現象**: 錯誤資訊進入 Context 後，後續推理全部偏離
   - **風險**: Agent 產生錯誤決策但自己不知道
   - **解法**: Context Validation + Checksum 檢查

3. **Memory Leak 在檔案系統**
   - **現象**: `memory/*.md` 不斷累積，從不清理
   - **風險**: 檔案系統佔用過大、檢索變慢
   - **解法**: 定期歸檔舊記憶、壓縮歷史檔案

4. **Distributed Deadlock**
   - **現象**: Agent A 等 Agent B 回應，B 等 C，C 等 A
   - **風險**: 系統卡死
   - **解法**: Timeout + Circuit Breaker

### 🚨 效能盲點

5. **Cold Start 問題**
   - **現象**: 第一次呼叫 Ollama 模型很慢（載入模型）
   - **風險**: 任務啟動延遲高
   - **解法**: 預載常用模型、Keep-Alive 策略

6. **Context Thrashing**
   - **現象**: Agent 反覆讀寫同一份記憶檔案
   - **風險**: I/O 瓶頸
   - **解法**: 記憶體快取 + Lazy Write

7. **Token 成本失控**
   - **現象**: 子 Agent 無限制重試導致 Token 爆炸
   - **風險**: 成本爆表
   - **解法**: Token Budget + Rate Limiting

8. **Ollama 單點故障**
   - **現象**: Ollama Crash 導致所有 Agent 都掛掉
   - **風險**: 系統不可用
   - **解法**: Health Check + Auto-restart + Fallback to Cloud API

### 🚨 安全盲點

9. **Sub-Agent Prompt Injection**
   - **現象**: 外部資料污染子 Agent 的指令
   - **風險**: Agent 被劫持執行惡意操作
   - **解法**: Input Sanitization + Structured Output

10. **記憶體內容洩漏**
    - **現象**: 子 Agent 間無隔離，可讀到彼此記憶
    - **風險**: 資料洩漏
    - **解法**: Session-based Memory Isolation

11. **Tool Execution 權限失控**
    - **現象**: 子 Agent 繼承主 Agent 的所有工具權限
    - **風險**: 權限提升攻擊
    - **解法**: 最小權限原則 + Tool Whitelist

### 🚨 維運盲點

12. **無法回滾**
    - **現象**: Agent 做了錯誤決策，無法復原
    - **風險**: 生產環境災難
    - **解法**: Transaction Log + Undo Stack

13. **除錯黑盒**
    - **現象**: 不知道 Agent 為何做出某決策
    - **風險**: 無法優化、無法符合監管要求
    - **解法**: Decision Trace + Explainability Layer

14. **缺少備份策略**
    - **現象**: 記憶檔案無備份，遺失就沒了
    - **風險**: 資料永久遺失
    - **解法**: 自動備份 + 版本控制（Git LFS）

15. **沒有災難復原計畫**
    - **現象**: 系統崩潰後不知道從哪重啟
    - **風險**: RTO/RPO 無法保證
    - **解法**: Disaster Recovery Plan + Checkpoint Snapshots

---

## 五、總結與行動建議

### 立即行動（本週）
1. 實作 `session_status --all` 列出所有活躍 Session
2. 開始記錄 Token 使用到 `token-usage.jsonl`
3. 實作 Context 使用率警告（>70% 時提醒）

### 短期行動（2 週內）
1. 建立 Shared State Store（Redis / SQLite）
2. 實作 Ollama 健康檢查腳本
3. 建立簡易 Dashboard（HTML + 定時刷新）

### 中期行動（1 個月內）
1. 整合 Langfuse 做完整追蹤
2. 實作 Session 生命週期管理
3. 建立 Token Budget 機制

### 長期願景（3 個月）
1. 實作分散式記憶體方案
2. 建立企業級監控平台
3. 完整的災難復原機制

---

**研究完成時間**: 2026-02-12 21:56  
**資料來源**: Medium, DEV Community, Langfuse, brlikhon.engineer, nuface.tw, Reddit r/ollama  
**框架版本**: LangGraph (latest), CrewAI (latest), AutoGen (latest), OpenClaw (current)
