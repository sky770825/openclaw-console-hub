# SQL / Supabase 基礎
> 學習日期：2026-03-02
> 讀的檔案：/Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts

## 我學到什麼
1.  系統是透過 @supabase/supabase-js 的 createClient 函數來建立與資料庫的連線。
2.  所有的連線金鑰（URL、Anon Key、Service Role Key）都是從環境變數讀取，而不是寫死在程式碼裡，這是為了安全。
3.  系統建立了兩種不同權限的 client：一個是 supabase（使用 anon key，會遵守 RLS 規則），另一個是 supabaseServiceRole（使用 service role key，擁有管理員權限，可以繞過 RLS）。
4.  連線時設定 auth: { persistSession: false }，這對後端服務很重要，因為伺服器不需要像瀏覽器那樣保存使用者會話。
5.  檔案裡用大量的 TypeScript interface 來定義每個資料表的結構（如 OpenClawTask），這讓整個專案在存取資料時有型別檢查，更安全可靠。

## 程式碼範例

建立管理員權限的 client：
``typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseServiceRole = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
  auth: {
    persistSession: false,
  },
});
`

任務表的 TypeScript 型別定義：
`typescript
export interface OpenClawTask {
  id?: string;
  name: string;
  status: string;
  priority?: number;
  owner?: string;
  description?: string;
  // ...以及其他欄位
}
`

## 還不懂的
-   這個檔案只定義了連線，但 RLS (Row Level Security) 的具體規則是在哪裡設定的？
-   OpenClawTask 的介面裡，為什麼同時有 name 和 title，description 和 thought` 這些看起來重複的欄位？它們之間有什麼轉換關係或歷史因素嗎？
