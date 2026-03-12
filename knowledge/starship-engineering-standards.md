# 星艦工程標準 (Starship Engineering Standards)

> 目的：定義 OpenClaw 系統的架構分層與模組化規範，杜絕「義大利麵代碼」。
> 適用範圍：所有 src/ 下的程式碼。
> 更新：2026-03-01

## 1. 架構分層 (Architecture Layers)

採用簡化版 Feature-Sliced Design (FSD)：

`
src/
  ├── app/          # 應用程式入口 (Providers, Router, Global Styles)
  ├── processes/    # 跨頁面流程 (Auth, Checkout)
  ├── pages/        # 頁面組件 (路由對應的視圖)
  ├── widgets/      # 獨立區塊 (Header, Sidebar, TaskBoard)
  ├── features/     # 用戶功能 (Login, CreateTask, ToggleTheme)
  ├── entities/     # 業務實體 (User, Task, Project - 包含 Model & UI)
  └── shared/       # 共用底層 (UI Kit, Utils, API Client, Config)
`

原則：
- 上層可以依賴下層，下層嚴禁依賴上層。
- shared 層不應該依賴任何業務邏輯。

## 2. 模組化規範 (Modularity)

每個模組 (Feature/Entity) 應具備以下結構：

`
src/features/auth/
  ├── ui/           # 該功能的 UI 元件
  ├── model/        # 狀態管理 (Zustand/Context) & Types
  ├── lib/          # 輔助函數
  ├── api/          # API 請求
  └── index.ts      # 公開介面 (Public API)
`

Public API (index.ts) 規則：
- 外部只能透過 index.ts 引入該模組的內容。
- 內部實作細節不要 export。

## 3. 防禦性編程 (Defensive Coding)

### 3.1 錯誤邊界 (Error Boundaries)
每個 Widget 級別的組件都必須包裹在 <ErrorBoundary> 中。

`tsx
<ErrorBoundary fallback={<WidgetErrorFallback />}>
  <ComplexWidget />
</ErrorBoundary>
`

### 3.2 空值處理
嚴禁直接存取深層屬性，必須使用 Optional Chaining 或預設值。

- ❌ data.user.profile.name
- ✅ data?.user?.profile?.name ?? 'Guest'

### 3.3 API 錯誤處理
所有 API 呼叫必須包裝在 try/catch 中，並統一透過 useToast 或 Logger 回報。

## 4. 狀態管理 (State Management)

- Server State: 使用 React Query (TanStack Query)。不要手動 useEffect fetch。
- Client State: 使用 Zustand (全域) 或 useReducer (複雜局部)。
- Form State: 使用 React Hook Form + Zod 驗證。

## 5. 測試策略 (Testing Strategy)

- 單元測試 (Vitest): 針對 shared/utils 和 entities/model (純邏輯)。
- 整合測試: 針對關鍵 User Flow。

---

此標準為所有 Auto-Executor 與開發者的最高指導原則。
