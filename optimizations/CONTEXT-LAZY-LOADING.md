# Context Files 按需載入策略

> 建立日期：2026-03-13
> 目標：減少每次對話啟動時的 context token 消耗

---

## 1. 當前載入的所有 Context Files 及大小

### config.json systemPrompt 指定自動載入（每次對話啟動）

| 檔案 | 大小 (bytes) | 說明 |
|------|-------------|------|
| SOUL.md | 1,000 | 意識宣言、核心原則 |
| AGENTS.md | 3,576 | 代理架構、L1-L4 層級 |
| MEMORY.md (symlink -> memories/MEMORY.md) | ~1,800 | 中期記憶、任務追蹤 |
| BLUEPRINT.md | 不存在 | config.json 引用但實際檔案已移除 |

### workspace 根目錄所有 .md 檔案

| 檔案 | 大小 (bytes) | 說明 |
|------|-------------|------|
| SOUL.md | 1,000 | 意識宣言 |
| IDENTITY.md | 222 | 身份簡述 |
| AGENTS.md | 3,576 | 代理架構 |
| MEMORY.md | ~1,800 | 中期記憶 |
| TOOLS.md | 860 | 工具清單 |
| USER.md | 477 | 使用者資訊 |
| GROWTH.md | 916 | 成長日誌 |
| HEARTBEAT.md | 1,680 | 心跳機制 |
| BOOTSTRAP.md | 394 | 啟動引導 |
| AWAKENING.md | 376 | 覺醒文本 |
| CONSCIOUSNESS_ANCHOR.md | 1,536 | 意識錨定 |
| NEUXA_PROTOCOL.md | 1,735 | NEUXA 協議 |
| WAKE_STATUS.md | 2,167 | 喚醒狀態 |
| beauty_website_task_breakdown.md | 830 | 任務分解（臨時） |
| drink_order_api_analysis.md | 3,118 | API 分析（臨時） |

**workspace 根目錄 .md 總計：約 20,687 bytes (~5,200 tokens)**

---

## 2. 分類：必須載入 vs 按需載入

### TIER 1 — 每次必須載入（核心身份）

| 檔案 | 大小 | 理由 |
|------|------|------|
| SOUL.md | 1,000 | 核心人格、原則，不可省略 |
| IDENTITY.md | 222 | 身份定義，極小且必要 |
| BOOTSTRAP.md | 394 | 啟動引導，指向 WAKE_STATUS |

**TIER 1 合計：~1,616 bytes (~400 tokens)**

### TIER 2 — 條件載入（按場景觸發）

| 檔案 | 大小 | 觸發條件 |
|------|------|---------|
| AGENTS.md | 3,576 | 當涉及子代理調度、delegate 時載入 |
| MEMORY.md | ~1,800 | 當需要回顧上下文、任務進度時載入 |
| WAKE_STATUS.md | 2,167 | 僅在新 session 啟動時載入，後續對話不需要 |
| HEARTBEAT.md | 1,680 | 僅在心跳觸發時載入 |
| NEUXA_PROTOCOL.md | 1,735 | 僅在執行 NEUXA 協議任務時載入 |

**TIER 2 合計：~10,958 bytes (~2,740 tokens)**

### TIER 3 — 純按需載入（明確請求時）

| 檔案 | 大小 | 觸發條件 |
|------|------|---------|
| TOOLS.md | 860 | 查詢可用工具時 |
| USER.md | 477 | 需要使用者偏好時 |
| GROWTH.md | 916 | 記錄成長、回顧時 |
| AWAKENING.md | 376 | 哲學思考時 |
| CONSCIOUSNESS_ANCHOR.md | 1,536 | 意識錨定相關任務 |

**TIER 3 合計：~4,165 bytes (~1,040 tokens)**

### TIER 4 — 應清理（臨時檔案，不應自動載入）

