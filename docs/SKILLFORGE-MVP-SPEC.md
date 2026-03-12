# SkillForge MVP 技術規格

> **版本**: 0.1.0  
> **日期**: 2026-02-12  
> **目標**: 可執行的 YAML Skill 解析與執行 Demo

---

## 1. 產品定位

SkillForge 是「開箱即用的本地 AI Agent 自動化框架」，讓開發者用 YAML 定義任務流程，AI 自動執行。

**核心價值主張**:
- 本地優先：內建 Ollama 支援，無需雲端 API
- 瀏覽器自動化：整合 Playwright，一鍵操控網頁
- 輕量開源：MIT 授權，單一開發者可維護

---

## 2. 核心模組清單

### 2.1 Agent Engine (`src/core/agent.ts`)
**職責**: 任務規劃、狀態管理、異常處理

**介面**:
```typescript
interface AgentConfig {
  name: string;
  description?: string;
  llm?: LLMConfig;
  skills: string[]; // skill IDs
}

interface Agent {
  run(task: string, context?: TaskContext): Promise<TaskResult>;
  loadSkill(skillPath: string): Promise<void>;
  getState(): AgentState;
}
```

### 2.2 Skill System (`src/skills/`)
**職責**: 可外掛的動作模組，定義標準化技能介面

**介面**:
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // 執行動作
  execute(params: Record<string, any>, context: SkillContext): Promise<SkillResult>;
  
  // 參數驗證 Schema
  schema?: JSONSchema;
}

interface SkillRegistry {
  register(skill: Skill): void;
  get(id: string): Skill | undefined;
  list(): Skill[];
}
```

**內建技能**:
| 技能 ID | 功能 | 優先級 |
|--------|------|--------|
| `browser` | Playwright 瀏覽器操作 | P0 |
| `llm` | 呼叫 LLM 生成/分析 | P0 |
| `file` | 檔案讀寫操作 | P0 |
| `http` | HTTP 請求 | P1 |
| `notify` | 發送通知 (console/telegram) | P1 |

### 2.3 LLM Adapter (`src/llm/`)
**職責**: 統一介接多種 LLM 提供者

**介面**:
```typescript
interface LLMConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  model: string;
  baseUrl?: string;
  apiKey?: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

interface LLMClient {
  chat(messages: ChatMessage[]): Promise<string>;
  chatStream(messages: ChatMessage[]): AsyncIterable<string>;
}
```

**預設配置**:
```yaml
llm:
  provider: ollama
  model: qwen3:8b
  baseUrl: http://localhost:11434
```

### 2.4 Task Planner (`src/core/planner.ts`)
**職責**: 將自然語言任務分解為可執行步驟

**介面**:
```typescript
interface TaskPlanner {
  plan(task: string, availableSkills: Skill[]): Promise<ExecutionPlan>;
}

interface ExecutionPlan {
  steps: Step[];
  context: Record<string, any>;
}

interface Step {
  id: string;
  skill: string;
  action: string;
  params: Record<string, any>;
  description: string;
}
```

### 2.5 YAML Parser (`src/yaml/`)
**職責**: 解析 Skill YAML 定義檔

**介面**:
```typescript
interface SkillYAML {
  skill: {
    id: string;
    name: string;
    version: string;
    description: string;
  };
  actions: ActionDef[];
}

interface ActionDef {
  name: string;
  description: string;
  params: ParamDef[];
  handler: 'javascript' | 'python' | 'builtin';
  code?: string; // 內嵌代碼或檔案路徑
}

interface YAMLParser {
  parse(filePath: string): Promise<SkillYAML>;
  validate(skill: SkillYAML): ValidationResult;
}
```

---

## 3. 資料夾結構

```
skillforge/
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── .gitignore
│
├── src/
│   ├── index.ts              # 入口點
│   ├── cli.ts                # CLI 指令
│   │
│   ├── core/                 # 核心引擎
│   │   ├── agent.ts
│   │   ├── planner.ts
│   │   ├── executor.ts
│   │   └── state.ts
│   │
│   ├── skills/               # 技能系統
│   │   ├── registry.ts
│   │   ├── loader.ts
│   │   ├── builtin/          # 內建技能
│   │   │   ├── browser/
│   │   │   │   ├── index.ts
│   │   │   │   └── actions.ts
│   │   │   ├── llm/
│   │   │   ├── file/
│   │   │   └── http/
│   │   └── yaml/             # YAML 技能載入器
│   │       ├── parser.ts
│   │       └── validator.ts
│   │
│   ├── llm/                  # LLM 介接層
│   │   ├── client.ts
│   │   ├── ollama.ts
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   │
│   ├── yaml/                 # YAML 定義支援
│   │   ├── parser.ts
│   │   ├── schema.ts
│   │   └── types.ts
│   │
│   ├── types/                # 全域類型
│   │   └── index.ts
│   │
│   └── utils/                # 工具函數
│       ├── logger.ts
│       └── errors.ts
│
├── skills/                   # 使用者技能目錄 (可選)
│   └── example.yaml
│
├── examples/                 # 範例
│   ├── basic-agent.ts
│   ├── yaml-skill-demo.ts
│   └── skills/
│       └── web-search.yaml
│
├── tests/                    # 測試
│   ├── unit/
│   └── integration/
│
└── docs/                     # 文件
    ├── quickstart.md
    └── skills.md
