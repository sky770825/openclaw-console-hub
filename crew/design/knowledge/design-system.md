# 設計系統基準 (Design System)

## Typography 字型系統

### 字型家族
- **主要字型 (中文):** Noto Sans TC
- **裝飾字型 (英文標題):** Playfair Display
- **備援:** system-ui, -apple-system, sans-serif

### 字級規範
| 元素 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| h1 | 2.4rem | 700 | 1.2 | 頁面主標題、Hero 區塊 |
| h2 | 2rem | 700 | 1.3 | 區段標題 |
| h3 | 1.25rem | 500 | 1.4 | 卡片標題、小區段標題 |
| body | 1rem | 400 | 1.6 | 內文段落 |
| small | 0.875rem | 300 / 400 | 1.5 | 輔助文字、標籤、footer |

### 字重對照
- 300 — Light：輔助文字、裝飾性文字
- 400 — Regular：內文、說明
- 500 — Medium：小標題、強調文字
- 700 — Bold：大標題、按鈕文字、CTA

---

## Color 配色系統

### Rose-Gold 品牌色盤
| Token | 色碼 | 用途 |
|-------|------|------|
| `--color-primary` | `#c7938e` | 主色：按鈕、連結、重點元素 |
| `--color-gold` | `#c9a96e` | 金色強調：裝飾線、圖示、hover 狀態 |
| `--color-dark` | `#3a2e2c` | 深色底：文字、深色背景 |
| `--color-cream` | `#faf6f2` | 奶油底：頁面背景、卡片背景 |
| `--color-light` | `#f5ede6` | 淺色區塊：交替背景 |
| `--color-muted` | `#a89a94` | 輔助文字、placeholder |
| `--color-white` | `#ffffff` | 純白：卡片、modal 背景 |
| `--color-error` | `#d4564e` | 錯誤狀態 |
| `--color-success` | `#6b9e78` | 成功狀態 |

### 語意使用規則
- 主要 CTA 按鈕：`--color-primary` 背景 + `--color-white` 文字
- 次要 CTA 按鈕：透明背景 + `--color-primary` 邊框與文字
- 頁面背景：`--color-cream` 或 `--color-white`
- 交替區段背景：`--color-light` / `--color-white` 交替使用
- 深色區段 (footer, hero overlay)：`--color-dark` 背景 + `--color-cream` 文字
- 裝飾元素 (分隔線、icon)：`--color-gold`
- 內文文字：`--color-dark`
- 輔助/次要文字：`--color-muted`

---

## Spacing 間距系統

基準單位：**4px**

| Token | 值 | 常用場景 |
|-------|----|----------|
| `--space-1` | 4px | 圖示與文字間距 |
| `--space-2` | 8px | 行內元素間距 |
| `--space-3` | 12px | 小元件內距 |
| `--space-4` | 16px | 卡片內距、標準間距 |
| `--space-5` | 20px | 表單欄位間距 |
| `--space-6` | 24px | 區段內元素間距 |
| `--space-7` | 28px | 中型間距 |
| `--space-8` | 32px | 卡片間距 |
| `--space-10` | 40px | 區段內距（上下） |
| `--space-12` | 48px | 大區段間距 |
| `--space-16` | 64px | 頁面區段間距 |
| `--space-20` | 80px | Hero / 大區段上下留白 |

---

## Shadow 陰影系統

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-subtle` | `0 4px 24px rgba(58, 46, 44, 0.08)` | 卡片預設、靜態元素 |
| `--shadow-hover` | `0 8px 32px rgba(58, 46, 44, 0.14)` | Hover 狀態、浮動元素 |
| `--shadow-modal` | `0 16px 48px rgba(58, 46, 44, 0.18)` | Modal、dropdown overlay |

---

## Border Radius 圓角

| 元素類型 | 值 | 範例 |
|----------|-----|------|
| 卡片、圖片容器 | `16px` | 服務卡片、作品展示 |
| 按鈕、pill 標籤 | `40px` | CTA 按鈕、分類標籤 |
| 頭像、圓形元素 | `50%` | 使用者頭像、圓形 icon |
| 輸入框 | `12px` | 表單 input、textarea |

---

## Animation 動畫

### 標準曲線與時長
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`
- **Duration:** `350ms`
- **快速互動 (toggle, fade):** `200ms`
- **慢速展開 (modal, accordion):** `500ms`

