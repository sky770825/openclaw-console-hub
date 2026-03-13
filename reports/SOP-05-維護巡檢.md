# SOP-5: Workspace 維護巡檢

## metadata

```yaml
id: sop-05
name: workspace 維護巡檢
category: 系統管理
tags: [巡檢, 清理, 根目錄, 白名單, autoexecutor, archive, 垃圾, CR-2, CR-7]
version: 2.0
created: 2026-02-16
trigger: 每次 /new 開新對話、主人說「幫我看一下」「清一下」
priority: P1
燈號: 🟢 檢查可直接做 / 🟡 移動檔案先說 / 🔴 殺 process 要等批准
```

---

## 目的

保持 workspace 乾淨。偵測未授權的自動化程式、垃圾檔案、異常活動。

---

## 根目錄白名單

### 允許存在的 .md 檔案

```
AGENTS.md, CHANGELOG.md, CLAUDE.md, CONTRIBUTING.md, MEMORY.md, README.md, SECURITY.md
```

**白名單以外的 .md → 移到 archive/**

### 允許存在的目錄

```
archive/, docs/, knowledge/, logs/, projects/, scripts/, sop-知識庫/, xiaocai-指令集/, node_modules/, .git/
```

**白名單以外的目錄 → 回報主人，不要自己移**

---

## 巡檢流程

### Step 1: 根目錄檔案清點

```bash
# 列出根目錄所有 .md
ls *.md 2>/dev/null

# 列出非標準檔案
ls *.json *.xml *.png *.log *.tmp *.bak 2>/dev/null
```

比對白名單。白名單外的 → 記下來。

### Step 2: 未授權自動化偵測（CR-7）

```bash
# 偵測 autoexecutor
ls -la .autoexecutor* .auto-mode-status .clawhub 2>/dev/null

# 偵測 PID 檔案
find . -maxdepth 2 -name "*.pid" 2>/dev/null

# 偵測 daemon/cron 相關
find . -maxdepth 2 -name "*executor*" -o -name "*daemon*" -o -name "*cron*" -o -name "boot.log" 2>/dev/null
```

有 PID 檔 → 讀 PID → 檢查 process：
```bash
cat {pid_file}  # 取得 PID
ps -p {PID} 2>/dev/null  # 確認是否在跑
```

- 在跑 → 🔴 **回報主人，不要自己殺**
- 沒跑 → 🟡 移到 archive

### Step 3: 可疑目錄偵測

```bash
# 檢查是否有非標準目錄
ls -d */ 2>/dev/null
```

非標準目錄（例如 `~/`、`小菜/`、`temp/`）→ 回報主人。

### Step 4: 任務板衛生

```bash
# 查 running 超過 24h 的任務
curl -s http://localhost:3011/api/tasks?status=running
```

- running 超過 24h → PATCH status → failed（🟡 先跟主人說）
- 任務總數 >200 → 回報異常

### Step 5: 最近活動偵測

```bash
find . -maxdepth 2 -mmin -10 -type f 2>/dev/null | head -20
```

- 有檔案被修改 → 列出，判斷是否正常
- 沒有 → agent 已停止活動

### Step 6: 自動健康檢查

```bash
./scripts/self-heal.sh check
```

### Step 7: 清理（如需要）

```bash
# 建立今天的 archive 目錄
mkdir -p archive/cleanup-$(date +%Y%m%d)

# 移動垃圾檔案（🟡 先列出給主人看）
mv {垃圾檔案} archive/cleanup-$(date +%Y%m%d)/
```

---

## 回報格式

```
🧹 巡檢報告

根目錄：{乾淨 / 有 X 個非白名單檔案}
  - {列出非白名單檔案}
未授權自動化：{無 / 發現 X 個}
  - {列出發現的}
可疑目錄：{無 / 發現 X 個}
任務板：{正常 / X 個 running 超時}
最近活動：{有/無} — {列出最近修改的檔案}
self-heal.sh：{全部通過 / X 個問題}

需要清理的：
- {檔案/目錄} → 移到 archive/
需要你決定的：
- {問題描述}
```

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 發現正在跑的未授權 process | 🔴 不要殺，回報 PID 和 process 名稱給主人 |
| archive 目錄不存在 | mkdir -p archive/ |
| 不確定某檔案是不是垃圾 | 列出但不移動，問主人 |
| self-heal.sh 跑不了 | chmod +x 後重試，還不行就手動檢查 |
