# Lovable AI 設計模式學習筆記

**專案來源**: trinhnai-lovable專案  
**學習日期**: 2026-02-16  
**狀態**: 🟢 已學習

---

## 1. 技術棧組合

Lovable 預設生成的技術架構：

| 層級 | 技術 | 用途 |
|------|------|------|
| **框架** | React 18 + TypeScript | UI 開發 |
| **建置** | Vite | 快速編譯、Hot Reload |
| **樣式** | Tailwind CSS | 原子化 CSS |
| **元件庫** | shadcn/ui | 基於 Radix UI 的無頭元件 |
| **路由** | React Router | SPA 路由管理 |
| **狀態** | React Query + Context | 資料與全局狀態 |
| **圖示** | Lucide React | 現代化圖示 |
| **動畫** | Framer Motion | 進場/互動動畫 |

---

## 2. 專案結構規範

```
src/
├── api/              # API 呼叫層
├── assets/           # 靜態資源（圖片、字體）
├── components/
│   ├── ui/          # shadcn 基礎元件（49個）
│   ├── sections/    # 頁面區塊（Hero、Features等）
│   └── *.tsx        # 共用業務元件
├── contexts/         # React Context（語言、主題等）
├── hooks/            # 自定義 Hooks（useAuth等）
├── lib/              # 工具函數（cn、utils等）
├── pages/            # 頁面元件
├── integrations/     # 第三方整合
└── *.css            # 全局樣式
```

### 與傳統專案的差異

| 傳統做法 | Lovable 做法 | 優點 |
|----------|--------------|------|
| 一個大 CSS 檔 | Tailwind + CSS 變數 | 維護容易、Tree-shaking |
| 手寫元件 | shadcn/ui 基礎 | 無障礙、一致性好 |
| 分散的顏色定義 | CSS 變數系統 | 主題切換容易 |

---

## 3. 設計系統（Design Tokens）

### CSS 變數架構

```css
:root {
  /* 核心顏色 - 使用 HSL 格式 */
  --background: 30 30% 97%;      /* H S L */
  --foreground: 25 25% 15%;
  --primary: 25 45% 55%;
  --primary-foreground: 30 30% 98%;
  
  /* 設計 Token */
  --rose-gold: 25 45% 55%;
  --cream: 30 30% 97%;
  --mocha: 25 30% 20%;
  
  /* 陰影 */
  --shadow-soft: 0 4px 20px -4px hsl(25 25% 15% / 0.06);
  --shadow-card: 0 8px 30px -8px hsl(25 25% 15% / 0.08);
  
  /* 圓角 */
  --radius: 0.75rem;
}
```

### Tailwind 擴展

```typescript
// tailwind.config.ts
colors: {
  border: "hsl(var(--border))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  "rose-gold": "hsl(var(--rose-gold))",
  cream: "hsl(var(--cream))",
}
```

**用法**:
```html
<!-- 使用設計 Token -->
<div class="bg-primary text-primary-foreground">
<div class="bg-rose-gold shadow-card rounded-lg">
```

---

## 4. 元件設計模式

### Button 元件範例

使用 **class-variance-authority (CVA)** 管理變體：

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-primary/30 bg-transparent",
        hero: "bg-gradient-to-r from-rose-gold to-rose-gold-light shadow-elevated",
      },
      size: {
        default: "h-11 px-6 py-2",
        lg: "h-14 rounded-xl px-8",
        xl: "h-16 rounded-xl px-10 text-lg",
      },
    },
  }
);
```

**用法**:
```tsx
<Button variant="hero" size="lg">立即預約</Button>
<Button variant="outline" size="default">了解更多</Button>
```

### 元件特點

| 特性 | 說明 |
|------|------|
| `asChild` | 可改變渲染元素（如變成 Link） |
| `cn()` | 合併 Tailwind 類名，處理條件判斷 |
| `forwardRef` | 支援 ref 轉發 |
| TypeScript | 完整的型別定義 |

---

## 5. shadcn/ui 元件庫

Lovable 預設安裝 **49 個基礎元件**：

### 表單元件
- `button`, `input`, `textarea`, `select`
- `checkbox`, `radio-group`, `switch`
- `form`, `label`, `input-otp`

### 導航元件
- `breadcrumb`, `navigation-menu`, `tabs`, `pagination`

### 反饋元件
- `alert`, `toast`, `sonner`, `progress`, `skeleton`

### 彈窗元件
- `dialog`, `alert-dialog`, `drawer`, `popover`, `hover-card`

### 資料展示
- `accordion`, `collapsible`, `table`, `card`, `calendar`

---

## 6. 動畫與互動模式

### 預設動畫（Tailwind keyframes）

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s ease-out forwards;
}
```

### 常用效果

| 效果 | Tailwind 類名 |
|------|---------------|
| 淡入 | `animate-fade-in` |
| 上滑淡入 | `animate-fade-in-up` |
| 縮放 | `hover:scale-[1.02] active:scale-[0.98]` |
| 陰影變化 | `hover:shadow-card transition-all duration-300` |

---

## 7. 路由與程式碼分割

```tsx
// App.tsx
import { lazy, Suspense } from "react";

// 路由級別程式碼分割
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
  </Routes>
</Suspense>
```

---

## 8. Lovable 的優勢總結

| 面向 | 優點 |
|------|------|
| **開發速度** | 自然語言改 UI，不用寫程式碼 |
| **視覺一致** | 內建 Design System，不會亂 |
| **響應式** | 自動處理手機/平板/桌面 |
| **無障礙** | 基於 Radix UI，a11y 支援好 |
| **可維護** | 生成的程式碼是標準 React，可手動改 |

---

## 9. 限制與注意事項

| 限制 | 說明 |
|------|------|
| **後端邏輯** | 複雜業務邏輯仍需手寫 |
| **資料庫** | 需自己接 Supabase/Firebase |
| **大改動** | 大量修改時可能「走鐘」 |
| **客製化** | 太特殊的設計可能無法生成 |

---

## 10. 給老蔡的檢查清單

當我幫你看 Lovable 專案時，我會檢查：

- [ ] **設計一致性** — 顏色、字體、間距是否統一
- [ ] **響應式** — 手機版是否正確顯示
- [ ] **無障礙** — 按鈕是否有足夠的點擊區域
- [ ] **效能** — 圖片是否懶加載、程式碼是否分割
- [ ] **安全** — API Key 是否暴露、是否有驗證
- [ ] **SEO** — 是否有正確的 meta tags、結構化資料

---

## 參考專案

- **trinhnai-lovable專案** — 美睫預約網站，使用 Warm Luxury 配色
- **技術亮點**: 49 個 shadcn 元件、完整深色模式、動畫效果豐富

---

**學習者**: 小蔡 (Kimi K2.5)  
**下次複習**: 實際協作 Lovable 專案時
