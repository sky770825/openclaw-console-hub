# Auth 設定指南

Dashboard 若對外開放，務必先擋掉未授權存取。本文件說明最小解與進階選項。

---

## 最小解：API Key 擋外網

### 1. 啟用讀取驗證（擋未帶 key 的請求）

```bash
# .env
OPENCLAW_API_KEY=你的強隨機金鑰
OPENCLAW_ENFORCE_WRITE_AUTH=true    # 預設，寫入需 key
OPENCLAW_ENFORCE_READ_AUTH=true     # 設為 true：連 GET 也需 key
```

- `OPENCLAW_ENFORCE_READ_AUTH=false`（預設）：GET 不需 key，Dashboard 對外等於公開讀取
- `OPENCLAW_ENFORCE_READ_AUTH=true`：所有 /api 請求都需帶 key，未帶 key 回 401

### 2. 前端帶 key

```bash
# .env（前端）
VITE_API_BASE_URL=https://your-api.example.com
VITE_OPENCLAW_API_KEY=與後端 OPENCLAW_API_KEY 相同
```

前端會以 `x-api-key` 或 `Authorization: Bearer <key>` 送出。

### 3. 額外防護：反向代理 Basic Auth

在 Nginx / Caddy / Cloudflare Access 加上一層 Basic Auth，雙重保護：

**Nginx**
```nginx
location / {
  auth_basic "Taskboard";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://localhost:3011;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

**Caddy**
```caddy
your-domain.com {
  basicauth / * {
    bcrypt $2a$14$...  # htpasswd 或 caddy hash-password 產生
  }
  reverse_proxy localhost:3011
}
```

**Cloudflare Access**：建立 Access Policy，僅允許特定 email / IdP 存取。

---

## 下一步：Read / Write scope 分離

後端已支援分層金鑰：

| 變數 | 用途 |
|------|------|
| `OPENCLAW_API_KEY` | 全權（讀+寫+等同 admin） |
| `OPENCLAW_READ_KEY` | 僅讀 |
| `OPENCLAW_WRITE_KEY` | 讀+寫 |
| `OPENCLAW_ADMIN_KEY` | 讀+寫+admin（重啟 gateway、trigger webhook 等） |

### UI 依用途選擇 key

| 情境 | 前端 VITE_OPENCLAW_API_KEY |
|------|---------------------------|
| 完整 Dashboard（可新增/編輯/刪除任務） | `OPENCLAW_API_KEY` 或 `OPENCLAW_WRITE_KEY` |
| 唯讀 Dashboard（僅檢視） | `OPENCLAW_READ_KEY` |

```bash
# 後端 .env
OPENCLAW_READ_KEY=read-only-key-xxx
OPENCLAW_WRITE_KEY=write-key-yyy
OPENCLAW_ADMIN_KEY=admin-key-zzz   # 給維運腳本用

# 前端 .env（完整操作）
VITE_OPENCLAW_API_KEY=write-key-yyy

# 或（唯讀）
VITE_OPENCLAW_API_KEY=read-only-key-xxx
```

---

## 建議順序

1. **先擋**：`OPENCLAW_ENFORCE_READ_AUTH=true` + 單一 `OPENCLAW_API_KEY`
2. **再分**：視需要加上 `OPENCLAW_READ_KEY`、`OPENCLAW_WRITE_KEY`，UI 改拿對應 key
3. **進階**：反向代理 Basic Auth 或 Cloudflare Access

---

## 錯誤處理

| 狀態碼 | 說明 |
|--------|------|
| 401 | 未帶 key 或 key 錯誤 |
| 503 | 後端未設定對應層級的 key（如需要 write 但沒設定 WRITE_KEY） |

前端 401 時會提示：請在 .env 設定 `VITE_OPENCLAW_API_KEY`，並與後端金鑰一致。
