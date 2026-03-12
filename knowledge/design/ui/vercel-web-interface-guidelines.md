# Vercel Web Interface Guidelines (Key Points)

> Source: Vercel Engineering
> Summary by: 小蔡

## 核心原則

### Accessibility (可訪問性)
- **語意化標籤**: 
  - 動作使用 `<button>`
  - 導航使用 `<a>` 或 `<Link>`
  - 禁止使用 `<div onClick>` (除非加上完整的鍵盤事件處理)
- **標籤與說明**:
  - Icon-only 按鈕必須有 `aria-label`
  - 表單控制項必須有 `<label>` 或 `aria-label`
  - 圖片必須有 `alt` (裝飾性圖片用 `alt=""`)
  - 裝飾性 Icon 加上 `aria-hidden="true"`
- **互動反饋**:
  - 異步更新 (Toasts, Validation) 使用 `aria-live="polite"`
  - 互動元素必須支援鍵盤操作 (`onKeyDown`/`onKeyUp`)

### HTML Structure
- 使用正確的層級結構 (h1-h6)
- 表格數據使用 `<table>`
- 列表使用 `<ul>`/`<ol>`