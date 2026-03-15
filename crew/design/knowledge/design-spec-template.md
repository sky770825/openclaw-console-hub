# 設計規格模板 (Design Spec Template)

> 每次產出設計規格時，依照此模板填寫。確保每個區段都有明確定義，避免開發端猜測。

---

## 1. Project Brief 專案簡述

```
專案名稱：[名稱]
客戶/品牌：[品牌名]
頁面類型：[首頁 / 服務頁 / 著陸頁 / 部落格 / 其他]
目標受眾：[描述主要使用者]
核心目標：[轉換 / 品牌展示 / 資訊傳遞 / 其他]
參考網站：[URL 或描述]
交付日期：[日期]
```

---

## 2. Color Palette 配色定義

| Token | 色碼 | 用途說明 |
|-------|------|----------|
| Primary | #______ | [主色用途] |
| Secondary | #______ | [輔色用途] |
| Accent | #______ | [強調色用途] |
| Background | #______ | [背景色] |
| Text | #______ | [文字色] |
| Muted | #______ | [輔助文字] |
| Error | #______ | [錯誤狀態] |
| Success | #______ | [成功狀態] |

---

## 3. Typography 字型規格

| 元素 | 字型 | 大小 | 字重 | 行高 | 顏色 |
|------|------|------|------|------|------|
| h1 | | | | | |
| h2 | | | | | |
| h3 | | | | | |
| body | | | | | |
| small | | | | | |
| button | | | | | |

---

## 4. Component Inventory 元件清單

### 4.1 Header / Navigation
- 佈局：[固定/靜態]
- Logo 位置：[左/中]
- 導航項目：[列出所有選單項]
- Mobile 行為：[漢堡選單 / 底部導航]

### 4.2 Hero Section
- 高度：[vh 或 px]
- 背景：[圖片 / 漸層 / 純色]
- 標題文案：[文字]
- 副標題文案：[文字]
- CTA 按鈕：[文字 + 連結目標]

### 4.3 Cards 卡片
- 尺寸：[固定寬 / 自適應]
- 內容結構：[圖片 + 標題 + 說明 + CTA]
- 網格：[desktop 欄數 / tablet 欄數 / mobile 欄數]
- 間距：[卡片間距]
- 圓角：[值]
- 陰影：[值]

### 4.4 Forms 表單
- 欄位列表：[列出所有欄位]
- 驗證規則：[各欄位驗證]
- 錯誤顯示：[inline / toast / 其他]
- 提交按鈕樣式：[描述]

### 4.5 Footer
- 欄位佈局：[欄數]
- 內容：[Logo / 聯絡資訊 / 導航 / 社群連結 / 版權]
- 背景：[深色/淺色]

---

## 5. Responsive Behavior 響應式行為

| 元件 | Desktop (>=1024px) | Tablet (768px) | Mobile (<480px) |
|------|---------------------|----------------|-----------------|
| Header | [行為] | [行為] | [行為] |
| Hero | [行為] | [行為] | [行為] |
| Cards | [行為] | [行為] | [行為] |
| Forms | [行為] | [行為] | [行為] |
| Footer | [行為] | [行為] | [行為] |

---

## 6. Assets 素材需求

- [ ] Logo (SVG / PNG)
- [ ] Hero 背景圖 (建議尺寸：___x___)
- [ ] 卡片圖片 (建議比例：_:_)
- [ ] Icon set (來源：___)
- [ ] 字型檔案 (Google Fonts / 自有)
- [ ] Placeholder 策略：CSS 漸層 > 實際圖片（避免外部 URL 失效）

---

## 7. Accessibility 無障礙需求

- [ ] WCAG AA 對比度通過
- [ ] 所有圖片含 alt 文字
- [ ] 表單欄位含 label
- [ ] 鍵盤可完整導航
- [ ] Focus ring 可見
- [ ] `prefers-reduced-motion` 支援
- [ ] 語意化 HTML 結構

---

---

# 範例：美容沙龍首頁設計規格

## 1. Project Brief

