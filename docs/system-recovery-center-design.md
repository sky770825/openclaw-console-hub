# 系統恢復中心 (System Recovery Center) 設計文件

> 版本：v1.0 | 日期：2026-02-13

---

## 1. 系統架構

```
┌─────────────────────────────────────────────────────┐
│                  系統恢復中心                          │
├─────────────┬─────────────┬─────────────────────────┤
│  自動備份層  │  健康檢查層  │       恢復引擎           │
│             │             │                         │
│ cron 定時   │ 系統狀態偵測 │  Level 1: AI 對話恢復    │
│ 增量備份    │ 異常告警     │  Level 2: Telegram 按鈕  │
│ 基線標記    │ 恢復建議     │  Level 3: 獨立 bash 腳本 │
└──────┬──────┴──────┬──────┴────────────┬────────────┘
       │             │                   │
       ▼             ▼                   ▼
┌──────────┐  ┌───────────┐  ┌─────────────────────┐
│ 備份儲存  │  │unified-   │  │ recovery.sh (獨立)   │
│ ~/.openclaw│  │monitor    │  │ 零依賴、可離線運作    │
│ /backups  │  │整合       │  │                     │
└──────────┘  └───────────┘  └─────────────────────┘
```

---

## 2. 備份機制設計

### 2.1 備份範圍

| 類別 | 路徑 | 重要性 | 說明 |
|------|------|--------|------|
| 核心設定 | `~/.openclaw/config/` | ⚡ 最高 | API keys、telegram 設定 |
| 系統設定 | `~/.openclaw/openclaw.json` | ⚡ 最高 | 主設定檔 |
| 記憶 | `~/.openclaw/memory/` | 🔴 高 | AI 記憶庫 |
| 腳本 | `workspace/scripts/` | 🔴 高 | 自動化腳本 |
| Skills | `~/.openclaw/extensions/` | 🟡 中 | 技能套件 |
| 工作文件 | `workspace/AGENTS.md`, `MEMORY.md`, `TOOLS.md` 等 | 🟡 中 | 工作指南 |
| Cron | `~/.openclaw/cron/` | 🟡 中 | 排程任務 |
| Automation | `~/.openclaw/automation/` | 🟡 中 | 自動化設定 |
| Identity | `~/.openclaw/identity/` | 🟡 中 | 身份設定 |

### 2.2 備份策略

```
頻率：
  - 每 6 小時：增量備份（只備份變更檔案）
  - 每日 03:00：完整備份
  - 手動：基線標記（baseline snapshot）

保留策略：
  - 增量備份：保留 7 天
  - 每日備份：保留 30 天
  - 基線標記：永久保留（手動清理）

儲存位置：~/.openclaw/backups/
  ├── incremental/    # 增量備份
  │   └── 2026-02-13_16-00/
  ├── daily/          # 每日完整備份
  │   └── 2026-02-13/
  └── baselines/      # 基線快照
      └── v1.0-stable/
```

### 2.3 備份格式

每次備份產生一個 tar.gz + manifest.json：

```json
{
  "type": "daily",
  "timestamp": "2026-02-13T03:00:00+08:00",
  "openclaw_version": "x.y.z",
  "files_count": 42,
  "size_bytes": 1234567,
  "checksum": "sha256:abc...",
  "label": "",
  "notes": ""
}
```

---

## 3. 基線標記機制

基線 = 「這個狀態是好的，出問題回到這裡」

```bash
# 標記基線
recovery.sh baseline create "v1.0-stable" "首次穩定版本"

# 列出基線
recovery.sh baseline list

# 恢復到基線
recovery.sh restore baseline v1.0-stable
```

基線儲存在 `~/.openclaw/backups/baselines/<name>/`，包含完整備份 + manifest。

---

## 4. 恢復流程設計（三種場景）

### 場景 A：輕度問題 — OpenClaw 正常運作

**症狀**：config 搞壞、記憶異常、腳本出錯，但 OpenClaw 可回應

