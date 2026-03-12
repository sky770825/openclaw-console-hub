# TROUBLESHOOTING.md - 自救檔案索引

| 問題 | 檔案位置 | 關鍵字 |
|------|---------|--------|
| **Anthropic 模型設定失敗** | `docs/ANTHROPIC-MODEL-SETUP.md` | 404, unknown model, invalid config, mode merge, 兩層設定 |
| **API Key 衝突** | `memory/2026-02-12.md` | API Key 衝突, 404, 備份檔案, anthropic.env |
| **完整資源索引** | `docs/ANTHROPIC-MODEL-RESOURCES.md` | 多方除錯, 20+ 資源, GitHub, Moltbook, Reddit |
| **Session 卡住** | `docs/RECOVERY-MECHANISM.md` | 卡住, 無回應, recovery, 緊急停止 |
| **Cursor Agent 救援** | `scripts/openclaw-cursor-rescue.sh` | 深度救援, cursor agent, 修復 |

## 緊急情況快速指令

```bash
# 檢查 Anthropic 設定
openclaw models status

# 重置模型到預設
# (在 OpenClaw 聊天中輸入): /session_status model=default

# 重啟 Gateway
openclaw gateway restart

# 緊急停止所有 Agent
./scripts/emergency-stop.sh all
```

## Opus 4.6 高難度任務管理

- **管理腳本**: `./scripts/opus-task.sh`
- **使用時機**: 複雜除錯(卡>30分鐘)、架構設計、大量代碼審查(>500行)
- **出動指令**: `opus-task.sh start "任務描述"`
- **完成指令**: `opus-task.sh complete <任務ID>`
- **成本提醒**: Opus 4.6 約貴 Kimi 30-40 倍，用完即切回
- **相關文件**: `docs/OPUS-TASK-SYSTEM.md`

## OpenClaw 模型設定（重要！避免踩雷）

- **設定檔位置**：`~/.openclaw/openclaw.json`
- **關鍵參數**：`"mode": "merge"`（必須加在 models 區塊）
- **兩層架構**：`models.providers`（連線設定）+ `agents.defaults.models`（可用列表）
- **API Key 管理**：`~/.openclaw/config/anthropic.env`（環境變數檔案）
- **常見錯誤**：
  - "invalid config" → 缺少 `mode: merge`
  - "unknown model" → provider 沒定義該模型
  - "404 Not Found" → provider 設定錯誤
  - "authentication failed" → API Key 無效
- **已啟用模型**：anthropic/claude-opus-4-6、anthropic/claude-sonnet-4-5、anthropic/claude-haiku-4-5
- **模型切換指令**：`/session_status model=anthropic/claude-opus-4-6`、`/session_status model=default`
- **教學文件**：`docs/ANTHROPIC-MODEL-SETUP.md`
