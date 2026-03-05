---
tags: [SEO, meta, sitemap, Google, Analytics, Core-Web-Vitals, 搜尋引擎, PageSpeed]
date: 2026-03-05
category: cookbook
---

# 25 — SEO 基礎與上線檢查表

> 適用對象：接案網頁設計師、前端工程師、行銷人員
> 最後更新：2026-03-05

---

## 目錄

1. [SEO 基礎概念](#1-seo-基礎概念)
2. [上線前 SEO 檢查表](#2-上線前-seo-檢查表)
3. [Core Web Vitals](#3-core-web-vitals)
4. [Google Search Console 設定](#4-google-search-console-設定)
5. [Google Analytics 4 設定](#5-google-analytics-4-ga4-設定)
6. [PageSpeed Insights 使用教學](#6-pagespeed-insights-使用教學)
7. [常見 SEO 錯誤與修復](#7-常見-seo-錯誤與修復)
8. [SEO 工具推薦](#8-seo-工具推薦)
9. [給客戶的 SEO 月報模板](#9-給客戶的-seo-月報模板)

---

## 1. SEO 基礎概念

### 搜尋引擎如何運作

```
抓取 (Crawl) → 索引 (Index) → 排名 (Rank) → 顯示 (Display)
```

| 階段 | 做什麼 | 你能控制什麼 |
|------|--------|-------------|
| **抓取** | Googlebot 造訪你的網頁，下載 HTML | robots.txt、sitemap.xml、內部連結結構 |
| **索引** | Google 分析頁面內容，決定是否收錄 | meta robots、canonical、內容品質 |
| **排名** | 演算法根據數百個因素排序 | 內容相關性、反向連結、使用者體驗 |
| **顯示** | 搜尋結果頁（SERP）呈現 | title、description、structured data |

### 排名因素（2026 年重要度排序）

| 優先級 | 因素 | 說明 |
|--------|------|------|
| **最高** | 內容品質與相關性 | 回答使用者搜尋意圖的原創內容 |
| **最高** | 反向連結 (Backlinks) | 其他網站連結到你，代表信任投票 |
| **高** | Core Web Vitals | 網頁載入速度、互動性、視覺穩定性 |
| **高** | 行動裝置友善 | 響應式設計、觸控友善 |
| **高** | HTTPS | 安全連線是基本要求 |
| **中** | 結構化資料 | 讓 Google 更了解頁面內容 |
| **中** | 內部連結結構 | 幫助搜尋引擎理解網站架構 |
| **中** | URL 結構 | 簡潔、有意義的網址 |
| **低** | meta keywords | Google 已不使用，可忽略 |

### 搜尋意圖的四種類型

理解使用者搜什麼，才能做出對的內容：

| 意圖類型 | 範例 | 你該提供什麼 |
|----------|------|-------------|
| **資訊型** | 「如何做 SEO」 | 教學文章、指南 |
| **導航型** | 「Facebook 登入」 | 確保品牌名搜得到 |
| **交易型** | 「買 iPhone 16」 | 產品頁、購買連結 |
| **在地型** | 「台北網頁設計」 | Google 商家檔案、在地化內容 |

---

## 2. 上線前 SEO 檢查表

### 2.1 Meta Title & Description

**每一頁都必須有獨立的 title 和 description。**

```html
<!-- 首頁 -->
<head>
  <title>小蔡工作室 — 台北網頁設計、LINE OA 整合專家</title>
  <meta name="description" content="專業網頁設計與 LINE OA 智能客服整合。10+ 年經驗，服務超過 200 家企業。免費諮詢，30 天內上線。">
</head>

<!-- 服務頁 -->
<head>
  <title>網頁設計服務方案與報價 | 小蔡工作室</title>
  <meta name="description" content="提供形象官網、電商網站、LINE OA 串接三種方案。從 NT$15,000 起，含一年免費維護。查看詳細報價。">
</head>

<!-- 部落格文章 -->
<head>
  <title>2026 LINE OA 完整教學：從零開始設定智能客服 | 小蔡工作室</title>
  <meta name="description" content="手把手教你設定 LINE Official Account 自動回覆、圖文選單、推播訊息。含實際操作截圖，20 分鐘完成設定。">
</head>
```

**Title 規則：**
- 長度：30-60 字元（中文約 15-30 字）
- 格式：`主要關鍵字 — 品牌名` 或 `主要關鍵字 | 品牌名`
- 每頁標題不重複
- 把最重要的關鍵字放前面

**Description 規則：**
- 長度：70-155 字元（中文約 35-75 字）
- 包含行動呼籲（CTA）：「免費諮詢」「立即查看」
- 自然融入關鍵字，不要硬塞

### 2.2 Open Graph Tags

讓網頁在 Facebook、LINE、Telegram 分享時顯示漂亮的預覽卡片。

```html
<head>
  <!-- 基本 OG Tags（每頁必備） -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="小蔡工作室 — 台北網頁設計專家">
  <meta property="og:description" content="專業網頁設計與 LINE OA 整合。免費諮詢，30 天內上線。">
  <meta property="og:image" content="https://example.com/images/og-cover.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:site_name" content="小蔡工作室">
  <meta property="og:locale" content="zh_TW">

  <!-- 文章頁額外 OG Tags -->
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="2026-03-05T08:00:00+08:00">
  <meta property="article:author" content="小蔡">
  <meta property="article:section" content="教學">
</head>
```

**OG Image 規格：**
- 尺寸：1200 x 630 px（最佳）
- 格式：JPG 或 PNG
- 檔案大小：< 1MB
- 文字不要太小（手機也要看得清）

**測試工具：**
- Facebook：https://developers.facebook.com/tools/debug/
- LINE：https://poker.line.naver.jp/

### 2.3 Twitter Card

```html
<head>
  <!-- Twitter Card（大圖摘要） -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@yourhandle">
  <meta name="twitter:creator" content="@yourhandle">
  <meta name="twitter:title" content="小蔡工作室 — 台北網頁設計專家">
  <meta name="twitter:description" content="專業網頁設計與 LINE OA 整合。免費諮詢。">
  <meta name="twitter:image" content="https://example.com/images/twitter-card.jpg">
  <meta name="twitter:image:alt" content="小蔡工作室品牌橫幅">
</head>
```

**Twitter Card 類型：**

| 類型 | 用途 | 圖片尺寸 |
|------|------|---------|
| `summary` | 一般頁面 | 144 x 144 px（最小） |
| `summary_large_image` | 文章、產品頁 | 1200 x 628 px |
| `player` | 影片、音訊 | 依播放器 |
| `app` | App 推廣 | 依平台 |

**測試工具：** https://cards-dev.twitter.com/validator

### 2.4 Canonical URL

告訴 Google 哪個是「正版」網址，避免重複內容問題。

```html
<!-- 每一頁都加，指向自己的標準網址 -->
<link rel="canonical" href="https://example.com/services/">

<!-- 如果有 www 和非 www 版本，選一個當正版 -->
<!-- https://example.com/page → 正版 -->
<!-- https://www.example.com/page → 加 canonical 指向非 www -->
<link rel="canonical" href="https://example.com/page">

<!-- 分頁的 canonical（全部指向第一頁） -->
<!-- /blog?page=2 的 canonical -->
<link rel="canonical" href="https://example.com/blog">
```

**常見需要 canonical 的情境：**
- `http` vs `https` 版本
- `www` vs 非 `www`
- 有無結尾斜線 `/services` vs `/services/`
- 帶追蹤參數 `?utm_source=facebook`
- 產品同時出現在多個分類頁

### 2.5 robots.txt

放在網站根目錄 `https://example.com/robots.txt`。

```txt
# ===== 正式環境 robots.txt =====

# 允許所有搜尋引擎
User-agent: *
Allow: /

# 禁止索引的路徑
Disallow: /admin/
Disallow: /api/
Disallow: /tmp/
Disallow: /_next/data/
Disallow: /search?
Disallow: /cart
Disallow: /checkout
Disallow: /account/
Disallow: /thank-you

# 禁止索引特定檔案類型
Disallow: /*.json$
Disallow: /*.xml$

# Sitemap 位置（必填！）
Sitemap: https://example.com/sitemap.xml
```

```txt
# ===== 測試環境 robots.txt（禁止所有爬蟲） =====
User-agent: *
Disallow: /
```

**注意事項：**
- 上線前確認 robots.txt 沒有擋掉整站（`Disallow: /`）
- 這是新手最常犯的錯，staging 設定忘了改就上線
- 檢查指令：`curl https://你的網站/robots.txt`

### 2.6 sitemap.xml

#### 手動建立（適合靜態小網站）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-03-05</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://example.com/services/</loc>
    <lastmod>2026-03-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://example.com/portfolio/</loc>
    <lastmod>2026-02-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>https://example.com/blog/</loc>
    <lastmod>2026-03-04</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://example.com/contact/</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>

</urlset>
```

#### 自動生成工具

**Next.js（App Router）：**

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://example.com';

  // 靜態頁面
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/services`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/portfolio`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.5 },
  ];

  // 動態頁面（從 CMS 或資料庫撈）
  // const posts = await fetch('https://api.example.com/posts').then(r => r.json());
  // const dynamicPages = posts.map(post => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: new Date(post.updatedAt),
  //   priority: 0.6,
  // }));

  return [...staticPages];
}
```

**Vite / React SPA（build 時生成）：**

```javascript
// scripts/generate-sitemap.js
import { writeFileSync } from 'fs';

const BASE_URL = 'https://example.com';
const pages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/services', priority: '0.8', changefreq: 'monthly' },
  { path: '/portfolio', priority: '0.7', changefreq: 'monthly' },
  { path: '/blog', priority: '0.6', changefreq: 'weekly' },
  { path: '/contact', priority: '0.5', changefreq: 'yearly' },
];

const today = new Date().toISOString().split('T')[0];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync('dist/sitemap.xml', sitemap);
console.log('sitemap.xml generated');
```

在 `package.json` 加入：

```json
{
  "scripts": {
    "build": "vite build && node scripts/generate-sitemap.js"
  }
}
```

**其他工具：**
- WordPress：Yoast SEO 或 Rank Math 外掛自動生成
- 線上生成器：https://www.xml-sitemaps.com/（小網站適用）
- CLI 工具：`npx sitemap-generator-cli https://example.com`

### 2.7 Structured Data / JSON-LD

結構化資料讓 Google 顯示複合式搜尋結果（Rich Results）。

#### LocalBusiness（在地商家，接案工作室必備）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "小蔡工作室",
  "description": "台北專業網頁設計與 LINE OA 整合服務",
  "url": "https://example.com",
  "logo": "https://example.com/images/logo.png",
  "image": "https://example.com/images/studio.jpg",
  "telephone": "+886-2-1234-5678",
  "email": "hello@example.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "信義路四段 123 號 5 樓",
    "addressLocality": "台北市",
    "addressRegion": "大安區",
    "postalCode": "106",
    "addressCountry": "TW"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 25.0330,
    "longitude": 121.5654
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    }
  ],
  "priceRange": "$$",
  "sameAs": [
    "https://www.facebook.com/yourpage",
    "https://www.instagram.com/yourhandle",
    "https://line.me/R/ti/p/@yourlineid"
  ]
}
</script>
```

#### Article（部落格文章）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "2026 LINE OA 完整教學：從零開始設定智能客服",
  "description": "手把手教你設定 LINE Official Account 自動回覆",
  "image": "https://example.com/images/blog/line-oa-tutorial.jpg",
  "author": {
    "@type": "Person",
    "name": "小蔡",
    "url": "https://example.com/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "小蔡工作室",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/images/logo.png"
    }
  },
  "datePublished": "2026-03-05T08:00:00+08:00",
  "dateModified": "2026-03-05T10:00:00+08:00",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/blog/line-oa-tutorial"
  }
}
</script>
```

#### Product（產品/服務方案）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "形象官網設計方案",
  "description": "5 頁響應式網站，含 SEO 基礎優化、SSL 憑證、一年免費維護",
  "image": "https://example.com/images/web-design-plan.jpg",
  "brand": {
    "@type": "Brand",
    "name": "小蔡工作室"
  },
  "offers": {
    "@type": "Offer",
    "price": "25000",
    "priceCurrency": "TWD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/services/web-design",
    "validFrom": "2026-01-01"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "36"
  }
}
</script>
```

#### FAQ（常見問答，搜尋結果會直接展開）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "做一個網站要多少錢？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "形象官網 NT$15,000-50,000，電商網站 NT$30,000-100,000，依功能複雜度而定。我們提供免費諮詢和詳細報價。"
      }
    },
    {
      "@type": "Question",
      "name": "網站多久可以做好？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "簡單形象官網約 2-3 週，電商網站約 4-6 週。我們會在簽約時提供明確時程表。"
      }
    }
  ]
}
</script>
```

**測試工具：** https://search.google.com/test/rich-results

#### BreadcrumbList（麵包屑導航）

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://example.com/" },
    { "@type": "ListItem", "position": 2, "name": "部落格", "item": "https://example.com/blog/" },
    { "@type": "ListItem", "position": 3, "name": "LINE OA 教學", "item": "https://example.com/blog/line-oa-tutorial" }
  ]
}
</script>
```

### 2.8 Favicon & Apple Touch Icon

```html
<head>
  <!-- 標準 favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">

  <!-- Apple Touch Icon（iOS 加到主畫面） -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

  <!-- Android Chrome -->
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#1a1a2e">

  <!-- Windows（可選） -->
  <meta name="msapplication-TileColor" content="#1a1a2e">
</head>
```

**`site.webmanifest` 範例：**

```json
{
  "name": "小蔡工作室",
  "short_name": "小蔡",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#1a1a2e",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

**生成工具：** https://realfavicongenerator.net/ （上傳一張 512x512 PNG，自動生成全套）

### 2.9 完整 `<head>` 模板

把以上全部整合：

```html
<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO 基本 -->
  <title>小蔡工作室 — 台北網頁設計、LINE OA 整合專家</title>
  <meta name="description" content="專業網頁設計與 LINE OA 智能客服整合。10+ 年經驗，200+ 客戶。免費諮詢。">
  <link rel="canonical" href="https://example.com/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="小蔡工作室 — 台北網頁設計專家">
  <meta property="og:description" content="專業網頁設計與 LINE OA 整合。免費諮詢，30 天內上線。">
  <meta property="og:image" content="https://example.com/images/og-cover.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:site_name" content="小蔡工作室">
  <meta property="og:locale" content="zh_TW">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="小蔡工作室 — 台北網頁設計專家">
  <meta name="twitter:description" content="專業網頁設計與 LINE OA 整合。免費諮詢。">
  <meta name="twitter:image" content="https://example.com/images/og-cover.jpg">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#1a1a2e">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "小蔡工作室",
    "url": "https://example.com",
    "telephone": "+886-2-1234-5678",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "台北市",
      "addressCountry": "TW"
    }
  }
  </script>
</head>
```

### 2.10 上線前 SEO 檢查清單（逐項打勾）

```
□ 每頁都有獨立的 <title>，長度 30-60 字元
□ 每頁都有獨立的 <meta description>，長度 70-155 字元
□ 每頁都有 <link rel="canonical">
□ 每頁都有 Open Graph tags（og:title, og:description, og:image）
□ 每頁都有 Twitter Card tags
□ 所有圖片都有 alt 屬性
□ robots.txt 允許搜尋引擎抓取（沒有 Disallow: /）
□ sitemap.xml 已生成並提交到 Google Search Console
□ robots.txt 有 Sitemap: 指令
□ 結構化資料通過 Rich Results Test
□ favicon 全套已設定
□ 網站使用 HTTPS
□ www / 非 www 有做 301 重導向
□ HTML lang 屬性設定正確（zh-Hant-TW）
□ 404 頁面已設計，不是空白頁
□ 所有內部連結可正常存取（無 broken links）
□ 圖片已壓縮（WebP 格式優先）
□ 頁面載入時間 < 3 秒
□ 行動裝置響應式正常
□ Google Search Console 已驗證
□ Google Analytics 4 已安裝
□ heading 結構正確（每頁只有一個 h1）
```

---

## 3. Core Web Vitals

Google 在排名中使用的三個使用者體驗指標。

### 三大指標

| 指標 | 全名 | 量測什麼 | 好 | 需改善 | 差 |
|------|------|---------|-----|--------|-----|
| **LCP** | Largest Contentful Paint | 最大內容繪製時間 | ≤ 2.5s | 2.5-4.0s | > 4.0s |
| **INP** | Interaction to Next Paint | 互動到下一次繪製 | ≤ 200ms | 200-500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | 累計版面位移 | ≤ 0.1 | 0.1-0.25 | > 0.25 |

> INP 已於 2024 年 3 月取代 FID（First Input Delay）成為正式指標。

### LCP 最大內容繪製 — 常見問題與修復

**問題 1：圖片太大**
```html
<!-- 壞：未壓縮的 3MB 圖片 -->
<img src="hero-image.png">

<!-- 好：使用 WebP + 響應式圖片 -->
<img
  src="hero-image.webp"
  srcset="hero-400w.webp 400w, hero-800w.webp 800w, hero-1200w.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
  alt="小蔡工作室首頁橫幅"
  width="1200"
  height="630"
  loading="eager"
  fetchpriority="high"
>
```

**問題 2：LCP 元素載入太慢**
```html
<!-- 預載 LCP 圖片（放在 <head> 最前面） -->
<link rel="preload" as="image" href="/images/hero.webp" type="image/webp">

<!-- 預連線到 CDN -->
<link rel="preconnect" href="https://cdn.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">
```

**問題 3：字體阻擋渲染**
```html
<!-- 預載字體 + font-display: swap -->
<link rel="preload" href="/fonts/noto-sans-tc.woff2" as="font" type="font/woff2" crossorigin>

<style>
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('/fonts/noto-sans-tc.woff2') format('woff2');
    font-display: swap; /* 關鍵：先顯示備用字體，載完再換 */
  }
</style>
```

**問題 4：伺服器回應太慢**
```
# 檢查 TTFB（Time to First Byte）
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://example.com

# TTFB 應 < 800ms，理想 < 200ms
# 解法：使用 CDN（Cloudflare、Vercel Edge）、伺服器端快取
```

### INP 互動回應 — 常見問題與修復

**問題 1：JavaScript 執行時間過長**
```javascript
// 壞：大量計算阻塞主線程
function heavyComputation() {
  for (let i = 0; i < 1000000; i++) { /* ... */ }
}
button.addEventListener('click', heavyComputation);

// 好：用 requestIdleCallback 或 Web Worker 處理
button.addEventListener('click', () => {
  // 先給使用者視覺回饋
  button.textContent = '處理中...';
  button.disabled = true;

  // 把重活丟到下一幀
  requestAnimationFrame(() => {
    setTimeout(() => {
      heavyComputation();
      button.textContent = '完成';
      button.disabled = false;
    }, 0);
  });
});
```

**問題 2：第三方腳本太多**
```html
<!-- 壞：同步載入大量第三方 -->
<script src="https://maps.googleapis.com/maps/api/js"></script>
<script src="https://connect.facebook.net/zh_TW/sdk.js"></script>
<script src="https://www.googletagmanager.com/gtag/js"></script>

<!-- 好：延遲載入非關鍵腳本 -->
<script defer src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  // Google Maps：使用者滾到該區域才載入
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_KEY';
      document.head.appendChild(script);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('map-section'));
</script>
```

### CLS 版面位移 — 常見問題與修復

**問題 1：圖片沒有指定寬高**
```html
<!-- 壞：圖片載入前不知道大小，載入後會把下面的內容推開 -->
<img src="photo.jpg" alt="照片">

<!-- 好：明確指定寬高，瀏覽器預留空間 -->
<img src="photo.jpg" alt="照片" width="800" height="600">

<!-- 好：用 CSS aspect-ratio -->
<style>
  .responsive-img {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
</style>
<img class="responsive-img" src="photo.jpg" alt="照片">
```

**問題 2：廣告或嵌入內容沒有預留空間**
```css
/* 為動態內容預留固定高度 */
.ad-container {
  min-height: 250px; /* 常見廣告高度 */
  background: #f0f0f0;
}

.embed-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 比例 */
  height: 0;
  overflow: hidden;
}
.embed-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

**問題 3：字體載入造成位移**
```css
/* 設定 font-display: optional 避免 FOIT/FOUT 造成位移 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional; /* 如果字體沒在極短時間載完，就用系統字體 */
  /* 或用 swap，可接受短暫位移但保證顯示自訂字體 */
}

/* 配合 size-adjust 減少字體切換時的位移 */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  size-adjust: 105%;
  ascent-override: 95%;
}
```

---

## 4. Google Search Console 設定

### 步驟 1：驗證網站擁有權

1. 前往 https://search.google.com/search-console
2. 點擊「新增資源」
3. 選擇「網域」或「網址前置字串」

| 方式 | 涵蓋範圍 | 驗證方法 |
|------|---------|---------|
| **網域** | 所有子網域 + http/https | DNS TXT 記錄 |
| **網址前置字串** | 僅指定的 URL | HTML 檔案 / meta tag / GA / GTM |

**推薦用網域驗證（一次搞定所有版本）：**

```
# DNS TXT 記錄範例（在你的 DNS 服務商加）
類型：TXT
名稱：@ 或留空
值：google-site-verification=你的驗證碼
TTL：3600
```

**如果用網址前置字串驗證（比較快）：**

```html
<!-- 方法 A：在 <head> 加 meta tag -->
<meta name="google-site-verification" content="你的驗證碼">

<!-- 方法 B：上傳 HTML 檔到根目錄 -->
<!-- 把 Google 給的 googleXXXXXXXX.html 放到 public/ 目錄 -->
```

### 步驟 2：提交 Sitemap

1. 左側選單 → 「Sitemap」
2. 輸入 `sitemap.xml`
3. 點擊「提交」
4. 狀態顯示「成功」即可

### 步驟 3：要求建立索引（新頁面加速收錄）

1. 上方搜尋列輸入你的頁面 URL
2. 點擊「要求建立索引」
3. 通常 1-3 天內收錄（不保證）

### 步驟 4：日常監控重點

| 報告 | 看什麼 | 多久看一次 |
|------|--------|-----------|
| **成效** | 曝光數、點擊數、平均排名 | 每週 |
| **涵蓋範圍** | 多少頁被索引、哪些被排除 | 每月 |
| **體驗** | Core Web Vitals、行動裝置可用性 | 每月 |
| **連結** | 外部連結、內部連結 | 每季 |
| **手動處罰** | 有沒有被 Google 處罰 | 每月（應該是空的） |

### 常用 Search Console 篩選技巧

```
# 在「成效」報告裡：
# 1. 篩選特定頁面的排名
#    → 頁面 → 包含 → /blog/

# 2. 看特定關鍵字的表現
#    → 查詢 → 包含 → 網頁設計

# 3. 比較兩段時間
#    → 日期 → 比較 → 過去 28 天 vs. 前一個期間

# 4. 看行動裝置 vs 桌機
#    → 裝置 → 行動裝置
```

---

## 5. Google Analytics 4 (GA4) 設定

### 步驟 1：建立 GA4 資源

1. 前往 https://analytics.google.com
2. 管理（齒輪圖示）→ 建立資源
3. 輸入資源名稱、時區（台北 UTC+8）、幣別（TWD）
4. 建立資料串流 → 網站 → 輸入網址

你會拿到一個 **Measurement ID**，格式像 `G-XXXXXXXXXX`

### 步驟 2：安裝 GA4

#### 方法 A：直接用 gtag.js（簡單直接）

```html
<!-- 放在 <head> 裡，所有頁面都要有 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**React / Next.js 安裝方式：**

```typescript
// lib/gtag.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX';

// 頁面瀏覽
export function pageview(url: string) {
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

// 自訂事件
export function event(action: string, params: Record<string, unknown>) {
  window.gtag('event', action, params);
}
```

```tsx
// app/layout.tsx (Next.js App Router)
import Script from 'next/script';
import { GA_MEASUREMENT_ID } from '@/lib/gtag';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### 方法 B：透過 Google Tag Manager (GTM)（推薦給需要管理多個標籤的情境）

```html
<!-- GTM 安裝碼 — <head> 裡盡量靠前 -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');
</script>

<!-- GTM noscript — <body> 開頭 -->
<noscript>
<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

然後在 GTM 後台：
1. 新增代碼 → Google Analytics: GA4 設定
2. 輸入 Measurement ID
3. 觸發條件：All Pages
4. 發布

### 步驟 3：基本事件追蹤

GA4 自動追蹤的事件（不用額外設定）：
- `page_view` — 頁面瀏覽
- `scroll` — 捲動到 90%
- `click` — 外連結點擊
- `file_download` — 檔案下載
- `form_start` / `form_submit` — 表單互動

**自訂事件範例：**

```javascript
// 追蹤「點擊聯絡按鈕」
document.querySelector('.contact-btn').addEventListener('click', () => {
  gtag('event', 'contact_click', {
    event_category: 'engagement',
    event_label: 'header_cta',
    value: 1
  });
});

// 追蹤「查看報價方案」
function trackPlanView(planName) {
  gtag('event', 'view_plan', {
    plan_name: planName,    // 'basic', 'pro', 'enterprise'
    page_location: window.location.href
  });
}

// 追蹤「提交諮詢表單」
document.querySelector('#consultation-form').addEventListener('submit', (e) => {
  gtag('event', 'generate_lead', {
    event_category: 'conversion',
    event_label: 'consultation_form',
    value: 1000  // 預估每筆諮詢價值（TWD）
  });
});

// 追蹤「LINE 好友加入」
function trackLineAdd() {
  gtag('event', 'line_add_friend', {
    event_category: 'conversion',
    event_label: 'line_oa',
    value: 500
  });
}
```

### 步驟 4：轉換目標設定

在 GA4 後台標記哪些事件是「轉換」：

1. 管理 → 事件
2. 找到你的事件（如 `generate_lead`）
3. 把「標示為轉換」開關打開

**接案網站常用的轉換目標：**

| 事件名稱 | 觸發時機 | 預估價值 |
|----------|---------|---------|
| `generate_lead` | 提交諮詢表單 | NT$1,000 |
| `contact_click` | 點擊聯絡電話 / Email | NT$500 |
| `line_add_friend` | 加 LINE 好友 | NT$500 |
| `view_plan` | 查看報價方案 | NT$200 |
| `schedule_meeting` | 預約會議 | NT$2,000 |

### 步驟 5：驗證安裝是否成功

```
# 方法 1：GA4 即時報告
# GA4 後台 → 報告 → 即時 → 打開你的網站看有沒有流量

# 方法 2：Chrome 擴充功能
# 安裝「Google Tag Assistant」，造訪網站看有沒有偵測到 GA4

# 方法 3：瀏覽器開發者工具
# F12 → Network → 搜尋 "collect" → 看有沒有送到 google-analytics.com
```

---

## 6. PageSpeed Insights 使用教學

### 如何使用

1. 前往 https://pagespeed.web.dev/
2. 輸入網址
3. 同時測行動版和桌面版

### 報告解讀

PageSpeed 分數分四個等級：

| 分數 | 等級 | 對排名的影響 |
|------|------|-------------|
| 90-100 | **好** (綠色) | 正面影響 |
| 50-89 | **需改善** (橘色) | 中性偏負面 |
| 0-49 | **差** (紅色) | 負面影響 |

### 六大指標

| 指標 | 目標 | 影響什麼 |
|------|------|---------|
| **FCP** (First Contentful Paint) | < 1.8s | 使用者多快看到第一個內容 |
| **LCP** (Largest Contentful Paint) | < 2.5s | 主要內容多快載入 |
| **TBT** (Total Blocking Time) | < 200ms | 主線程被阻塞多久（對應 INP） |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 版面位移量 |
| **SI** (Speed Index) | < 3.4s | 內容可見的速度 |
| **INP** (Interaction to Next Paint) | < 200ms | 互動回應速度 |

### 常見問題與修復（看到這些建議怎麼處理）

**「減少未使用的 JavaScript」**
```html
<!-- 問題：載入了整包 JS 但只用到一部分 -->
<!-- 解法 1：動態載入 -->
<script>
  // 只在需要時載入 Swiper
  if (document.querySelector('.swiper-container')) {
    import('swiper').then(({ Swiper }) => {
      new Swiper('.swiper-container', { /* ... */ });
    });
  }
</script>

<!-- 解法 2：Tree Shaking（Vite / Webpack 預設開啟） -->
<!-- 確保 import 是具名引入，不要 import 整個套件 -->
```

```javascript
// 壞
import _ from 'lodash';
_.debounce(fn, 300);

// 好
import debounce from 'lodash/debounce';
debounce(fn, 300);
```

**「提供適當尺寸的圖片」**
```html
<!-- 使用 srcset 讓瀏覽器選擇最佳尺寸 -->
<img
  src="image-800.webp"
  srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="服務項目"
  loading="lazy"
>
```

**「啟用文字壓縮」**
```nginx
# Nginx 設定
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
gzip_comp_level 6;

# 更好：使用 Brotli 壓縮
brotli on;
brotli_types text/plain text/css application/json application/javascript text/xml;
```

**「設定靜態資產的快取政策」**
```nginx
# Nginx — 靜態資產快取 1 年
location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

```javascript
// Vercel — vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 用 CLI 測 PageSpeed（批次檢查）

```bash
# 用 Lighthouse CLI 本地測試
npx lighthouse https://example.com --output=json --output-path=./report.json

# 用 PageSpeed API 批次測試多個頁面
API_KEY="你的_API_KEY"
PAGES=("https://example.com/" "https://example.com/services" "https://example.com/blog")

for page in "${PAGES[@]}"; do
  echo "Testing: $page"
  curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$page&key=$API_KEY&strategy=mobile" \
    | python3 -c "
import json,sys
d=json.load(sys.stdin)
score=d['lighthouseResult']['categories']['performance']['score']*100
print(f'  Performance: {score}')
for m in ['first-contentful-paint','largest-contentful-paint','cumulative-layout-shift','total-blocking-time']:
  v=d['lighthouseResult']['audits'][m]['displayValue']
  print(f'  {m}: {v}')
"
  echo "---"
done
```

---

## 7. 常見 SEO 錯誤與修復

### 錯誤 1：重複的 Title / Description

```bash
# 用 Screaming Frog 或手動檢查
# 每一頁的 title 和 description 必須獨特

# 壞：所有頁面都寫一樣
<title>小蔡工作室</title>  <!-- 首頁 -->
<title>小蔡工作室</title>  <!-- 服務頁也一樣 ← 問題！ -->

# 好：每頁獨立
<title>小蔡工作室 — 台北網頁設計專家</title>  <!-- 首頁 -->
<title>網頁設計服務方案與報價 | 小蔡工作室</title>  <!-- 服務頁 -->
```

**React / Next.js 自動處理：**

```tsx
// 每個頁面都 export metadata
// app/services/page.tsx
export const metadata = {
  title: '網頁設計服務方案與報價 | 小蔡工作室',
  description: '提供形象官網、電商網站、LINE OA 串接三種方案。',
};

// 或用 generateMetadata 動態生成
export async function generateMetadata({ params }: Props) {
  const post = await getPost(params.slug);
  return {
    title: `${post.title} | 小蔡工作室`,
    description: post.excerpt,
  };
}
```

### 錯誤 2：圖片缺少 alt 屬性

```html
<!-- 壞 -->
<img src="team-photo.jpg">

<!-- 壞（空 alt，除非是純裝飾圖） -->
<img src="team-photo.jpg" alt="">

<!-- 好 -->
<img src="team-photo.jpg" alt="小蔡工作室團隊合照，五位設計師在辦公室">

<!-- 純裝飾圖（分隔線、背景紋理）才用空 alt -->
<img src="decorative-line.svg" alt="" role="presentation">
```

**alt 文字撰寫原則：**
- 描述圖片內容，不要塞關鍵字
- 如果圖片有文字，把文字打出來
- 長度控制在 125 字以內
- 不用寫「圖片」「照片」等前綴（螢幕閱讀器會自己說）

### 錯誤 3：Broken Links（壞掉的連結）

```bash
# 用 CLI 工具檢查
npx broken-link-checker https://example.com --recursive

# 或用 curl 批次檢查
urls=$(curl -s https://example.com/sitemap.xml | grep '<loc>' | sed 's/.*<loc>//;s/<\/loc>.*//')
for url in $urls; do
  status=$(curl -o /dev/null -s -w "%{http_code}" "$url")
  if [ "$status" != "200" ]; then
    echo "BROKEN ($status): $url"
  fi
done
```

**修復方法：**
- 刪掉的頁面做 301 重導向到相關頁面
- 外連結失效就移除或替換
- 定期（每月）跑一次 broken link check

### 錯誤 4：沒有 HTTPS

```
# 確認全站 HTTPS
curl -I http://example.com
# 應該回 301/302 重導向到 https://example.com

# Vercel / Netlify 預設強制 HTTPS，不用設
# 自建主機需要設 Nginx redirect
```

```nginx
# Nginx 強制 HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}
```

### 錯誤 5：缺少 heading 層級結構

```html
<!-- 壞：跳過層級 -->
<h1>首頁</h1>
<h3>我們的服務</h3>  <!-- 跳過 h2！ -->
<h5>網頁設計</h5>    <!-- 跳過 h4！ -->

<!-- 壞：多個 h1 -->
<h1>小蔡工作室</h1>
<h1>我們的服務</h1>  <!-- 一頁只能有一個 h1！ -->

<!-- 好：正確的層級結構 -->
<h1>小蔡工作室 — 台北網頁設計專家</h1>
  <h2>我們的服務</h2>
    <h3>網頁設計</h3>
    <h3>LINE OA 整合</h3>
  <h2>客戶案例</h2>
    <h3>餐飲業 — 好味道餐廳</h3>
    <h3>零售業 — 美美服飾</h3>
```

### 錯誤 6：URL 結構不佳

```
# 壞
https://example.com/page?id=123
https://example.com/p/2026/03/05/article-name
https://example.com/服務項目    ← 中文 URL 不利 SEO

# 好
https://example.com/services
https://example.com/blog/line-oa-tutorial
https://example.com/portfolio/restaurant-website
```

**URL 規則：**
- 用英文小寫 + 連字號 `-`
- 簡短有意義（3-5 個字）
- 不要用底線 `_`、不要用中文
- 不要太深（最多 3 層 `/category/subcategory/page`）

### 錯誤 7：行動裝置不友善

```html
<!-- 必備：viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

```css
/* 檢查清單 */
/* 1. 點擊目標夠大（至少 48x48px） */
.button, .link {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 24px;
}

/* 2. 字體不要太小（至少 16px） */
body {
  font-size: 16px;
  line-height: 1.6;
}

/* 3. 不要水平捲動 */
html, body {
  overflow-x: hidden;
}
img, video, iframe {
  max-width: 100%;
  height: auto;
}
```

### 錯誤 8：頁面載入太多未使用的 CSS

```bash
# 用 Chrome DevTools 檢查
# F12 → Coverage (Ctrl+Shift+P → Coverage) → 開始錄製 → 刷新頁面
# 紅色 = 未使用的 CSS/JS

# 用 PurgeCSS 移除未使用的 CSS（build 時）
npx purgecss --css dist/assets/*.css --content dist/**/*.html --output dist/assets/
```

### 完整 SEO 錯誤檢查腳本

```bash
#!/bin/bash
# seo-check.sh — 快速 SEO 健檢
URL="${1:-https://example.com}"

echo "=== SEO Quick Check: $URL ==="
echo ""

# 1. HTTP 狀態碼
STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$URL")
echo "HTTP Status: $STATUS"

# 2. HTTPS 重導向
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "http://$(echo $URL | sed 's|https://||')")
echo "HTTP→HTTPS redirect: $HTTP_STATUS (should be 301)"

# 3. Title
TITLE=$(curl -s "$URL" | grep -oP '<title[^>]*>\K[^<]+')
echo "Title: $TITLE (${#TITLE} chars)"

# 4. Description
DESC=$(curl -s "$URL" | grep -oP 'name="description"[^>]*content="\K[^"]+')
echo "Description: ${DESC:0:60}... (${#DESC} chars)"

# 5. robots.txt
ROBOTS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$URL/robots.txt")
echo "robots.txt: $ROBOTS_STATUS"

# 6. sitemap.xml
SITEMAP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$URL/sitemap.xml")
echo "sitemap.xml: $SITEMAP_STATUS"

# 7. 圖片缺 alt
NO_ALT=$(curl -s "$URL" | grep -c '<img[^>]*(?!alt=)[^>]*>')
echo "Images without alt: ~$NO_ALT"

echo ""
echo "=== Done ==="
```

---

## 8. SEO 工具推薦

### 免費工具

| 工具 | 用途 | 適合誰 |
|------|------|--------|
| **Google Search Console** | 搜尋表現監控、索引狀態、問題診斷 | 所有人（必裝） |
| **Google Analytics 4** | 流量分析、使用者行為、轉換追蹤 | 所有人（必裝） |
| **Lighthouse** (Chrome DevTools) | 效能、SEO、無障礙評分 | 開發者 |
| **PageSpeed Insights** | Core Web Vitals、載入速度分析 | 開發者、PM |
| **Screaming Frog** (免費版) | 網站爬蟲，找出 SEO 問題（限 500 頁） | 開發者、SEO 人員 |
| **Google Rich Results Test** | 測試結構化資料 | 開發者 |
| **Google Trends** | 關鍵字趨勢、搜尋量比較 | 行銷人員 |
| **Ubersuggest** (免費額度) | 關鍵字研究、競爭分析 | 行銷人員 |
| **Chrome: SEO Meta in 1 Click** | 快速查看任何頁面的 SEO meta | 所有人 |
| **Chrome: Web Vitals** | 即時顯示 CWV 分數 | 開發者 |

### 付費工具

| 工具 | 價格 | 強項 | 適合誰 |
|------|------|------|--------|
| **Ahrefs** | US$99/月起 | 反向連結分析最強、關鍵字探索 | SEO 專業人員 |
| **SEMrush** | US$139/月起 | 全方位 SEO 平台、競爭對手分析 | 行銷團隊 |
| **Screaming Frog** (付費版) | US$259/年 | 無頁數限制的網站爬蟲 | 大型網站 |
| **Surfer SEO** | US$89/月起 | AI 內容優化、SERP 分析 | 內容行銷 |
| **Moz Pro** | US$99/月起 | 網域權威度 (DA)、連結分析 | SEO 入門者 |

### 建議的工具組合

**接案設計師（預算有限）：**
```
免費全配：GSC + GA4 + Lighthouse + Screaming Frog Free + Chrome 擴充
月費 $0
```

**小型行銷團隊：**
```
GSC + GA4 + Ahrefs Lite ($99/月) + Screaming Frog 付費 ($259/年)
月費 ~US$120
```

**專業 SEO 公司：**
```
GSC + GA4 + Ahrefs Standard ($199/月) + Screaming Frog + Surfer SEO
月費 ~US$350
```

### Lighthouse 本地使用

```bash
# 安裝
npm install -g lighthouse

# 跑完整報告
lighthouse https://example.com --output html --output-path ./lighthouse-report.html

# 只看 SEO 和效能
lighthouse https://example.com --only-categories=performance,seo --output json

# 模擬行動裝置（預設就是）
lighthouse https://example.com --preset=perf --form-factor=mobile

# 模擬桌機
lighthouse https://example.com --preset=desktop
```

---

## 9. 給客戶的 SEO 月報模板

### 報告格式

以下是可以直接用的月報模板，每月填數據給客戶：

---

```markdown
# SEO 月報 — [客戶名稱]

> 報告期間：2026 年 3 月
> 製作日期：2026-04-01
> 製作人：[你的名字 / 工作室名]

---

## 一、摘要

| 指標 | 本月 | 上月 | 變化 |
|------|------|------|------|
| Google 自然搜尋曝光 | 12,500 | 10,200 | +22.5% |
| Google 自然搜尋點擊 | 850 | 720 | +18.1% |
| 平均點擊率 (CTR) | 6.8% | 7.1% | -0.3% |
| 平均排名 | 15.2 | 18.6 | +3.4 (改善) |
| 已索引頁面數 | 45 | 42 | +3 |
| PageSpeed 分數 (Mobile) | 88 | 82 | +6 |

**本月重點：**
- 自然搜尋流量成長 18%，主要來自「[關鍵字A]」排名提升
- 新增 3 篇部落格文章，全部已被 Google 索引
- PageSpeed 從 82 提升到 88，圖片壓縮優化生效

---

## 二、關鍵字排名

### 主力關鍵字

| 關鍵字 | 本月排名 | 上月排名 | 變化 | 月搜尋量 |
|--------|---------|---------|------|---------|
| 台北網頁設計 | #8 | #12 | +4 | 1,200 |
| LINE OA 設定教學 | #3 | #5 | +2 | 800 |
| 網頁設計報價 | #15 | #22 | +7 | 600 |
| 形象官網製作 | #11 | #14 | +3 | 400 |
| 小型企業網站 | #19 | — | 新進 | 300 |

### 長尾關鍵字（新發現的機會）

| 關鍵字 | 排名 | 曝光 | 點擊 | 建議 |
|--------|------|------|------|------|
| line oa 自動回覆怎麼設定 | #6 | 320 | 45 | 優化現有文章 |
| 餐廳網站設計範例 | #18 | 150 | 8 | 新增案例頁面 |
| 網頁設計 台北 推薦 | #25 | 280 | 5 | 爭取 Google 商家評論 |

---

## 三、流量分析

### 流量來源

| 來源 | 造訪數 | 佔比 | 變化 |
|------|--------|------|------|
| 自然搜尋 (Google) | 850 | 45% | +18% |
| 直接造訪 | 420 | 22% | +5% |
| 社群媒體 | 310 | 16% | +12% |
| 推薦連結 | 200 | 11% | +8% |
| 付費廣告 | 120 | 6% | — |

### 熱門頁面 (Top 5)

| 頁面 | 瀏覽數 | 平均停留 | 跳出率 |
|------|--------|---------|--------|
| /blog/line-oa-tutorial | 380 | 4:32 | 35% |
| / (首頁) | 350 | 1:45 | 52% |
| /services | 220 | 2:10 | 48% |
| /portfolio | 180 | 3:05 | 42% |
| /blog/web-design-cost | 150 | 3:48 | 38% |

---

## 四、技術 SEO 狀態

| 項目 | 狀態 | 說明 |
|------|------|------|
| Core Web Vitals (LCP) | 2.1s (通過) | 上月 2.8s，圖片優化後改善 |
| Core Web Vitals (INP) | 150ms (通過) | 良好 |
| Core Web Vitals (CLS) | 0.05 (通過) | 良好 |
| 行動裝置可用性 | 通過 | 無問題 |
| HTTPS | 通過 | 全站 HTTPS |
| 索引涵蓋 | 45/48 頁 | 3 頁被排除（已確認是正確排除） |
| 結構化資料 | 通過 | LocalBusiness + Article |
| Broken Links | 0 個 | 無壞掉的連結 |

---

## 五、本月執行項目

- [x] 新增 3 篇部落格文章
- [x] 全站圖片轉 WebP 格式
- [x] 修復 2 個 broken links
- [x] 更新 sitemap.xml
- [x] Google 商家檔案更新營業資訊

---

## 六、下月計畫

| 項目 | 預期效果 | 優先級 |
|------|---------|--------|
| 新增 2 篇長尾關鍵字文章 | 增加自然搜尋流量 | 高 |
| 優化「台北網頁設計」頁面內容 | 目標排進前 5 | 高 |
| 新增 FAQ 結構化資料 | 爭取 SERP 展開 | 中 |
| 向 3 個產業目錄提交網站 | 增加反向連結 | 中 |
| 優化聯絡頁面 CTA | 提高轉換率 | 低 |

---

## 七、競爭對手觀察

| 競爭對手 | 本月動態 | 我們的應對 |
|----------|---------|-----------|
| A 設計公司 | 新增電商服務頁 | 我們已有，需優化內容 |
| B 工作室 | 發了 5 篇部落格 | 加快內容產出頻率 |
| C 數位行銷 | Google 廣告增加 | 專注自然搜尋，長期效益更高 |

---

*報告結束。如有任何問題，歡迎隨時聯繫。*
*下次報告日期：2026-05-01*
```

---

### 月報產出流程

每月初按這個 SOP 產出報告：

```
1. 登入 Google Search Console
   → 成效 → 過去 28 天 → 匯出 CSV
   → 截圖關鍵指標

2. 登入 Google Analytics 4
   → 報告 → 流量獲取 → 匯出
   → 比較本月 vs 上月

3. 跑 PageSpeed Insights
   → 截圖分數
   → 記錄 CWV 數據

4. 跑 Screaming Frog（或 broken-link-checker）
   → 記錄 broken links、missing alt、duplicate title

5. 填入月報模板
   → 加上分析和建議
   → 轉成 PDF 寄給客戶
```

**自動化建議：** 用 Google Looker Studio（免費）串接 GSC + GA4，設定自動更新的儀表板，每月只需要寫分析和建議，數據自動產生。

---

## 附錄：SEO 術語速查表

| 術語 | 中文 | 說明 |
|------|------|------|
| SERP | 搜尋結果頁 | Search Engine Results Page |
| CTR | 點擊率 | Click-Through Rate |
| DA / DR | 網域權威度 | Domain Authority / Domain Rating |
| Backlink | 反向連結 | 其他網站連到你的連結 |
| Crawl | 抓取 | 搜尋引擎讀取你的網頁 |
| Index | 索引 | 搜尋引擎收錄你的網頁 |
| Canonical | 標準網址 | 告訴搜尋引擎哪個是正版 URL |
| 301 Redirect | 永久重導向 | 告訴搜尋引擎頁面已搬家 |
| Rich Results | 複合式搜尋結果 | 帶有圖片、星星、FAQ 的搜尋結果 |
| Schema | 結構化資料 | 幫助搜尋引擎理解內容的標記 |
| Keyword Density | 關鍵字密度 | 關鍵字佔總字數比例（不要刻意堆砌） |
| Anchor Text | 錨點文字 | 連結上的可點擊文字 |
| Nofollow | 不傳遞權重 | 告訴搜尋引擎不要追蹤這個連結 |
| Sitemap | 網站地圖 | 列出所有頁面的 XML 檔案 |
| Robots.txt | 機器人協定 | 告訴爬蟲哪些頁面可以抓取 |
| CWV | 核心網頁指標 | Core Web Vitals |
| LCP | 最大內容繪製 | Largest Contentful Paint |
| INP | 互動到下一次繪製 | Interaction to Next Paint |
| CLS | 累計版面位移 | Cumulative Layout Shift |
| TTFB | 首位元組時間 | Time to First Byte |
| FCP | 首次內容繪製 | First Contentful Paint |
| TBT | 總阻塞時間 | Total Blocking Time |

---

> 本文件搭配 [21-接案SOP.md](./21-接案SOP.md) 使用，在「部署上線」階段跑完這份 SEO 檢查表。
> 有問題查 [06-除錯與救援.md](./06-除錯與救援.md) 或 [07-網站與部署.md](./07-網站與部署.md)。
