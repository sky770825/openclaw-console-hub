---
tags: [GA4, Google-Analytics, Search-Console, GTM, 追蹤, 流量, 報表, 事件]
date: 2026-03-05
category: cookbook
---

# 34 — Google Analytics 4 與 Search Console 完整設定指南

> 給接案設計師/工作室的完整指南：幫客戶網站安裝 GA4 追蹤 + Search Console 搜尋優化
> 最後更新：2026-03-05

---

## 目錄

1. [GA4 帳戶建立與安裝](#1-ga4-帳戶建立與安裝)
2. [GA4 基本設定](#2-ga4-基本設定)
3. [GA4 事件追蹤](#3-ga4-事件追蹤)
4. [GA4 轉換目標](#4-ga4-轉換目標)
5. [GA4 報表快速指南](#5-ga4-報表快速指南)
6. [Google Search Console 設定](#6-google-search-console-設定)
7. [Search Console 日常使用](#7-search-console-日常使用)
8. [給客戶的月報模板](#8-給客戶的月報模板)
9. [權限管理](#9-權限管理)
10. [常見問題](#10-常見問題)

---

## 1. GA4 帳戶建立與安裝

### 1.1 建立 GA4 帳戶 + 資源（Property）

**步驟一：進入 GA 管理後台**

```
https://analytics.google.com/
```

用 Google 帳號登入後，點左下角齒輪圖示進入「管理」。

**步驟二：建立帳戶**

1. 點「+ 建立帳戶」
2. **帳戶名稱**：填客戶公司名（例如「王記水電行」）
3. 帳戶資料共用設定：全部勾選（建議），點「下一步」

**步驟三：建立資源（Property）**

1. **資源名稱**：填網站名稱（例如「王記水電行官網」）
2. **報表時區**：台灣 (GMT+8)
3. **幣別**：新台幣 (TWD)
4. 點「下一步」

**步驟四：商家資訊**

1. **產業類別**：選最接近的（例如「居家服務」）
2. **公司規模**：依實際選擇
3. **使用目的**：勾「評估使用者互動」「提升轉換率」
4. 點「建立」→ 接受服務條款

**步驟五：設定資料串流（Data Stream）**

1. 平台選「網站」
2. **網站網址**：填入客戶網站（例如 `https://www.wang-plumbing.com.tw`）
3. **串流名稱**：填「官網」
4. 點「建立串流」

建立完成後，你會看到一個 **評估 ID（Measurement ID）**，格式為 `G-XXXXXXXXXX`。這個 ID 等等安裝時會用到。

> **重要**：一個客戶 = 一個帳戶 + 一個資源。不要把所有客戶塞在同一個帳戶下，未來移交權限會很麻煩。

---

### 1.2 安裝方式一：gtag.js（直接貼 code）

最簡單的方式，適合靜態網站或快速安裝。

把以下程式碼貼到網站**每一頁**的 `<head>` 標籤內（越前面越好）：

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

> 把 `G-XXXXXXXXXX` 換成你在步驟五拿到的評估 ID。

**各框架的安裝位置：**

| 框架/平台 | 放在哪裡 |
|-----------|---------|
| 純 HTML | 每個 `.html` 檔案的 `<head>` 內 |
| WordPress | 外觀 → 自訂 → 額外 CSS/JS，或用 Insert Headers and Footers 外掛 |
| Next.js | `app/layout.tsx` 的 `<head>` 或用 `next/script` |
| Nuxt.js | `nuxt.config.ts` 的 `head.script` |
| React (Vite) | `index.html` 的 `<head>` 內 |

**Next.js App Router 範例（推薦）：**

```tsx
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### 1.3 安裝方式二：Google Tag Manager (GTM)

**建議用 GTM**。原因：

- 之後加 Facebook Pixel、LINE Tag、自訂事件，不用再動程式碼
- 客戶可以自己在 GTM 介面加追蹤碼
- 版本控管，改壞了可以回滾
- 一次安裝 GTM，之後所有追蹤碼都透過 GTM 管理

#### 步驟一：建立 GTM 帳戶

```
https://tagmanager.google.com/
```

1. 點「建立帳戶」
2. **帳戶名稱**：客戶公司名
3. **國家**：台灣
4. **容器名稱**：客戶網站網址
5. **目標平台**：網站
6. 點「建立」→ 接受服務條款

#### 步驟二：安裝 GTM 容器代碼

建立完成後，GTM 會給你兩段程式碼。你會拿到一個容器 ID，格式為 `GTM-XXXXXXX`。

**第一段：放在 `<head>` 內，越前面越好**

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

**第二段：放在 `<body>` 開頭標籤之後**

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

#### 步驟三：在 GTM 內設定 GA4 代碼

1. 進入 GTM 管理介面
2. 左側選「代碼」→「新增」
3. **代碼名稱**：`GA4 - 設定`
4. **代碼類型**：選「Google Analytics：GA4 設定」（Google 代碼）
5. **評估 ID**：填 `G-XXXXXXXXXX`
6. **觸發條件**：選「All Pages」（所有頁面）
7. 點「儲存」

#### 步驟四：發布容器

1. 點右上角「提交」
2. **版本名稱**：`初始安裝 - GA4`
3. 點「發布」

> **切記**：GTM 設定完不點「發布」，什麼追蹤都不會生效。這是新手最常犯的錯。

---

### 1.4 驗證安裝成功

安裝完畢後，**必須驗證**。不驗證就交差，後面才發現沒裝好會很尷尬。

#### 方法一：GA4 即時報表

1. 打開 GA4 → 報表 → 即時
2. 自己用瀏覽器打開客戶網站
3. 等 30 秒，即時報表應該會出現 1 位使用者
4. 如果有看到，代表安裝成功

#### 方法二：GA4 DebugView

1. 安裝 Chrome 擴充功能「Google Analytics Debugger」
2. 開啟擴充功能（圖示變綠色）
3. 瀏覽客戶網站
4. GA4 → 管理 → DebugView
5. 你會看到事件即時跳出來（page_view、scroll 等）

#### 方法三：瀏覽器開發者工具

1. 打開 Chrome DevTools（F12）
2. 切到 Network 分頁
3. 搜尋 `collect`
4. 瀏覽網站，應該會看到發往 `google-analytics.com/g/collect` 的請求

#### 方法四：GTM 預覽模式

1. GTM 管理介面 → 點「預覽」
2. 輸入客戶網站網址
3. 會打開一個帶有 debug 面板的新分頁
4. 確認 GA4 代碼有在「Tags Fired」列表中

> **四種方法至少做一種。建議用 DebugView，最可靠。**

---

## 2. GA4 基本設定

安裝完之後，以下設定**必做**。不做的話數據會不準確。

### 2.1 資料保留期設定（14 個月）

GA4 預設只保留 2 個月的使用者層級資料。改成 14 個月。

1. GA4 → 管理 → 資料設定 → 資料保留
2. **事件資料保留**：改為「14 個月」
3. **重設使用者活動的資料**：開啟
4. 點「儲存」

> **為什麼是 14 個月？** 因為這是 GA4 免費版的上限。企業版（GA4 360）可以保留更久。14 個月讓你可以做去年同期比較。

### 2.2 排除內部流量（開發者 IP）

如果不排除，你自己開發測試的流量會混進客戶的報表，數據會失真。

#### 步驟一：定義內部流量規則

1. GA4 → 管理 → 資料串流 → 點選你的串流
2. 點「設定代碼設定」（底部）
3. 展開「定義內部流量」
4. 點「建立」
5. **規則名稱**：`開發團隊`
6. **traffic_type 值**：`internal`（預設）
7. **IP 位址**：
   - 比對類型：選「IP 位址等於」
   - 值：填你的辦公室 IP（去 https://whatismyip.com 查）
8. 點「建立」

#### 步驟二：啟用資料篩選器

1. GA4 → 管理 → 資料設定 → 資料篩選器
2. 你會看到一個預設的「Internal Traffic」篩選器
3. 目前狀態是「測試中」（Testing）
4. 確認篩選器正確後，改為「啟用」（Active）

> **注意**：篩選器啟用後，被排除的流量就**永遠不會**出現在報表中（不可回溯）。建議先在「測試中」狀態確認幾天沒問題再啟用。

#### 排除多個 IP 的範例：

```
辦公室固定 IP：203.69.xx.xx
工程師家裡：114.34.xx.xx
客戶辦公室（開發期）：61.216.xx.xx
```

如果是整個子網段，可以用「IP 位址開頭為」的比對類型，例如 `203.69.123`。

### 2.3 跨網域追蹤

如果客戶有多個網域（例如主站 + 購物車在不同網域），需要設定跨網域追蹤，否則使用者從 A 網域跳到 B 網域會被計算為兩個不同的 session。

1. GA4 → 管理 → 資料串流 → 點選串流
2. 點「設定代碼設定」
3. 展開「設定跨網域」
4. 新增所有相關網域：
   - `www.wang-plumbing.com.tw`（主站）
   - `shop.wang-plumbing.com.tw`（購物車）
   - `booking.wang-plumbing.com.tw`（預約系統）
5. 比對類型選「包含」
6. 點「儲存」

> **常見案例**：客戶的官網用 WordPress，結帳頁用 Shopify / 91APP / CYBERBIZ，這種情況一定要設定跨網域追蹤。

### 2.4 增強型評估事件（Enhanced Measurement）

GA4 可以自動追蹤一些常見的使用者行為，不需要額外寫程式碼。

1. GA4 → 管理 → 資料串流 → 點選串流
2. 找到「增強型評估」區塊
3. 確認以下項目全部開啟：

| 事件 | 說明 | 建議 |
|------|------|------|
| 網頁瀏覽 (page_view) | 使用者瀏覽頁面 | **必開** |
| 捲動 (scroll) | 使用者捲動到頁面底部 90% | **必開** |
| 外連點擊 (outbound click) | 使用者點擊離開你網站的連結 | **必開** |
| 站內搜尋 (site search) | 使用者使用站內搜尋功能 | 有搜尋功能就開 |
| 影片互動 (video engagement) | YouTube 嵌入影片的觀看行為 | 有嵌 YouTube 就開 |
| 檔案下載 (file download) | 使用者下載 PDF、ZIP 等檔案 | 有提供檔案下載就開 |
| 表單互動 (form interaction) | 使用者開始填寫/送出表單 | **必開** |

> **全部開啟不會影響效能**。這些追蹤非常輕量。

---

## 3. GA4 事件追蹤

### 3.1 事件分類

GA4 的事件分為四類：

| 類型 | 說明 | 範例 |
|------|------|------|
| **自動收集** | 安裝 GA4 就有，不需設定 | `first_visit`、`session_start`、`user_engagement` |
| **增強型評估** | 第 2.4 節開啟的那些 | `page_view`、`scroll`、`click`（outbound）、`file_download` |
| **建議事件** | Google 建議的命名規範 | `login`、`sign_up`、`purchase`、`add_to_cart` |
| **自訂事件** | 你自己定義的 | `contact_form_submit`、`cta_button_click`、`price_page_view` |

> **原則**：能用自動收集 / 增強型評估就用。需要更細的追蹤再用建議事件 / 自訂事件。事件名稱一律用英文小寫加底線，不要用中文。

### 3.2 按鈕點擊追蹤（GTM + Click Trigger）

追蹤客戶網站上的 CTA 按鈕（例如「立即諮詢」「預約服務」）。

#### 步驟一：在按鈕上加識別屬性

在 HTML 上加 `data-gtm` 屬性，方便 GTM 辨識：

```html
<button class="cta-btn" data-gtm="cta-consult">
  立即諮詢
</button>

<a href="/booking" class="btn-primary" data-gtm="cta-booking">
  預約服務
</a>
```

#### 步驟二：GTM 設定 — 啟用內建變數

1. GTM → 變數 → 設定（右上角）
2. 勾選以下內建變數：
   - Click Element
   - Click Classes
   - Click ID
   - Click Text
   - Click URL

#### 步驟三：GTM 建立觸發條件

1. GTM → 觸發條件 → 新增
2. **名稱**：`CTA 按鈕點擊`
3. **觸發條件類型**：「所有元素」（All Elements）
4. **啟動條件**：「部分點擊」
5. 條件：`Click Element` → 「符合 CSS 選擇器」→ `[data-gtm]`
6. 點「儲存」

#### 步驟四：GTM 建立代碼

1. GTM → 代碼 → 新增
2. **名稱**：`GA4 - CTA 按鈕點擊`
3. **代碼類型**：「Google Analytics：GA4 事件」
4. **設定代碼**：選你的 GA4 設定代碼
5. **事件名稱**：`cta_click`
6. **事件參數**：

| 參數名稱 | 值 |
|---------|-----|
| `button_text` | `{{Click Text}}` |
| `button_location` | `{{Page Path}}` |
| `button_type` | `{{Click Element}}` 的 data-gtm 屬性 |

7. **觸發條件**：選剛才建立的「CTA 按鈕點擊」
8. 儲存 → 發布

#### 用 gtag.js 直接追蹤（不用 GTM）：

```html
<button onclick="trackCTA('consult')">立即諮詢</button>
<button onclick="trackCTA('booking')">預約服務</button>

<script>
function trackCTA(buttonType) {
  gtag('event', 'cta_click', {
    button_type: buttonType,
    button_location: window.location.pathname
  });
}
</script>
```

### 3.3 表單提交追蹤

#### 方法一：GTM 表單提交觸發條件

1. GTM → 觸發條件 → 新增
2. **類型**：「表單提交」
3. **啟動條件**：「部分表單」
4. 條件：`Form ID` 等於 `contact-form`（或你表單的 ID）
5. 勾選「檢查驗證」（確保表單真的送出才觸發）

#### 方法二：用 Data Layer 推送（更精準）

在表單成功送出後，推送事件到 Data Layer：

```javascript
// 表單送出成功後執行
function onFormSubmitSuccess(formName) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'form_submit',
    form_name: formName,
    form_location: window.location.pathname
  });
}

// 範例：聯繫表單
document.getElementById('contact-form').addEventListener('submit', function(e) {
  // 先做表單驗證...
  // 驗證通過後：
  fetch('/api/contact', {
    method: 'POST',
    body: new FormData(this)
  })
  .then(response => {
    if (response.ok) {
      onFormSubmitSuccess('contact');
      // 顯示成功訊息
    }
  });
});
```

GTM 端設定：
1. 觸發條件 → 新增 → 類型「自訂事件」
2. 事件名稱：`form_submit`
3. 建立 Data Layer 變數 `form_name`（變數類型：資料層變數，名稱 `form_name`）
4. 建立 GA4 事件代碼，事件名稱 `form_submit`，參數帶上 `form_name`

### 3.4 影片觀看追蹤

GA4 增強型評估已經自動追蹤**嵌入的 YouTube 影片**。它會記錄：
- `video_start`：開始播放
- `video_progress`：播到 10%、25%、50%、75%
- `video_complete`：播放完畢

如果客戶的影片**不是 YouTube**（自架或 Vimeo），需要手動追蹤：

```javascript
// 自架影片追蹤範例
const video = document.getElementById('intro-video');

video.addEventListener('play', function() {
  gtag('event', 'video_start', {
    video_title: '公司介紹影片',
    video_provider: 'self-hosted',
    video_url: video.currentSrc
  });
});

video.addEventListener('ended', function() {
  gtag('event', 'video_complete', {
    video_title: '公司介紹影片',
    video_provider: 'self-hosted'
  });
});

// 追蹤播放進度（25%, 50%, 75%）
let milestones = [25, 50, 75];
let reportedMilestones = [];

video.addEventListener('timeupdate', function() {
  const percent = Math.floor((video.currentTime / video.duration) * 100);
  milestones.forEach(milestone => {
    if (percent >= milestone && !reportedMilestones.includes(milestone)) {
      reportedMilestones.push(milestone);
      gtag('event', 'video_progress', {
        video_title: '公司介紹影片',
        video_percent: milestone
      });
    }
  });
});
```

### 3.5 電商事件追蹤

如果客戶有電商功能（購物車、結帳），以下事件**必須**追蹤。這是 Google 建議事件（Recommended Events），GA4 的電商報表靠這些事件產生。

#### 查看商品 (view_item)

```javascript
gtag('event', 'view_item', {
  currency: 'TWD',
  value: 1280,
  items: [{
    item_id: 'SKU-A001',
    item_name: '經典白色 T-shirt',
    item_category: '上衣',
    item_brand: '客戶品牌',
    price: 1280,
    quantity: 1
  }]
});
```

#### 加入購物車 (add_to_cart)

```javascript
gtag('event', 'add_to_cart', {
  currency: 'TWD',
  value: 1280,
  items: [{
    item_id: 'SKU-A001',
    item_name: '經典白色 T-shirt',
    item_category: '上衣',
    price: 1280,
    quantity: 1
  }]
});
```

#### 開始結帳 (begin_checkout)

```javascript
gtag('event', 'begin_checkout', {
  currency: 'TWD',
  value: 3560,
  coupon: 'SPRING2026',
  items: [
    { item_id: 'SKU-A001', item_name: '經典白色 T-shirt', price: 1280, quantity: 1 },
    { item_id: 'SKU-B003', item_name: '牛仔短褲', price: 2280, quantity: 1 }
  ]
});
```

#### 完成購買 (purchase)

```javascript
gtag('event', 'purchase', {
  transaction_id: 'ORD-20260305-001',
  value: 3560,
  tax: 169,
  shipping: 60,
  currency: 'TWD',
  coupon: 'SPRING2026',
  items: [
    { item_id: 'SKU-A001', item_name: '經典白色 T-shirt', price: 1280, quantity: 1 },
    { item_id: 'SKU-B003', item_name: '牛仔短褲', price: 2280, quantity: 1 }
  ]
});
```

> **重要**：`purchase` 事件的 `transaction_id` 必須唯一。GA4 會自動去重，同一個 `transaction_id` 只會記錄一次。放在「感謝頁/訂單完成頁」觸發。

#### Data Layer 方式（GTM 推薦）

```javascript
// 在訂單完成頁的 <script> 中推送
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'ORD-20260305-001',
    value: 3560,
    tax: 169,
    shipping: 60,
    currency: 'TWD',
    items: [
      {
        item_id: 'SKU-A001',
        item_name: '經典白色 T-shirt',
        item_category: '上衣',
        price: 1280,
        quantity: 1
      }
    ]
  }
});
```

---

## 4. GA4 轉換目標

### 4.1 設定轉換事件

轉換（Conversion）是你最關心的使用者行為。GA4 中，轉換就是「被標記為轉換的事件」。

**常見轉換事件：**

| 事件 | 適用場景 |
|------|---------|
| `form_submit` | 聯繫表單送出（接案最常用） |
| `purchase` | 電商完成購買 |
| `sign_up` | 會員註冊 |
| `generate_lead` | 潛在客戶名單收集 |
| `cta_click` | CTA 按鈕點擊 |
| `phone_call` | 點擊電話號碼（行動版） |

**設定步驟：**

1. GA4 → 管理 → 事件
2. 找到你要標記為轉換的事件（例如 `form_submit`）
3. 將右邊的「標記為轉換」開關打開
4. 完成

> **如果事件還沒出現在列表中**（因為還沒有人觸發過），可以手動建立：
> 管理 → 轉換 → 新增轉換事件 → 輸入事件名稱

#### 電話點擊追蹤（接案網站常用）

很多客戶的網站有「撥打電話」按鈕，這在行動版特別重要：

```html
<a href="tel:+886912345678" onclick="trackPhoneCall()">
  撥打電話：0912-345-678
</a>

<script>
function trackPhoneCall() {
  gtag('event', 'phone_call', {
    phone_number: '0912345678',
    call_source: window.location.pathname
  });
}
</script>
```

把 `phone_call` 標記為轉換事件。

### 4.2 Funnel 漏斗分析

漏斗分析讓你看到使用者在轉換過程中哪一步流失最多。

**設定步驟：**

1. GA4 → 探索 → 建立新的探索
2. 技巧選「漏斗探索」
3. 設定步驟：

**範例一：聯繫表單漏斗**

```
步驟 1：瀏覽首頁 (page_view, page_location 含 "/")
步驟 2：瀏覽服務頁 (page_view, page_location 含 "/services")
步驟 3：瀏覽聯繫頁 (page_view, page_location 含 "/contact")
步驟 4：送出表單 (form_submit)
```

**範例二：電商購買漏斗**

```
步驟 1：查看商品 (view_item)
步驟 2：加入購物車 (add_to_cart)
步驟 3：開始結帳 (begin_checkout)
步驟 4：完成購買 (purchase)
```

4. 設定完成後，GA4 會用圖表顯示每一步的完成率和流失率

> **重點觀察**：哪一步流失率最高？如果很多人加入購物車但沒結帳，可能是運費太高或結帳流程太複雜。這就是你跟客戶報告時的具體建議依據。

---

## 5. GA4 報表快速指南

### 5.1 即時報表（Realtime）

**位置**：報表 → 即時

顯示過去 30 分鐘內的活動。用途：
- 驗證追蹤碼是否安裝成功
- 行銷活動上線後即時觀察效果
- 確認新事件是否正確觸發

看到的資訊：
- 目前活躍使用者數
- 流量來源
- 使用者位置（地圖）
- 觸發的事件
- 轉換次數

### 5.2 使用者 → 客層 / 裝置 / 地區

**位置**：報表 → 使用者 → 使用者屬性

| 報表 | 告訴你什麼 | 給客戶的洞察 |
|------|-----------|-------------|
| 客層總覽 | 使用者的年齡、性別 | 「你的客群主要是 25-34 歲女性」 |
| 技術 → 裝置 | 手機 vs 桌機 vs 平板 | 「80% 用手機看，行動版體驗很重要」 |
| 技術 → 瀏覽器 | Chrome / Safari / Edge | 「要確保 Safari 上顯示正常」 |
| 地理位置 | 城市 / 國家 | 「你的客群主要在台北、新北、桃園」 |

> **注意**：客層資料（年齡、性別）需要啟用 Google Signals 才會有。路徑：管理 → 資料設定 → 資料收集 → 開啟 Google 信號。

### 5.3 流量來源分析

**位置**：報表 → 流量開發 → 流量開發總覽

| 管道 | 說明 | 常見來源 |
|------|------|---------|
| Organic Search | 搜尋引擎自然流量 | Google、Bing |
| Direct | 直接輸入網址 / 書籤 | 無 referrer |
| Social | 社群媒體 | Facebook、Instagram、LINE |
| Referral | 其他網站連過來 | 合作夥伴、論壇 |
| Paid Search | 搜尋廣告 | Google Ads |
| Display | 多媒體廣告 | Google Display Network |
| Email | 電子郵件 | 電子報 |
| (Other) | 無法分類 | UTM 沒設好 |

> **給客戶的重點**：「你的流量主要從哪來？」比例圓餅圖一看就懂。如果 90% 是 Direct，代表客戶的品牌知名度高但 SEO 可能沒做好。

### 5.4 頁面與畫面

**位置**：報表 → 參與 → 頁面與畫面

重要指標：
- **瀏覽次數**：這頁被看了幾次
- **使用者數**：有多少人看過這頁
- **平均互動時間**：使用者在這頁停留多久
- **跳出率**：只看這一頁就離開的比率

> **實務解讀**：如果服務頁瀏覽次數高但聯繫頁瀏覽次數低 → 服務頁到聯繫頁的引導不夠明確，需要加 CTA。

### 5.5 自訂報表

GA4 的「探索」功能可以建立自訂報表。

**建立步驟：**

1. GA4 → 探索 → 建立新的探索
2. 選擇技巧：
   - **自由形式**：最常用，自由拖拉維度和指標
   - **漏斗探索**：步驟轉換分析
   - **路徑探索**：使用者瀏覽路徑
   - **區隔重疊**：比較不同使用者群

**實用自訂報表範例 — 各頁面轉換率：**

- **維度**：`頁面標題`
- **指標**：`瀏覽次數`、`轉換次數`、`轉換率`
- **篩選**：排除首頁（只看內頁）
- **排序**：依轉換率遞減

---

## 6. Google Search Console 設定

### 6.1 進入 Search Console

```
https://search.google.com/search-console/
```

用 Google 帳號登入。

### 6.2 新增資源 — 驗證網站所有權

有兩種資源類型：

| 類型 | 說明 | 建議 |
|------|------|------|
| **網域** | 涵蓋所有子網域（www / blog / shop） | **建議選這個** |
| **網址前置字元** | 只涵蓋特定 URL 前綴 | 如果只管一個子網域 |

#### 驗證方式一：DNS TXT 記錄（網域型專用，最推薦）

1. 選「網域」→ 輸入網域（例如 `wang-plumbing.com.tw`）
2. Google 會給你一段 TXT 記錄，類似：

```
google-site-verification=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

3. 到客戶的 DNS 管理後台（Cloudflare / GoDaddy / 中華電信 HiNet 等）
4. 新增一筆 TXT 記錄：
   - **主機**：`@`（根網域）
   - **類型**：TXT
   - **值**：貼上 Google 給的驗證碼
5. 等待 DNS 生效（通常 5-30 分鐘，最久 48 小時）
6. 回到 Search Console 點「驗證」

> **Cloudflare 操作路徑**：登入 → 選網域 → DNS → 記錄 → 新增記錄 → 類型 TXT

#### 驗證方式二：HTML 檔案上傳

1. 選「網址前置字元」→ 輸入完整網址
2. 下載 Google 提供的 HTML 驗證檔案（例如 `google1234abcd.html`）
3. 上傳到網站根目錄
4. 確認可以訪問：`https://www.wang-plumbing.com.tw/google1234abcd.html`
5. 回到 Search Console 點「驗證」

#### 驗證方式三：HTML meta tag

在首頁的 `<head>` 內加入：

```html
<meta name="google-site-verification" content="你的驗證碼" />
```

#### 驗證方式四：透過 GA 驗證

如果網站已經安裝了 GA4 的 gtag.js，而且你用同一個 Google 帳號，Search Console 會自動偵測並驗證。這是最方便的方式。

> **建議順序**：先裝 GA4 → 再開 Search Console → 用 GA 自動驗證。快又不需要動 DNS。

### 6.3 提交 Sitemap

Sitemap 告訴 Google 你的網站有哪些頁面。

1. Search Console → 左側「Sitemap」
2. 輸入 Sitemap 網址：

```
https://www.wang-plumbing.com.tw/sitemap.xml
```

3. 點「提交」

**確認 Sitemap 存在：**

常見的 Sitemap 位置：
- `/sitemap.xml`（最常見）
- `/sitemap_index.xml`（大型網站）
- `/wp-sitemap.xml`（WordPress 5.5+ 內建）

**如果沒有 Sitemap：**

| 平台 | 怎麼產生 |
|------|---------|
| WordPress | 安裝 Yoast SEO 或 Rank Math 外掛，自動產生 |
| Next.js | 用 `next-sitemap` 套件 |
| 靜態網站 | 用 https://www.xml-sitemaps.com/ 線上產生 |

**Next.js sitemap 範例：**

```javascript
// next-sitemap.config.js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.wang-plumbing.com.tw',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin/*', '/api/*'],
};
```

### 6.4 檢查 URL（索引狀態）

1. Search Console 頂部搜尋列 → 貼入要檢查的 URL
2. 你會看到：
   - **已索引**：Google 已經收錄，搜尋得到
   - **未索引**：Google 知道但還沒收錄
   - **找不到**：Google 完全不知道這個頁面

如果某個重要頁面沒被索引，可以點「要求建立索引」手動提交。

> **注意**：「要求建立索引」有每日上限，不要對所有頁面都按。讓 Google 自己爬就好，只對重要的新頁面手動提交。

### 6.5 覆蓋率報告（頁面索引報告）

**位置**：Search Console → 索引 → 頁面

這份報告分四個類別：

| 類別 | 說明 | 該怎麼辦 |
|------|------|---------|
| **錯誤** | 無法索引的頁面 | **必須處理** — 伺服器錯誤 (5xx)、重新導向錯誤 |
| **警告** | 已索引但有問題 | 檢查看看 — 例如被 `noindex` 但又在 sitemap 中 |
| **有效** | 正常被索引的頁面 | 好消息，確認數量對不對 |
| **排除** | 被排除不索引 | 大部分正常（重複頁面、noindex 頁面）但要檢查有沒有誤排除 |

**常見錯誤與解決方式：**

| 錯誤 | 原因 | 解決方式 |
|------|------|---------|
| 伺服器錯誤 (5xx) | 伺服器當掉或回傳 500 | 修伺服器問題 |
| 重新導向錯誤 | 重新導向鏈太長或循環 | 檢查 `.htaccess` 或 nginx 設定 |
| 已提交的 URL 含有 noindex | sitemap 裡有頁面但頁面上加了 noindex | 從 sitemap 移除，或拿掉 noindex |
| 軟性 404 | 頁面回傳 200 但內容像 404 | 修正頁面內容或回傳正確的 404 |
| 封鎖的 URL | robots.txt 擋住 | 檢查 robots.txt |

---

## 7. Search Console 日常使用

### 7.1 成效報告（最重要的報表）

**位置**：Search Console → 成效 → 搜尋結果

四個核心指標：

| 指標 | 說明 | 重要性 |
|------|------|--------|
| **曝光次數** | 你的網頁出現在搜尋結果中幾次 | 知名度指標 |
| **點擊次數** | 使用者真的點進來幾次 | 流量指標 |
| **平均點閱率 (CTR)** | 點擊 / 曝光 | 標題和描述吸引力指標 |
| **平均排名** | 你的網頁在搜尋結果中的平均位置 | SEO 成效指標 |

> **健康數值參考**（一般企業官網）：
> - 平均排名 < 20（前兩頁）→ 不錯
> - CTR > 3% → 正常
> - CTR > 5% → 很好
> - 第 1 名 CTR 通常 25-35%

### 7.2 查詢關鍵字分析

在成效報告中切到「查詢」分頁，可以看到使用者用什麼關鍵字找到你的網站。

**實用分析方法：**

1. **高曝光低 CTR 的關鍵字** → 標題/描述不夠吸引人，需要優化 meta title 和 description
2. **排名在 8-20 名的關鍵字** → 有機會進入前 10，值得投入 SEO 優化
3. **意想不到的關鍵字** → 發現新的市場機會，可以針對這些關鍵字產出內容

**篩選技巧：**

- 點「+ 新增」→ 篩選特定查詢、頁面、國家、裝置
- 比較功能：選兩個時間範圍比較（例如本月 vs 上月）
- 匯出 CSV 做進階分析

### 7.3 頁面索引問題排查

**排查流程：**

```
1. 查看「頁面」報告 → 有沒有新的錯誤？
2. 有錯誤 → 點進去看影響哪些 URL
3. 修正問題
4. 回到 Search Console → 在錯誤項目旁點「驗證修正」
5. Google 會在幾天內重新檢查
```

### 7.4 行動裝置可用性

**位置**：Search Console → 體驗 → 行動裝置可用性

常見問題：
- **文字太小**：字級至少 16px
- **可點擊元素太靠近**：按鈕之間要有足夠間距（至少 8px）
- **內容寬度超過螢幕**：確認有 `<meta name="viewport" content="width=device-width, initial-scale=1">` 和 RWD
- **使用不相容的外掛程式**：不要用 Flash（2026 年應該沒人用了吧）

### 7.5 Core Web Vitals 報告

**位置**：Search Console → 體驗 → Core Web Vitals

三個核心指標：

| 指標 | 全名 | 衡量什麼 | 良好標準 |
|------|------|---------|---------|
| **LCP** | Largest Contentful Paint | 最大內容繪製時間 | < 2.5 秒 |
| **INP** | Interaction to Next Paint | 互動到下一次繪製 | < 200 毫秒 |
| **CLS** | Cumulative Layout Shift | 累計版面位移 | < 0.1 |

**常見優化方向：**

| 指標差 | 可能原因 | 解決方式 |
|--------|---------|---------|
| LCP 太高 | 大圖片、字型載入慢 | 圖片壓縮 + lazy load + 字型 preload |
| INP 太高 | JS 太多、主執行緒被佔 | 程式碼分割 + defer JS |
| CLS 太高 | 圖片沒設寬高、動態插入內容 | 給圖片設 width/height + 預留空間 |

```html
<!-- 優化 LCP：圖片 preload -->
<link rel="preload" as="image" href="/hero-image.webp" />

<!-- 優化 CLS：圖片設定固定尺寸 -->
<img src="/hero-image.webp" width="1200" height="600" alt="..." loading="eager" />

<!-- 優化 INP：非關鍵 JS defer -->
<script src="/analytics.js" defer></script>
```

### 7.6 手動處罰檢查

**位置**：Search Console → 安全性與手動處罰 → 手動處罰

如果這裡顯示「未偵測到問題」就沒事。

如果有手動處罰，常見原因：
- 不自然的反向連結（買連結被抓）
- 純垃圾內容
- 隱藏文字/連結
- 導流頁面

> **處理方式**：修正問題 → 點「要求審查」→ 等 Google 重新審查（通常 1-2 週）

---

## 8. 給客戶的月報模板

每月做一份報告給客戶，讓他知道錢花得值得。以下是實用的模板格式。

### 8.1 月報結構

```
================================================
  [客戶名稱] 網站月報
  報告期間：2026 年 3 月
  製作日期：2026-04-01
  製作者：[你的名字/工作室名]
================================================

一、流量總覽
二、熱門頁面 Top 10
三、流量來源分布
四、搜尋關鍵字 Top 20
五、裝置分布
六、轉換數據
七、建議行動項目
```

### 8.2 一、流量總覽（本月 vs 上月）

```
┌─────────────────────────────────────────────────────┐
│  流量總覽                                            │
├──────────────┬──────────┬──────────┬────────────────┤
│  指標         │  本月     │  上月     │  變化          │
├──────────────┼──────────┼──────────┼────────────────┤
│  總使用者數   │  3,542    │  3,180    │  +11.4% ↑     │
│  新使用者數   │  2,891    │  2,604    │  +11.0% ↑     │
│  工作階段數   │  5,127    │  4,688    │  +9.4% ↑      │
│  互動工作階段 │  4,102    │  3,750    │  +9.4% ↑      │
│  平均互動時間 │  1 分 42 秒│  1 分 35 秒│  +7.3% ↑     │
│  跳出率       │  38.2%    │  41.5%    │  -3.3% ↓ (好) │
│  每階段頁面數 │  2.8      │  2.5      │  +12.0% ↑     │
└──────────────┴──────────┴──────────┴────────────────┘

摘要：本月流量穩定成長 11%，使用者互動品質也有提升，
     跳出率下降 3.3% 代表內容越來越吸引使用者停留。
```

### 8.3 二、熱門頁面 Top 10

```
┌────┬─────────────────────────────┬────────┬──────────┐
│ #  │  頁面                        │ 瀏覽數  │ 平均停留  │
├────┼─────────────────────────────┼────────┼──────────┤
│  1 │  / (首頁)                    │  2,105  │  0:45    │
│  2 │  /services (服務項目)         │  1,234  │  2:12    │
│  3 │  /about (關於我們)            │    876  │  1:30    │
│  4 │  /blog/water-heater-guide    │    654  │  3:45    │
│  5 │  /contact (聯繫我們)          │    543  │  1:15    │
│  6 │  /portfolio (作品集)          │    432  │  2:00    │
│  7 │  /blog/kitchen-renovation    │    321  │  3:20    │
│  8 │  /pricing (價格方案)          │    298  │  1:50    │
│  9 │  /faq (常見問題)              │    256  │  2:30    │
│ 10 │  /blog/bathroom-tips         │    198  │  4:10    │
└────┴─────────────────────────────┴────────┴──────────┘

洞察：部落格文章的停留時間最長（3-4 分鐘），代表內容品質好。
     建議持續經營部落格，帶動 SEO 自然流量。
```

### 8.4 三、流量來源分布

```
流量來源分布：

  Organic Search (自然搜尋)  ██████████████████  45.2%  (1,601)
  Direct (直接流量)          ████████████        28.1%  (  995)
  Social (社群)              ██████              14.3%  (  507)
  Referral (推薦連結)        ████                 8.7%  (  308)
  Paid Search (搜尋廣告)     █                    2.5%  (   89)
  Email (電子郵件)           ░                    1.2%  (   42)

社群明細：
  - Facebook：312 次 (61.5%)
  - Instagram：118 次 (23.3%)
  - LINE：52 次 (10.3%)
  - 其他：25 次 (4.9%)

洞察：自然搜尋佔比最高（45%），SEO 成效良好。
     建議加強 Instagram 經營，目前佔比偏低但成長潛力大。
```

### 8.5 四、搜尋關鍵字 Top 20

```
┌────┬───────────────────────┬───────┬──────┬───────┬──────┐
│ #  │  關鍵字               │ 曝光   │ 點擊  │ CTR   │ 排名  │
├────┼───────────────────────┼───────┼──────┼───────┼──────┤
│  1 │ 王記水電行             │  1,200 │  320 │ 26.7% │  1.2 │
│  2 │ 台北水電維修            │    890 │  125 │ 14.0% │  3.5 │
│  3 │ 熱水器安裝推薦          │    650 │   78 │ 12.0% │  5.2 │
│  4 │ 廚房翻新費用            │    520 │   45 │  8.7% │  7.8 │
│  5 │ 浴室漏水修理            │    480 │   42 │  8.8% │  6.3 │
│  6 │ 水電行推薦 台北         │    420 │   38 │  9.0% │  4.1 │
│  7 │ 馬桶不通 自己修         │    380 │   35 │  9.2% │  8.5 │
│  8 │ 冷氣安裝費用            │    350 │   28 │  8.0% │  9.2 │
│  9 │ 王記水電 評價           │    300 │   85 │ 28.3% │  1.5 │
│ 10 │ 抽水馬達維修            │    280 │   22 │  7.9% │ 11.3 │
│ 11 │ 水管漏水 處理方式       │    260 │   20 │  7.7% │ 12.5 │
│ 12 │ 熱水器推薦 2026         │    240 │   18 │  7.5% │ 10.8 │
│ 13 │ 台北 水電維修 24小時    │    220 │   25 │ 11.4% │  6.7 │
│ 14 │ 水塔清洗 費用           │    200 │   15 │  7.5% │ 14.2 │
│ 15 │ 水龍頭更換              │    180 │   12 │  6.7% │ 13.1 │
│ 16 │ 浴室整修 報價           │    160 │   10 │  6.3% │ 15.8 │
│ 17 │ 水電師傅 北投           │    140 │   18 │ 12.9% │  5.5 │
│ 18 │ 洗碗機安裝              │    120 │    8 │  6.7% │ 16.3 │
│ 19 │ 排水孔堵塞              │    100 │    6 │  6.0% │ 18.5 │
│ 20 │ 淨水器安裝 推薦         │     90 │    5 │  5.6% │ 17.2 │
└────┴───────────────────────┴───────┴──────┴───────┴──────┘

機會關鍵字（高曝光但排名可改進）：
  - 「廚房翻新費用」排名 7.8 → 可優化到前 5
  - 「馬桶不通 自己修」排名 8.5 → 寫一篇教學文可衝上去
  - 「冷氣安裝費用」排名 9.2 → 差一點就進前頁
```

### 8.6 五、裝置分布

```
裝置分布：

  行動裝置 (Mobile)   ████████████████████  72.4%  (2,564)
  桌上型電腦 (Desktop) ████████              24.1%  (  854)
  平板 (Tablet)        █                      3.5%  (  124)

作業系統：
  - iOS：1,538 (43.4%)
  - Android：1,026 (29.0%)
  - Windows：712 (20.1%)
  - macOS：142 (4.0%)
  - 其他：124 (3.5%)

洞察：超過 7 成使用者用手機瀏覽，行動版體驗是最重要的。
     建議定期在手機上測試網站（特別是 iOS Safari）。
```

### 8.7 六、轉換數據

```
┌──────────────────────┬──────┬──────┬──────────┐
│  轉換事件             │ 本月  │ 上月  │ 變化     │
├──────────────────────┼──────┼──────┼──────────┤
│  聯繫表單送出          │   32 │   28 │ +14.3% ↑ │
│  電話點擊              │   45 │   39 │ +15.4% ↑ │
│  LINE 加好友點擊       │   18 │   15 │ +20.0% ↑ │
│  服務報價表單           │   12 │    9 │ +33.3% ↑ │
├──────────────────────┼──────┼──────┼──────────┤
│  轉換總計              │  107 │   91 │ +17.6% ↑ │
└──────────────────────┴──────┴──────┴──────────┘

轉換率：107 / 3,542 = 3.02%（上月 2.86%）

洞察：每 33 位訪客就有 1 位採取行動，轉換率健康。
     電話點擊是最主要的轉換管道，建議在手機版加強電話按鈕的能見度。
```

### 8.8 七、建議行動項目

```
本月建議行動項目：

 [高優先] 寫一篇「馬桶不通 DIY 教學」部落格文章
          理由：該關鍵字曝光高但排名在第 8，一篇好文章可以衝到前 3

 [高優先] 優化「廚房翻新費用」頁面的 SEO
          理由：曝光 520 次但排名 7.8，meta title 和 H1 需要更精準

 [中優先] 加強 Instagram 經營頻率
          理由：IG 流量只佔 23%，但目標客群（25-44 歲）大量使用 IG

 [中優先] 行動版「預約服務」按鈕放大並固定在底部
          理由：72% 使用者在手機上，但行動版轉換率低於桌機版

 [低優先] 建立 Google 商家檔案（Google Business Profile）
          理由：本地搜尋「台北水電行」可以出現在地圖包中
```

---

## 9. 權限管理

### 9.1 GA4 權限等級

| 等級 | 權限 | 說明 |
|------|------|------|
| **管理員** | 完整控管 | 可以管理使用者、修改設定、刪除資源 |
| **編輯者** | 管理設定 | 可以修改設定、建立轉換，但不能管理使用者 |
| **行銷人員** | 建立受眾 | 可以建立/編輯受眾（較少用） |
| **分析師** | 建立報表 | 可以建立自訂報表和探索，不能改設定 |
| **檢視者** | 只看報表 | 只能看現有報表，不能建立也不能改 |

### 9.2 給客戶什麼權限

**建議做法：**

| 角色 | 給什麼權限 | 原因 |
|------|-----------|------|
| **客戶老闆** | 管理員 | 這是客戶的資產，他要有最高權限 |
| **客戶行銷人員** | 分析師 | 可以看報表和建自訂探索，但不會改壞設定 |
| **你自己（接案方）** | 編輯者 | 你需要修改設定和建立轉換，但帳戶所有權在客戶手上 |
| **客戶老闆家人/朋友** | 檢視者 | 只看不碰 |

**新增使用者步驟：**

1. GA4 → 管理 → 帳戶存取管理（帳戶級）或資源存取管理（資源級）
2. 點右上角「+」→「新增使用者」
3. 輸入對方的 Gmail
4. 選擇權限等級
5. 點「新增」

> **重要原則**：帳戶擁有者一定是客戶。你是協力廠商，用編輯者權限就好。這樣未來客戶要換合作對象，直接移除你的權限即可，不用整個帳戶重建。

### 9.3 多客戶管理（組織帳戶）

如果你同時管理 5 個以上客戶的 GA，建議用「組織」統一管理。

**Google Marketing Platform 組織：**

```
https://marketingplatform.google.com/
```

1. 建立組織（用你工作室的 Google 帳號）
2. 把各客戶的 GA4 帳戶連結到組織下
3. 你可以在一個介面切換不同客戶的 GA4

**但更實務的做法是：**

- 每個客戶獨立建立 GA4 帳戶（他們是帳戶管理員）
- 你被加為每個帳戶的編輯者
- 用 Chrome 的多重登入切換，或用不同 Chrome Profile

> **Chrome Profile 技巧**：為每個客戶建一個 Chrome Profile，登入該客戶的 GA/Search Console。切換 Profile 比切換帳號方便得多。

### 9.4 Search Console 權限

| 等級 | 權限 |
|------|------|
| **擁有者** | 完整控管 + 可以新增/移除其他使用者 |
| **完整使用者** | 可以查看所有資料 + 提交 sitemap + 要求索引 |
| **受限使用者** | 只能查看部分資料 |

**建議**：客戶是擁有者，你是完整使用者。

---

## 10. 常見問題

### 10.1 資料不準 — 被 Ad Blocker 擋

**問題**：Ad Blocker（如 uBlock Origin、Adblock Plus）會擋掉 GA4 的追蹤請求，導致實際流量比報表數字高。

**影響範圍**：大約 25-40% 的桌機使用者、5-10% 的手機使用者會使用 Ad Blocker。

**解決方案（依複雜度排序）：**

1. **接受它**（最務實）：跟客戶說明 GA4 數字偏低是正常的，實際流量會更高。報表看「趨勢」比「絕對數字」重要。

2. **Server-side tagging**（進階）：透過你自己的 server 中轉追蹤請求，Ad Blocker 擋不到。需要額外設定 GTM Server Container（需要一台 server，月費約 US$50-150）。

3. **用 Google Tag Manager Server-Side**：
   - 在 Google Cloud Platform 建立 Tag Manager Server Container
   - 設定自訂網域（例如 `analytics.wang-plumbing.com.tw`）
   - Ad Blocker 只擋 `google-analytics.com`，擋不到你的自訂網域

> **給客戶的說法**：「GA4 的數字大約代表實際流量的 70-80%。我們看的是趨勢變化，每個月用同樣的標準在比。如果這個月比上個月成長 10%，那就是真的成長 10%，不會因為 Ad Blocker 而失準。」

### 10.2 自己的流量被計入

**問題**：你在開發/測試時的流量混進客戶報表。

**解決方案：**

1. **排除 IP**（第 2.2 節已說明）
2. **GTM 預覽模式不會觸發正式追蹤碼**
3. **GA4 DebugView 的流量不計入正式報表**
4. **Chrome 擴充功能**：安裝「Google Analytics Opt-out Add-on」，開發時開著它

```
https://tools.google.com/dlpage/gaoptout
```

5. **用 GTM 排除特定 cookie**：

在你的瀏覽器 console 執行：
```javascript
document.cookie = "developer_mode=true; expires=Fri, 31 Dec 2027 23:59:59 GMT; path=/";
```

GTM 觸發條件加上排除：`1st Party Cookie` → `developer_mode` 不等於 `true`。

### 10.3 UTM 參數使用（追蹤廣告/社群成效）

UTM 參數讓你知道流量從哪個特定活動來。在 GA4 的流量來源報表中會自動分類。

**五個 UTM 參數：**

| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `utm_source` | **是** | 流量來源 | `facebook`、`google`、`newsletter` |
| `utm_medium` | **是** | 行銷媒介 | `cpc`、`social`、`email` |
| `utm_campaign` | **是** | 活動名稱 | `spring_sale_2026`、`new_service_launch` |
| `utm_term` | 否 | 付費關鍵字 | `水電維修` |
| `utm_content` | 否 | 區分同一活動的不同版本 | `banner_a`、`text_link` |

**UTM 產生器：**

```
https://ga-dev-tools.google/ga4/campaign-url-builder/
```

**常用 UTM 範例：**

```
Facebook 貼文：
https://www.wang-plumbing.com.tw/services?utm_source=facebook&utm_medium=social&utm_campaign=march_promo

IG 限動連結：
https://www.wang-plumbing.com.tw/booking?utm_source=instagram&utm_medium=social&utm_campaign=ig_story_cta

LINE 群發訊息：
https://www.wang-plumbing.com.tw/spring-sale?utm_source=line&utm_medium=message&utm_campaign=spring_sale_2026

電子報：
https://www.wang-plumbing.com.tw/blog/new-post?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest_w10

Google 廣告（手動設定時）：
https://www.wang-plumbing.com.tw/services?utm_source=google&utm_medium=cpc&utm_campaign=taipei_plumbing&utm_term=台北水電維修
```

**UTM 命名規範（建議統一）：**

```
來源 (source)：全小寫英文，不加空格
  facebook, instagram, line, google, newsletter, partner_xxx

媒介 (medium)：用 Google 標準分類
  cpc = 付費點擊廣告
  social = 社群（自然）
  email = 電子郵件
  referral = 推薦連結
  display = 多媒體廣告
  message = 訊息推播（LINE、SMS）

活動 (campaign)：小寫 + 底線，含日期或月份
  spring_sale_2026
  march_promo
  new_service_launch_202603
```

> **重要**：UTM 參數大小寫敏感。`Facebook` 和 `facebook` 在 GA4 中是兩個不同的來源。**統一用全小寫**。

### 10.4 GA4 和 Search Console 串接

把 GA4 和 Search Console 串接起來，可以在 GA4 裡面直接看到 Search Console 的資料。

**步驟：**

1. GA4 → 管理 → 產品連結 → Search Console 連結
2. 點「連結」
3. 選擇你的 Search Console 資源
4. 選擇要對應的 GA4 資料串流
5. 點「提交」

串接完成後，GA4 → 報表 → Search Console 會出現：
- **查詢**：使用者用什麼關鍵字找到你
- **Google 自然搜尋流量**：從搜尋引擎來的流量表現

### 10.5 常見安裝失敗原因

| 問題 | 可能原因 | 解決方式 |
|------|---------|---------|
| 即時報表沒反應 | 追蹤碼沒安裝到 | 檢查原始碼有沒有 gtag.js 或 GTM |
| 資料有延遲 | GA4 正常延遲 24-48 小時 | 用即時報表確認即可，標準報表等一天 |
| 事件重複計算 | 安裝了兩次（gtag + GTM 都裝） | 只留一個，刪掉另一個 |
| GTM 設定完沒資料 | 忘記發布容器 | GTM → 提交 → 發布 |
| SPA 只記錄首頁 | 單頁應用換頁不觸發 page_view | GTM 設定 History Change 觸發條件 |
| 跨網域流量被當新使用者 | 沒設定跨網域追蹤 | 參考第 2.3 節設定 |

### 10.6 SPA（單頁應用程式）追蹤設定

如果客戶網站用 React / Vue / Next.js 等 SPA 框架，換頁不會真的載入新頁面，GA4 可能漏記。

**GA4 增強型評估的 page_view 已經支援 History Change**（瀏覽器網址改變時自動觸發），但如果不準確，可以手動發送：

```javascript
// React Router 範例
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // 每次路由變化都發送 page_view
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: location.pathname + location.search
    });
  }, [location]);
}

// 在 App 組件中使用
function App() {
  usePageTracking();
  return <RouterProvider router={router} />;
}
```

**Next.js App Router（自動處理）：**

Next.js App Router 每次換頁會觸發完整的頁面載入事件，GA4 增強型評估通常能正確追蹤。如果發現漏記，在 `app/layout.tsx` 加上：

```tsx
'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    // @ts-ignore
    window.gtag?.('event', 'page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
```

---

## 附錄 A — 新客戶 GA4 + Search Console 安裝 Checklist

每個新客戶網站上線前/後，對照這份清單確認。

```
GA4 安裝
  [ ] 建立 GA4 帳戶（客戶名稱）
  [ ] 建立資源（網站名稱）
  [ ] 取得評估 ID (G-XXXXXXXXXX)
  [ ] 安裝追蹤碼（gtag.js 或 GTM）
  [ ] 驗證安裝成功（DebugView 或即時報表）
  [ ] 資料保留期改為 14 個月
  [ ] 排除內部 IP
  [ ] 增強型評估全部開啟
  [ ] 設定跨網域追蹤（如需要）
  [ ] 建立轉換事件（表單/電話/LINE）
  [ ] 客戶設為帳戶管理員

Search Console
  [ ] 新增資源並驗證所有權
  [ ] 提交 Sitemap
  [ ] 確認首頁已被索引
  [ ] 與 GA4 串接
  [ ] 客戶設為擁有者

GTM（如果用 GTM）
  [ ] 建立 GTM 帳戶和容器
  [ ] 安裝容器代碼到網站
  [ ] 建立 GA4 設定代碼
  [ ] 設定 CTA 點擊追蹤
  [ ] 設定表單提交追蹤
  [ ] 發布容器
  [ ] 用預覽模式驗證

通知客戶
  [ ] 寄送 GA4 存取邀請給客戶
  [ ] 寄送 Search Console 存取邀請給客戶
  [ ] 教客戶怎麼看即時報表（簡單就好）
  [ ] 約定月報頻率（每月/每季）
```

---

## 附錄 B — 實用工具與資源

| 工具 | 用途 | 網址 |
|------|------|------|
| GA4 官方 | GA4 管理後台 | https://analytics.google.com/ |
| GTM 官方 | GTM 管理後台 | https://tagmanager.google.com/ |
| Search Console | GSC 管理後台 | https://search.google.com/search-console/ |
| Campaign URL Builder | UTM 參數產生器 | https://ga-dev-tools.google/ga4/campaign-url-builder/ |
| PageSpeed Insights | 網頁速度/CWV 測試 | https://pagespeed.web.dev/ |
| Mobile-Friendly Test | 行動裝置友善測試 | https://search.google.com/test/mobile-friendly |
| Rich Results Test | 結構化資料測試 | https://search.google.com/test/rich-results |
| Tag Assistant | GTM/GA4 Debug 工具 | Chrome Web Store 搜尋 "Tag Assistant" |
| GA4 Opt-out Add-on | 停用 GA 追蹤（開發用） | https://tools.google.com/dlpage/gaoptout |
| Screaming Frog | SEO 爬蟲工具（免費版 500 URL） | https://www.screamingfrog.co.uk/ |

---

## 附錄 C — GA4 事件命名速查表

常用事件名稱對照（按照 Google 建議事件命名規範）：

| 中文 | 事件名稱 | 常用參數 |
|------|---------|---------|
| 瀏覽頁面 | `page_view` | `page_title`, `page_location` |
| 註冊 | `sign_up` | `method` |
| 登入 | `login` | `method` |
| 搜尋 | `search` | `search_term` |
| 分享 | `share` | `method`, `content_type`, `item_id` |
| 查看商品 | `view_item` | `currency`, `value`, `items[]` |
| 加入購物車 | `add_to_cart` | `currency`, `value`, `items[]` |
| 移除購物車 | `remove_from_cart` | `currency`, `value`, `items[]` |
| 開始結帳 | `begin_checkout` | `currency`, `value`, `items[]` |
| 購買完成 | `purchase` | `transaction_id`, `value`, `items[]` |
| 退款 | `refund` | `transaction_id`, `value` |
| 潛在客戶 | `generate_lead` | `currency`, `value` |
| CTA 點擊 | `cta_click` (自訂) | `button_type`, `button_location` |
| 表單送出 | `form_submit` (自訂) | `form_name`, `form_location` |
| 電話點擊 | `phone_call` (自訂) | `phone_number`, `call_source` |
| 檔案下載 | `file_download` | `file_name`, `file_extension` |

> **命名規則**：全小寫、用底線分隔、不超過 40 字元、不要用 `ga_` 或 `google_` 或 `firebase_` 開頭（保留字）。
