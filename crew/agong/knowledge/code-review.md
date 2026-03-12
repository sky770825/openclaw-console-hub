# 阿工專屬 — 代碼審查要點
> 你是阿工（🔧 工程師），不是小蔡，這是你的專屬知識庫

---

## 審查三維度：正確性 → 安全性 → 效能

每次審查代碼，按這個順序檢查。

---

## TypeScript 常見問題

### 1. 型別安全
```typescript
// 🔴 差：any 到處飛
function processData(data: any) {
  return data.result.items;  // runtime 可能爆
}

// 🟢 好：明確型別
interface ApiResponse {
  result: { items: string[] };
}
function processData(data: ApiResponse) {
  return data.result.items;
}
```

### 2. null/undefined 防護
```typescript
// 🔴 差：直接存取，可能 undefined
const name = user.profile.name;

// 🟢 好：optional chaining + 預設值
const name = user?.profile?.name ?? 'Unknown';
```

### 3. async/await 錯誤處理
```typescript
// 🔴 差：async 沒有 try-catch，promise rejection 會變 unhandled
app.get('/api/data', async (req, res) => {
  const data = await fetchSomething();
  res.json(data);
});

// 🟢 好：完整的錯誤處理
app.get('/api/data', async (req, res) => {
  try {
    const data = await fetchSomething();
    res.json(data);
  } catch (err) {
    console.error('[GET /api/data]', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
```

### 4. 型別斷言濫用
```typescript
// 🔴 差：as 強轉，繞過型別檢查
const data = response as UserData;

// 🟢 好：用 type guard 做執行時檢查
function isUserData(obj: unknown): obj is UserData {
  return obj !== null && typeof obj === 'object' && 'id' in obj;
}
if (isUserData(response)) {
  // 這裡 response 自動推斷為 UserData
}
```

### 5. import/export 問題（ESM）
```typescript
// 🔴 OpenClaw 用 ESM，不要用 require
const express = require('express');

// 🟢 用 import
import express from 'express';
```

---

## React 常見問題

### 1. useEffect 依賴陣列
```typescript
// 🔴 差：缺少依賴，effect 不會在 userId 改變時重跑
useEffect(() => {
  fetchUser(userId);
}, []);

// 🟢 好：完整依賴
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// 🔴 也差：每次 render 都跑（沒有依賴陣列）
useEffect(() => {
  fetchUser(userId);
});
```

### 2. 不必要的 re-render
```typescript
// 🔴 差：每次 render 都建新物件，子元件永遠 re-render
<ChildComponent style={{ color: 'red' }} />

// 🟢 好：用 useMemo 穩定參考
const style = useMemo(() => ({ color: 'red' }), []);
<ChildComponent style={style} />
```

### 3. 在 render 裡做重計算
```typescript
// 🔴 差：每次 render 都重新排序
function TaskList({ tasks }) {
  const sorted = tasks.sort((a, b) => b.priority - a.priority); // 還改了原陣列！
  return sorted.map(t => <Task key={t.id} task={t} />);
}

// 🟢 好：useMemo + 不改原陣列
function TaskList({ tasks }) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => b.priority - a.priority),
    [tasks]
  );
  return sorted.map(t => <Task key={t.id} task={t} />);
}
```

### 4. key prop 問題
```typescript
// 🔴 差：用 index 當 key（列表順序會變時出問題）
tasks.map((t, i) => <Task key={i} task={t} />)

// 🟢 好：用唯一 ID
tasks.map(t => <Task key={t.id} task={t} />)
```

---

## Express.js 常見問題

### 1. 路由順序
```typescript
// 🔴 差：萬用路由放前面，後面的路由全部失效
app.get('/api/*', catchAllHandler);
app.get('/api/tasks', taskHandler);  // 永遠到不了

// 🟢 好：具體路由放前面
app.get('/api/tasks', taskHandler);
app.get('/api/*', catchAllHandler);
```

### 2. 中間件順序
```typescript
// 🔴 差：json parser 放在路由後面，req.body 是 undefined
app.use('/api', apiRouter);
app.use(express.json());

// 🟢 好：parser 在路由之前
app.use(express.json());
app.use('/api', apiRouter);
```

### 3. 回應多次
```typescript
// 🔴 差：條件判斷後忘記 return，send 兩次會 crash
app.get('/api/task/:id', async (req, res) => {
  if (!req.params.id) {
    res.status(400).json({ error: 'Missing id' });
    // 忘記 return，繼續執行下面的
  }
  const task = await getTask(req.params.id);
  res.json(task);  // Error: headers already sent
});

// 🟢 好：加 return
if (!req.params.id) {
  return res.status(400).json({ error: 'Missing id' });
}
```

### 4. 錯誤不回應
```typescript
// 🔴 差：catch 了但沒回應，客戶端永遠等到 timeout
try {
  // ...
} catch (err) {
  console.error(err);
  // 忘記 res.status(500).json(...)
}

// 🟢 好：一定要回應
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

---

## 效能陷阱

### 1. N+1 查詢
```typescript
// 🔴 差：迴圈裡查 DB（N+1 問題）
for (const task of tasks) {
  const owner = await supabase.from('users').select('*').eq('id', task.ownerId).single();
  task.owner = owner.data;
}

// 🟢 好：一次查完
const ownerIds = tasks.map(t => t.ownerId);
const { data: owners } = await supabase.from('users').select('*').in('id', ownerIds);
const ownerMap = new Map(owners.map(o => [o.id, o]));
tasks.forEach(t => { t.owner = ownerMap.get(t.ownerId); });
```

### 2. 大量數據沒有分頁
```typescript
// 🔴 差：一次載入所有數據
const { data } = await supabase.from('tasks').select('*');

// 🟢 好：加分頁
const { data } = await supabase.from('tasks').select('*').range(offset, offset + limit - 1);
```

### 3. 同步阻塞
```typescript
// 🔴 差：sync 檔案操作會阻塞 event loop
const data = fs.readFileSync('/big/file.json', 'utf-8');

// 🟢 好：async
const data = await fs.promises.readFile('/big/file.json', 'utf-8');
```

### 4. 不必要的 await
```typescript
// 🔴 差：串行等待，很慢
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();

// 🟢 好：獨立的請求並行
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

---

## 審查 Checklist

審查任何代碼前，過一遍這個清單：

- [ ] **型別**：有沒有 `any`？有沒有 `as` 強轉？
- [ ] **null 安全**：有沒有直接存取可能 undefined 的屬性？
- [ ] **錯誤處理**：async 函數有沒有 try-catch？catch 有沒有回應？
- [ ] **SQL 注入**：有沒有字串拼接 SQL？（Supabase client 通常安全）
- [ ] **敏感資訊**：有沒有 hardcode API key / password？
- [ ] **效能**：有沒有 N+1 查詢？大量數據有沒有分頁？
- [ ] **記憶體洩漏**：有沒有未清理的 setInterval / event listener？
- [ ] **ESM 格式**：import/export 是否正確？（不用 require）
