# 71 — Lovable AI 美學生成設計理念

> 適用場景：優化 generate_site 產出品質、建立設計系統、提升 UI 美學標準
> 參考來源：lovable.dev 設計哲學與業界最佳實踐

---

## 目錄

1. [Lovable AI 是什麼](#1-lovable-ai-是什麼)
2. [核心設計理念](#2-核心設計理念)
3. [美學設計原則](#3-美學設計原則)
4. [技術實現](#4-技術實現)
5. [代碼範例](#5-代碼範例)
6. [如何應用到 generate_site](#6-如何應用到-generate_site)
7. [與 OpenClaw 整合的實踐建議](#7-與-openclaw-整合的實踐建議)

---

## 1. Lovable AI 是什麼

Lovable AI（lovable.dev）是一個 AI 驅動的 Web 應用生成器，使用者只需用自然語言描述想要的應用程式，AI 就能即時產出完整的前端、後端與資料庫架構。

### 與傳統 AI 程式碼生成器的差異

| 特性 | 傳統 AI 生成器 | Lovable AI |
|------|---------------|------------|
| 產出重點 | 功能可用即可 | 功能 + 設計品質並重 |
| 設計品質 | 預設樣式、無美學考量 | 遵循 UI/UX 最佳實踐 |
| 元件架構 | 一次性程式碼 | 可重用的 React 元件 |
| 設計系統 | 無 | 內建設計 token + 一致性 |
| 響應式 | 需手動處理 | 天生 RWD |
| 暗色模式 | 需另外實作 | 內建支援 |

### 核心技術棧

- **前端框架**：React + TypeScript
- **CSS 方案**：Tailwind CSS
- **UI 元件庫**：shadcn/ui（基於 Radix UI）
- **設計管理**：CSS 變數 + 設計 token
- **後端整合**：Supabase（認證 + 資料庫 + API）
- **版本控制**：GitHub 整合，可匯出完整原始碼

### Lovable 的設計哲學

Lovable 對傳統設計系統提出反思：與其維護一套僵硬的靜態設計系統，不如讓 AI 動態生成符合美學標準的元件。重點不在文件齊全，而在實際產出的品質。像 Linear 這樣的公司，並沒有正式的設計系統文件，卻以出色的設計品質聞名，靠的是團隊成員的品味（taste）。

---

## 2. 核心設計理念

### 2.1 設計優先（Design-First）

**原則：不只能用，還要好看。**

傳統的開發流程是「先讓功能跑起來，再美化」，Lovable 翻轉這個順序：從第一秒開始，產出的就是有設計感的介面。

關鍵做法：
- 每個元素都有適當的 padding、margin、border-radius
- 色彩不用純黑（#000）或純白（#FFF），而是帶有微妙灰調
- 按鈕有 hover/active/focus 狀態
- 表單有驗證回饋的視覺提示
- 空狀態（empty state）也要有設計

### 2.2 元件化思維（Component-Based）

**原則：生成的每一塊 UI 都是可重用的元件。**

```
頁面
  |-- Header（導航 + Logo + 使用者選單）
  |-- Sidebar（導航連結 + 摺疊控制）
  |-- MainContent
  |     |-- PageHeader（標題 + 麵包屑 + 操作按鈕）
  |     |-- DataTable（排序 + 篩選 + 分頁）
  |     |-- Card（資訊卡片 + 動效）
  |-- Footer（連結 + 版權 + 社群圖示）
```

元件拆分原則：
- **單一職責**：一個元件只做一件事
- **Props 驅動**：外觀和行為由 props 控制
- **組合優於繼承**：小元件組合成大元件
- **一致的 API**：相似功能的元件有相似的 props 命名

### 2.3 設計系統整合（Design System）

**原則：統一的色彩、字型、間距，讓整體感覺「一家人」。**

Lovable 採用動態的設計系統方式：
- 用 CSS 變數定義設計 token
- 所有元件引用 token 而非硬編碼值
- 切換主題只需修改 token 值
- 設計系統本身是一個專案，其他專案可連結引用

### 2.4 響應式原生（Responsive Native）

**原則：天生就是 RWD，不是事後補上。**

Lovable 基於 Tailwind CSS 的 mobile-first 策略：
- 預設樣式為手機版
- 用 `sm:` `md:` `lg:` `xl:` 前綴逐步擴展
- 網格系統自動調整欄數
- 圖片和媒體自動縮放
- 導航在小螢幕自動轉為漢堡選單

斷點定義：
| 斷點 | 寬度 | 裝置 |
|------|------|------|
| 預設 | 0px+ | 手機（直式）|
| sm | 640px+ | 手機（橫式）|
| md | 768px+ | 平板 |
| lg | 1024px+ | 筆電 |
| xl | 1280px+ | 桌機 |
| 2xl | 1536px+ | 大螢幕 |

### 2.5 動效優先（Animation-First）

**原則：過渡動畫、微互動、載入效果，讓介面有生命感。**

動效的三大用途：
1. **回饋**：使用者操作後的視覺回應（按鈕點擊、表單送出）
2. **引導**：引導使用者注意力到重要區域（通知彈出、高亮提示）
3. **連續性**：頁面切換、元素出現/消失的過渡，讓使用者不迷失

---

## 3. 美學設計原則

### 3.1 色彩系統

一個完整的色彩系統包含四大類：

**主色（Primary）**：品牌色，用於主要 CTA 按鈕、選中狀態、連結
**輔色（Secondary）**：次要操作、標籤、徽章
**中性色（Neutral）**：文字、背景、邊框、分隔線
**語義色（Semantic）**：
- 成功（Success）：#10B981 系列 — 完成、通過、上線
- 警告（Warning）：#F59E0B 系列 — 注意、待確認
- 錯誤（Error）：#EF4444 系列 — 失敗、刪除、危險操作
- 資訊（Info）：#3B82F6 系列 — 提示、說明

每個色彩都需要完整的色階（50-950），用於不同的情境：
- 50-100：背景色（淺色模式）
- 200-300：邊框、分隔線
- 400-500：圖示、次要文字
- 600-700：主要文字、按鈕底色
- 800-950：強調、暗色模式背景

### 3.2 字型層級

| 層級 | 大小 | 粗細 | 行高 | 用途 |
|------|------|------|------|------|
| Display | 36-48px | 700-800 | 1.1 | 首頁大標題 |
| H1 | 30-36px | 700 | 1.2 | 頁面標題 |
| H2 | 24-30px | 600 | 1.3 | 區段標題 |
| H3 | 20-24px | 600 | 1.4 | 子區段標題 |
| H4 | 16-18px | 600 | 1.5 | 卡片標題 |
| Body | 14-16px | 400 | 1.6 | 正文 |
| Small | 12-13px | 400 | 1.5 | 輔助說明、時間戳 |
| Caption | 10-11px | 500 | 1.4 | 標籤、徽章 |

最佳實踐：
- 正文字型大小不低於 14px
- 行高（line-height）正文 1.5-1.7，標題 1.1-1.3
- 字重不超過 3 種（Regular 400 / Medium 500 / Bold 700）
- 字型家族最多 2 種（標題 + 正文可分開）

### 3.3 間距節奏（Spacing Rhythm）

**8px 基準網格系統**：所有間距都是 8 的倍數。

| Token | 值 | 用途 |
|-------|-----|------|
| space-1 | 4px | 圖示與文字的間距 |
| space-2 | 8px | 元素內部小間距 |
| space-3 | 12px | 緊密排列的元素間 |
| space-4 | 16px | 元素間的標準間距 |
| space-5 | 20px | 區塊內的間距 |
| space-6 | 24px | 卡片內的 padding |
| space-8 | 32px | 區段間的間距 |
| space-10 | 40px | 大區塊間的間距 |
| space-12 | 48px | 頁面主要區段間 |
| space-16 | 64px | 頁面頂部/底部間距 |

### 3.4 陰影層次（Elevation）

| 層級 | 值 | 用途 |
|------|-----|------|
| elevation-0 | none | 內嵌元素、表格列 |
| elevation-1 | 0 1px 2px rgba(0,0,0,0.05) | 卡片、輸入框 |
| elevation-2 | 0 4px 6px rgba(0,0,0,0.07) | 浮動卡片、下拉選單 |
| elevation-3 | 0 10px 15px rgba(0,0,0,0.1) | Modal、Drawer |
| elevation-4 | 0 20px 25px rgba(0,0,0,0.15) | 懸浮面板 |
| elevation-5 | 0 25px 50px rgba(0,0,0,0.25) | 全螢幕覆蓋層 |

### 3.5 圓角規範（Border Radius）

| 元素類型 | 圓角值 | 說明 |
|----------|--------|------|
| 小元素 | 4px | 徽章（Badge）、標籤（Tag）、Checkbox |
| 按鈕 | 6-8px | 一般按鈕、輸入框 |
| 卡片 | 8-12px | 資訊卡片、表單區塊 |
| Modal | 12-16px | 對話框、Drawer |
| 膠囊形 | 9999px | Pill 按鈕、搜尋框 |

統一原則：同一頁面上，相同類型的元素圓角一致。

### 3.6 動畫規範

**時長（Duration）**：
| 類型 | 時長 | 用途 |
|------|------|------|
| 即時 | 100ms | Tooltip 出現、Checkbox 勾選 |
| 快速 | 150-200ms | 按鈕 hover、顏色變化 |
| 標準 | 200-300ms | 面板展開/收合、卡片出現 |
| 強調 | 300-500ms | Modal 進場、頁面切換 |
| 慢速 | 500-1000ms | 首次載入動畫、引導教學 |

**緩動函數（Easing）**：
- `ease-out`（減速）：元素進場，從快到慢，最常用
- `ease-in`（加速）：元素離場，從慢到快
- `ease-in-out`：展開/收合
- `cubic-bezier(0.16, 1, 0.3, 1)`：彈性效果

**Stagger 動畫**：列表中的元素依序出現，每個間隔 50-100ms。

**Skeleton Loading**：內容載入前顯示骨架屏，灰色區塊搭配左到右的光澤動畫。

---

## 4. 技術實現

### 4.1 CSS 變數管理設計 Token

設計 token 是設計系統的原子單位，用 CSS 自訂屬性（Custom Properties）管理：

```css
:root {
  /* 色彩 */
  --color-primary: 222 47% 51%;
  --color-primary-foreground: 210 40% 98%;
  --color-secondary: 210 40% 96%;
  --color-secondary-foreground: 222 47% 11%;

  --color-background: 0 0% 100%;
  --color-foreground: 222 84% 5%;
  --color-card: 0 0% 100%;
  --color-card-foreground: 222 84% 5%;
  --color-border: 214 32% 91%;
  --color-muted: 210 40% 96%;
  --color-muted-foreground: 215 16% 47%;

  --color-success: 142 71% 45%;
  --color-warning: 38 92% 50%;
  --color-error: 0 84% 60%;
  --color-info: 217 91% 60%;

  /* 圓角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* 陰影 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* 動畫 */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-bounce: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 4.2 Tailwind CSS 自訂主題配置

在 `tailwind.config.ts` 中擴展預設主題：

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary))',
          foreground: 'hsl(var(--color-secondary-foreground))',
        },
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        card: {
          DEFAULT: 'hsl(var(--color-card))',
          foreground: 'hsl(var(--color-card-foreground))',
        },
        border: 'hsl(var(--color-border))',
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))',
        },
        success: 'hsl(var(--color-success))',
        warning: 'hsl(var(--color-warning))',
        error: 'hsl(var(--color-error))',
        info: 'hsl(var(--color-info))',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s var(--ease-out)',
        'slide-in': 'slide-in 0.3s var(--ease-out)',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
};

export default config;
```

### 4.3 暗色模式切換

暗色模式透過在 `<html>` 標籤加上 `class="dark"` 實現：

```css
.dark {
  --color-primary: 213 94% 68%;
  --color-primary-foreground: 222 47% 11%;
  --color-background: 222 84% 5%;
  --color-foreground: 210 40% 98%;
  --color-card: 222 47% 11%;
  --color-card-foreground: 210 40% 98%;
  --color-border: 217 33% 17%;
  --color-muted: 217 33% 17%;
  --color-muted-foreground: 215 20% 65%;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5);
}
```

切換邏輯（原生 JS）：

```javascript
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 初始化：優先讀取使用者偏好，其次跟隨系統
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.classList.toggle('dark', saved === 'dark');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}
```

### 4.4 元件庫架構

Lovable 風格的元件庫包含以下核心元件：

| 類別 | 元件 | 說明 |
|------|------|------|
| 基礎 | Button, Badge, Avatar, Icon | 最小粒度的互動元素 |
| 輸入 | Input, Textarea, Select, Checkbox, Radio, Switch | 表單元素 |
| 資料展示 | Card, Table, List, Stat, Timeline | 結構化呈現資料 |
| 回饋 | Toast, Alert, Dialog, Progress, Spinner | 系統回饋 |
| 導航 | Navbar, Sidebar, Tabs, Breadcrumb, Pagination | 頁面導航 |
| 覆蓋層 | Modal, Drawer, Dropdown, Tooltip, Popover | 彈出式元素 |
| 佈局 | Container, Grid, Stack, Divider, Spacer | 結構排版 |

---

## 5. 代碼範例

### 5.1 設計 Token CSS 變數系統（完整版）

```html
<style>
  :root {
    /* === 色彩系統 === */
    --primary-50: #eff6ff;
    --primary-100: #dbeafe;
    --primary-200: #bfdbfe;
    --primary-500: #3b82f6;
    --primary-600: #2563eb;
    --primary-700: #1d4ed8;

    --neutral-50: #fafafa;
    --neutral-100: #f5f5f5;
    --neutral-200: #e5e5e5;
    --neutral-300: #d4d4d4;
    --neutral-500: #737373;
    --neutral-700: #404040;
    --neutral-800: #262626;
    --neutral-900: #171717;

    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;

    /* === 字型 === */
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    /* === 間距（8px 網格） === */
    --space-1: 0.25rem;   /* 4px */
    --space-2: 0.5rem;    /* 8px */
    --space-3: 0.75rem;   /* 12px */
    --space-4: 1rem;      /* 16px */
    --space-6: 1.5rem;    /* 24px */
    --space-8: 2rem;      /* 32px */
    --space-12: 3rem;     /* 48px */

    /* === 圓角 === */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;

    /* === 陰影 === */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.06);

    /* === 動畫 === */
    --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
    --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 400ms;

    /* === 層級（z-index） === */
    --z-dropdown: 50;
    --z-sticky: 100;
    --z-modal: 200;
    --z-toast: 300;
    --z-tooltip: 400;
  }
</style>
```

### 5.2 美觀的卡片元件（含 Hover 動效）

```html
<style>
  .card {
    background: var(--neutral-50);
    border: 1px solid var(--neutral-200);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-normal) var(--ease-out);
    cursor: pointer;
  }

  .card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    border-color: var(--primary-200);
  }

  .card__header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .card__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--primary-50);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .card__title {
    font-family: var(--font-sans);
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--neutral-900);
    margin: 0;
  }

  .card__subtitle {
    font-size: 0.875rem;
    color: var(--neutral-500);
    margin: 0;
  }

  .card__body {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--neutral-700);
  }

  .card__footer {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--neutral-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card__tag {
    font-size: 0.75rem;
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    background: var(--primary-50);
    color: var(--primary-700);
  }
</style>

<div class="card">
  <div class="card__header">
    <div class="card__icon">&#9733;</div>
    <div>
      <h3 class="card__title">功能模組標題</h3>
      <p class="card__subtitle">更新於 3 分鐘前</p>
    </div>
  </div>
  <div class="card__body">
    這是一張具有 Lovable 風格的卡片元件。Hover 時會有陰影加深和微幅上移的動效，
    讓使用者感受到互動的回饋。
  </div>
  <div class="card__footer">
    <span class="card__tag">進行中</span>
    <span style="font-size:0.875rem; color:var(--neutral-500);">2/5 完成</span>
  </div>
</div>
```

### 5.3 Skeleton Loading 效果

```html
<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--neutral-200) 25%,
      var(--neutral-100) 50%,
      var(--neutral-200) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite linear;
    border-radius: var(--radius-md);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skeleton--text {
    height: 1rem;
    margin-bottom: var(--space-2);
  }

  .skeleton--text:last-child {
    width: 60%;
  }

  .skeleton--title {
    height: 1.5rem;
    width: 50%;
    margin-bottom: var(--space-4);
  }

  .skeleton--avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
  }

  .skeleton--image {
    width: 100%;
    height: 200px;
    margin-bottom: var(--space-4);
  }

  .skeleton-card {
    background: var(--neutral-50);
    border: 1px solid var(--neutral-200);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }
</style>

<!-- 骨架屏卡片 -->
<div class="skeleton-card">
  <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4);">
    <div class="skeleton skeleton--avatar"></div>
    <div style="flex:1;">
      <div class="skeleton skeleton--text" style="width:40%;"></div>
      <div class="skeleton skeleton--text" style="width:25%; height:0.75rem;"></div>
    </div>
  </div>
  <div class="skeleton skeleton--image"></div>
  <div class="skeleton skeleton--text"></div>
  <div class="skeleton skeleton--text"></div>
  <div class="skeleton skeleton--text" style="width:60%;"></div>
</div>
```

### 5.4 暗色模式切換按鈕

```html
<style>
  .theme-toggle {
    position: relative;
    width: 56px;
    height: 28px;
    border-radius: var(--radius-full);
    border: 1px solid var(--neutral-300);
    background: var(--neutral-100);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-out);
    padding: 0;
  }

  .theme-toggle:hover {
    border-color: var(--primary-500);
  }

  .theme-toggle__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 22px;
    height: 22px;
    border-radius: var(--radius-full);
    background: white;
    box-shadow: var(--shadow-sm);
    transition: transform var(--duration-normal) var(--ease-bounce);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .dark .theme-toggle {
    background: var(--neutral-800);
    border-color: var(--neutral-700);
  }

  .dark .theme-toggle__thumb {
    transform: translateX(28px);
    background: var(--neutral-700);
  }
</style>

<button class="theme-toggle" onclick="toggleDarkMode()" aria-label="Toggle theme">
  <span class="theme-toggle__thumb">
    <!-- 亮色顯示太陽，暗色顯示月亮（用 CSS 切換） -->
  </span>
</button>

<script>
  function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // 頁面載入時初始化
  (function() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

---

## 6. 如何應用到 generate_site

### 6.1 生成的 HTML 要遵循的美學原則

當 `generate_site` action 產出 HTML 時，應遵循以下規範：

1. **CSS 變數統一管理**：所有色彩和間距用 CSS 變數定義在 `:root`，不硬編碼
2. **語義化 HTML**：用 `<header>`, `<main>`, `<section>`, `<footer>` 等語義標籤
3. **響應式基礎**：加入 viewport meta + 基本的響應式 CSS
4. **暗色模式支援**：定義 `.dark` class 的變數覆蓋
5. **載入動畫**：內容區域加入 fade-in 動畫
6. **Hover 狀態**：所有可點擊元素都要有 hover 效果

### 6.2 每個產品類型的色彩方案

| 產品類型 | 主色 | 輔色 | 氛圍 |
|----------|------|------|------|
| SaaS / 儀表板 | 藍色 #3B82F6 | 靛藍 #6366F1 | 專業、信任 |
| 電商 | 橙色 #F97316 | 琥珀 #F59E0B | 活力、購買慾 |
| 個人品牌 | 紫色 #8B5CF6 | 粉色 #EC4899 | 創意、獨特 |
| 企業官網 | 深藍 #1E40AF | 灰色 #6B7280 | 穩重、專業 |
| 醫療健康 | 青色 #06B6D4 | 綠色 #10B981 | 安心、專業 |
| 教育 | 綠色 #22C55E | 藍色 #3B82F6 | 成長、知識 |
| 美食餐飲 | 紅色 #EF4444 | 橙色 #F97316 | 食慾、溫暖 |
| 科技新創 | 漸層紫藍 | 螢光綠 #84CC16 | 前衛、創新 |

### 6.3 generate_site Prompt 優化建議

在生成 HTML 的 prompt 中加入以下設計指引：

```
設計規範：
- 使用 CSS 變數管理所有色彩（:root 定義，.dark 覆蓋）
- 間距遵循 8px 網格（4/8/12/16/24/32/48px）
- 圓角：小元素 4px / 按鈕 6-8px / 卡片 12px / Modal 16px
- 陰影：最多 3 級（sm/md/lg），暗色模式加深
- 動畫：hover 用 ease-out 200ms / 進場用 ease-out 300ms
- 字型：正文 15-16px / 行高 1.6 / 最多 3 種字重
- 所有可互動元素必須有 hover 和 focus 狀態
- 包含 skeleton loading 占位
- 支援暗色模式切換
```

---

## 7. 與 OpenClaw 整合的實踐建議

### 7.1 優化 generate_site 的產出品質

**現狀問題**：目前 generate_site 產出的 HTML 偏向功能導向，缺乏設計細節。

**改進方案**：

1. **建立設計 token 模板**：準備一套 CSS 變數模板，每次 generate_site 自動注入
2. **產品類型對應色彩**：根據使用者描述的產品類型，自動選擇對應的色彩方案
3. **元件模板庫**：預建常用元件（Hero、Feature Grid、Pricing Table、CTA Section）的 HTML 模板
4. **品質檢查清單**：生成後自動檢查是否符合美學規範

### 7.2 實作建議清單

| 優先級 | 項目 | 說明 |
|--------|------|------|
| P0 | CSS 變數模板 | 建立統一的設計 token，所有生成頁面自動引入 |
| P0 | 暗色模式 | 生成的頁面預設支援亮/暗雙模式 |
| P1 | 響應式骨架 | 預設 mobile-first 的 grid 佈局 |
| P1 | 動效基礎 | fade-in + hover 效果自動加入 |
| P2 | Skeleton loading | 非同步載入區域自動加骨架屏 |
| P2 | 色彩方案自動匹配 | 根據產品描述關鍵字匹配色彩 |
| P3 | 元件模板庫 | 累積常用區塊模板，降低 AI 生成負擔 |

### 7.3 品質驗收標準

生成的頁面應通過以下檢查：

- [ ] CSS 變數定義在 `:root`，無硬編碼色值
- [ ] 有 `.dark` class 的暗色模式定義
- [ ] 加入 `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] 間距使用 8px 倍數
- [ ] 所有按鈕和連結有 hover 效果
- [ ] 字型大小不低於 14px
- [ ] 有至少一處動畫效果（fade-in 或 slide-in）
- [ ] 在 375px / 768px / 1280px 三個斷點下外觀正常

---

## 參考資源

- Lovable 官方網站：https://lovable.dev/
- Lovable 設計系統文件：https://docs.lovable.dev/features/design-systems
- Lovable 重新定義設計系統：https://lovable.dev/blog/2025-01-24-reinventing-design-systems
- shadcn/ui 主題設定：https://ui.shadcn.com/docs/theming
- Tailwind CSS 文件：https://tailwindcss.com/docs
