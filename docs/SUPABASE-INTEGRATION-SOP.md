# Supabase 功能整合 SOP

> 標準作業流程：如何正確開發與 Supabase 整合的功能
> 建立日期：2026-02-11
> 適用對象：AI Agents、開發人員

---

## ⚠️ 重要原則

**禁止交付半成品！** 任何功能上線前必須完成：
1. ✅ 後端 API 端點實作（寫入 Supabase）
2. ✅ 前端 API 服務層（呼叫後端）
3. ✅ 前端 UI 整合（使用真實 API）
4. ✅ 測試驗證（資料確實存入資料庫）

---

## 📋 開發流程檢查清單

### Step 1: 資料表設計

```sql
-- 1. 在 Supabase 建立資料表
-- 2. 設定 RLS (Row Level Security) 權限
-- 3. 建立必要的索引

-- 範例：reviews 表
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'pending',
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  review_note TEXT,
  number SERIAL
);

-- RLS 權限
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON reviews FOR ALL USING (true);
```

**檢查點：**
- [ ] 資料表已建立
- [ ] RLS 權限已設定
- [ ] 測試資料可正常寫入

---

### Step 2: 後端 API 端點

**檔案位置：** `server/src/index.ts`

```typescript
// 1. 新增 API 路由
app.get('/api/openclaw/reviews', async (_req, res) => {
  try {
    const reviews = await fetchOpenClawReviews();
    res.json(reviews);
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

app.patch('/api/openclaw/reviews/:id', async (req, res) => {
  try {
    const review = await upsertOpenClawReview({ 
      ...req.body, 
      id: req.params.id 
    });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    console.error('Failed to update review:', err);
    res.status(500).json({ message: 'Failed to update review' });
  }
});
```

**檔案位置：** `server/src/openclawSupabase.ts`

```typescript
// 2. 新增 Supabase 操作函數
export async function fetchOpenClawReviews(): Promise<OpenClawReview[]> {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertOpenClawReview(
  review: Partial<OpenClawReview>
): Promise<OpenClawReview | null> {
  if (!hasSupabase) return null;
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

**檢查點：**
- [ ] API 端點可正常回應
- [ ] 資料確實寫入 Supabase
- [ ] 使用 `curl` 或 Postman 測試通過

---

### Step 3: 型別定義

**檔案位置：** `src/types/index.ts`

```typescript
// 新增 TypeScript 型別
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  number: number;
  title: string;
  summary: string;
  filePath: string;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  tags: string[];
}
```

**檢查點：**
- [ ] 型別定義與資料表欄位一致
- [ ] 已 export 供外部使用

---

### Step 4: 前端 API 服務層

**檔案位置：** `src/services/apiClient.ts`

```typescript
// 新增 API 方法
async listReviews(): Promise<Review[]> {
  return request('/api/openclaw/reviews');
},