**恢復方式**：透過 Telegram 對話

```
用戶：「恢復 config 到昨天的版本」
AI：找到昨日備份 2026-02-12，包含 config/ 目錄
    [恢復 config] [恢復全部] [取消]
用戶：[恢復 config]
AI：✅ config 已恢復到 2026-02-12 03:00 版本，OpenClaw 重啟中...
```

### 場景 B：中度問題 — OpenClaw 啟動但不穩定

**症狀**：反覆崩潰、某些功能壞掉

**恢復方式**：Telegram inline buttons + 背景腳本

```
[系統恢復中心]
├── [🔍 健康檢查]
├── [📋 列出備份]
├── [⏪ 恢復到昨天]
├── [🏷️ 恢復到基線]
├── [⚙️ 僅恢復 Config]
└── [🔄 重啟 OpenClaw]
```

OpenClaw 呼叫 `recovery.sh` 執行實際恢復，然後自我重啟。

### 場景 C：重度問題 — OpenClaw 完全無法啟動

**症狀**：啟動報錯、掛死、完全無回應

**恢復方式**：直接在終端機執行獨立腳本

```bash
# 互動式恢復（選單）
~/.openclaw/backups/recovery.sh

# 快速恢復到最近的每日備份
~/.openclaw/backups/recovery.sh restore latest

# 恢復到指定基線
~/.openclaw/backups/recovery.sh restore baseline v1.0-stable

# 僅恢復 config
~/.openclaw/backups/recovery.sh restore latest --only config

# 健康檢查（診斷問題）
~/.openclaw/backups/recovery.sh check
```

互動式選單：

```
╔══════════════════════════════════════╗
║     🔧 OpenClaw 系統恢復中心        ║
╠══════════════════════════════════════╣
║  1. 健康檢查（診斷問題）             ║
║  2. 恢復到最近備份                   ║
║  3. 恢復到指定日期                   ║
║  4. 恢復到基線快照                   ║
║  5. 僅恢復 Config                    ║
║  6. 僅恢復 Scripts                   ║
║  7. 僅恢復 Memory                    ║
║  8. 查看備份列表                     ║
║  9. 重啟 OpenClaw                    ║
║  0. 離開                             ║
╚══════════════════════════════════════╝
```

---

## 5. 健康檢查設計

`recovery.sh check` 執行以下檢查：

| 檢查項目 | 方法 | 異常處理建議 |
|----------|------|-------------|
| openclaw.json 存在且有效 | `jq . < openclaw.json` | 從備份恢復 |
| config/ API keys 存在 | 檢查 .env 檔案非空 | 從備份恢復 |
| Node.js 可用 | `node --version` | 提示安裝 |
| OpenClaw 可啟動 | `openclaw gateway status` | 查看 logs |
| 磁碟空間 | `df -h` | 清理舊備份 |
| 備份完整性 | 驗證最新備份 checksum | 使用更早備份 |
| memory/ 目錄正常 | 檔案數量 & 大小 | 從備份恢復 |
| cron 任務正常 | 比對已知 cron 列表 | 從備份恢復 |

輸出範例：
```
🔍 OpenClaw 健康檢查
──────────────────────
✅ openclaw.json        正常
✅ config/              正常 (7 個設定檔)
✅ Node.js              v25.5.0
⚠️  OpenClaw Gateway    未運行
✅ 磁碟空間             剩餘 45GB
✅ 最新備份             2026-02-13 03:00 (10小時前)
✅ memory/              正常 (23 個檔案)
❌ cron/                缺少 3 個排程

建議：執行 `openclaw gateway start` 然後恢復 cron
```

---

## 6. 檔案結構

