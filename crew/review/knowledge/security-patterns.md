# 安全漏洞模式參考 (OWASP Top 10)

## 1. XSS（跨站腳本攻擊）

**檢查重點**: 使用者輸入是否未經清理就輸出到 HTML

```javascript
// ❌ 危險：直接插入未清理的使用者輸入
element.innerHTML = userInput;
res.send(`<h1>${req.query.name}</h1>`);

// ✅ 安全：使用 textContent 或模板引擎自動轉義
element.textContent = userInput;
res.render('page', { name: req.query.name }); // 模板引擎自動轉義
```

**審查清單**:
- [ ] 所有使用者輸入在輸出前經過轉義
- [ ] 不使用 `innerHTML`、`v-html`、`dangerouslySetInnerHTML` 處理使用者資料
- [ ] Content-Security-Policy header 已設置

---

## 2. SQL Injection（SQL 注入）

**檢查重點**: SQL 查詢是否使用字串拼接

```javascript
// ❌ 危險：字串拼接
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ 安全：參數化查詢
const { data } = await supabase.from('users').select('*').eq('id', userId);
// 或 prepared statement
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

**審查清單**:
- [ ] 所有資料庫查詢使用參數化查詢或 ORM
- [ ] 無 SQL 字串拼接（含 template literal）
- [ ] 使用者輸入不直接進入 ORDER BY、LIMIT 等子句

---

## 3. CSRF（跨站請求偽造）

**檢查重點**: 狀態變更請求是否驗證來源

```javascript
// ❌ 危險：無 CSRF token 驗證
app.post('/api/transfer', (req, res) => { /* 直接處理 */ });

// ✅ 安全：驗證 CSRF token 或使用 SameSite cookie
app.use(csrf({ cookie: { sameSite: 'strict' } }));
```

**審查清單**:
- [ ] POST/PUT/DELETE 請求驗證 CSRF token 或 Origin header
- [ ] Cookie 設置 SameSite=Strict 或 Lax
- [ ] API 使用 x-api-key 或 Bearer token 驗證

---

## 4. 認證繞過 (Broken Authentication)

**檢查重點**: 受保護路由是否正確套用中介軟體

```javascript
// ❌ 危險：忘記套用認證中介軟體
app.get('/api/admin/users', adminController.listUsers);

// ✅ 安全：明確套用認證
app.get('/api/admin/users', authMiddleware, requireAdmin, adminController.listUsers);
```

**審查清單**:
- [ ] 所有受保護路由都有認證中介軟體
- [ ] 密碼使用 bcrypt/argon2 雜湊（非 md5/sha1）
- [ ] JWT token 設定合理過期時間
- [ ] 登入嘗試有頻率限制

---

## 5. 敏感資料曝露 (Sensitive Data Exposure)

**檢查重點**: 機密資訊是否意外暴露

```javascript
// ❌ 危險：API key 寫在前端程式碼
const API_KEY = 'sk-proj-abc123...';
fetch('/api/data', { headers: { 'x-api-key': API_KEY } });

// ❌ 危險：錯誤訊息暴露內部結構
res.status(500).json({ error: err.stack, dbQuery: query });

// ✅ 安全：機密放環境變數，錯誤訊息不洩漏細節
const API_KEY = process.env.API_KEY;
res.status(500).json({ error: 'Internal server error' });
```

**審查清單**:
- [ ] `.env` 檔案在 `.gitignore` 中
- [ ] 前端程式碼無硬編碼 API key / 密碼
- [ ] 錯誤回應不暴露 stack trace 或 SQL 查詢
- [ ] 日誌不記錄密碼或 token 全文
- [ ] HTTPS 強制啟用（production）

---

## 6. 不安全的直接物件參考 (IDOR)

**檢查重點**: 使用者能否存取非自己的資料

```javascript
// ❌ 危險：僅靠 URL 參數，未驗證所有權
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.getOrder(req.params.id); // 任何人都能看
});

// ✅ 安全：驗證資源屬於當前使用者
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.getOrder(req.params.id);
  if (order.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
});
```

---

## 快速審查流程

1. **搜尋危險模式**: `innerHTML`, `eval(`, string concatenation in SQL, hardcoded keys
2. **檢查路由保護**: 每個 API endpoint 是否有對應的 auth middleware
3. **檢查輸入驗證**: 使用者輸入是否有型別檢查和長度限制
4. **檢查輸出清理**: 回應是否洩漏內部資訊
5. **檢查依賴安全**: `npm audit` 或 `pip audit` 是否有已知漏洞
