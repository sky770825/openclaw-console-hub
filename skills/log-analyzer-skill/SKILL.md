---
name: log-analyzer-skill
description: 智慧日誌分析與監控 Skill，支援多種日誌格式（syslog, JSON, plain text），自動提取關鍵資訊（錯誤、警告、效能指標）並生成分析報告
version: 1.0.0
author: Cursor
metadata:
  openclaw:
    emoji: "📊"
---

# Log Analyzer Skill v1.0 📝📊

智慧日誌分析與監控 Skill，能自動解析各種日誌格式，提取關鍵資訊並生成分析報告。

---

## ✨ 功能特性

| 功能 | 說明 |
|------|------|
| **多格式支援** | Syslog、JSON、Plain Text |
| **智能提取** | 錯誤、警告、效能指標 |
| **趨勢分析** | 時間序列分析、異常檢測 |
| **報告生成** | Markdown、JSON、HTML 格式 |
| **即時監控** | 實時日誌監控與告警 |

---

## 📦 安裝

```bash
cd log-analyzer-skill
npm install
```

---

## 🚀 快速開始

### 1️⃣ 分析單一日誌檔案

```bash
# 分析 syslog 格式
node scripts/analyze.js --file /var/log/system.log --format syslog

# 分析 JSON 格式
node scripts/analyze.js --file app.log --format json

# 分析純文字格式
node scripts/analyze.js --file server.log --format plain
```

### 2️⃣ 即時監控模式

```bash
# 監控日誌並輸出告警
node scripts/monitor.js --file /var/log/app.log --format json --severity error

# 多檔案監控
node scripts/monitor.js --files "logs/*.log" --format syslog
```

### 3️⃣ 生成報告

```bash
# Markdown 報告
node scripts/analyze.js --file app.log --format json --output report.md

# JSON 報告
node scripts/analyze.js --file app.log --format json --output report.json --type json

# HTML 報告
node scripts/analyze.js --file app.log --format json --output report.html --type html
```

---

## 📖 使用說明

### `scripts/analyze.js` - 日誌分析器

**基本用法：**
```bash
node scripts/analyze.js --file <path> --format <format> [options]
```

**參數說明：**

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `--file, -f` | 日誌檔案路徑 | 必填 |
| `--format, -t` | 日誌格式 (syslog/json/plain) | 必填 |
| `--output, -o` | 輸出報告路徑 | console |
| `--type` | 輸出格式 (markdown/json/html) | markdown |
| `--start` | 開始時間 (ISO 格式) | - |
| `--end` | 結束時間 (ISO 格式) | - |
| `--severity` | 過濾嚴重性 (error/warn/info/debug) | all |
| `--limit` | 最大分析行數 | 10000 |

**範例：**
```bash
# 分析最近錯誤
node scripts/analyze.js -f /var/log/syslog -t syslog --severity error

# 分析特定時間範圍
node scripts/analyze.js -f app.log -t json --start 2026-02-01T00:00:00Z --end 2026-02-14T23:59:59Z
```

### `scripts/monitor.js` - 即時監控

**基本用法：**
```bash
node scripts/monitor.js --file <path> --format <format> [options]
```

**參數說明：**

| 參數 | 說明 | 預設值 |
|------|------|--------|
| `--file, -f` | 監控的日誌檔案 | 必填 |
| `--format, -t` | 日誌格式 | 必填 |
| `--severity` | 告警嚴重性門檻 | error |
| `--interval` | 檢查間隔（毫秒） | 1000 |
| `--webhook` | 告警 Webhook URL | - |
| `--pattern` | 自定義匹配模式 | - |

**範例：**
```bash
# 基本監控
node scripts/monitor.js -f /var/log/app.log -t json

# 帶 Webhook 告警
node scripts/monitor.js -f app.log -t json --webhook https://hooks.slack.com/services/XXX

# 自定義告警模式
node scripts/monitor.js -f server.log -t plain --pattern "CRITICAL|FATAL"
```

### `scripts/parse.js` - 日誌解析器（程式化使用）

```javascript
const LogParser = require('./scripts/parse');

const parser = new LogParser('json');
const entries = parser.parseFile('app.log');

// 過濾錯誤
const errors = parser.filterBySeverity(entries, 'error');

// 時間範圍過濾
const recent = parser.filterByTime(entries, '2026-02-01', '2026-02-14');
```

---

## 📊 支援的日誌格式

### Syslog 格式
```
Feb 14 10:30:45 myserver kernel: [12345.678901] Warning: CPU temperature high
Feb 14 10:31:12 myserver nginx: 192.168.1.1 - - [14/Feb/2026:10:31:12 +0800] "GET /api/health HTTP/1.1" 200 23
```

