## Supabase RLS 政策產出總結

已根據專案需求，完成 Supabase Row Level Security (RLS) 政策的 SQL 腳本撰寫。

**產出檔案**

*   **檔案路徑:** `/Users/caijunchang/.openclaw/workspace/rls_policies.sql`
*   **內容:** 包含了 `profiles`, `teams`, `projects`, `tasks`, `task_assignees`, `invitations` 等資料表的 `SELECT`, `INSERT`, `UPDATE`, `DELETE` 權限設定。

**後續步驟**

使用者需將此 SQL 腳本的內容複製到 Supabase 專案的 SQL Editor 中執行，以正式啟用這些安全政策。
