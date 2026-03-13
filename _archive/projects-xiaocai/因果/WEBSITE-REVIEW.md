# 因果真相網站 — 全站檢視與補強建議

> 檢視日期：2026-02-28  
> 範圍：內容、排版、技術、SEO、可及性、資源

---

## 一、內容與結構

### 已具備且完整
- **首頁**：主視覺、每日一悟、各分頁入口、LINE CTA、投稿表單、雙 footer、NEUXA 浮動助手
- **子頁**：諸神、地獄、輪迴、功過格、導航、參悟、懺悔、佛音、測驗、監測、案例、白皮書
- **動線**：首頁 → 各主題頁 → 交叉連結（如地獄→案例、導航→功過格）

### 已修復（2026-02-28）
| 項目 | 說明 |
|------|------|
| **導航統一** | 全子頁 nav 已改為：回首頁、諸神、地獄、輪迴、功過格、導航、佛音（7 項），與首頁核心入口一致。監測頁維持終端風格未改。 |
| **cases 投稿連結** | 案例頁「我也要投稿案例」連到 `#submit`，在 cases.html 上沒有 id=submit，應改為 `../index.html#submit`。 |
| **footer 重複** | index.html 有兩段 `<footer>`（約 L251、L264），可合併為一或明確分工（例如一為 CTA、一為站內連結+免責）。 |

---

## 二、排版與視覺

### 已具備
- 全站 `Noto Serif TC`、金色/深色主題、`styles.css` 與各頁 inline style 搭配
- 按鈕 hover、視覺框、地獄頁 scroll progress、功過格等有設計感

### 需補強
| 項目 | 說明 |
|------|------|
| **響應式** | 未見 `meta viewport`，手機上可能無法正確縮放。應在**所有 HTML** 的 `<head>` 加入：`<meta name="viewport" content="width=device-width, initial-scale=1.0">` |
| **首頁 Hero 圖** | 已改為 Unsplash CDN 意境圖 + `bg-[#0a0a0a]` 備用，無本地圖時不破圖。 |
| **地獄頁圖片** | 已改為 placehold.co 四張 placeholder（鐵鏈、樓梯、審判人影、孽鏡），可之後換成正式圖檔。 |
| **返回頂端按鈕** | JS 依捲動加上 `.visible`，但 `styles.css` 未定義 `.back-to-top.visible`，按鈕顯示/隱藏邏輯不完整。應預設隱藏，捲動超過一定高度後顯示。 |
| **分享 Modal** | `#share-modal` 同時有 `hidden` 與 `flex`，依賴 Tailwind。若 CSS 載入順序有變可能錯亂，可考慮用 `aria-hidden` + 單一 class 控制顯示。 |

---

## 三、技術

### 已具備
- Tailwind CDN、particles.js（首頁/地獄/輪迴/案例/白皮書）、prompts.js（地獄）
- 功過格、測驗、佛音、監測、模擬等有互動邏輯
- manifest.json、favicon.svg、sitemap.xml、robots.txt 存在

### 需補強
| 項目 | 說明 |
|------|------|
| **index 未掛 favicon / manifest** | 首頁與多數子頁未在 `<head>` 加上 `rel="icon"`、`rel="manifest"`、theme-color，不利 PWA 與書籤圖示。 |
| **SEO / 社群 meta** | 僅 full_content_raw.html 有 og/twitter/description/keywords；**index.html 與各子頁沒有**，分享連結時預覽會不完整。建議至少為 index 與主要子頁補上 description、og:title、og:description、og:image。 |
| **sitemap 不完整** | sitemap.xml 只列首頁，建議加入所有主要頁面（諸神、地獄、輪迴、功過格、導航、參悟、懺悔、佛音、測驗、監測、案例、白皮書）。 |
| **particles 效能** | 首頁載入即跑 100 顆粒子 + requestAnimationFrame，低階裝置可能吃 CPU。可考慮：減少數量、或進入視窗再 init、或提供「關閉特效」開關。 |
| **外部資源** | 背景音樂、deities 圖片用外部 CDN（Mixkit、Unsplash），需注意：版權、失效連結、GDPR/隱私（若有追蹤）。 |
| **表單** | 投稿表單目前僅 `alert`，未真正送出後端。若為靜態站，可改為 mailto 或導向 Typeform/Google Form，並在文案說明「將導向外部表單」。 |

---

## 四、可及性（a11y）

| 項目 | 建議 |
|------|------|
| **按鈕/連結** | 部分 `onclick`（如返回頂端、分享、NEUXA）可加上 `role="button"` 與 `aria-label`，以便讀屏。 |
| **對比** | 金色 (#d4af37 / #b8860b) 在深色底多數處對比足夠，可再抽檢「灰字+金底」區塊是否符合 WCAG AA。 |
| **鍵盤** | Modal 打開時應 trap focus、Esc 關閉，避免鍵盤使用者卡在背景。 |

---

## 五、建議優先順序

| 優先 | 項目 | 影響 |
|------|------|------|
| P0 | 補齊所有頁面 `viewport` | 手機排版 |
| P0 | 修正 cases 投稿連結為 `../index.html#submit` | 功能正確 |
| P0 | 補 `.back-to-top.visible` 樣式或預設隱藏 | 首頁 UX |
| P1 | 首頁 head 補 favicon、manifest、description、og 基本 meta | SEO / PWA / 分享 |
| P1 | 建立 `images/hell/` 或改 Hero/地獄圖為可用來源 | 不破圖 |
| P1 | sitemap 列入全站主要 URL | SEO |
| P2 | 子頁導航統一（至少「首頁 + 核心 5～6 個」） | 站內動線 |
| P2 | 合併/整理 index 雙 footer | 維護性 |
| P3 | particles 節流或延遲載入、Modal 鍵盤/焦點 | 效能與 a11y |

---

## 六、檔案與連結速查

- **首頁**：`index.html`（Hero 圖：`images/hell/hall.jpg` — 目前無此檔）
- **地獄**：`pages/hell.html`（4 張圖在 `../images/hell/` — 目前無此目錄）
- **案例投稿**：`pages/cases.html` 內 `#submit` → 應改 `../index.html#submit`
- **全站樣式**：`styles.css`（缺 `.back-to-top` 預設隱藏與 `.visible` 顯示）
- **全站**：皆未加 viewport；僅 full_content_raw 有完整 meta。

以上完成後，再依需求補：GA/GTM、正式表單後端、更多 og:image、子頁個別 description。