### JSON 格式
```json
{"timestamp":"2026-02-14T10:30:45Z","level":"ERROR","message":"Database connection failed","service":"api-server","metadata":{"retry":3}}
{"timestamp":"2026-02-14T10:31:12Z","level":"INFO","message":"Request processed","duration_ms":45,"service":"api-server"}
```

### Plain Text 格式
```
[2026-02-14 10:30:45] [ERROR] Database connection failed
[2026-02-14 10:31:12] [INFO] Request processed in 45ms
```

---

## 🎯 分析報告內容

### 摘要區塊
- 總日誌行數
- 時間範圍
- 各級別數量統計
- 錯誤率

### 錯誤分析
- Top 10 錯誤類型
- 錯誤時間分佈
- 錯誤來源服務

### 效能指標
- 平均/最大/最小響應時間
- 吞吐量趨勢
- 延遲分佈

### 趨勢圖表（HTML 報告）
- 時間序列圖
- 嚴重性分佈餅圖
- 錯誤趨勢折線圖

---

## 🔧 配置檔案

### `config.json`
```json
{
  "parsers": {
    "syslog": {
      "timestampPattern": "^(\\w{3} \\d{1,2} \\d{2}:\\d{2}:\\d{2})",
      "severityMap": {
        "emerg": "critical",
        "alert": "critical",
        "crit": "critical",
        "err": "error",
        "warning": "warn",
        "notice": "info"
      }
    },
    "json": {
      "timestampField": "timestamp",
      "levelField": "level",
      "messageField": "message"
    }
  },
  "alerts": {
    "errorThreshold": 10,
    "responseTimeThreshold": 1000,
    "webhook": {
      "url": "",
      "headers": {}
    }
  }
}
```

---

## 📁 專案結構

```
log-analyzer-skill/
├── SKILL.md                 # 本文件
├── package.json             # 依賴配置
├── config.json              # 預設配置
├── scripts/
│   ├── analyze.js           # 分析主程式
│   ├── monitor.js           # 監控程式
│   ├── parse.js             # 解析器核心
│   ├── report.js            # 報告生成器
│   └── utils.js             # 工具函數
├── examples/
│   ├── sample-syslog.log    # Syslog 範例
│   ├── sample-json.log      # JSON 範例
│   └── sample-plain.log     # Plain text 範例
└── tests/
    └── test-analyze.js      # 測試程式
```

---

## 🧪 測試

```bash
# 執行測試
npm test

# 使用範例檔案測試
node scripts/analyze.js --file examples/sample-syslog.log --format syslog
node scripts/analyze.js --file examples/sample-json.log --format json
node scripts/analyze.js --file examples/sample-plain.log --format plain
```

---

## 📈 效能考量

| 檔案大小 | 預估分析時間 | 記憶體使用 |
|----------|--------------|------------|
| < 10MB | < 2 秒 | ~50MB |
| 10-100MB | 2-10 秒 | ~200MB |
| 100MB-1GB | 10-60 秒 | ~1GB |
| > 1GB | 建議分段分析 | 需調整 --limit |

---

## 🛡️ 安全性

- ✅ 純讀取操作，不修改原始日誌
- ✅ 支援日誌輪替（log rotation）
- ✅ 無網路傳輸（除非配置 webhook）
- ✅ 敏感資訊可配置遮蔽

---

## 📝 使用範例

### 系統日誌分析
```bash
# 找出系統啟動錯誤
node scripts/analyze.js -f /var/log/syslog -t syslog --severity error --output boot-errors.md
```

### 應用程式效能分析
```bash
# 分析 API 響應時間
node scripts/analyze.js -f app.log -t json --output performance-report.html --type html
```

### 安全稽核
```bash
# 監控登入失敗
node scripts/monitor.js -f /var/log/auth.log -t syslog --pattern "Failed password|Invalid user"
```

---

## 🚧 未來改進

- [ ] 支援更多日誌格式（CSV、XML、NDJSON）
- [ ] 機器學習異常檢測
- [ ] 分散式日誌聚合
- [ ] 即時儀表板（Web UI）
- [ ] Elasticsearch 整合
- [ ] Grafana 告警整合

---

## 📚 參考資料

- [Syslog Protocol RFC 5424](https://tools.ietf.org/html/rfc5424)
- [JSON Lines Format](https://jsonlines.org/)
- [OpenClaw Skills 開發指南](../../docs/SKILL_DEVELOPMENT.md)

---

## 🐛 問題回報

如有問題或建議，請透過以下方式回報：
1. 建立 GitHub Issue
2. 聯繫開發團隊
3. 參考 `examples/` 目錄的範例
