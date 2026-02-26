# Rotate Key 驗證清單

## 1) 更新本機 `.env`

- `SUPABASE_SERVICE_ROLE_KEY=<新 key>`
- `SUPABASE_URL` 保持原值

## 2) 更新部署環境

- 後端平台（Zeabur / Railway / Vercel）同步更新 `SUPABASE_SERVICE_ROLE_KEY`
- n8n 若有直接寫 Supabase，也同步更新

## 3) 重啟後端（確保載入新環境變數）

```bash
cd /Users/caijunchang/Downloads/openclaw-console-hub-main/server
set -a; source ../.env; set +a; npm run dev
```

## 4) 健康檢查

```bash
curl http://localhost:3009/api/health
```

預期回應：

```json
{"ok":true,"service":"openclaw-server"}
```

## 5) 寫入測試（確認新 key 可寫入）

```bash
curl -X POST http://localhost:3009/api/openclaw/tasks \
  -H "Content-Type: application/json" \
  -d '{"id":"key_rotate_test_1","title":"key rotate test","cat":"feature","status":"queued","progress":0,"auto":false,"subs":[]}'
```

預期：HTTP `201` 且回傳任務 JSON（不是 `Failed to save task`）

## 6) 刷新驗證

- 前端開 `http://localhost:3010`
- 應可看到 `key_rotate_test_1`
- 按 `F5` 後資料仍存在

## 7) 清理測試資料

```bash
curl -X DELETE http://localhost:3009/api/openclaw/tasks/key_rotate_test_1
```

## 8) 常見失敗排查

- 若 `POST /api/openclaw/tasks` 回 `500 Failed to save task`：
  - 檢查後端進程是否真的載入新 `.env`
  - 重新用第 3 步命令啟動後端
- 若前端 `F5` 後看起來重置：
  - 確認前端在 `3010`、後端在 `3009`
  - 確認 `vite.config.ts` 的 `/api` proxy target 是 `http://localhost:3009`
