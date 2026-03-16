# 69 — Manus AI 設計理念與實踐

> 適用對象：系統架構師、AI Agent 開發者、前端 UX 設計師
> 最後更新：2026-03-07

---

## 1. Manus AI 是什麼

Manus 是由中國新創公司 Monica.im 於 2025 年 3 月推出的**通用型自主 AI Agent 平台**。它不是聊天機器人，而是能夠**獨立規劃、執行、交付完整成果**的數位助理。

| 傳統 AI 助手 | Manus AI Agent |
|-------------|----------------|
| 被動回應使用者指令 | 主動規劃並執行完整任務 |
| 一問一答 | 多步驟自主作業 |
| 需要持續人工介入 | 背景自主運行，完成後交付 |
| 單一模型回答 | 多 Agent 協作，工具調度 |
| 輸出文字回答 | 產出實際檔案、網站、報告 |

底層使用 Claude 3.5 搭配 Qwen 微調模型，擁有約 29 個專用工具，平均每個任務經過約 50 次工具呼叫。

---

## 2. 核心設計理念

### 2.1 任務拆解（Task Decomposition）

將模糊的大目標動態拆解成可執行的小步驟——不是事先規劃好所有步驟，而是邊執行邊調整。

**三階段認知循環：** 分析當前狀態 -> 規劃/選擇下一步工具 -> 執行並觀察結果 -> 回到分析

### 2.2 自主決策（Autonomous Decision）

從「提示驅動」轉向「目標驅動」。使用者只需說出目標（「分析這份資料集並產出圖表」），Manus 自己決定如何完成。

- **狀態機管理**：用 context-aware state machine 在 token decoding 階段遮罩特定 action 的 logits，控制工具可用性
- **動態路由**：根據任務類型自動選擇最適合的子代理
- **錯誤自癒**：執行失敗時自動分析原因、嘗試替代方案

### 2.3 工具調度（Tool Orchestration）

管理約 29 個工具，核心策略：不動態增刪工具（避免 KV-cache 失效），而是用 logit masking 控制可用性。工具呼叫結果用於下一步決策，支援工具鏈組合。

### 2.4 迭代優化（Iterative Refinement）

執行 -> 檢查 -> 修正循環。設有驗證代理（Verification Agent）專門檢查品質，結果不符預期時自動回退嘗試不同策略。

### 2.5 多 Agent 協作（Multi-Agent Collaboration）

| 代理類型 | 職責 | 對應 OpenClaw |
|---------|------|--------------|
| 規劃代理（Planning） | 目標拆解、流程設計 | 小蔡主線任務判斷 |
| 執行代理（Execution） | 工具呼叫、程式執行 | 星群 crew-bots |
| 驗證代理（Verification） | 結果校驗、迭代優化 | crew-doctor |

三類代理可並行運作，多個執行代理同時處理不同子任務。

### 2.6 Context Engineering（上下文工程）

Manus 最獨特的技術貢獻——不做模型微調，用上下文工程驅動 Agent 行為：

1. **KV-Cache 命中率優先**：快取 token 成本 0.30 USD/MTok vs 未快取 3 USD/MTok（差 10 倍）。固定 system prompt，用 logit masking 控制工具，不破壞快取。
2. **檔案系統即記憶體**：教 Agent 用檔案讀寫作為外部化記憶，大小無限、天然持久化。
3. **可恢復壓縮**：從上下文中刪除網頁內容（保留 URL 即可恢復），縮減上下文但不永久丟失資訊。
4. **注意力操控**：持續維護 `todo.md`，將全域計畫推入模型近期注意力窗口，解決長序列「中間遺忘」問題。

---

## 3. 前端 UX 設計啟發

### 3.1 三欄式介面

| 欄位 | 內容 | 設計意圖 |
|------|------|---------|
| 左側任務列 | 歷史任務列表 | 快速切換、任務管理 |
| 中央對話區 | 與 Agent 的互動 | 目標輸入、狀態回報 |
| 右側電腦視窗 | Agent 的即時操作畫面 | 建立信任、透明度 |

### 3.2 即時思考過程展示

- 即時顯示 Agent 正在執行的動作（「正在捲動頁面...」「正在瀏覽網頁...」）
- 時間軸截圖回放——記錄每個動作的視覺快照，可事後回顧
- 勾選清單即時更新——步驟逐一完成打勾

**設計原則：透明度建立信任。** 使用者看到 AI「真的在做事」，就像看著助理在工作。

### 3.3 步驟進度視覺化

```
任務：「分析競品網站並產出報告」

[v] 1. 開啟目標網站            (00:05)
[v] 2. 擷取頁面結構            (00:12)
[>] 3. 分析設計模式            (進行中...)
[ ] 4. 產出效能報告與建議       [pending]

進度：2/4 ━━━━━━━━░░░░░░░░ 50%
```

### 3.4 目標導向互動

傳統 AI：使用者逐步下指令，AI 逐步回答。
Manus：使用者說出目標，Agent 自動完成全部流程（寫程式 -> 執行 -> 除錯 -> 交付）。

---

## 4. 代碼範例

### 4.1 任務拆解引擎