async updateReview(
  reviewId: string,
  patch: Partial<Review>
): Promise<Review | null> {
  return request(`/api/openclaw/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    body: patch,
  });
},
```

**檔案位置：** `src/services/api.ts`

```typescript
// 匯出 API 函數（含 mock fallback）
export const listReviews = dataConfig.apiBaseUrl
  ? () => apiClient.listReviews()
  : async (): Promise<Review[]> => {
      // Mock 實作...
    };

export const updateReview = dataConfig.apiBaseUrl
  ? (id: string, patch: Partial<Review>) => apiClient.updateReview(id, patch)
  : async (id: string, patch: Partial<Review>): Promise<Review | null> => {
      // Mock 實作...
    };
```

**檢查點：**
- [ ] API 函數可正常呼叫
- [ ] 錯誤處理機制完善
- [ ] Mock fallback 機制正常

---

### Step 5: 前端 UI 整合

**檔案位置：** `src/pages/ReviewCenter.tsx`

```typescript
import { useState, useEffect } from 'react';
import { listReviews, updateReview } from '@/services/api';
import type { Review } from '@/types';

export default function ReviewCenter() {
  const [ideas, setIdeas] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // 載入資料
  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const data = await listReviews(); // ✅ 使用真實 API
      setIdeas(data);
    } catch (err) {
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  // 更新狀態
  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    const updated = await updateReview(id, { status }); // ✅ 使用真實 API
    if (updated) {
      setIdeas(prev => prev.map(i => i.id === id ? updated : i));
    }
  };
}
```

**檢查點：**
- [ ] 使用 `useEffect` 載入資料
- [ ] 顯示 loading 狀態
- [ ] 錯誤時顯示 toast 通知
- [ ] 更新後立即反映到 UI

---

### Step 6: 測試驗證

```bash
# 1. 啟動後端
cd server && npm run dev

# 2. 測試 API
curl http://localhost:3011/api/openclaw/reviews

# 3. 測試更新
curl -X PATCH http://localhost:3011/api/openclaw/reviews/xxx \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 4. 確認 Supabase 資料
echo "檢查 Supabase 資料表確認資料已寫入"

# 5. 啟動前端測試 UI
cd .. && npm run dev
```

**檢查點：**
- [ ] API 測試通過
- [ ] 資料確實寫入 Supabase
- [ ] UI 操作後資料持久化
- [ ] 刷新頁面後資料仍存在

---

## 🚨 常見錯誤

### 錯誤 1：只有前端 mock，沒有後端 API
```typescript
// ❌ 錯誤：只用本地 state
const [ideas, setIdeas] = useState(mockIdeas);
const handleReview = (id, status) => {
  setIdeas(prev => prev.map(...)); // 沒有呼叫 API！
};
```

### 錯誤 2：後端 API 沒有寫入 Supabase
```typescript
// ❌ 錯誤：只回傳成功，沒有真的寫入
app.post('/api/reviews', (req, res) => {
  res.json({ success: true }); // 沒有寫入資料庫！
});
```

### 錯誤 3：缺少錯誤處理
```typescript
// ❌ 錯誤：沒有錯誤處理
const data = await listReviews(); // 失敗時會崩潰
```

### 錯誤 4：沒有 loading 狀態
```typescript
// ❌ 錯誤：沒有 loading 狀態
return <div>{ideas.map(...)}</div>; // 資料還沒載入就渲染
```

---

## ✅ 正確範例

完整的 Supabase 整合功能應該包含：

| 層級 | 檔案 | 職責 |
|------|------|------|
| 資料庫 | Supabase 控制台 | 資料表、RLS、索引 |
| 後端 | `server/src/index.ts` | API 路由 |
| 後端 | `server/src/openclawSupabase.ts` | Supabase 操作 |
| 型別 | `src/types/index.ts` | TypeScript 型別 |
| 前端 | `src/services/apiClient.ts` | API 客戶端 |
| 前端 | `src/services/api.ts` | API 服務層 |
| 前端 | `src/pages/ReviewCenter.tsx` | UI 元件 |

---

## 📝 交付檢查清單

功能上線前必須確認：

- [ ] 資料表已在 Supabase 建立
- [ ] RLS 權限已正確設定
- [ ] 後端 API 端點已實作
- [ ] 後端 API 已測試通過（curl/Postman）
- [ ] 前端 API 服務層已實作
- [ ] 前端 UI 使用真實 API
- [ ] 錯誤處理機制完善
- [ ] Loading 狀態已實作
- [ ] 刷新頁面後資料仍存在
- [ ] 文件已更新（API 文件、型別定義）

---

## 🔧 快速修復指南

如果發現功能是半成品：

1. **檢查後端 API** - 確認有實作並寫入 Supabase
2. **檢查前端 API 呼叫** - 確認使用真實 API 而非 mock
3. **測試資料持久化** - 刷新頁面確認資料仍存在
4. **補上缺失的部分** - 依照本 SOP 完成未完成的步驟
5. **更新文件** - 記錄這次錯誤，避免再犯

---

*最後更新：2026-02-11*
*教訓來源：ReviewCenter 功能最初只實作前端 UI，沒有後端 API 整合，導致審核後刷新消失*
