# SOP-3: 系統診斷

## metadata

```yaml
id: sop-03
name: 系統診斷
category: 系統管理
tags: [診斷, self-heal, 健康檢查, docker, API, gateway, 錯誤排查, log]
version: 2.1
created: 2026-02-16
trigger: 主人說「檢查一下」「看一下」「XXX 壞了」「怎麼不動了」
priority: P1
燈號: 🟢 檢查可直接做 / 🔴 修復要等主人批准
```

---

## 目的

快速定位系統問題，回報主人讓他決定怎麼修。你是診斷員不是醫生——找出問題，但修復要主人批准。

---

## 診斷流程

### Step 0: 環境偵測與資源監控

**在執行任何診斷指令前，先檢查 Agent 自身狀態：**

1.  **資源佔用**：檢查 Context Token 使用率（若 > 80% 則優先回報請求清理）。
2.  **檔案權限**：確認是否具備目標日誌或目錄的讀取權限。
3.  **敏感資料分級**：預判診斷目標（如 `.env` 或 `secrets`）的資料等級。

### Step 1: 跑自動診斷

```bash
./scripts/self-heal.sh check
```

這會檢查 CR-1 到 CR-8 所有項目。記下輸出。

### Step 2: 服務健康檢查

```bash
# Gateway 狀態
openclaw gateway health

# 任務板 API
curl -s http://localhost:3011/api/health

# Docker 容器
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ollama
curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"models\"])} models loaded')"
```

### Step 3: 日誌檢查（最近 10 分鐘）

```bash
# Gateway 日誌
tail -50 ~/.openclaw/logs/gateway.log 2>/dev/null

# 任務板日誌
tail -50 ~/openclaw任務面版設計/server/logs/*.log 2>/dev/null

# 最近修改的檔案
find ~/.openclaw/workspace -maxdepth 2 -mmin -10 -type f 2>/dev/null
```

### Step 4: 分類問題

把發現的問題分成三類：

- 🟢 **正常** — 服務在跑、沒有異常
- 🟡 **警告** — 有潛在問題但不影響運行
- 🔴 **異常** — 服務掛了或有嚴重問題

### Step 5: 回報與回饋機制

**根據診斷結果，標註對應的燈號與回饋訊息：**

```
🔍 系統診斷報告

📡 環境偵測：{🟢 正常 / 🟡 資源警告 / 🔴 偵測到敏感資料}
📊 資料分級：{🟢 綠色-公開 / 🟡 黃色-敏感 / 🔴 紅色-機密}

self-heal.sh: {通過/有問題}
Gateway: {🟢 正常 / 🔴 停止}
任務板 API: {🟢 正常 / 🔴 無回應}
Docker: {🟢 X 個容器運行中 / 🔴 有容器停止}
Ollama: {🟢 X 個模型 / 🔴 未運行}

問題清單：
1. 🔴 {問題描述} — 建議：{修復方式}
2. 🟡 {問題描述} — 建議：{修復方式}

需要你批准的操作：
- {操作 1}
- {操作 2}
```

---

## 常見問題速查

| 症狀 | 可能原因 | 診斷命令 | 修復（需批准） |
|------|---------|---------|-------------|
| Gateway 沒回應 | 進程掛了 | `openclaw gateway health` | `openclaw gateway restart` 🔴 |
| API 404 | 任務板沒起 | `curl localhost:3011/api/health` | `cd ~/openclaw任務面版設計 && npm run dev` 🔴 |
| Docker 容器停了 | crash 或 OOM | `docker ps -a` | `docker start {name}` 🔴 |
| Ollama 沒回應 | 沒啟動 | `curl localhost:11434/api/tags` | `ollama serve &` 🔴 |
| 達爾卡住 | session 膨脹 | `./scripts/self-heal.sh cr8` | `openclaw gateway restart` 🔴 |
| 任務 running 超過 24h | 卡死 | 任務板查詢 | PATCH status → failed 🟡 |
| 根目錄有垃圾 | 達爾亂放 | `./scripts/self-heal.sh cr2` | 移到 archive 🟡 |

---

## 錯誤處理流程

當診斷工具失敗或發現異常時：

1.  **日誌記錄**：若 `self-heal.sh` 或 `curl` 報錯，將完整的 `stderr` 紀錄。
2.  **自動重試**：網絡類錯誤自動重試 1 次，無效則停止。
3.  **回饋機制**：
    - 若發現 **🔴 紅燈資料**（如日誌中出現 Secret Key），**嚴禁**直接將該片段貼回 Telegram 或任務板。
    - 應回報：「偵測到 🔴 敏感資料在 {路徑}，已對其進行脱敏/遮蔽處理」。
4.  **資源過載**：若診斷導致系統負載過高，子代理應立即暫停並回報達爾。

---

## 禁止行為

- ❌ 不可自行 `docker restart` — 🔴 紅燈
- ❌ 不可自行 `openclaw gateway restart` — 🔴 紅燈
- ❌ 不可刪除 log 檔案
- ❌ 不可修改設定檔來「修復」問題
- ❌ 不可連續診斷超過 10 次工具呼叫不回報