### Hover 效果
```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
  transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 動畫原則
- 所有互動元素必須有 transition
- 避免使用 `ease` 或 `linear`，一律用品牌曲線
- `prefers-reduced-motion` 時取消所有動畫，僅保留 opacity 過渡

---

## Component States 元件狀態

每個互動元件必須定義以下狀態：

| 狀態 | 視覺變化 | 說明 |
|------|----------|------|
| Default | 基準樣式 | 靜態呈現 |
| Hover | 陰影加深 + translateY(-2px) + 色彩微調 | 滑鼠懸停 |
| Active / Pressed | 陰影縮回 + translateY(0) + 色彩加深 5% | 點擊中 |
| Focus | `outline: 2px solid var(--color-gold); outline-offset: 2px;` | 鍵盤聚焦（無障礙必要） |
| Disabled | `opacity: 0.5; cursor: not-allowed;` | 不可操作 |
| Loading | 內容替換為 spinner 或 skeleton | 資料載入中 |

---

## Responsive Breakpoints 響應式斷點

| 斷點名稱 | 寬度 | 佈局變化 |
|----------|------|----------|
| Mobile | < 480px | 單欄、隱藏側邊欄、漢堡選單、字級縮小 10% |
| Mobile-L | 480px - 767px | 單欄、可顯示部分次要資訊 |
| Tablet | 768px - 1023px | 雙欄、側邊欄可折疊 |
| Desktop | >= 1024px | 完整佈局、多欄 |

### 響應式原則
- Mobile-first：CSS 先寫手機樣式，再用 `min-width` 往上覆寫
- 卡片網格：mobile 1 欄 / tablet 2 欄 / desktop 3-4 欄
- 圖片：一律使用 `max-width: 100%; height: auto;`
- 字級：h1 在 mobile 縮至 1.8rem，h2 縮至 1.5rem

---

## Accessibility 無障礙

### WCAG AA 對比度
- 內文文字 vs 背景：對比度 >= 4.5:1
- 大標題 (>=18px bold / >=24px regular) vs 背景：>= 3:1
- `--color-primary (#c7938e)` 在白底上對比度不足，用於大字或搭配深底

### Focus 指示
- 所有可互動元素必須顯示 focus ring
- Focus ring 樣式：`outline: 2px solid var(--color-gold); outline-offset: 2px;`
- 禁止使用 `outline: none` 除非提供等效替代

### 鍵盤導航
- Tab 順序必須合理（依視覺閱讀順序）
- Modal 必須 trap focus
- 下拉選單支援方向鍵導航
- ESC 鍵關閉 modal / dropdown

### 其他
- 所有圖片提供 `alt` 文字
- 表單欄位必須有 `<label>` 關聯
- 使用語意化 HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- 顏色不能是傳達資訊的唯一方式（搭配圖示或文字）

---

## Icon System 裝飾圖示

### Unicode 裝飾符號
| 符號 | 用途 |
|------|------|
| ✦ | 主要裝飾：標題前、列表項前 |
| ❋ | 次要裝飾：分隔符、section break |
| ✧ | 輕量裝飾：副標題、hover 效果 |
| ❀ | 花卉/美容相關主題裝飾 |

### 使用規範
- 裝飾符號尺寸與相鄰文字一致或略小
- 間距：符號與文字間留 `--space-2` (8px)
- 顏色：預設使用 `--color-gold`，深色背景上使用 `--color-cream`
- 不過度使用：每個區段最多 1-2 個裝飾符號
- 螢幕閱讀器以 `aria-hidden="true"` 隱藏裝飾符號
