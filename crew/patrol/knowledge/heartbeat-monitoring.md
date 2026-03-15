# Heartbeat 主動巡檢擴展

> 學習自外部系統「小墨」的 Heartbeat 巡檢機制
> 從純系統巡檢擴展至業務面巡檢

## 巡檢維度

### 系統面（現有）
```
[ ] 6 項服務健康（Gateway/Taskboard/Ollama/n8n/SearXNG/Dashboard）
[ ] 磁碟空間 < 85%
[ ] Error log 無暴增
[ ] LaunchAgent 全數運行
[ ] 代理 inbox 無積壓（> 10 項觸發警告）
```

### 業務面（新增）
```
[ ] 達爾互動日誌今日是否有紀錄（無紀錄 = 達爾可能離線）
[ ] 知識庫最後更新時間（> 7 天未更新 = 提醒維護）
[ ] 代理記憶檔大小（MEMORY.md > 500 行 = 提醒整理）
[ ] 共享任務數量（active-tasks > 5 項 = 提醒清理）
[ ] 品牌資訊檔是否存在且非空（brand-facts.json）
```

### 流程面（新增）
```
[ ] delivery-pipeline.md 是否可讀
[ ] PLAYBOOK.md 版本是否為最新
[ ] DELIVERY-FORMAT.md 是否存在
[ ] 各代理 RULES.md 是否存在
```

## 巡檢頻率

| 維度 | 頻率 | 觸發方式 |
|------|------|---------|
| 系統面 | 每 4 小時 | agent-scheduled-tasks.sh |
| 業務面 | 每日 08:00 | 早報 + agent-scheduled-tasks.sh |
| 流程面 | 每週一 08:00 | 可加入 weekly-check |

## 異常通報格式

```markdown
## 巡檢異常通報
- 時間：{YYYY-MM-DD HH:MM}
- 維度：系統 / 業務 / 流程
- 嚴重度：P0 / P1 / P2

### 異常項目
1. {項目名}：{現狀} → {預期值}

### 建議處理
- {具體動作}
- 建議由 {代理名} 處理
```

## 靜默原則

- 一切正常 → 不發通知（靜默成功）
- 發現異常 → 立即通報（大聲失敗）
- 巡查報告寫入 `patrol/inbox/` 供日後查閱
