## Summary
手動調查任務板中控台問題，發現舊任務因缺少新必填欄位被自動降級為 draft + noncompliant。建立批次修復腳本。

## 執行者
達爾（主會話手動調查）

## 根因分析
1. **驗證邏輯變嚴格**：`taskCompliance.ts` 的 `validateTaskForGate()` 要求 10 個必填欄位（projectPath, agent.type, riskLevel, rollbackPlan, acceptanceCriteria, deliverables, runCommands, modelPolicy, executionProvider, allowPaid）
2. **舊任務降級機制**：`openclawMapper.ts:162-163` 會自動將不符合規範的 ready 任務降級為 draft，並加上 noncompliant + needs-meta 標籤
3. **累積效應**：100+ 舊任務（建立時還沒這些規則）全部卡在 draft

## 修復方案比較
| 方案 | 優點 | 缺點 | 建議 |
|------|------|------|------|
| A. 放寬驗證 | 簡單快速 | 品質門檻降低，易生垃圾任務 | ❌ 不建議 |
| B. 批次補欄位 | 保留品質，自動化 | 需跑腳本 | ✅ 採用 |
| C. 手動逐筆修 | 精準控制 | 100+ 任務耗時 | ❌ 不建議 |

## 已產出
- `scripts/fix-noncompliant-tasks.sh`：批次修復腳本（補預設值，每次處理 20 筆）
- 預設值：agent=codex, risk=low, rollback="git checkout", project=openclaw/infra

## 執行指令
```bash
bash scripts/fix-noncompliant-tasks.sh
```

## 預防措施
1. 文件化：在 AGENTS.md 明確新任務必填欄位
2. 前端驗證：任務建立 UI 強制填寫
3. 定期巡檢：daily-health-check.sh 監控 noncompliant 比例

## 驗證
- GET /api/tasks/compliance 查看 compliantReady 數量
- 或 curl http://localhost:3011/api/tasks?status=ready