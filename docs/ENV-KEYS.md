# API Key 與環境變數放哪裡

## 放哪裡？

**全部放在專案根目錄的 `.env` 檔案。**

- 路徑：`openclaw-console-hub-main/.env`（與 `package.json` 同層）
- 前端（Vite）與後端（server）都會讀這同一份 `.env`
- 若沒有 `.env`，可複製範本：`cp .env.example .env`，再改裡面的值

**重要：** `.env` 已在 `.gitignore`，不要提交到版控，也不要將真實 key 寫進 `.env.example`。

---

## 常用變數速查

| 變數 | 誰用 | 說明 |
|------|------|------|
| `VITE_API_BASE_URL` | 前端 | 後端 API 網址，例如 `http://localhost:3011` 或正式站網址 |
| `VITE_OPENCLAW_API_KEY` | 前端 | 與後端 `OPENCLAW_API_KEY` 一致，前端打 API 時帶在 Header |
| `OPENCLAW_API_KEY` | 後端 | 後端驗證用，正式環境務必改成強密鑰 |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 後端 | Supabase 專案連線與金鑰 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | 後端 | 任務通知發到 Telegram 用 |
| `N8N_API_URL` / `N8N_API_KEY` | 後端 | n8n 整合用 |

---

## 本機開發最少要設什麼？

1. **只跑前端、用 mock 資料**  
   可以不建 `.env`，或只設 `VITE_API_BASE_URL=`（留空）。

2. **前端接本機後端**  
   在 `.env` 加上：
   ```env
   VITE_API_BASE_URL=http://localhost:3011
   VITE_OPENCLAW_API_KEY=你的後端OPENCLAW_API_KEY
   ```
   後端同一個檔案裡要有：
   ```env
   OPENCLAW_API_KEY=與上面VITE_OPENCLAW_API_KEY相同的值
   ```

3. **後端要存資料**  
   再補上 Supabase 的 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。

完整清單與註解見根目錄 **`.env.example`**。
