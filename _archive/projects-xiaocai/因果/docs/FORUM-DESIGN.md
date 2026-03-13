# 討論區會員投稿 — 設計文件

> 實作日期：2026-02-28  
> 目標：建立會員投稿討論區，讓使用者可以投稿因果案例、留言討論、互相啟發

---

## 投稿福報加分與鐵則

- **真實投稿經審核通過，可獲功德・福報加分**，每位會員如實分享見證皆有福報累積。
- **兩條鐵則（站內已明示）**：
  1. **不可捏造故事** — 虛構內容一經查證將不予採用，且與因果正道相違。
  2. **必須是自己真實的故事** — 本人親身經歷或親見親聞，詳實紀錄，不誇大不杜撰。
- 實作時：審核通過（status = approved）時可對該會員／投稿者給予福報加分（需與功過格或會員系統連動）；捏造或非真實經歷不予採用、不給分。

---

## 一、資料表設計（Supabase）

### 1. `causelaw_users`（會員表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | 自動產生 |
| `email` | text | Email（可選，用於通知） |
| `display_name` | text | 顯示名稱（投稿時顯示） |
| `avatar_url` | text | 頭像 URL（可選） |
| `created_at` | timestamp | 註冊時間 |
| `updated_at` | timestamp | 最後更新 |

**認證方式**：先用簡單的 localStorage + 顯示名稱，之後可接 Supabase Auth。

### 2. `causelaw_posts`（投稿表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | 自動產生 |
| `user_id` | uuid FK | 投稿者 ID（可為 null，匿名投稿） |
| `display_name` | text | 投稿者顯示名稱（若未登入） |
| `title` | text | 故事標題 |
| `content` | text | 故事內容 |
| `category` | text | 分類：`口業之報` / `善行之報` / `貪婪之報` / `偽善之報` / `其他` |
| `status` | text | 狀態：`pending`（待審核）/ `approved`（已通過）/ `rejected`（已拒絕） |
| `view_count` | int | 瀏覽次數（預設 0） |
| `like_count` | int | 按讚數（預設 0） |
| `comment_count` | int | 留言數（預設 0） |
| `created_at` | timestamp | 投稿時間 |
| `updated_at` | timestamp | 最後更新 |

### 3. `causelaw_comments`（留言表）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | 自動產生 |
| `post_id` | uuid FK | 對應投稿 ID |
| `user_id` | uuid FK | 留言者 ID（可為 null，匿名留言） |
| `display_name` | text | 留言者顯示名稱（若未登入） |
| `content` | text | 留言內容 |
| `parent_id` | uuid FK | 父留言 ID（用於回覆，可為 null） |
| `like_count` | int | 按讚數（預設 0） |
| `created_at` | timestamp | 留言時間 |
| `updated_at` | timestamp | 最後更新 |

---

## 二、頁面結構

### 1. `pages/forum.html`（討論區主頁）

- **功能**：
  - 顯示所有已通過審核的投稿列表（最新優先）
  - 分類篩選（口業之報、善行之報等）
  - 搜尋功能（標題、內容）
  - 排序（最新、最熱、最多留言）
  - 「我要投稿」按鈕（連到首頁 #submit 或獨立投稿頁）

- **顯示欄位**：
  - 標題、投稿者、分類、時間、瀏覽數、留言數、按讚數
  - 內容預覽（前 200 字）

### 2. `pages/post.html?id=xxx`（投稿詳情頁）

- **功能**：
  - 顯示完整投稿內容
  - 留言列表（最新優先，支援回覆）
  - 留言表單（需登入或輸入顯示名稱）
  - 按讚功能（localStorage 記錄，避免重複）
  - 分享功能

### 3. 改進首頁投稿表單

- **功能**：
  - 連接 Supabase，真正存到資料庫
  - 可選「登入後投稿」或「匿名投稿」
  - 提交後顯示「已提交，待審核中」

---

## 三、實作階段

### Phase 1：基礎架構（本次實作）

1. ✅ 建立資料表設計文件
2. ⏳ 建立 `pages/forum.html`（討論區主頁，先顯示假資料）
3. ⏳ 建立 `pages/post.html`（投稿詳情頁，先顯示假資料）
4. ⏳ 改進首頁投稿表單（連接 Supabase，存到 `causelaw_posts`）
5. ⏳ 簡單會員系統（localStorage 存顯示名稱，之後可接 Supabase Auth）

### Phase 2：Supabase 整合

1. 在 Supabase 建立上述三張表
2. 前端用 Supabase JS Client 連接
3. 實作 CRUD（投稿、留言、按讚）

### Phase 3：進階功能

1. 審核系統（後台或手動）
2. 通知系統（Email / LINE）
3. 會員專屬功能（我的投稿、我的留言）

---

## 四、技術細節

### Supabase 連接

```javascript
// 需要 Supabase URL 和 anon key
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)
```

### 投稿流程

1. 使用者填寫表單（標題、內容、分類、顯示名稱）
2. 提交到 Supabase `causelaw_posts`，status = `pending`
3. 顯示「已提交，待審核中」
4. 管理員審核後，status 改為 `approved`，才會出現在討論區

### 留言流程

1. 使用者點進投稿詳情頁
2. 填寫留言（內容、顯示名稱）
3. 提交到 Supabase `causelaw_comments`
4. 即時更新留言列表

---

## 五、UI/UX 設計

- **風格**：維持全站黑底 + 金色主題
- **投稿卡片**：類似 `cases.html` 的 `case-folder` 風格
- **留言區**：簡潔列表，支援回覆（縮排顯示）
- **表單**：與現有投稿表單風格一致

---

*文件版本：1.0 | 更新：2026-02-28*
