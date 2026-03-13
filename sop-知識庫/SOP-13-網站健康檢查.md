# SOP-13: 網站健康檢查報告

## metadata

```yaml
id: sop-13
name: 網站健康檢查報告
category: 運維
tags: [健康檢查, 網站, API, 前端, 後端, docker, supabase, n8n, 全站檢查]
version: 1.0
created: 2026-02-16
trigger: 要確認整個系統是否正常、部署前後驗證、定期巡檢
priority: P1
燈號: 🟢 全部都是檢查，不修改任何東西
```

---

## 目的

一份完整的清單，快速確認整個 OpenClaw 平台（前端+後端+服務+資料庫+通知）是否正常。

---

## 檢查清單總覽

| # | 項目 | 檢查什麼 | 預期結果 |
|---|------|---------|---------|
| 1 | Docker 容器 | 所有容器都在跑 | 4-5 個 running |
| 2 | 任務板 API | /api/health 回應 | 200 OK |
| 3 | 任務板前端 | localhost:3009 可開 | 頁面載入 |
| 4 | n8n | localhost:5678 回應 | healthz OK |
| 5 | n8n Webhook | POST webhook 有回應 | 200 |
| 6 | Telegram 通知 | 發測試訊息 | 收到 |
| 7 | Supabase 連線 | API 查詢有回應 | 200 + 資料 |
| 8 | Qdrant 向量庫 | collections 可查 | 200 |
| 9 | Ollama | /api/tags 有模型 | 模型列表 |
| 10 | Gateway | health 檢查 | 回應正常 |
| 11 | Git 狀態 | 沒有未提交的關鍵修改 | clean 或已知 |
| 12 | 環境變數 | .env 檔案完整 | 所有 key 存在 |
| 13 | SSL/HTTPS | 外部 URL 可訪問 | 200 |
| 14 | Disk 空間 | 磁碟不滿 | <80% |

---

## 完整檢查腳本

### 1. Docker 容器

```bash
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "❌ Docker not running"
```

**預期：** n8n, postgres, redis, qdrant 都是 Up

### 2. 任務板 API

```bash
echo "=== Taskboard API ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/api/health)
echo "Health: $STATUS"
# 測試任務列表
curl -s http://localhost:3011/api/tasks?limit=1 | python3 -m json.tool | head -5
```

**預期：** 200, 回傳 JSON

### 3. 任務板前端

```bash
echo "=== Frontend ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3009)
echo "Frontend: $STATUS"
```

**預期：** 200

### 4. n8n

```bash
echo "=== n8n ==="
curl -s http://localhost:5678/healthz
echo ""
```

**預期：** OK 或 {"status":"ok"}

### 5. n8n Webhook

```bash
echo "=== n8n Webhook ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5678/webhook/openclaw-memory \
  -H "Content-Type: application/json" \
  -d '{"test": true}')
echo "Webhook: $RESP"
```

**預期：** 200

### 6. Telegram 通知

```bash
echo "=== Telegram ==="
TOKEN=$(grep TELEGRAM_BOT_TOKEN ~/.openclaw/secrets/n8n-telegram.env 2>/dev/null | cut -d= -f2)
if [ -n "$TOKEN" ]; then
  RESP=$(curl -s "https://api.telegram.org/bot${TOKEN}/getMe" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ok','error'))")
  echo "Bot: $RESP"
else
  echo "❌ Token not found"
fi
```

**預期：** True

### 7. Supabase

```bash
echo "=== Supabase ==="
ANON_KEY=$(grep SUPABASE_ANON_KEY ~/openclaw任務面版設計/server/.env 2>/dev/null | cut -d= -f2)
SUPA_URL=$(grep SUPABASE_URL ~/openclaw任務面版設計/server/.env 2>/dev/null | cut -d= -f2)
if [ -n "$ANON_KEY" ] && [ -n "$SUPA_URL" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SUPA_URL}/rest/v1/openclaw_tasks?select=id&limit=1" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}")
  echo "Supabase API: $STATUS"
else
  echo "❌ Supabase config not found"
fi
```

**預期：** 200

### 8. Qdrant

