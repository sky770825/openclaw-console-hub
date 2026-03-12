# Vercel React Best Practices (Key Points)

> Source: Vercel Engineering
> Summary by: 小蔡

## 優化分類

### 1. Async (異步處理)
- **Parallelize**: 避免請求瀑布流 (Waterfalls)，能並行的請求使用 `Promise.all`。
- **Defer**: 非關鍵數據延後加載，優先渲染核心內容。
- **Suspense**: 善用 Suspense Boundaries 處理加載狀態。

### 2. Bundle (打包體積)
- **No Barrel Imports**: 避免 `import { A, B } from 'utils'` 導致引入整個模組，應直接引用具體路徑。
- **Dynamic Imports**: 對於大型組件或非首屏組件，使用 `next/dynamic` 或 `React.lazy`。
- **Conditional**: 條件渲染的依賴項應按需加載。

### 3. Client (客戶端效能)
- **Event Listeners**: 
  - `useEffect` 中註冊的監聽器必須在 cleanup function 中移除。
  - 滾動與觸摸事件使用 `{ passive: true }`。
- **LocalStorage**: 規範 Schema，避免讀寫阻塞。

### 4. JavaScript Execution
- **Lookups**: 頻繁查找使用 `Set` 或 `Map` (O(1)) 代替 Array `find`/`filter` (O(n))。
- **Memoization**: 昂貴計算結果應緩存。
- **Immutable**: 使用 `toSorted` 等不可變方法操作陣列。