```
~/.openclaw/backups/
├── recovery.sh              # 獨立恢復腳本（零依賴）
├── backup.sh                # 備份執行腳本（cron 呼叫）
├── manifest-latest.json     # 最新備份 manifest
├── incremental/
│   ├── 2026-02-13_16-00/
│   │   ├── backup.tar.gz
│   │   └── manifest.json
│   └── ...
├── daily/
│   ├── 2026-02-13/
│   │   ├── backup.tar.gz
│   │   └── manifest.json
│   └── ...
└── baselines/
    └── v1.0-stable/
        ├── backup.tar.gz
        └── manifest.json

~/.openclaw/workspace/scripts/
├── recovery-backup.sh       # 備份 wrapper（給 cron 用）
└── recovery-health.sh       # 健康檢查（給 unified-monitor 整合）
```

---

## 7. 與現有監控整合

### unified-monitor 整合

在 `unified-monitor.sh` 加入恢復中心健康檢查：

```bash
# 在監控迴圈中加入
check_recovery_health() {
  local last_backup=$(cat ~/.openclaw/backups/manifest-latest.json 2>/dev/null | jq -r '.timestamp')
  local age_hours=$(( ($(date +%s) - $(date -d "$last_backup" +%s)) / 3600 ))
  if [ "$age_hours" -gt 24 ]; then
    alert "WARNING" "最近備份已超過 24 小時"
  fi
}
```

### dashboard-monitor 整合

在 dashboard 加入備份狀態面板：
- 最新備份時間
- 備份大小趨勢
- 基線列表
- 一鍵恢復按鈕

---

## 8. Telegram 選單設計

### 主選單觸發

用戶發送 `/recovery` 或「系統恢復」觸發：

```
🔧 系統恢復中心

最近備份：2026-02-13 03:00 ✅
系統狀態：正常運行中

[🔍 健康檢查]  [📋 備份列表]
[⏪ 快速恢復]  [🏷️ 基線恢復]
[📸 建立基線]  [🔄 重啟系統]
```

### 快速恢復子選單

```
⏪ 恢復到哪個時間點？

[今天 03:00]  [昨天 03:00]
[2天前]       [3天前]

恢復範圍：
[全部恢復]  [僅 Config]  [僅 Scripts]  [僅 Memory]
```

### 確認對話

```
⚠️ 確認恢復操作

將恢復到：2026-02-12 03:00
範圍：全部（config + memory + scripts + cron）
目前設定將備份到：pre-restore-2026-02-13/

[✅ 確認恢復]  [❌ 取消]
```

---

## 9. 實作步驟

### Phase 1：核心腳本（Day 1）

1. **`backup.sh`** — 備份執行腳本
   - tar.gz 打包指定目錄
   - 產生 manifest.json
   - 增量模式（用 `find -newer` 偵測變更）
   - 清理過期備份

2. **`recovery.sh`** — 獨立恢復腳本
   - 零外部依賴（純 bash + tar + jq）
   - 互動式選單
   - 恢復前自動備份當前狀態（pre-restore snapshot）
   - 支援 `--only` 粒度恢復

### Phase 2：自動化（Day 2）

3. 設定 cron 排程
   - `0 */6 * * * ~/.openclaw/backups/backup.sh incremental`
   - `0 3 * * * ~/.openclaw/backups/backup.sh daily`

4. **`recovery-health.sh`** — 健康檢查腳本
   - 整合到 unified-monitor

### Phase 3：Telegram 整合（Day 3）

5. 建立 Telegram inline button 處理
   - 透過 OpenClaw skill 或 automation 觸發
   - 呼叫 recovery.sh 子命令

### Phase 4：完善（Day 4+）

6. 基線管理完善
7. Dashboard 面板整合
8. 文件 & 測試

---

## 10. recovery.sh 核心邏輯（偽碼）

