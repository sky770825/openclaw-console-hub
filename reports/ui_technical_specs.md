# Linear / Vercel / Raycast 風格技術校準報告

## 1. 核心技術棧 (Dependencies)
```json
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "clsx": "^2.1.1",
    "framer-motion": "^12.34.3",
    "lucide-react": "^0.462.0",
    "tailwind-merge": "^2.6.0",
```

## 2. 視覺語言分析 (Visual Language)
根據原始碼掃描，系統採用了以下技術實現「高品質感」：
- **毛玻璃效果 (Glassmorphism)**: 使用 `backdrop-blur` 配合 `bg-opacity`。
- **微邊框 (Subtle Borders)**: 廣泛使用 `border-white/10` 或 `border-neutral-800` 營造深度感。
- **漸層處理 (Gradients)**: 發現 `bg-gradient-to-b` 或 `from-zinc-900` 等樣式。

## 3. 動效校準 (Motion)
- 檢測到 Framer Motion 使用跡象，主要用於頁面切換與組件進入動畫。

## 4. 針對「阿工」的開發建議
1. **顏色定義**: 確保 `globals.css` 中定義了 `--background: 0 0% 0%` (純黑) 或極深灰。
2. **陰影**: 使用 `drop-shadow` 而非標準 shadow 來模擬 Raycast 的浮動感。
3. **字體**: 建議優先使用 Inter 或 Geist (Vercel 官方字體)。

---
*報告產生於: Wed Mar  4 20:35:47 CST 2026*