```
專案名稱：Bella Glow 美容沙龍官網
客戶/品牌：Bella Glow
頁面類型：首頁 (Landing Page)
目標受眾：25-45歲女性，注重肌膚保養與美容體驗
核心目標：線上預約轉換 + 品牌形象展示
參考網站：日系高端美容沙龍風格
交付日期：2026-04-01
```

## 2. Color Palette

| Token | 色碼 | 用途說明 |
|-------|------|----------|
| Primary | #c7938e | 主色：CTA 按鈕、連結 |
| Gold | #c9a96e | 裝飾線、icon、hover |
| Dark | #3a2e2c | 文字、深色背景 |
| Cream | #faf6f2 | 頁面背景 |
| Light | #f5ede6 | 交替區段背景 |
| Muted | #a89a94 | 輔助文字 |

## 3. Typography

| 元素 | 字型 | 大小 | 字重 | 行高 | 顏色 |
|------|------|------|------|------|------|
| h1 | Playfair Display | 2.4rem | 700 | 1.2 | #3a2e2c |
| h2 | Noto Sans TC | 2rem | 700 | 1.3 | #3a2e2c |
| h3 | Noto Sans TC | 1.25rem | 500 | 1.4 | #3a2e2c |
| body | Noto Sans TC | 1rem | 400 | 1.6 | #3a2e2c |
| small | Noto Sans TC | 0.875rem | 300 | 1.5 | #a89a94 |
| button | Noto Sans TC | 1rem | 500 | 1 | #ffffff |

## 4. Component Inventory

### Header
- 固定在頂部，背景半透明 cream，滾動後加 shadow-subtle
- Logo 左側，導航右側
- 項目：首頁 / 服務項目 / 作品集 / 關於我們 / 預約
- Mobile：漢堡選單，展開為全螢幕 overlay

### Hero
- 高度：90vh
- 背景：CSS 漸層 `linear-gradient(135deg, #f5ede6, #faf6f2)` + 裝飾圓形
- 標題：「呵護每一寸肌膚的光采」(Playfair Display)
- 副標題：「專業美容 ✦ 客製化療程 ✦ 舒適體驗」
- CTA：「立即預約」按鈕 (primary, 40px radius)

### Service Cards
- 3 欄 grid (desktop) / 2 欄 (tablet) / 1 欄 (mobile)
- 每張卡片：CSS 漸層 placeholder + 服務名稱 + 簡述 + 價格 + 「了解更多」
- 圓角 16px，shadow-subtle，hover 時 shadow-hover + translateY(-2px)

### Booking Form
- 欄位：姓名、電話、Email、服務選擇 (dropdown)、預約日期、備註
- 驗證：姓名必填、電話格式、Email 格式
- 提交按鈕：primary 樣式，寬度 100%

### Footer
- 3 欄：品牌資訊 / 快速連結 / 聯絡方式
- 背景：#3a2e2c，文字：#faf6f2
- 底部：版權聲明 + 社群 icon

## 5. Responsive

| 元件 | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Header | 完整導航列 | 簡化導航 | 漢堡選單 |
| Hero | 90vh, 大字 | 70vh, 中字 | 60vh, 小字 |
| Cards | 3 欄 grid | 2 欄 grid | 1 欄堆疊 |
| Form | 2 欄欄位 | 2 欄欄位 | 1 欄堆疊 |
| Footer | 3 欄 | 2 欄 | 1 欄堆疊 |

## 6. Assets

- [ ] Logo SVG
- [ ] 不使用外部圖片 URL，全部用 CSS 漸層 placeholder
- [ ] Google Fonts: Noto Sans TC, Playfair Display
- [ ] 裝飾符號：✦ ❋ ✧ ❀ (Unicode, 無需額外檔案)

## 7. Accessibility

- [x] 所有色彩組合通過 WCAG AA
- [x] Focus ring: 2px solid #c9a96e
- [x] 表單全部含 label
- [x] 語意化 HTML
- [x] prefers-reduced-motion 支援
