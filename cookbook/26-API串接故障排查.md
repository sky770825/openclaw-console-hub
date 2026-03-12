# 26 — API 串接故障排查 SOP

> 打 API 失敗了。按這個順序排查。

---

## 通用排查流程

### Step 1：確認錯誤類型

```
{"action":"run_script","command":"curl -sv https://api.xxx.com/endpoint 2>&1 | head -30"}
```

| HTTP 狀態碼 | 意思 | 常見原因 |
|------------|------|---------|
| 400 | 請求格式錯 | JSON 格式不對、缺少必要欄位 |
| 401 | 未授權 | API Key 錯、過期、沒帶 |
| 403 | 禁止 | Key 沒權限、IP 被擋、CORS |
| 404 | 不存在 | URL 路徑錯、資源被刪 |
| 429 | 太頻繁 | 超過 rate limit，等一下再試 |
| 500 | 伺服器錯 | 對方的問題，不是你的 |
| 502/503 | 服務不可用 | 對方掛了或維護中 |
| timeout | 連線逾時 | 網路問題或對方太慢 |

### Step 2：針對性排查

**401/403 — 認證問題：**
1. 確認 Key 是否正確（不要直接 echo key，用 `echo ${#VAR}` 看長度）
2. 確認 Header 格式：`Authorization: Bearer xxx` vs `x-api-key: xxx` vs `?key=xxx`
3. 確認 Key 有沒有過期（很多 token 有時效）
4. 確認帳號有沒有開通該 API 的權限

**429 — Rate limit：**
1. 看 response header 的 `Retry-After` 或 `X-RateLimit-*`
2. 等待指定時間後重試
3. 如果是持續性的，降低請求頻率

**CORS 問題（前端才會遇到）：**
- 前端直接打第三方 API → 被 CORS 擋
- 解法：透過後端 proxy 轉發（Server 不受 CORS 限制）

### Step 3：測試連通性

```
# 最基本的連通測試
{"action":"run_script","command":"curl -s -o /dev/null -w '%{http_code} %{time_total}s' https://api.xxx.com/health"}

# 看完整 response header
{"action":"run_script","command":"curl -sI https://api.xxx.com/endpoint"}

# DNS 解析測試
{"action":"run_script","command":"nslookup api.xxx.com"}
```

---

## 常見 API 的除錯方式

### Supabase API
```
# 測試連線
curl -s 'https://xxx.supabase.co/rest/v1/' \
  -H 'apikey: <key>' \
  -H 'Authorization: Bearer <key>'

# 常見錯誤：
# 401 → key 錯
# 404 → 表名錯
# 空陣列 → 條件太嚴或真的沒資料
```

### Telegram Bot API
```
# 測試 bot token
curl -s 'https://api.telegram.org/bot<token>/getMe'

# 常見錯誤：
# 401 → token 錯
# 409 → 有其他 instance 在 polling（衝突）
```

### n8n API
```
# 測試連線
curl -s http://localhost:5678/api/v1/workflows \
  -H 'X-N8N-API-KEY: <key>'

# 常見錯誤：
# connection refused → n8n 沒啟動
# 401 → API key 錯
```

### Gemini API
```
# 透過 proxy_fetch（不需要知道 key）
{"action":"proxy_fetch","url":"https://generativelanguage.googleapis.com/v1beta/models","method":"GET"}

# 429 → 配額用完，等 24 小時或切 Kimi
```

---

## 修不了的時候

1. 確認是不是對方的問題（查 status page）
2. 如果是 key/權限問題 → 告訴老蔡，讓他處理
3. 如果是 rate limit → 等待，或切換備援
4. 如果是網路問題 → 確認本機網路正常（`curl google.com`）

---

**記住：先看錯誤碼，再針對性排查。不要盲目重試。**