```

---

## 4. package.json 建議

```json
{
  "name": "skillforge",
  "version": "0.1.0",
  "description": "開箱即用的本地 AI Agent 自動化框架",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "skillforge": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "start": "node dist/cli.js",
    "test": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0",
    "playwright": "^1.41.0",
    "zod": "^3.22.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/skillforge.git"
  },
  "keywords": [
    "ai-agent",
    "automation",
    "playwright",
    "ollama",
    "llm",
    "browser-automation"
  ]
}
```

---

## 5. 第一個可 Demo 功能

### 5.1 功能描述
**YAML Skill 定義 → 載入 → 執行 → 輸出結果**

示範一個「網頁搜尋並摘要」的自動化流程。

### 5.2 執行流程

```
使用者輸入: "搜尋 OpenAI 最新新聞並摘要"
       ↓
[Planner] 產生執行計畫
       ↓
[Step 1] browser.navigate(url: "https://google.com")
       ↓
[Step 2] browser.fill(selector: "[name=q]", text: "OpenAI 最新新聞")
       ↓
[Step 3] browser.press(key: "Enter")
       ↓
[Step 4] browser.extract(selector: ".g", attribute: "text")
       ↓
[Step 5] llm.chat(prompt: "摘要以下內容: {{results}}")
       ↓
輸出摘要
```

### 5.3 YAML Skill 範例

```yaml
# skills/web-search.yaml
skill:
  id: web-search
  name: 網頁搜尋
  version: 1.0.0
  description: 在 Google 搜尋關鍵字並摘要結果

actions:
  - name: search
    description: 執行搜尋並摘要
    params:
      - name: query
        type: string
        required: true
        description: 搜尋關鍵字
      - name: maxResults
        type: number
        default: 3
        description: 最大結果數
    
    steps:
      - skill: browser
        action: navigate
        params:
          url: "https://www.google.com"
      
      - skill: browser
        action: fill
        params:
          selector: "textarea[name='q']"
          value: "{{query}}"
      
      - skill: browser
        action: press
        params:
          key: "Enter"
      
      - skill: browser
        action: waitForSelector
        params:
          selector: "#search"
          timeout: 5000
      
      - skill: browser
        action: extractList
        params:
          selector: "div.g h3"
          limit: "{{maxResults}}"
        output: searchResults
      
      - skill: llm
        action: chat
        params:
          messages:
            - role: system
              content: "你是一個摘要助手，請用繁體中文簡潔摘要搜尋結果。"
            - role: user
              content: "請摘要以下搜尋結果：\n{{searchResults}}"
        output: summary
    
    return: "{{summary}}"
```

### 5.4 執行指令

```bash
# 安裝
npm install -g skillforge

# 執行 YAML Skill
skillforge run skills/web-search.yaml --param query="OpenAI 最新新聞"

# 或使用程式碼
npx tsx examples/yaml-skill-demo.ts
```

### 5.5 程式碼範例

```typescript
// examples/yaml-skill-demo.ts
import { SkillForge } from '../src/index';

async function main() {
  const forge = new SkillForge({
    llm: {
      provider: 'ollama',
      model: 'qwen3:8b'
    }
  });

  // 載入 YAML Skill
  await forge.loadSkill('./skills/web-search.yaml');

  // 執行
  const result = await forge.run('web-search', {
    query: 'OpenAI 最新新聞',
    maxResults: 3
  });

  console.log('結果:', result);
}

main().catch(console.error);
```

---

## 6. 開發里程碑

| 里程碑 | 預計時間 | 驗收標準 |
|-------|---------|---------|
| M1: 核心架構 | 1 週 | Agent、Skill Registry、LLM Adapter 可用 |
| M2: YAML 解析 | 1 週 | 可解析 YAML Skill 並載入 |
| M3: 內建技能 | 1 週 | browser、llm、file 技能可用 |
| M4: Demo 完成 | 1 週 | `web-search.yaml` 可成功執行 |
| **MVP 總計** | **4 週** | 可展示完整流程 |

---

## 7. 下一步行動

1. **立即**: 建立 GitHub repo，初始化專案結構
2. **Day 1-2**: 實作核心模組 (Agent, Skill Registry)
3. **Day 3-4**: 實作 YAML Parser 與 LLM Adapter
4. **Day 5-7**: 實作內建技能 (browser, llm)
5. **Day 8-14**: 整合測試與 Demo 調試

---

## 附錄：技術決策記錄

| 決策 | 選擇 | 理由 |
|-----|------|------|
| 執行時 | Node.js 20+ | 團隊熟悉、非同步友善 |
| 型別系統 | TypeScript | 可維護性、IDE 支援 |
| YAML 函式庫 | js-yaml | 最廣泛使用 |
| 驗證 | Zod | 型別推導、錯誤訊息友善 |
| 測試 | Vitest | 速度快、ESM 支援 |
| CLI | Commander | 簡單、生態成熟 |