```bash
echo "=== Qdrant ==="
curl -s http://localhost:6333/collections | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Collections: {len(d.get(\"result\",{}).get(\"collections\",[]))}')" 2>/dev/null || echo "❌ Qdrant not responding"
```

**預期：** Collections: N

### 9. Ollama

```bash
echo "=== Ollama ==="
curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Models: {len(d[\"models\"])}')" 2>/dev/null || echo "❌ Ollama not running"
```

**預期：** Models: 5+

### 10. Gateway

```bash
echo "=== Gateway ==="
openclaw gateway health 2>/dev/null || echo "❌ Gateway not responding"
```

### 11. Git 狀態

```bash
echo "=== Git Status ==="
echo "-- workspace --"
cd ~/.openclaw/workspace && git status --short
echo "-- console-hub --"
cd ~/openclaw任務面版設計 && git status --short
```

**預期：** 沒有意外的未提交修改

### 12. 環境變數完整性

```bash
echo "=== Env Files ==="
for f in ~/openclaw任務面版設計/.env ~/openclaw任務面版設計/server/.env ~/.openclaw/.env; do
  if [ -f "$f" ]; then
    KEYS=$(grep -c "=" "$f")
    echo "✅ $f ($KEYS keys)"
  else
    echo "❌ $f MISSING"
  fi
done
```

### 13. 外部 URL（如已部署）

```bash
echo "=== External URLs ==="
# Supabase
curl -s -o /dev/null -w "Supabase: %{http_code}\n" https://vbejswywswaeyfasnwjq.supabase.co
```

### 14. 磁碟空間

```bash
echo "=== Disk ==="
df -h / | tail -1 | awk '{print "Used: "$5, "Available: "$4}'
```

---

## 報告模板

```
🏥 網站健康檢查報告
時間：{YYYY-MM-DD HH:MM}

| # | 項目 | 狀態 | 備註 |
|---|------|------|------|
| 1 | Docker | {🟢/🔴} | {X} 容器運行中 |
| 2 | 任務板 API | {🟢/🔴} | {status code} |
| 3 | 前端 | {🟢/🔴} | localhost:3009 |
| 4 | n8n | {🟢/🔴} | localhost:5678 |
| 5 | Webhook | {🟢/🔴} | {status code} |
| 6 | Telegram | {🟢/🔴} | Bot {active/inactive} |
| 7 | Supabase | {🟢/🔴} | {status code} |
| 8 | Qdrant | {🟢/🔴} | {N} collections |
| 9 | Ollama | {🟢/🔴} | {N} models |
| 10 | Gateway | {🟢/🔴} | {status} |
| 11 | Git | {🟢/🟡} | {clean/有未提交} |
| 12 | 環境變數 | {🟢/🔴} | {X} env files OK |
| 13 | 外部 URL | {🟢/🔴} | {status} |
| 14 | 磁碟 | {🟢/🟡/🔴} | {X}% used |

總結：{X}/14 通過
問題：
- {列出問題}
建議：
- {修復建議}
```

---

## 一鍵檢查腳本

可以用以下方式快速跑完全部檢查：

```bash
~/.openclaw/workspace/scripts/self-heal.sh check
```

或要更完整的（包含外部服務），用本 SOP 的完整腳本逐項跑。

---

## 什麼時候該跑這個檢查

| 時機 | 必要性 |
|------|--------|
| 部署前 | 必要 — 確認環境正常再部署 |
| 部署後 | 必要 — 確認部署沒壞東西 |
| 每天早上 | 建議 — 日常巡檢 |
| 系統異常時 | 必要 — 定位問題 |
| 主人說「檢查一下」 | 必要 |
| 重啟服務後 | 必要 — 確認恢復正常 |

---

## 錯誤處理

| 狀況 | 優先級 | 處理方式 |
|------|--------|----------|
| Docker 容器停止 | P0 | SOP-11 n8n 運維 或 `docker compose up -d` |
| API 無回應 | P0 | 檢查 server 是否在跑，看 log |
| Supabase key 過期 | P1 | 回報主人，去 Dashboard 更新 |
| Telegram 發不出去 | P2 | 檢查 bot token，見 SOP-11 |
| 磁碟 >90% | P1 | 回報主人，docker system prune 需批准 |
| Ollama 沒跑 | P3 | `ollama serve &` |
