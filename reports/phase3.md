# Phase 3: ContextGuard 產品化

> 執行者：Cursor（訂閱制）
> 優先級：P0（商業化）
> 依賴：Phase 1 & 2 完成
> 工作目錄：/Users/caijunchang/.openclaw/workspace/skills/contextguard/

## 目標
將我們的 Context 優化實踐打包成可銷售的 OpenClaw Skill，並準備商業化。

## 背景
我們已經實證：
- Context 控制：從 70%+ 降級到 30% 使用率
- Token 效率：節省 80%（每小時 75K → 15K）
- 系統穩定性：熔斷器 + 預算看門狗 + 超時保護

## 任務 1：建立 Skill 結構

### 目錄結構
```
skills/contextguard/
├── SKILL.md              # Skill 說明文件
├── package.json          # NPM 配置
├── src/
│   ├── index.ts          # 主入口
│   ├── monitor.ts        # Context 監控核心
│   ├── optimizer.ts      # 優化建議引擎
│   └── reporter.ts       # 報告生成器
├── scripts/
│   ├── install.sh        # 安裝腳本
│   └── uninstall.sh      # 移除腳本
└── README.md             # 使用說明
```

### 核心功能
1. **Context Monitor** — 即時監控 context 使用率
2. **Smart Compaction** — 智能建議 compact 時機
3. **Token Optimizer** — 自動優化建議（摘要長訊息）
4. **Cost Dashboard** — 成本儀表板

## 任務 2：CLI 工具

建立 `contextguard` 命令：

```bash
contextguard status              # 顯示目前狀態
contextguard optimize            # 手動觸發優化建議
contextguard report --daily      # 生成日報告
contextguard report --weekly     # 生成週報告
contextguard config              # 配置優化規則
```

## 任務 3：配置文件

`~/.openclaw/contextguard.json`：

```json
{
  "thresholds": {
    "warn": 70,
    "critical": 85,
    "autoCompact": 90
  },
  "reporting": {
    "enabled": true,
    "interval": "hourly",
    "channels": ["telegram"]
  },
  "optimization": {
    "autoSummarize": true,
    "maxMessageLength": 500,
    "compressHistory": true
  }
}
```

## 任務 4：安裝腳本

`install.sh` 功能：
1. 檢查依賴（jq, curl）
2. 安裝 CLI 工具到 `/usr/local/bin/`
3. 建立預設配置
4. 啟用背景監控（cron/systemd）
5. 發送測試通知

## 任務 5：定價策略文件

建立 `PRICING.md`：

| 方案 | 價格 | 功能 |
|------|------|------|
| Free | $0 | 基礎監控 + 日報 |
| Pro | $9/月 | 即時告警 + 自動優化 |
| Enterprise | $49/月 | API + 自定義規則 + 支援 |

## 驗收標準

1. ✅ `contextguard` CLI 命令可用
2. ✅ `contextguard status` 正確顯示 context 使用率
3. ✅ 超過閾值時自動發送優化建議
4. ✅ 日報告生成正確
5. ✅ 安裝腳本一鍵部署無錯誤
6. ✅ 定價策略文件完成

## 下一步（Phase 4）

- 上架 ClawHub
- 建立產品網站
- 寫技術部落格文章
- 收集用戶反饋