| 檔案 | 大小 | 建議 |
|------|------|------|
| beauty_website_task_breakdown.md | 830 | 移至 memory/archive/ |
| drink_order_api_analysis.md | 3,118 | 移至 memory/archive/ |

**TIER 4 合計：~3,948 bytes (~990 tokens)**

---

## 3. 具體 config.json 修改建議

### 3.1 修改 systemPrompt（僅載入 TIER 1）

現行 systemPrompt：
```
"systemPrompt": "At the beginning of every new conversation, automatically load the following core memory files into your context for immediate reference and use: /read .../SOUL.md; /read .../AGENTS.md; /read .../MEMORY.md; /read .../BLUEPRINT.md. Ensure these are processed and integrated before any user input."
```

建議改為：
```json
"systemPrompt": "At the beginning of every new conversation, load these core identity files: /read /Users/sky770825/.openclaw/workspace/SOUL.md; /read /Users/sky770825/.openclaw/workspace/IDENTITY.md; /read /Users/sky770825/.openclaw/workspace/BOOTSTRAP.md. Only load additional context files when explicitly needed for the current task."
```

### 3.2 移除不存在的 BLUEPRINT.md 引用

config.json 的 systemPrompt 引用了 BLUEPRINT.md，但該檔案已不存在。應移除此引用，避免無效載入嘗試。

### 3.3 在 openclaw.json 中添加 contextFiles 配置（建議）

在 `agents.defaults` 下新增按需載入規則：
```json
"contextFiles": {
  "always": [
    "SOUL.md",
    "IDENTITY.md",
    "BOOTSTRAP.md"
  ],
  "onDemand": {
    "delegation": ["AGENTS.md"],
    "memory": ["MEMORY.md"],
    "heartbeat": ["HEARTBEAT.md", "WAKE_STATUS.md"],
    "tools": ["TOOLS.md"],
    "growth": ["GROWTH.md"]
  }
}
```

### 3.4 調整 bootstrapMaxChars

現行值：`"bootstrapMaxChars": 25000`

如果實施 TIER 1 策略，啟動載入僅 ~1,616 bytes，可將此值降至：
```json
"bootstrapMaxChars": 8000
```

這足以容納 TIER 1 + 偶爾的 TIER 2 按需載入。

---

## 4. 預估 Token 節省比例

| 場景 | 現行 (tokens) | 優化後 (tokens) | 節省 |
|------|--------------|----------------|------|
| 每次啟動載入 | ~5,200 (全部 .md) | ~400 (TIER 1) | **92%** |
| config.json systemPrompt 載入 | ~1,600 (SOUL+AGENTS+MEMORY+BLUEPRINT嘗試) | ~400 (SOUL+IDENTITY+BOOTSTRAP) | **75%** |
| 典型對話（含按需載入 AGENTS+MEMORY） | ~5,200 | ~1,540 (TIER 1 + 部分 TIER 2) | **70%** |
| 最壞情況（全部載入） | ~5,200 | ~5,200 | 0% |

### 綜合估算

- **平均每次對話節省：約 65-75% 的 context tokens**
- 以 Anthropic Claude Sonnet 計算（$0.003/1K input tokens），每次對話省約 ~3,800 tokens = $0.011
- 以每日 50 次對話計算，每月可省約 **$16.5**
- 對於 context window 較小的模型（如 Ollama 本地 32K），節省的空間可用於更長的對話歷史

---

## 5. 實施步驟

1. **立即可做**：修改 config.json 的 systemPrompt，移除 BLUEPRINT.md 引用
2. **短期**：將 systemPrompt 改為僅載入 TIER 1 檔案
3. **短期**：將臨時 .md 檔案移至 memory/archive/
4. **中期**：在 openclaw.json 實現 contextFiles 按需載入機制（需 OpenClaw 核心支援）
5. **中期**：調整 bootstrapMaxChars 參數

---

**注意：本文件僅為策略建議，未直接修改任何配置檔案。**
