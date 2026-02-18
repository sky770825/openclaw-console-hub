# 快速啟動 — 開啟網頁

需同時啟動 **前端** 與 **後端**，網頁才能正常使用。

## 步驟

### 1. 啟動後端（Terminal 1）

```bash
npm run dev:server
```

或使用 build 版本：

```bash
npm run dev:server:prod
```

後端會在 **http://localhost:3060**

### 2. 啟動前端（Terminal 2）

```bash
npm run dev
```

前端會在 **http://localhost:3009**

### 3. 開啟網頁

在瀏覽器前往：

- **首頁**：http://localhost:3009/
- **OpenClaw 任務板**：http://localhost:3009/cursor

---

## 若網頁打不開

| 狀況 | 處理方式 |
|------|----------|
| 白屏或無法連線 | 確認前端有執行 `npm run dev` |
| API 錯誤 | 確認後端有執行 `npm run dev:server` 或 `npm run dev:server:prod` |
| Port 被佔用 | 執行 `lsof -ti:3060 \| xargs kill` 或 `lsof -ti:3009 \| xargs kill` 後重啟 |
