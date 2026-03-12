# 中階 vs 高階工程師技能定義

技術棧：React · TypeScript · Node.js · Express · Supabase

---

## 前端（React + TypeScript）

### 中階工程師

元件設計
- 熟練使用 useState, useEffect, useContext, useRef, useMemo, useCallback
- 理解 re-render 觸發條件，能用 memo 避免不必要的渲染
- 能設計可複用的 Controlled / Uncontrolled 元件

TypeScript
- 熟練使用 interface, type, union, intersection, generic
- 能正確標注 Props, Event Handler, API 回傳型別
- 理解 Partial, Required, Pick, Omit 等 Utility Types

狀態管理
- 理解 local state vs global state 的邊界
- 能使用 Context API 或 Zustand / Jotai 管理跨元件狀態
- 能處理非同步狀態（loading / error / data）

資料獲取
- 使用 react-query (TanStack Query) 或 SWR 管理 server state
- 理解 cache invalidation, refetch, optimistic update 的概念

路由
- 熟練使用 React Router v6（nested routes, protected routes, lazy loading）

樣式
- 能使用 Tailwind CSS 或 CSS Modules 建立一致的 UI

---

### 高階工程師

效能優化
- 能使用 Chrome DevTools Profiler 找出效能瓶頸
- 掌握 Suspense, lazy, startTransition, useDeferredValue
- 理解 Virtual DOM diffing 機制，能解釋並優化 reconciliation

TypeScript 進階
- 能撰寫 conditional types, mapped types, template literal types
- 能封裝型別安全的 utility function 和 custom hooks
- 理解 infer 關鍵字和型別推導

架構設計
- 能設計 Feature-based 或 Domain-driven 的資料夾結構
- 能建立元件設計系統（Design System）與 Storybook
- 能定義清晰的元件 API boundary，讓團隊有一致的開發規範

自訂 Hook 設計
- 能封裝複雜的副作用邏輯（防抖、WebSocket、虛擬滾動）
- 能設計職責單一、可測試的 custom hooks

測試
- 能用 Vitest + Testing Library 撰寫整合測試
- 理解 MSW (Mock Service Worker) 的測試策略

Server Components（進階選項）
- 理解 React Server Components (RSC) 的渲染模型與 Next.js App Router

---

## 後端（Node.js + Express + Supabase）

### 中階工程師

API 設計
- 能設計 RESTful API（正確使用 HTTP method、狀態碼、資源命名）
- 能實作 middleware（logging, error handler, auth guard）
- 能處理輸入驗證（使用 zod 或 joi）

TypeScript
- 能為 Express req/res 正確標注型別
- 能定義 DTO（Data Transfer Object）與 schema 型別

Supabase / 資料庫
- 熟練使用 Supabase Client（select, insert, update, delete, eq, join）
- 理解 Row Level Security (RLS) 的基本設定
