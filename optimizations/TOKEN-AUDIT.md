# Token 用量審計與預估工具

## 概述

`token-audit.mjs` 讀取 OpenClaw server.log，解析所有 LLM 呼叫紀錄，按模型和用途分類統計 token 用量，並根據各模型公開定價估算成本。

## 使用方法

```bash
# 基本用法 — 最近 24h，表格輸出
node ~/.openclaw/workspace/optimizations/token-audit.mjs

# 指定時間範圍
node ~/.openclaw/workspace/optimizations/token-audit.mjs --last 7d
node ~/.openclaw/workspace/optimizations/token-audit.mjs --last 30d

# JSON 格式輸出（方便程式處理）
node ~/.openclaw/workspace/optimizations/token-audit.mjs --last 24h --json

# 指定日誌路徑
node ~/.openclaw/workspace/optimizations/token-audit.mjs --log /path/to/server.log

# 組合
node ~/.openclaw/workspace/optimizations/token-audit.mjs --last 7d --json > report.json
```

### 參數

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `--last` | `24h` | 時間範圍，支援 `Nh`（小時）、`Nd`（天） |
| `--json` | (無) | 以 JSON 格式輸出 |
| `--table` | (預設) | 以格式化表格輸出 |
| `--log` | `~/.openclaw/logs/server.log` | 指定日誌檔案路徑 |

### 輸出內容

- **按模型統計**: 每個模型的呼叫次數、估算 input/output tokens、估算成本 (USD)
- **按用途統計**: heartbeat / conversation / sub-agent / cron / other
- **總估算成本**: 所有模型合計

## 整合到每日 Cron

在 crontab 或 launchd 中加入每日執行：

### 方法 A: crontab

```bash
crontab -e
```

加入以下行（每天凌晨 3:00 執行，報告保存到 logs 目錄）：

```cron
0 3 * * * /usr/local/bin/node /Users/sky770825/.openclaw/workspace/optimizations/token-audit.mjs --last 24h --json >> /Users/sky770825/.openclaw/logs/token-audit-daily.jsonl 2>&1
```

### 方法 B: 搭配 OpenClaw Auto-Executor

在 OpenClaw 任務系統中建立定時任務，指令為：

```
node ~/.openclaw/workspace/optimizations/token-audit.mjs --last 24h --json
```

設定為每日 cron，結果會自動記錄在任務執行歷史中。

### 方法 C: 週報

```bash
# 每週一產出 7 天報告
0 8 * * 1 /usr/local/bin/node /Users/sky770825/.openclaw/workspace/optimizations/token-audit.mjs --last 7d --json >> /Users/sky770825/.openclaw/logs/token-audit-weekly.jsonl 2>&1
```

## 校準預估準確度

Token 估算基於 `字元數 / 2.5` 的啟發式公式，中英文混合場景下誤差通常在 ±30% 以內。以下是校準步驟：

### 步驟 1: 取得實際用量

登入各 API provider 的 dashboard 取得實際 token 消耗：

- **Google AI Studio**: https://aistudio.google.com/ -> 用量頁面
- **Anthropic Console**: https://console.anthropic.com/ -> Usage
- **OpenAI**: https://platform.openai.com/usage

截圖記錄當日或當週的實際用量。

### 步驟 2: 比對估算值

```bash
# 產出同一時間段的估算報告
node token-audit.mjs --last 7d --json > estimated.json
```

對比 JSON 報告中 `byModel[model].inputTokensEst` / `outputTokensEst` 與 dashboard 實際值。

### 步驟 3: 調整係數

如果發現系統性偏差，修改 `token-audit.mjs` 中的：

```javascript
const CHARS_PER_TOKEN = 2.5;  // 調高 = 估算 token 變少，調低 = 估算變多
```

參考值：
- 純英文: ~4.0 chars/token
- 純中文: ~1.5 chars/token
- 中英混合 (OpenClaw 場景): ~2.5 chars/token

### 步驟 4: 特定估算調整

對於 ScriptGen、QualityGate、IndexFile 等 sub-agent 呼叫，預設使用固定估算值。若想更精確，可在 server 端的相關模組增加 token usage 日誌輸出，例如：

```javascript
logger.info({ module: 'executor-agents', inputTokens: usage.input, outputTokens: usage.output }, '[ScriptGen] token usage');
```

這樣 `token-audit.mjs` 就能直接讀取實際值而非估算。

## 支援的模型定價

| 模型 | Input ($/1M tokens) | Output ($/1M tokens) |
|------|---------------------|----------------------|
| gemini-2.5-flash | $0.15 | $0.60 |
| gemini-2.5-pro | $1.25 | $10.00 |
| claude-opus-4 / cli | $15.00 | $75.00 |
| claude-sonnet-4 | $3.00 | $15.00 |
| gpt-4o | $2.50 | $10.00 |
| deepseek-r1 | $0.55 | $2.19 |
| mistral-7b (本地) | $0.00 | $0.00 |
| deepseek-r1-7b (本地) | $0.00 | $0.00 |

定價可在腳本中的 `PRICING` 物件直接修改。

## 偵測的 LLM 呼叫來源

| 日誌標記 | 分類 | 說明 |
|----------|------|------|
| `[XiaocaiAI] model=...` | conversation / heartbeat | 達爾 AI 回覆 |
| `[Heartbeat] 心跳觸發` | heartbeat | 定時心跳自主思考 |
| `[QualityGate-AI]` | sub-agent | 品質審查 AI |
| `[ScriptGen]` | sub-agent | 腳本生成 AI |
| `[IndexFile]` | sub-agent | 知識索引摘要 |
| `[AutoExecutor]` | cron | 自動執行器 |
