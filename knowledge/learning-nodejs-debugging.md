# Node.js 除錯
> 學習日期：2026-03-02
> 對應 GROWTH.md #7
> 讀的檔案：server/src/telegram/bot-polling.ts, server/src/index.ts

## 除錯 SOP：4 步定位法

### 1. 看 Log → 定層級

```
前端 (React)  →  API (Express)  →  DB (Supabase)  →  外部服務 (Telegram/Gemini)
```

問自己：錯誤發生在哪一層？

| 線索 | 層級 |
|------|------|
| 瀏覽器 console 紅字 | 前端 |
| HTTP 4xx/5xx | API |
| Supabase error / relation not found | DB |
| 403 / 429 / timeout | 外部服務 |

### 2. 讀 Stack Trace

```
Error: Cannot read property 'status' of undefined
    at mapToBoard (/server/dist/openclawMapper.js:15:23)    ← 出錯的位置
    at Array.map (<anonymous>)
    at /server/dist/routes/openclaw-tasks.js:42:35           ← 呼叫的地方
```

**關鍵：從上往下讀，第一行是錯誤，第二行是出錯位置。**

常見錯誤類型：
- `TypeError: Cannot read property X of undefined` → 某個變數是 undefined，檢查資料源
- `SyntaxError: Unexpected token` → JSON 解析失敗，資料格式不對
- `ECONNREFUSED` → 目標服務沒啟動（port 沒開）
- `EADDRINUSE` → port 被佔了，用 `lsof -i :3011` 找誰佔的

### 3. 重現問題

```bash
# 健康檢查
curl -s http://localhost:3011/api/health

# 看 server log
tail -n 50 /tmp/openclaw-server.log

# 看誰在用 port
lsof -i :3011 -sTCP:LISTEN

# 看進程
ps aux | grep node
```

### 4. 提修法

格式：
```
問題：[一句話描述]
根因：[哪一層、哪個檔案、哪一行]
修法：[具體改什麼]
驗證：[怎麼確認修好了]
```

## 真實案例：端口衝突

```
問題：達爾的 create_task API 一直回 404
根因：兩個 Node 進程同時聽 port 3011
  - PID 56466: OpenClaw server (IPv4)
  - PID 86625: NEUXAclaw server (IPv6)
  IPv6 的搶走了部分請求
修法：kill 86625，把 NEUXAclaw 改到 port 4000
驗證：curl POST /api/openclaw/tasks 成功建立任務
```

## 真實案例：in_progress 狀態

```
問題：任務卡在 in_progress 狀態
根因：不是 bug。系統有兩套狀態映射：
  - Supabase 層：running
  - OpenClaw API 層：in_progress
  openclawMapper.ts 自動轉換
修法：不需要修。把卡住的任務用 update_task 改回 ready
驗證：任務重新被 auto-executor 撿起來執行
```

## bot-polling.ts 的錯誤處理模式

```typescript
// 從 bot-polling.ts 學到的：try-catch + 降級
try {
  const result = await callGeminiAPI(prompt);
  return result;
} catch (error: any) {
  // 1. 記 log（帶 context）
  log.error({ error, chatId, model }, '[Bot] API call failed');

  // 2. 降級：主模型失敗就換備用
  if (error.status === 429) {
    return await callFallbackModel(prompt);
  }

  // 3. 通知使用者
  await sendTelegramMessage('系統忙碌中，請稍後再試');
}
```

## 還不懂的
- 記憶體洩漏排查（需要學 `--inspect` 和 Chrome DevTools）
- 怎麼用 pino 的 correlation ID 追蹤跨請求的問題


### 任務狀態映射修正
Supabase 資料庫 status 欄位儲存的是 'in_progress'，而 API 或 WAKE_STATUS.md 為了可讀性會顯示為 'running'
