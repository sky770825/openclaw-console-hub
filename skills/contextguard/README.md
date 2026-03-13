# ContextGuard

ContextGuard 是 OpenClaw 的智能 Context 管理助手，幫助用戶有效監控和優化 LLM 會話中的 token 使用。

## 功能

- **Context Monitor** — 即時監控 context 使用率，預警即將觸達限制
- **Smart Compaction** — 智能分析對話歷史，建議最佳 compact 時機
- **Token Optimizer** — 自動檢測冗餘內容，提供優化建議
- **Cost Dashboard** — 視覺化展示 token 消耗趨勢與成本估算

## 安裝

```bash
# 在 OpenClaw 目錄下執行
./skills/contextguard/scripts/install.sh
```

## 使用

```
# 查看當前 context 狀態
/context status

# 手動觸發優化建議
/context optimize

# 查看成本儀表板
/context dashboard
```

## 配置

在 `~/.openclaw/config.json` 中添加：

```json
{
  "contextguard": {
    "threshold_warning": 0.7,
    "threshold_critical": 0.9,
    "auto_suggest": true
  }
}
```

## License

MIT