```bash
#!/bin/bash
# OpenClaw System Recovery Center
# 獨立運作，零依賴（僅需 bash, tar, jq, date）

OPENCLAW_HOME="$HOME/.openclaw"
BACKUP_DIR="$OPENCLAW_HOME/backups"
WORKSPACE="$OPENCLAW_HOME/workspace"

# 備份目標定義
BACKUP_TARGETS=(
  "config:$OPENCLAW_HOME/config"
  "main-config:$OPENCLAW_HOME/openclaw.json"
  "memory:$OPENCLAW_HOME/memory"
  "scripts:$WORKSPACE/scripts"
  "extensions:$OPENCLAW_HOME/extensions"
  "cron:$OPENCLAW_HOME/cron"
  "automation:$OPENCLAW_HOME/automation"
  "identity:$OPENCLAW_HOME/identity"
  "workspace-docs:$WORKSPACE/AGENTS.md $WORKSPACE/MEMORY.md $WORKSPACE/TOOLS.md"
)

do_backup() {  # type: incremental|daily|baseline
  local type="$1" label="$2"
  local dest="$BACKUP_DIR/$type/${label:-$(date +%Y-%m-%d_%H-%M)}"
  mkdir -p "$dest"
  
  # 打包所有目標
  tar czf "$dest/backup.tar.gz" \
    "$OPENCLAW_HOME/config" \
    "$OPENCLAW_HOME/openclaw.json" \
    "$OPENCLAW_HOME/memory" \
    "$WORKSPACE/scripts" \
    "$OPENCLAW_HOME/extensions" \
    "$OPENCLAW_HOME/cron" \
    "$OPENCLAW_HOME/automation" \
    "$OPENCLAW_HOME/identity" \
    "$WORKSPACE/AGENTS.md" "$WORKSPACE/MEMORY.md" "$WORKSPACE/TOOLS.md" \
    2>/dev/null
  
  # 產生 manifest
  local checksum=$(shasum -a 256 "$dest/backup.tar.gz" | cut -d' ' -f1)
  cat > "$dest/manifest.json" <<EOF
{
  "type": "$type",
  "timestamp": "$(date -Iseconds)",
  "label": "$label",
  "checksum": "sha256:$checksum",
  "size_bytes": $(stat -f%z "$dest/backup.tar.gz" 2>/dev/null || stat -c%s "$dest/backup.tar.gz")
}
EOF
  cp "$dest/manifest.json" "$BACKUP_DIR/manifest-latest.json"
}

do_restore() {  # backup_path, [--only component]
  local src="$1" only="$2"
  
  # 恢復前先備份當前狀態
  do_backup "incremental" "pre-restore-$(date +%Y%m%d-%H%M%S)"
  
  if [ -n "$only" ]; then
    # 粒度恢復：只解壓指定路徑
    tar xzf "$src/backup.tar.gz" -C / --include="*/$only/*"
  else
    tar xzf "$src/backup.tar.gz" -C /
  fi
  
  echo "✅ 恢復完成"
}

do_check() {
  # 逐項健康檢查...
}

# 主入口
case "${1:-menu}" in
  backup)    do_backup "${2:-daily}" "$3" ;;
  restore)   do_restore "$2" "$3" ;;
  baseline)  # create/list/delete ;;
  check)     do_check ;;
  menu)      interactive_menu ;;
esac
```

---

## 11. 安全考量

1. **恢復前必定備份**：任何 restore 操作前，自動建立 pre-restore snapshot
2. **Config 含敏感資訊**：備份檔案權限設為 `600`
3. **不備份 logs/**：避免佔用空間，logs 可再生
4. **Checksum 驗證**：恢復時驗證 tar.gz 完整性
5. **乾運行模式**：`recovery.sh restore --dry-run` 預覽要恢復的內容

---

## 12. 總結

| 項目 | 設計 |
|------|------|
| 備份頻率 | 每 6 小時增量 + 每日完整 |
| 保留期 | 增量 7 天、每日 30 天、基線永久 |
| 恢復粒度 | 全部 / config / scripts / memory / cron |
| 輕度恢復 | Telegram 對話 + inline buttons |
| 重度恢復 | `~/.openclaw/backups/recovery.sh` 獨立執行 |
| Token 成本 | 核心腳本全 bash，零 token |
| 健康檢查 | 整合 unified-monitor，異常自動告警 |