```typescript
interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  tool?: string;
  dependencies: string[];
}

class TaskDecompositionEngine {
  private steps: TaskStep[] = [];

  async decompose(goal: string): Promise<TaskStep[]> {
    const llmResponse = await this.callLLM({
      system: '將使用者目標拆解成 3-8 個可執行步驟，每步包含 description、tool、dependencies。',
      user: goal,
    });
    this.steps = llmResponse.steps.map((s: any, i: number) => ({
      id: `step-${i + 1}`, description: s.description,
      status: 'pending' as const, tool: s.tool, dependencies: s.dependencies || [],
    }));
    return this.steps;
  }

  /** 取得可並行執行的步驟（依賴都已完成） */
  getParallelizable(): TaskStep[] {
    return this.steps.filter(s =>
      s.status === 'pending' &&
      s.dependencies.every(dep => this.steps.find(d => d.id === dep)?.status === 'done')
    );
  }

  async executeNext(): Promise<TaskStep | null> {
    const next = this.getParallelizable()[0];
    if (!next) return null;
    next.status = 'running';
    try {
      await this.executeTool(next.tool!, next);
      next.status = 'done';
    } catch {
      next.status = 'failed';
    }
    return next;
  }
}
```

### 4.2 進度追蹤 UI

```tsx
function TaskProgressTracker({ taskId }: { taskId: string }) {
  const [steps, setSteps] = useState<StepInfo[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/tasks/${taskId}/progress`);
    es.onmessage = (e) => setSteps(JSON.parse(e.data).steps);
    return () => es.close();
  }, [taskId]);

  const icon = (s: string) =>
    s === 'done' ? '[v]' : s === 'running' ? '[>]' : s === 'failed' ? '[x]' : '[ ]';
  const done = steps.filter(s => s.status === 'done').length;

  return (
    <div style={{ fontFamily: 'monospace' }}>
      {steps.map((step, i) => (
        <div key={step.id} style={{ opacity: step.status === 'pending' ? 0.5 : 1 }}>
          {icon(step.status)} {i + 1}. {step.description}
          {step.status === 'running' && ' 進行中...'}
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        進度：{done}/{steps.length} ({Math.round((done / steps.length) * 100)}%)
      </div>
    </div>
  );
}
```

---

## 5. 與 OpenClaw 整合的實踐建議

### 5.1 架構對照

| Manus 概念 | OpenClaw 現有實現 | 優化方向 |
|-----------|-----------------|---------|
| 多 Agent 協作 | 小蔡 + 星群（crew-bots） | 加強代理間結果傳遞 |
| 工具調度 | 22 個 action | 參考 logit masking 做工具可用性管理 |
| 自主決策 | selfDrive 模式 | 引入驗證代理做品質檢查 |
| 檔案系統即記憶 | ~/.openclaw/workspace/ | 已實現，可加強結構化 |
| 進度視覺化 | 任務面版前端 | 加入即時步驟追蹤 |

### 5.2 可落地的改進

**短期：**
1. **todo.md 注意力錨定**：多步驟任務中持續維護 `todo.md`，解決長任務目標遺忘
2. **步驟進度 API**：新增 `/api/tasks/:id/progress`，前端即時顯示任務進度
3. **動作日誌**：記錄每個 action 的執行時間與結果

**中期：**
4. **驗證代理**：任務完成後自動品質檢查
5. **並行執行引擎**：識別可並行子任務，分派給多個 crew-bot

**長期：**
6. **KV-Cache 友善工具管理**：固定 system prompt，用狀態機控制工具可用性
7. **前端三欄式改版**：左側任務列 + 中央對話 + 右側即時操作視窗

### 5.3 Context Engineering 在 OpenClaw 的應用

```typescript
const contextStrategy = {
  memory: {
    shortTerm: 'conversation context',
    longTerm: '~/.openclaw/workspace/memory/',
    taskState: '~/.openclaw/workspace/todo.md',  // 注意力錨點
  },
  compression: {
    keepAlways: ['file_paths', 'urls', 'task_ids'],
    compressible: ['file_contents', 'web_pages'],   // 保留路徑即可恢復
    droppable: ['intermediate_logs'],
  },
  attention: {
    reciteInterval: 10,  // 每 10 次工具呼叫重新注入任務計畫
    planFile: 'todo.md',
  },
};
```

---

## 6. 參考資料

- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [From Mind to Machine: The Rise of Manus AI](https://arxiv.org/html/2505.02024v1)
- [In-depth technical investigation into Manus AI](https://gist.github.com/renschni/4fbc70b31bad8dd57f3370239dccd58f)
- [Inside Manus: The Anatomy of an Autonomous AI Agent](https://medium.com/@jalajagr/inside-manus-the-anatomy-of-an-autonomous-ai-agent-b3042e5e5084)
- [Manus AI: The Guiding Principles Behind Its Design](https://www.gocodeo.com/post/manus-ai-the-guiding-principles-behind-its-design)
- [The Complete Guide to AI Multi-Agent Orchestration with Manus AI](https://natesnewsletter.substack.com/p/the-complete-guide-to-ai-multi-agent)
- [Cursor, "vibe coding," and Manus: the UX revolution](https://uxdesign.cc/cursor-vibe-coding-and-manus-the-ux-revolution-that-ai-needs-3d3a0f8ccdfa)
- [Manus AI Explained: How Autonomous Agents Are Changing the Game](https://designcode.io/agentic-workflows-manus-ai-explained/)
