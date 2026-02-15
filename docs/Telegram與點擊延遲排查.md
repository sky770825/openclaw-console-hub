# Telegram 與點擊功能延遲排查

## 一、Telegram ↔ OpenClaw 回應慢

### 流程概述

```
你發訊息 → Telegram → OpenClaw 收到 → LLM 處理 → 呼叫任務板 API → 回覆
                ↑_______________ 最耗時 _______________↑
```

### 可能原因與對策

| 原因 | 說明 | 對策 |
|------|------|------|
| **LLM 推論時間** | OpenClaw 用模型理解意圖，大型模型較慢 | 換較快的模型（如 Gemini Flash、Kimi Turbo） |
| **OPENCLAW_TASKBOARD_URL 指向慢** | 若指向遠端或 VPN 後方，API 延遲高 | 本機用 `http://localhost:3011`；遠端用 HTTPS 且網路穩定 |
| **Skill 說明過長** | OpenClaw 讀很多文字才決定動作 | 精簡 SKILL.md，把「先打 API」寫清楚 |
| **後端 API 慢** | Supabase 查詢或任務處理耗時 | 檢查 Supabase 連線、索引、查詢效能 |

### 檢查清單

1. **OpenClaw 的 openclaw.json**  
   - `OPENCLAW_TASKBOARD_URL` 是否正確（本機：`http://localhost:3011`）  
   - 若 OpenClaw 在另一台機器，需填可連到的網址  

2. **後端是否有在跑**  
   - `cd server && npm run dev`  
   - 確認 `http://localhost:3011` 可連  

3. **用 curl 測 API 速度**  
   ```bash
   time curl -s http://localhost:3011/api/openclaw/tasks
   ```
   - 若 > 1 秒就有問題  

---

## 二、點擊功能很久才跑出來

### 流程概述

```
點擊按鈕 → 前端發 API → 後端處理 → 回傳 → 前端更新 UI
```

### 可能原因與對策

| 原因 | 說明 | 對策 |
|------|------|------|
| **後端 API 慢** | Supabase 查詢、邏輯處理時間長 | 同上，排查後端與 Supabase |
| **網路延遲** | 前後端不在同一台或走遠端 | 本機開發時用 localhost |
| **無樂觀更新** | 等 API 回傳才更新畫面 | 已在「立即執行」做樂觀更新 |
| **第一次載入慢** | 冷啟動、Supabase 連線 | 正常，之後會較快 |

### 檢查清單

1. **開開發者工具 (F12) → Network**  
   - 點擊後看對應 API 請求的 Response Time  
   - 若 > 2–3 秒就偏慢  

2. **確認 VITE_API_BASE_URL**  
   - 本機：`http://localhost:3011`  
   - 不要指到遠端或錯誤 port  

3. **Supabase 連線**  
   - 後端啟動時會印 `[Supabase] 已連線`  
   - 若沒印，查 `.env` 的 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`  

---

## 三、已做的優化

- Telegram 通知：非阻塞、10 秒 timeout  
- /stop 輪詢：1.5 秒間隔、10 秒長輪詢  
- 前端 API：30 秒 timeout、重試 2 次  
- WebSocket：自動重連、指數退避  

---

## 四、快速測速指令

```bash
# 後端 API 速度
time curl -s http://localhost:3011/api/health
time curl -s http://localhost:3011/api/openclaw/tasks

# 若超過 1 秒，檢查後端 log 與 Supabase 連線
```
