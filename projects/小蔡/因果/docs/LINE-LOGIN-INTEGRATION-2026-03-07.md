# LINE Login 接入方案（2026-03-07）

## 結論

- 這個專案目前不能直接用 LINE 註冊 / 登入。
- `Supabase Auth` 官方 Social providers 目前沒有 `LINE`。
- `LINE Login` 本身是標準 `OAuth 2.0 + OpenID Connect`，所以技術上可接，但要加一層身份橋接。

## 為什麼不能直接接

目前站上的會員系統是直接吃 `Supabase Auth` session：

- 前端用 `supabase.auth.signInWithPassword()`、`signUp()`、`signInWithOtp()`、`signInWithOAuth()`。
- 資料表與 RLS 依賴 `auth.uid()`。
- `members.id`、`posts.user_id`、`comments.user_id`、`tasks.member_id` 都綁 Supabase member UUID。

目前 repo 只實作：

- Email + 密碼
- Email magic link
- Google OAuth

對應檔案：

- [causelaw-client.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-client.js)
- [causelaw-ui.js](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/causelaw-ui.js)
- [pages/admin.html](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/pages/admin.html)

## 官方限制

截至 2026-03-07：

- `Supabase Auth` 的 Social Auth 清單不含 `LINE`
- `Supabase` 接受第三方 JWT 時，JWT 需要有 `role` claim 才會套用 `authenticated` Postgres role
- `LINE Login` 的 ID token 是 OpenID Connect token，官方文件列出的標準欄位有 `iss`、`sub`、`aud`、`exp`、`iat`、`nonce`、`name`、`picture`、`email`，沒有 `role`

這代表：

- 不能把 `LINE` token 直接拿來當這個站的 Supabase Data API token
- 否則多數 RLS 會落到 `anon`，站上互動功能會失效

## 建議架構

建議採用：

`LINE Login -> 自家 callback / Supabase Edge Function -> 自簽 Supabase 可接受 JWT -> 前端以 accessToken 模式存取 Supabase`

### 元件拆分

1. `LINE Login Channel`
   - 申請 LINE Login channel
   - 設定 callback URL
   - 申請 email scope（如果你要用 email 做帳號合併）

2. `Supabase Edge Functions`
   - `line-login-start`
     - 產生 `state` / `nonce`
     - 組 LINE authorize URL
   - `line-login-callback`
     - 驗證 `state`
     - 用 `code` 換 token
     - 驗證 `id_token`
     - 取得 `sub`、`name`、`picture`、`email`
     - 找到或建立站內 member
     - 簽發站內 JWT
     - redirect 回前端

3. 新增身份映射表
   - 建議表名：`causelaw_yinguo_v1.external_identities`
   - 欄位建議：
     - `id`
     - `member_id`
     - `provider` (`line`)
     - `provider_user_id` (`sub`)
     - `provider_email`
     - `provider_payload`
     - `created_at`
     - `updated_at`
   - unique:
     - `(provider, provider_user_id)`
     - `(provider, provider_email)` 可選

4. 前端 token 模式
   - `CauseLawClient` 新增 `external access token` 模式
   - `createClient(..., { accessToken })`
   - 自己管理 `line_session` 的儲存、過期、登出
   - 共用 auth bar 顯示「使用 LINE 登入」

## 為什麼建議自己簽 JWT

因為這個專案的資料存取大量依賴：

- `auth.uid()`
- `authenticated` role
- `members.id = auth.uid()`

如果直接把 LINE ID token 拿去打 Supabase，缺少 `role='authenticated'` 會讓 RLS 行為不對。

這裡的判斷是依官方文件推論，不是 repo 內部限制：

- Supabase 要求第三方 JWT 帶 `role` claim
- LINE 官方列出的 ID token payload 沒有 `role`

所以中間橋接層必須把：

- `sub` 映射成站內 member id
- `role` 固定簽成 `authenticated`

## 不建議的做法

1. 直接把 LINE 當成 `Supabase Social provider`
   - 目前官方沒有原生 `LINE` provider

2. 用假的 Email/密碼帳號包裝 LINE
   - 後續綁定、找回、重複帳號處理都會變髒

3. 前端直接驗 LINE token 後把資料寫進 Supabase
   - 不能安全建立可用 session
   - 也無法正確套 RLS

## 需要你準備的東西

1. LINE Developers
   - `Channel ID`
   - `Channel secret`
   - 是否申請 `email` scope

2. Supabase
   - Edge Functions 可部署
   - 一組專用 JWT signing key
   - 前端 redirect URL 白名單

3. 網站網域
   - 正式網域 callback
   - 本機開發 callback

## 這個 repo 已經補上的東西

- 前端 `CauseLawClient` 已支援外部 JWT session
- 共用會員彈窗已可顯示 `LINE 登入`
- 新增 migration：
  - [20260307120000_line_external_identities.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/supabase/migrations/20260307120000_line_external_identities.sql)
- 新增 Edge Functions：
  - [line-login-start/index.ts](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/supabase/functions/line-login-start/index.ts)
  - [line-login-callback/index.ts](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/supabase/functions/line-login-callback/index.ts)

## 你要填的 env

部署 Edge Functions 前，至少要有：

- `CAUSELAW_LINE_CHANNEL_ID`
- `CAUSELAW_LINE_CHANNEL_SECRET`
- `CAUSELAW_EXTERNAL_JWT_SECRET`
- `CAUSELAW_SITE_URL`

建議另外補：

- `CAUSELAW_ALLOWED_RETURN_ORIGINS`
- `CAUSELAW_LINE_CALLBACK_URL`
- `CAUSELAW_LINE_LOGIN_SCOPE`
- `CAUSELAW_LINE_LOGIN_TTL_SECONDS`
- `CAUSELAW_EXTERNAL_JWT_ISSUER`

範例檔：

- [supabase/functions/.env.example](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/supabase/functions/.env.example)

## callback URL

如果你沿用目前這個 Supabase 專案 `vbejswywswaeyfasnwjq`，預設 callback URL 會是：

`https://vbejswywswaeyfasnwjq.supabase.co/functions/v1/line-login-callback`

把這個填進 LINE Developers 的 Login channel callback URL。

## 建議實作順序

1. 建立 `external_identities` migration
2. 建 `line-login-start` / `line-login-callback`
3. 前端 `CauseLawClient` 加 `accessToken` 模式
4. 共用 auth modal 加 `LINE 登入`
5. 補 browser smoke
6. 補帳號綁定 / 合併規則

## 帳號合併規則建議

第一次 LINE 登入時：

- 若 `provider_user_id` 已存在，直接登入原帳號
- 若不存在但 `email` 與既有會員一致，可要求使用者確認綁定
- 若拿不到 email，直接新建 member，再讓使用者日後補 email

## 這一版先不做的事

- LIFF 版站內深度整合
- LINE 官方帳號訊息推播綁會員
- LINE Pay 或 LINE MINI App

## 下一步

repo 內骨架已經補好，離正式可用還差：

1. 在 Supabase 執行 [2026-03-07-line-external-identities.sql](/Users/caijunchang/.openclaw/workspace/projects/小蔡/因果/docs/sql/2026-03-07-line-external-identities.sql)
2. 為兩個 Edge Functions 設定 env
3. 在 LINE Developers 填入 callback URL
4. 在前端設定檔把 `window.CAUSELAW_LINE_LOGIN_ENABLED = true`
5. 部署 `line-login-start` / `line-login-callback`
