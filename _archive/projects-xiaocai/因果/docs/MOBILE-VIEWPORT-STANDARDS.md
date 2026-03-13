# 手機版顯示比例與標準

> 本站採用的 viewport 與響應式慣例，便於維護與對照業界標準。

---

## 一、Viewport 標準（業界常用）

| 項目 | 建議值 | 本站採用 | 說明 |
|------|--------|----------|------|
| **width** | `device-width` | ✅ 是 | 以裝置寬度為基準，不強制縮放成桌面寬。 |
| **initial-scale** | `1.0` | ✅ 是 | 初始縮放 1:1，不放大不縮小，避免字體錯位。 |
| **maximum-scale** | 建議不鎖死，或 `5` | 可不設 | 允許使用者放大（無障礙）；若設 `1` 會禁止縮放，不建議。 |
| **minimum-scale** | 可不設 | 可不設 | 由瀏覽器預設即可。 |
| **viewport-fit** | `cover`（有劉海機） | 可選 | iPhone X 起全螢幕可加，搭配 CSS `env(safe-area-inset-*)` 避開劉海。 |

**本站目前全頁面已加：**  
`<meta name="viewport" content="width=device-width, initial-scale=1.0">`

---

## 二、建議的完整 Viewport（可選升級）

若希望支援劉海機全螢幕且允許使用者放大，可改為：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

- **viewport-fit=cover**：內容可延伸到安全區域外，再由 CSS 用 `padding: env(safe-area-inset-top)` 等留白。
- **不設 maximum-scale=1**：保留使用者雙指縮放，利於無障礙。

---

## 三、常見斷點（響應式）

| 斷點 | 常見用途 |
|------|----------|
| **&lt; 480px** | 小手機、直式；單欄、字略縮、按鈕堆疊。 |
| **480px～768px** | 大手機／小平板；可兩欄或仍單欄。 |
| **768px～1024px** | 平板；多欄、導航可收合。 |
| **≥ 1024px** | 桌面；完整版型。 |

本站已用 Tailwind 的 `md:`、`lg:` 等，對應約 768px、1024px。

---

## 四、其他手機版建議

- **觸控目標**：按鈕／連結建議至少約 **44×44px**（Apple）或 **48×48px**（Material），避免誤觸。
- **字體**：小螢幕主文可約 **16px** 起跳，避免 iOS 自動放大輸入框；標題可依斷點縮小（例如首頁 Hero 大標在小屏改小一級）。
- **固定欄（nav/footer）**：可加 `padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);` 避免被劉海或圓角裁掉。
- **theme-color**：本站已設 `<meta name="theme-color" content="#050505">`，手機狀態列／位址列會用深色。

---

## 五、本站已做與可補

| 項目 | 狀態 |
|------|------|
| 全站 viewport width + initial-scale | ✅ 已加 |
| theme-color | ✅ 首頁已加 |
| viewport-fit=cover + safe-area | 可選，有需要再補 |
| Hero 大標在小屏縮小 | 可補 media query 或 Tailwind 響應式 class |
| 導航在窄屏收合／橫捲 | 部分頁面有 Tailwind 響應式，可再檢視 |

若要我幫你「實際改 viewport 或補一段手機版 CSS」，可指定要改哪一頁或先從首頁開始。
