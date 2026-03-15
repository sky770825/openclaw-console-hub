# UX 方法論 (UX Methodology)

---

## 1. User Flow 使用者流程圖

### 什麼時候需要畫流程圖
- 新頁面有超過 1 個互動路徑時
- 表單或預約流程
- 多步驟操作（結帳、註冊、多頁表單）
- 需要條件判斷的互動（登入/未登入、會員/訪客）

### 基本元素
```
[矩形] — 頁面或畫面
(圓角矩形) — 使用者操作
<菱形> — 判斷/條件
→ — 流程方向
```

### 流程圖撰寫原則
1. **起點明確**：標示使用者從哪進入（首頁 / 廣告連結 / 搜尋引擎）
2. **主線優先**：先畫出最常見的「快樂路徑」(happy path)
3. **分支簡潔**：錯誤狀態、邊界情境另外標註，不塞進主線
4. **終點清楚**：標示最終目標（完成預約 / 送出表單 / 購買完成）
5. **不超過 10 步**：若步驟超過 10 個，考慮拆分或簡化流程

### 範例：預約流程
```
首頁 → 點擊「立即預約」→ 服務選擇頁 → 選擇日期時間
→ 填寫基本資料 → 確認資訊 → 送出 → 預約成功頁
                                ↘ (驗證失敗) → 錯誤提示 → 回到表單
```

---

## 2. Accessibility Testing 無障礙測試程序

### 自動化檢查（每次交付前必做）
1. **對比度檢查**：使用 WebAIM Contrast Checker 驗證所有文字/背景組合
2. **HTML 語意**：確認使用正確語意標籤 (`<nav>`, `<main>`, `<section>`, `<article>`, `<button>`)
3. **Alt 文字**：所有 `<img>` 必須有 `alt`，裝飾性圖片用 `alt=""`
4. **表單標籤**：所有 `<input>` 必須關聯 `<label>`

### 手動檢查
1. **鍵盤導航測試**
   - 只用 Tab/Shift+Tab 能否操作所有功能
   - Focus 順序是否符合視覺閱讀順序
   - Modal 是否 trap focus
   - 能否用 ESC 關閉彈出元素

2. **螢幕閱讀器測試**
   - 頁面標題是否清楚描述內容
   - 導航區域是否有 `aria-label`
   - 動態內容更新是否有 `aria-live` 通知
   - 裝飾性元素是否用 `aria-hidden="true"` 隱藏

3. **視覺測試**
   - 頁面放大到 200% 是否仍可正常使用
   - `prefers-reduced-motion` 啟用時動畫是否停止
   - 色彩是否不是傳達資訊的唯一方式

### 檢查清單（交付前逐項確認）
- [ ] 所有文字對比度 >= 4.5:1 (AA)
- [ ] 大標題對比度 >= 3:1 (AA)
- [ ] 鍵盤可完整導航
- [ ] Focus ring 清晰可見
- [ ] 所有圖片有 alt
- [ ] 表單有 label
- [ ] 語意化 HTML
- [ ] 無自動播放媒體

---

## 3. Mobile-First 設計方法

### 核心原則
> 先設計最小螢幕的體驗，再逐步增強到更大螢幕。

### 為什麼 Mobile-First
- 強迫優先處理最重要的內容
- 避免桌面版資訊過度堆疊到手機上
- CSS 覆寫方向更合理 (`min-width` 逐步加功能)

### 執行步驟
1. **內容優先排序**：列出頁面所有內容，依重要性排序
2. **320px 開始**：在最窄螢幕寬度下設計，確保核心內容可讀
3. **單欄佈局**：Mobile 預設單欄，元素垂直堆疊
4. **觸控友善**：
   - 點擊目標最小 44x44px
   - 按鈕間距至少 8px
   - 避免 hover-only 的互動（mobile 無 hover）
5. **逐步增強**：
   - 480px：可微調間距、字級
   - 768px：引入雙欄、顯示更多次要資訊
   - 1024px+：完整多欄佈局

### CSS 寫法範例
```css
/* Mobile first — 基礎樣式 */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}
```

---

## 4. Image & Placeholder 策略

### 黃金法則
> **CSS 漸層 > SVG placeholder > 本地圖片 > 外部 URL**

### 為什麼避免外部圖片 URL
- 外部連結會失效（404、CORS 錯誤）
- 載入速度不可控
- 依賴第三方可靠性
- 影響頁面穩定度與 SEO

### CSS 漸層 Placeholder（優先使用）
```css
/* 品牌風格漸層 placeholder */
.placeholder-primary {
  background: linear-gradient(135deg, #f5ede6 0%, #faf6f2 50%, #f5ede6 100%);
}

.placeholder-warm {
  background: linear-gradient(135deg, #c7938e22, #c9a96e22);
}

.placeholder-dark {
  background: linear-gradient(135deg, #3a2e2c, #5a4e4c);
}
```

### 圖片使用時機
- 真正需要展示的作品照片、產品圖
- Logo 和品牌識別
- 不可替代的視覺內容

### 圖片規範（當必須使用時）
- 格式：WebP 優先，PNG 備援（透明需求），JPG（照片）
- 壓縮：品質 80%，使用 lazy loading
- 響應式：提供多尺寸 (`srcset`) 或使用 `max-width: 100%`
- Alt 文字：必填，描述圖片內容而非檔名
- 尺寸建議：
  - Hero: 1920x1080 (16:9)
  - Card: 600x400 (3:2)
  - Thumbnail: 300x300 (1:1)
  - Avatar: 200x200 (1:1, 圓形裁切)
