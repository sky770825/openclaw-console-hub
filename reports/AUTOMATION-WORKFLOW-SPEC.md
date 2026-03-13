# AUTOMATION-WORKFLOW-SPEC.md
# 自動化工作流規範 v1.0
# 生成日期: 2026-02-14
# 強制生效: 所有任務執行必須遵守

## 1. 角色分工

| 角色 | 職責 | 執行者 |
|------|------|--------|
| **指揮官** | 策略制定、任務派發、里程碑審查 | 達爾 |
| **執行代理** | 程式開發、系統建置、測試驗收 | 🧑‍💻 Codex / 🎯 Cursor |
| **摘要整理** | 進度摘要、下一步規劃、寫回任務卡 | Ollama (qwen3:8b) |
| **巡檢員** | 定期檢查專案進度、輸出策略進展 | 達爾 (低頻率) |

## 2. 任務包必填欄位

任務卡建立時必須完整填寫，否則拒絕執行：

```yaml
task:
  projectPath: "projects/<project>/<module>/"  # 強制：唯一真相源
  deliverables:                                # 強制：必交付檔案清單
    - "README.md"
    - ".env.example"
    - "docs/runbook.md"
    - "src/" 或 "scripts/"
  runCommands:                                 # 強制：可複製執行指令
    install: ""
    start: ""
    test: ""
    verify: ""
  acceptanceCriteria: []                       # 已存在：可量化驗收條件
  rollbackPlan: ""                            # 已存在：明確回滾方式
  riskLevel: "low|medium|high"                # 已存在
  assignedAgent: "codex|cursor"               # 強制：執行代理
  modelPolicy:                                # 新增：模型使用政策
    default: "ollama/qwen3:8b"                # 預設：本地免費
    fallback: "subscription/codex-native"     # 備援：訂閱制
    upgradeRequires: "riskLevel=high + 主人確認"  # 升級條件
```

## 3. 里程碑回報規則

### Telegram 回報（僅限以下情況）
- ✅ **架構完成** - 技術架構確定，開始實作
- ✅ **可跑版本** - MVP 完成，可執行測試
- ✅ **驗收通過** - 所有 acceptance criteria 達成
- ❌ **阻塞/失敗** - 需要人工介入處理

### 一般進度更新
- 一律寫入任務卡 `description`（has:summary + nextSteps + evidenceLinks）
- 同步寫入專案 `docs/updates/YYYY-MM-DD.md`
- **禁止**每步驟發 Telegram

## 4. projectPath 單飛原則

- **每個任務必須指定 `projectPath`**，作為唯一真相源
- 所有產出檔案必須落地於該路徑下
- **禁止**只有聊天記錄、沒有檔案落地的執行

### 路徑規範
```
projects/
├── <project-name>/
│   ├── README.md                 # 專案總覽
│   ├── docs/
│   │   ├── STATUS.md            # 當前狀態
│   │   ├── updates/
│   │   │   └── YYYY-MM-DD.md    # 每日更新
│   │   └── runbook.md           # 維運手冊
│   ├── src/ 或 scripts/         # 實作程式碼
│   ├── tests/                   # 測試檔案
│   └── .env.example             # 環境變數範例
```

## 5. IdempotencyKey 機制

### 必填欄位
每個執行實例必須包含：
```yaml
execution:
  task_id: "uuid"           # 任務唯一識別
  run_id: "uuid"            # 執行實例識別
  idempotencyKey: "string"  # 冪等性金鑰（防止重複執行）
  timestamp: "ISO8601"      # 執行時間戳
```

### 防重複規則
- 同一 `idempotencyKey` 24 小時內不得重複執行
- 同一 `projectPath` 同時只能有 1 個執行中（檔案鎖機制）
- 重試僅允許重跑當前 step，不得整串重跑

## 6. 模型/成本禁令

### 預設允許模型
| 模型 | 成本 | 使用場景 |
|------|------|----------|
| `ollama/qwen3:8b` | $0 | 摘要、寫回、簡單分析 |
| `subscription/codex-native` | $0（已訂閱）| 程式開發 |
| `subscription/cursor-auto` | $0（已訂閱）| 程式開發 |

### 禁止預設使用（需特別核准）
| 模型 | 成本 | 核准條件 |
|------|------|----------|
| `kimi/kimi-k2.5` | 按量計費 | `riskLevel=high` + 主人確認 |
| `anthropic/claude-opus-4` | 高 | `riskLevel=high` + 主人確認 |
| `openrouter/gemini-pro` | 中 | `riskLevel=high` + 主人確認 |

### 強制檢查
```bash
# scripts/model-policy-guard.sh
if [[ "$MODEL" =~ ^(kimi|opus|gemini-pro) ]] && [[ "$riskLevel" != "high" ]]; then
  echo "❌ 付費模型需 riskLevel=high + 主人確認"
  exit 1
fi
```

## 7. 違規處理

- **未填 projectPath**: 拒絕執行，回報指揮官
- **使用付費模型未核准**: 強制終止，回報指揮官
- **未寫回任務卡**: 標記執行失敗，要求補齊
- **每步驟 Telegram**: 警告一次，再犯暫停權限

---

**版本**: v1.0
**生效日期**: 2026-02-14
**審查週期**: 每週一回顧
