---
tags: [CMS, WordPress, Next.js, Webflow, 建站, 選型, Headless, No-Code]
date: 2026-03-05
category: cookbook
---

# 29 — CMS 選型與快速建站手冊

> 適用對象：網頁設計接案者 / 小型工作室 / 幫客戶做網站的自由工作者
> 最後更新：2026-03-05

---

## 目錄

1. [CMS 選型決策矩陣](#1-cms-選型決策矩陣)
2. [WordPress](#2-wordpress)
3. [Next.js + Headless CMS](#3-nextjs--headless-cms)
4. [Webflow](#4-webflow)
5. [靜態網站生成器](#5-靜態網站生成器)
6. [No-Code 方案](#6-no-code-方案)
7. [綜合比較表](#7-綜合比較表)
8. [各方案報價建議](#8-各方案報價建議)

---

## 1. CMS 選型決策矩陣

### 決策流程圖

```
客戶需求進來
    |
    v
客戶會自己維護內容嗎？
    |
    +-- 會 ──> 客戶技術程度？
    |            |
    |            +-- 零技術（完全不會）──> Wix / Squarespace / Webflow
    |            |
    |            +-- 會用後台（打字貼圖）──> WordPress
    |            |
    |            +-- 會寫 Markdown ──> Headless CMS + 靜態生成器
    |
    +-- 不會（全部交給你）──> 需求複雜度？
                 |
                 +-- 簡單形象站（5 頁以內）──> WordPress / Astro
                 |
                 +-- 部落格 / 內容網站 ──> WordPress
                 |
                 +-- 電商網站 ──> Shopify / WooCommerce
                 |
                 +-- 會員系統 / SaaS ──> Next.js + 資料庫
                 |
                 +-- Landing Page（單頁）──> Framer / Webflow / Astro
                 |
                 +-- 高效能客製化 ──> Next.js + Headless CMS
```

### 依客戶需求分類速查表

| 需求類型 | 首選方案 | 備選方案 | 建站時間 | 報價區間（TWD） |
|----------|----------|----------|----------|-----------------|
| 形象網站（5 頁以內） | WordPress + Astra | Astro / Webflow | 1-3 天 | 15,000 - 50,000 |
| 部落格 / 內容網站 | WordPress | Ghost / Astro + MDX | 2-5 天 | 20,000 - 60,000 |
| 電商網站（< 50 品項） | Shopify | WooCommerce | 3-7 天 | 30,000 - 100,000 |
| 電商網站（> 50 品項） | WooCommerce | Shopify Plus | 7-21 天 | 80,000 - 250,000 |
| 會員系統 | Next.js + Supabase | WordPress + BuddyBoss | 14-30 天 | 100,000 - 350,000 |
| Landing Page | Framer / Webflow | Astro / Next.js | 0.5-1 天 | 8,000 - 25,000 |
| 多語系官網 | Next.js + i18n | WordPress + WPML | 7-14 天 | 60,000 - 150,000 |
| 作品集 / Portfolio | Webflow | Framer / Astro | 1-3 天 | 15,000 - 40,000 |

### 決策關鍵問題清單

跟客戶談之前，先問自己這 6 個問題：

```
1. 客戶之後會自己改內容嗎？
   → 會：需要好用的後台（WordPress / Webflow）
   → 不會：技術導向方案也行（Next.js / Astro）

2. 需要 SEO 嗎？
   → 需要：SSR / SSG 優先（Next.js / Astro / WordPress）
   → 不重要：SPA 也可以

3. 預算多少？
   → < 20K：WordPress / 模板站
   → 20K-80K：WordPress 客製 / Webflow
   → 80K+：Next.js 全客製

4. 上線時間多趕？
   → 一週內：WordPress 模板 / Webflow / Framer
   → 一個月：Next.js 客製

5. 未來需要擴充功能嗎？
   → 會大幅擴充：Next.js（彈性最高）
   → 小幅修改就好：WordPress
   → 不會動：靜態站

6. 有沒有特殊整合需求？
   → LINE OA / CRM / ERP：Next.js + API
   → 只要表單收信：WordPress / Webflow
```

---

## 2. WordPress

### 優缺點

| 優點 | 缺點 |
|------|------|
| 生態系龐大，外掛幾萬個 | 外掛太多容易衝突、拖慢速度 |
| 客戶後台好上手 | 安全性需要額外加固 |
| 佈景主題豐富，快速出站 | 客製化程度受限於主題架構 |
| SEO 外掛成熟（Yoast / RankMath） | 效能需要額外優化 |
| 社群資源多，問題容易找到解答 | 更新頻繁，外掛相容性問題 |
| WooCommerce 電商功能完整 | 大量商品效能瓶頸 |
| 可視化編輯器（Elementor / Bricks） | 編輯器產生大量冗餘 HTML |

### 適用場景

- 客戶需要自己更新文章、產品
- 中小企業形象網站
- 部落格、媒體網站
- 中小型電商（< 500 品項）
- 預算有限但功能需求多

### 快速建站 SOP（從零到上線 2 小時）

```
時間軸：

00:00 - 00:15  購買主機 + 網域 + 安裝 WordPress
00:15 - 00:30  安裝主題 + 必裝外掛
00:30 - 01:00  匯入 Demo 內容 + 修改文字圖片
01:00 - 01:20  設定 SEO + 安全外掛
01:20 - 01:40  設定表單 + 聯絡頁
01:40 - 01:50  SSL + 效能優化
01:50 - 02:00  最終檢查 + 上線
```

#### Step 1：主機與安裝（15 分鐘）

**推薦主機（台灣接案適用）：**

| 主機商 | 月費 | 特色 | 適合 |
|--------|------|------|------|
| Cloudways | US$14/月 | DigitalOcean / Vultr / Linode | 效能需求高 |
| SiteGround | US$3.99/月 | 官方推薦、自動備份 | 一般企業站 |
| Bluehost | US$2.95/月 | 便宜、含免費網域 | 預算導向 |
| A2 Hosting | US$2.99/月 | Turbo Server 快 | 效能 + 預算平衡 |

```bash
# 如果用 Cloudways（推薦）
# 1. 註冊 Cloudways → 選 DigitalOcean → $14/mo → Singapore
# 2. Application 選 WordPress → 自動安裝完成
# 3. 設定 Domain → DNS A Record 指向 IP

# 如果用 CLI 管理（本機開發用）
# 安裝 WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# 下載 WordPress
wp core download --locale=zh_TW --path=./mysite

# 建立設定檔
wp config create \
  --dbname=wordpress_db \
  --dbuser=root \
  --dbpass=your_password \
  --locale=zh_TW \
  --path=./mysite

# 安裝 WordPress
wp core install \
  --url="https://example.com" \
  --title="公司名稱" \
  --admin_user=admin \
  --admin_password="STRONG_PASSWORD_HERE" \
  --admin_email=admin@example.com \
  --path=./mysite
```

#### Step 2：安裝主題 + 必裝外掛（15 分鐘）

```bash
# 安裝主題（三選一）
wp theme install astra --activate --path=./mysite
# wp theme install flavor --activate --path=./mysite
# wp theme install flavor --activate --path=./mysite

# 必裝外掛 — 一次裝齊
wp plugin install \
  wordpress-seo \
  wordfence \
  updraftplus \
  wpforms-lite \
  wp-super-cache \
  redirection \
  wp-mail-smtp \
  --activate --path=./mysite
```

#### Step 3：匯入 Demo + 修改內容（30 分鐘）

```
1. 進入 外觀 → Starter Templates（Astra 內建）
2. 選一個跟客戶行業接近的 Demo
3. 一鍵匯入（會自動裝 Elementor 或 Block Editor 版本）
4. 逐頁修改：
   - 公司名稱、LOGO
   - 聯絡資訊
   - 服務項目文字
   - 替換所有圖片（用客戶提供的，或 Unsplash 暫替）
5. 設定選單結構
```

#### Step 4：SEO + 安全設定（20 分鐘）

```
SEO（Yoast SEO）：
- 設定首頁標題：公司名稱 | 一句話描述
- 設定每頁 meta description
- 開啟 XML Sitemap
- 連結 Google Search Console
- 設定麵包屑

安全（Wordfence）：
- 啟用防火牆
- 設定暴力破解保護（5 次失敗鎖定 30 分鐘）
- 啟用 2FA（雙因素認證）
```

#### Step 5：表單 + 聯絡頁（20 分鐘）

```
WPForms Lite：
- 建立聯絡表單（姓名、Email、電話、訊息）
- 設定通知信寄到客戶信箱
- 嵌入到「聯絡我們」頁面

WP Mail SMTP：
- 設定 SMTP（用 Gmail / SendGrid）
- 測試寄信功能
```

#### Step 6：SSL + 效能優化（10 分鐘）

```bash
# SSL（大部分主機商都有免費 Let's Encrypt）
# Cloudways：一鍵開啟 SSL
# SiteGround：Site Tools → Security → SSL

# 效能優化（WP Super Cache）
# 設定 → WP Super Cache → 開啟快取 → Expert 模式

# 或用 LiteSpeed Cache（如果主機支援）
wp plugin install litespeed-cache --activate --path=./mysite
```

#### Step 7：最終檢查清單

```
[ ] 所有頁面文字正確
[ ] 所有圖片載入正常
[ ] 手機版排版正確（RWD）
[ ] 表單能正常收到信
[ ] SSL 正常（網址列有鎖頭）
[ ] SEO 標題、描述已設定
[ ] Google Analytics / Search Console 已連結
[ ] 404 頁面有設定
[ ] favicon 已上傳
[ ] 頁面載入速度 < 3 秒（用 PageSpeed Insights 測）
[ ] 備份已設定（UpdraftPlus 每日備份到 Google Drive）
```

### 必裝外掛清單

| 類別 | 外掛名稱 | 免費/付費 | 用途 |
|------|----------|-----------|------|
| **SEO** | Yoast SEO | 免費夠用 | SEO 標題、meta、sitemap |
| **SEO** | RankMath | 免費夠用 | Yoast 替代，功能更多 |
| **安全** | Wordfence Security | 免費夠用 | 防火牆、惡意掃描、暴力破解防護 |
| **安全** | WPS Hide Login | 免費 | 改掉 /wp-admin 登入網址 |
| **安全** | Two-Factor | 免費 | 雙因素認證 |
| **快取** | WP Super Cache | 免費 | 頁面快取（Automattic 官方） |
| **快取** | LiteSpeed Cache | 免費 | LiteSpeed 主機用，效果更好 |
| **快取** | WP Rocket | 付費 $59/年 | 最強快取外掛，懶人首選 |
| **備份** | UpdraftPlus | 免費夠用 | 自動備份到 Google Drive / Dropbox |
| **表單** | WPForms Lite | 免費 | 拖拉式表單建立 |
| **表單** | Contact Form 7 | 免費 | 經典表單，輕量 |
| **圖片** | ShortPixel | 免費額度 | 圖片壓縮（WebP 轉換） |
| **圖片** | Imagify | 免費額度 | 圖片壓縮 |
| **重導向** | Redirection | 免費 | 301 重導向管理 |
| **郵件** | WP Mail SMTP | 免費夠用 | SMTP 設定，確保信寄得出去 |
| **編輯器** | Elementor | 免費版夠用 | 視覺化頁面編輯器 |
| **編輯器** | Bricks Builder | 付費 $99 終身 | 效能最好的頁面編輯器 |
| **效能** | Perfmatters | 付費 $24.95/年 | 停用不需要的資源 |
| **多語系** | WPML | 付費 $39/年 | 多語系網站 |

### 推薦主題

#### Astra（首推）

```
優點：
- 最輕量的多功能主題（< 50KB）
- Starter Templates 一鍵匯入 200+ 設計
- 支援 Elementor / Beaver Builder / Block Editor
- WooCommerce 深度整合
- 免費版功能就很完整

適合：90% 的客戶案子

價格：免費版夠用 / Pro $59/年
```

#### GeneratePress

```
優點：
- 極致輕量（< 30KB）
- 程式碼品質最好
- 開發者友善
- 效能跑分最高

適合：重視效能、有自己寫 CSS 能力的案子

價格：免費版夠用 / Premium $59/年
```

#### flavor（flavflavor.developer 系列）

```
優點：
- 台灣開發者製作
- 適合台灣市場需求
- 中文支援最好

適合：台灣本地客戶案子
```

#### Kadence

```
優點：
- Block Editor 深度整合
- 內建 Header / Footer Builder
- Starter Templates 品質高
- 效能好

適合：不想用 Elementor、偏好 Block Editor 的案子

價格：免費版夠用 / Pro $149/年
```

### WooCommerce 電商設定

#### 快速設定 SOP

```bash
# 安裝 WooCommerce
wp plugin install woocommerce --activate --path=./mysite

# 安裝中文化包
wp language plugin install woocommerce zh_TW --path=./mysite

# WooCommerce 必裝外掛
wp plugin install \
  woocommerce-payments \
  woo-checkout-field-editor-pro \
  yith-woocommerce-wishlist \
  --activate --path=./mysite
```

#### 台灣電商必備設定

```
1. 金流設定：
   - 綠界 ECPay（信用卡 / ATM / 超商代碼）
   - LINE Pay
   - 街口支付
   → 安裝「RY WooCommerce Tools for ECPay」外掛

2. 物流設定：
   - 黑貓宅急便
   - 7-11 / 全家超商取貨
   → 安裝「RY WooCommerce Tools for ECPay」（含物流功能）

3. 發票設定：
   - 電子發票（綠界）
   → 安裝「RY WooCommerce Tools for ECPay Invoice」

4. 運費計算：
   - 免費運費門檻（例：滿 $1,000 免運）
   - 宅配 / 超取不同運費

5. 稅務：
   - 台灣不需外加稅（含稅價）
   - WooCommerce → 設定 → 稅務 → 價格含稅
```

#### WooCommerce 效能注意事項

```
商品數量 vs 方案建議：
- < 50 品項：WooCommerce 免費版夠用
- 50-500 品項：需要快取 + CDN
- 500-5000 品項：需要 Redis Object Cache + 獨立主機
- > 5000 品項：考慮 Shopify Plus 或 Next.js + 客製電商

效能優化：
- 啟用 HPOS（High-Performance Order Storage）
- 安裝 Redis Object Cache
- 商品圖片全部 WebP 格式
- 停用不需要的 WooCommerce 功能（管理員列 → WooCommerce → 狀態 → 功能）
```

### 安全加固

#### 必做清單

```
1. 改掉預設登入網址
   → 安裝 WPS Hide Login
   → 把 /wp-admin 改成 /my-secret-login

2. 啟用雙因素認證（2FA）
   → 安裝 Two-Factor 外掛
   → 管理員帳號全部啟用 TOTP

3. 安裝 Wordfence
   → 開啟防火牆（Extended Protection）
   → 啟用 Rate Limiting
   → 登入失敗 5 次鎖定 IP 30 分鐘
   → 開啟即時流量監控

4. 停用 XML-RPC（除非需要遠端發文）
   → .htaccess 加入：
   <Files xmlrpc.php>
     Order Deny,Allow
     Deny from all
   </Files>

5. 停用 REST API 使用者列舉
   → functions.php 加入：
   add_filter('rest_endpoints', function($endpoints) {
       if (isset($endpoints['/wp/v2/users'])) {
           unset($endpoints['/wp/v2/users']);
       }
       return $endpoints;
   });

6. 停用檔案編輯器
   → wp-config.php 加入：
   define('DISALLOW_FILE_EDIT', true);

7. 限制上傳檔案類型
   → wp-config.php 加入：
   define('ALLOW_UNFILTERED_UPLOADS', false);

8. 自動更新設定
   → 核心小版本自動更新（預設開啟）
   → 外掛安全更新自動套用
   → 大版本手動更新（先備份）

9. 資料庫前綴不要用 wp_
   → 安裝時就改（例：oc_ 或隨機字串）

10. 備份策略
   → UpdraftPlus 每日備份到 Google Drive
   → 保留最近 14 天
   → 每月完整備份一次存到本地
```

### 效能優化

#### 方案 A：WP Rocket（付費，最省事）

```
設定重點：
- 快取 → 全部開啟
- 檔案優化 → CSS/JS 合併壓縮 + 延遲載入
- 媒體 → LazyLoad 圖片和影片
- 預先載入 → 開啟 Sitemap 預先載入
- CDN → 連接 Cloudflare（免費方案就好）
- 心跳 → 降低 WordPress Heartbeat 頻率
- 資料庫 → 每週自動清理

優點：裝上去設好就不用管，省時間
價格：$59/年（單站）
```

#### 方案 B：LiteSpeed Cache（免費，主機要支援）

```
適用主機：A2 Hosting / NameHero / 任何 LiteSpeed Server

設定重點：
- Page Cache → 開啟
- Object Cache → 開啟（需要主機支援 Memcached / Redis）
- Browser Cache → 開啟
- Image Optimization → 開啟（WebP 轉換）
- CSS/JS Optimization → 開啟
- CDN → QUIC.cloud CDN（LiteSpeed 自家，免費額度）

優點：完全免費 + 效果比 WP Rocket 更好（同主機）
限制：主機必須是 LiteSpeed Server
```

#### 方案 C：免費組合（WP Super Cache + Autoptimize + Cloudflare）

```bash
# 安裝免費外掛組合
wp plugin install \
  wp-super-cache \
  autoptimize \
  --activate --path=./mysite

# WP Super Cache：頁面快取
# Autoptimize：CSS/JS 合併壓縮
# Cloudflare（免費方案）：CDN + DDos 保護

# 額外推薦
wp plugin install shortpixel-image-optimiser --activate --path=./mysite
# ShortPixel：圖片壓縮 + WebP
```

#### 效能目標

```
Google PageSpeed Insights 目標分數：
- 行動版：> 80 分
- 桌面版：> 90 分

Core Web Vitals 目標：
- LCP（最大內容繪製）：< 2.5 秒
- INP（互動到下一次繪製）：< 200 毫秒
- CLS（累積佈局偏移）：< 0.1
```

---

## 3. Next.js + Headless CMS

### 適用場景

```
選 Next.js 的信號：
[x] 客戶需要極致效能（LCP < 1 秒）
[x] 需要高度客製化 UI/UX
[x] 有會員系統 / 登入功能
[x] 需要跟外部 API 串接（CRM / ERP / LINE）
[x] 多語系 + SSR/SSG
[x] 客戶團隊有工程師可以維護
[x] 預算 > 80,000 TWD

不選 Next.js 的信號：
[x] 客戶完全不懂技術，沒人維護
[x] 預算 < 30,000 TWD
[x] 只是簡單形象站，不需要客製
[x] 客戶需要自己拖拉改版面
```

### Headless CMS 選擇

| CMS | 類型 | 免費方案 | 適合 | 月費（付費） |
|-----|------|----------|------|-------------|
| **Strapi** | 自架 | 完全免費（自架） | 想完全掌控資料、有技術團隊 | 主機費用 |
| **Sanity** | 雲端 | 免費額度慷慨 | 內容結構複雜、需要即時協作 | $99/月 起 |
| **Contentful** | 雲端 | 免費（5 users） | 大型團隊、企業級 | $300/月 起 |
| **Directus** | 自架 | 完全免費（自架） | 想要 SQL 資料庫直接管理 | 主機費用 |
| **PayloadCMS** | 自架 | 完全免費（自架） | Next.js 深度整合，2024 後新星 | 主機費用 |
| **Keystatic** | 本地/GitHub | 完全免費 | 開源專案、Markdown 內容 | 免費 |

#### 推薦組合

```
小型專案（< 10 頁，少量文章）：
→ Next.js + Keystatic（零成本，Markdown 管理）

中型專案（企業站，CMS 後台需求）：
→ Next.js + Sanity（免費額度夠用，Studio 好用）

大型專案（多語系，多人協作）：
→ Next.js + Strapi（自架，完全掌控）

電商專案：
→ Next.js + Shopify Storefront API（用 Shopify 做金流物流）
→ Next.js + Saleor（開源替代）

全端一體：
→ Next.js + PayloadCMS（App Router 深度整合）
```

### 快速起步模板

#### Next.js + Sanity（最推薦入門）

```bash
# 方法 1：官方模板一鍵啟動
npx create-next-app@latest my-site \
  --example "https://github.com/vercel/next.js/tree/canary/examples/cms-sanity"

# 方法 2：手動建立
npx create-next-app@latest my-site --typescript --tailwind --app
cd my-site

# 安裝 Sanity
npm install next-sanity @sanity/image-url @sanity/client

# 初始化 Sanity Studio
npm create sanity@latest -- --project-id=YOUR_ID --dataset=production --template clean

# .env.local
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_token
```

**基本資料結構（Sanity Schema）：**

```typescript
// sanity/schemas/page.ts
export default {
  name: 'page',
  title: '頁面',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '標題',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: '網址路徑',
      type: 'slug',
      options: { source: 'title' },
    },
    {
      name: 'content',
      title: '內容',
      type: 'array',
      of: [{ type: 'block' }, { type: 'image' }],
    },
    {
      name: 'seo',
      title: 'SEO 設定',
      type: 'object',
      fields: [
        { name: 'metaTitle', title: 'Meta 標題', type: 'string' },
        { name: 'metaDescription', title: 'Meta 描述', type: 'text' },
        { name: 'ogImage', title: 'OG 圖片', type: 'image' },
      ],
    },
  ],
};
```

**Next.js 頁面範例：**

```typescript
// app/[slug]/page.tsx
import { client } from '@/sanity/lib/client';
import { PortableText } from '@portabletext/react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPage(slug: string) {
  return client.fetch(
    `*[_type == "page" && slug.current == $slug][0]{
      title,
      content,
      seo
    }`,
    { slug }
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: page?.seo?.metaTitle || page?.title,
    description: page?.seo?.metaDescription,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page) return <div>Page not found</div>;

  return (
    <main>
      <h1>{page.title}</h1>
      <PortableText value={page.content} />
    </main>
  );
}
```

#### Next.js + Strapi（自架完全掌控）

```bash
# 建立 Strapi 專案
npx create-strapi-app@latest my-cms --quickstart

# Strapi 預設跑在 http://localhost:1337
# 管理後台：http://localhost:1337/admin

# Next.js 端
npx create-next-app@latest my-site --typescript --tailwind --app
cd my-site
npm install qs

# .env.local
STRAPI_API_URL=http://localhost:1337
STRAPI_API_TOKEN=your_api_token
```

**Strapi API 呼叫：**

```typescript
// lib/strapi.ts
import qs from 'qs';

const STRAPI_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function fetchStrapi(
  path: string,
  params: Record<string, unknown> = {}
) {
  const query = qs.stringify(params, { encodeValuesOnly: true });
  const url = `${STRAPI_URL}/api${path}?${query}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    next: { revalidate: 60 }, // ISR：60 秒重新驗證
  });

  if (!res.ok) throw new Error(`Strapi error: ${res.status}`);
  return res.json();
}

// 使用範例
// const pages = await fetchStrapi('/pages', {
//   populate: ['seo', 'seo.ogImage'],
//   filters: { slug: { $eq: 'about' } },
// });
```

#### Next.js + PayloadCMS（一體式，2025 年後推薦）

```bash
# 一行建立 Next.js + Payload 整合專案
npx create-payload-app@latest my-site

# 選擇 Next.js 模板
# Payload 內嵌在 Next.js App Router 裡
# 管理後台：/admin（同一個 Next.js app）

# .env
DATABASE_URI=mongodb://localhost:27017/my-site
# 或用 PostgreSQL
# DATABASE_URI=postgres://user:pass@localhost:5432/my-site
PAYLOAD_SECRET=your_secret_key
```

### 部署到 Vercel

```bash
# 1. 推到 GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/you/my-site.git
git push -u origin main

# 2. Vercel 部署
npm i -g vercel
vercel

# 或者直接在 vercel.com 連結 GitHub repo（推薦）
# → Import Project → 選 repo → 自動偵測 Next.js → Deploy

# 3. 設定環境變數（Vercel Dashboard → Settings → Environment Variables）
# NEXT_PUBLIC_SANITY_PROJECT_ID=xxx
# SANITY_API_TOKEN=xxx
# 等等

# 4. 自訂網域
# Vercel Dashboard → Domains → Add → 輸入網域
# 設定 DNS：
# A Record → 76.76.21.21
# CNAME → cname.vercel-dns.com
```

#### Vercel 計費參考

```
Hobby（免費）：
- 適合個人專案
- 商業使用不允許
- 100GB 頻寬/月

Pro（$20/月）：
- 商業使用 OK
- 1TB 頻寬/月
- 自訂網域
- 團隊協作

Enterprise：
- SLA 保證
- 企業級安全
- 客製報價
```

---

## 4. Webflow

### 優缺點

| 優點 | 缺點 |
|------|------|
| 視覺化設計，不寫程式碼 | 月費較高（$14-39/月） |
| 設計自由度高（不是模板套版） | 學習曲線比 Wix 陡 |
| 內建 CMS Collection | CMS 項目數有限制 |
| 自動產生乾淨 HTML/CSS | 電商功能偏弱（台灣金流不支援） |
| 內建 SEO 設定 | 客製化邏輯受限（沒有後端） |
| Hosting 效能好 | 匯出程式碼需付費方案 |
| Client Billing（轉嫁給客戶付） | 客戶操作需要教學 |

### 適合什麼客戶

```
最適合：
[x] 設計導向的形象網站（設計師、攝影師、建築師）
[x] 作品集 Portfolio
[x] 行銷 Landing Page
[x] SaaS 產品官網
[x] 需要精美動畫互動效果
[x] 客戶願意付 Webflow 月費

不適合：
[x] 台灣電商（金流物流不支援）
[x] 會員登入系統
[x] 複雜後端邏輯
[x] 預算極低（月費持續累積）
[x] 內容量極大（> 10,000 篇文章）
```

### CMS Collection 用法

```
Webflow CMS 核心概念：

1. Collection = 資料表（類似資料庫的 Table）
   例：「作品集」Collection、「部落格」Collection、「團隊成員」Collection

2. Collection Item = 資料列（一篇文章、一個作品）

3. Collection Page = 自動產生的頁面（根據 Collection Item 的 slug）

4. Collection List = 在任何頁面插入 Collection 的列表

設定步驟：
1. CMS → Add Collection → 命名「作品集」
2. 新增欄位：
   - 標題（Single Line Text）
   - 封面圖（Image）
   - 分類（Option / Reference）
   - 內容（Rich Text）
   - 發布日期（Date）
3. 設計 Collection Page 模板
4. 在首頁加入 Collection List 顯示最新作品
5. 加入篩選 / 排序邏輯

免費方案限制：
- 50 個 CMS 項目
- 1 個 CMS Collection

Basic（$14/月）：
- 10,000 個 CMS 項目
- 20 個 CMS Collection
```

### Webflow → 客戶自行維護 SOP

#### 交付前準備

```
1. 建立 Client-Friendly 的 CMS 結構
   - 欄位命名用中文（「文章標題」而不是「title」）
   - 加入說明文字（Helptext）在每個欄位
   - 設定欄位驗證（必填、字數限制）

2. 建立 Style Guide 頁面
   - 展示所有元件的使用方式
   - 標題 / 段落 / 按鈕 / 卡片 / 表格

3. 製作操作教學
   - 錄 Loom 影片（5 分鐘以內）
   - 主題 1：如何新增文章
   - 主題 2：如何修改圖片
   - 主題 3：如何發布 / 排程
```

#### 客戶操作指南模板

```
給客戶的 Webflow Editor 操作手冊：

一、登入
1. 打開 https://你的網站.webflow.io/?edit
2. 用你的 Email 登入

二、新增文章
1. 左側面板 → CMS Collection → 部落格
2. 點「+ New Item」
3. 填寫標題、內容、上傳封面圖
4. 設定 slug（網址路徑）
5. 點「Publish」發布

三、修改現有內容
1. 在網站上找到要改的文字
2. 直接點擊 → 編輯
3. 改完點上方「Publish」

四、注意事項
- 不要動版面結構（只改文字和圖片）
- 圖片上傳前先壓縮（用 tinypng.com）
- 修改完記得點 Publish，否則不會生效
```

#### 轉交帳號設定

```
Webflow 帳號權限設定：

1. 在 Webflow Dashboard → Project Settings → Members
2. 邀請客戶 Email → 設為「Can Edit」
3. 不要給「Can Design」權限（避免客戶改壞版面）

或使用 Client Billing：
1. Project Settings → Plans → Transfer Billing
2. 讓客戶直接付 Webflow 月費
3. 你保留 Designer 權限做後續維護
```

---

## 5. 靜態網站生成器

### 概覽

| 生成器 | 語言 | 建構速度 | 生態系 | 學習曲線 |
|--------|------|----------|--------|----------|
| **Astro** | JS/TS | 極快 | 成長中（2022 起） | 低 |
| **Hugo** | Go | 最快 | 成熟 | 中（Go 模板語法） |
| **Gatsby** | React | 慢 | 成熟但式微 | 中（GraphQL） |
| **11ty (Eleventy)** | JS | 快 | 中等 | 低 |

### Astro（2025-2026 最推薦）

```
為什麼選 Astro：
- 預設零 JS（Island Architecture）
- 支援 React / Vue / Svelte 混用
- 內建 Content Collections（Markdown / MDX）
- 內建 Image Optimization
- Lighthouse 100 分很容易達到
- SSG + SSR 混合模式
- View Transitions 動畫

適合場景：
- 形象網站
- 部落格
- 文件站
- 行銷頁面
- 不需要複雜互動的網站
```

```bash
# 快速建立 Astro 專案
npm create astro@latest my-site

# 選主題
npm create astro@latest my-site -- --template starlight  # 文件站
npm create astro@latest my-site -- --template blog        # 部落格
npm create astro@latest my-site -- --template portfolio   # 作品集

# 安裝 Tailwind CSS
npx astro add tailwind

# 安裝 React（如果需要互動元件）
npx astro add react

# 開發
cd my-site
npm run dev

# 建構
npm run build
# 產出在 dist/ 目錄
```

**Astro 內容管理：**

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };

// 文章放在 src/content/blog/
// 例：src/content/blog/my-first-post.md
```

### Hugo（最快建構速度）

```
適合場景：
- 大量文章（1000+ 篇）建構依然秒速
- 技術文件站
- 個人部落格
- 不想碰 Node.js

優點：
- 建構速度業界最快
- 單一二進位檔，零依賴
- 主題豐富

缺點：
- Go template 語法不直覺
- 生態系比 JS 系小
```

```bash
# macOS 安裝
brew install hugo

# 建立專案
hugo new site my-site
cd my-site

# 安裝主題
git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke
echo 'theme = "ananke"' >> hugo.toml

# 新增文章
hugo new content posts/my-first-post.md

# 開發
hugo server -D

# 建構
hugo
# 產出在 public/ 目錄
```

### Gatsby（式微中，不建議新專案）

```
2026 年現況：
- 核心團隊已大幅縮編
- 社群活躍度下降
- 建構速度慢（GraphQL overhead）
- 新專案建議用 Astro 或 Next.js 取代

如果遇到既有 Gatsby 站需要維護：
- 升級到 Gatsby 5
- 考慮逐步遷移到 Astro（頁面結構相似）
```

### 部署到 Netlify / Cloudflare Pages

#### Netlify

```bash
# 方法 1：CLI 部署
npm i -g netlify-cli
netlify init
netlify deploy --prod

# 方法 2：連結 GitHub（推薦）
# 1. 登入 netlify.com
# 2. New site from Git → 選 GitHub repo
# 3. Build command: npm run build
# 4. Publish directory: dist (Astro) / public (Hugo)
# 5. Deploy

# 設定自訂網域
# Site settings → Domain management → Add custom domain
# DNS 設定：
# CNAME → your-site.netlify.app

# Netlify 免費方案：
# - 100GB 頻寬/月
# - 300 分鐘建構時間/月
# - 足夠大多數小型網站
```

#### Cloudflare Pages

```bash
# 方法 1：CLI 部署
npm i -g wrangler
wrangler pages deploy dist

# 方法 2：連結 GitHub（推薦）
# 1. 登入 Cloudflare Dashboard → Pages
# 2. Create a project → Connect to Git
# 3. 選 GitHub repo
# 4. Build command: npm run build
# 5. Build output directory: dist
# 6. Deploy

# Cloudflare Pages 免費方案：
# - 無限頻寬（是的，免費無限）
# - 500 次建構/月
# - 自訂網域
# - 全球 CDN
# → 成本最低的選擇，強烈推薦
```

#### 部署平台比較

| 平台 | 免費頻寬 | 建構限制 | 特色 |
|------|----------|----------|------|
| Cloudflare Pages | 無限 | 500 次/月 | 最划算，全球 CDN |
| Netlify | 100GB/月 | 300 分鐘/月 | 功能最豐富（Forms, Functions） |
| Vercel | 100GB/月 | 6000 分鐘/月 | Next.js 最佳，Serverless |
| GitHub Pages | 100GB/月 | 10 次/小時 | 完全免費，限靜態 |

---

## 6. No-Code 方案

### 概覽

| 平台 | 月費 | 適合 | 特色 |
|------|------|------|------|
| **Wix** | 免費 - $36/月 | 完全不懂技術的客戶 | 拖拉介面最直覺 |
| **Squarespace** | $16 - $52/月 | 重視設計質感 | 模板最美 |
| **Framer** | 免費 - $30/月 | 設計師自己做網站 | Figma → 網站 |

### Wix

```
優點：
- 最直覺的拖拉編輯器
- AI 建站功能（Wix ADI）
- 內建 SEO、表單、電商
- 模板 800+
- 客戶完全可以自己維護

缺點：
- 程式碼無法匯出
- 效能偏差（PageSpeed 通常 40-60）
- 客製化受限
- 網址列會有 Wix 標誌（免費版）
- SEO 比 WordPress 弱

適合推給客戶自己做的場景：
- 預算 < 10,000 TWD
- 只需要基本形象頁
- 客戶想自己維護
- 不在意效能分數
```

### Squarespace

```
優點：
- 設計模板品質最高
- 所見即所得編輯
- 內建電商（支援 PayPal / Stripe）
- 響應式設計自動處理
- 客服品質好

缺點：
- 月費比 Wix 高
- 客製化程度不如 WordPress
- 台灣金流不直接支援
- 模板間切換會遺失內容

適合：
- 設計師 / 攝影師 / 建築師的作品集
- 重視視覺質感的品牌形象站
- 海外客戶（金流支援 Stripe）
```

### Framer

```
優點：
- Figma 設計稿直接變網站
- 設計自由度最高的 No-Code
- 效能比 Wix / Squarespace 好
- CMS 功能夠用
- 動畫效果豐富

缺點：
- 學習曲線比 Wix 陡
- CMS 功能比 Webflow 弱
- 生態系較新較小
- SEO 功能基本

適合：
- 設計師用來接 Landing Page 案子
- 快速產出行銷頁面
- Figma 工作流的團隊
- 強調動畫互動的網站
```

### 什麼時候推給客戶自己做

```
判斷流程圖：

客戶說「我想要一個網站」
    |
    v
預算多少？
    |
    +-- < 8,000 TWD ──> 教客戶用 Wix / Squarespace 自己做
    |                    收教學費 3,000-5,000 TWD
    |
    +-- 8,000 - 20,000 TWD ──> 看需求複雜度
    |   |
    |   +-- 簡單（< 5 頁）──> 幫做 Wix / Squarespace，教客戶維護
    |   |
    |   +-- 中等 ──> WordPress
    |
    +-- > 20,000 TWD ──> 自己接案做

推給客戶自己做的話術：
「您的需求相對簡單，用 Wix 就能做出很好的效果。
 我可以幫您做初始設定和教學，之後您自己就能維護更新。
 這樣您不用付我每月維護費，長期下來更省錢。」

收費模式：
- 初始設定 + 教學：3,000-5,000 TWD
- 提供 30 分鐘 Zoom 教學影片
- 附上文字版操作手冊
- 30 天內免費 LINE 諮詢
```

---

## 7. 綜合比較表

### 功能比較

| 項目 | WordPress | Next.js + CMS | Webflow | Astro | Wix | Squarespace | Framer |
|------|-----------|---------------|---------|-------|-----|-------------|--------|
| **初始成本** | 低 | 中高 | 中 | 低 | 低 | 中 | 低 |
| **月費** | 主機費 $5-30 | Vercel $0-20 | $14-39 | 免費 | $0-36 | $16-52 | $0-30 |
| **學習曲線** | 中 | 高 | 中高 | 中 | 低 | 低 | 中 |
| **客製化程度** | 高 | 最高 | 中高 | 高 | 低 | 低 | 中 |
| **SEO** | 優 | 最優 | 良 | 最優 | 中 | 良 | 中 |
| **效能** | 中 | 最優 | 良 | 最優 | 差 | 中 | 良 |
| **維護難度** | 中 | 高 | 低 | 低 | 最低 | 最低 | 低 |
| **電商** | 強（WooCommerce） | 需整合 | 弱 | 無 | 中 | 中 | 無 |
| **會員系統** | 可（外掛） | 可（自建） | 弱 | 無 | 可 | 可 | 無 |
| **多語系** | 可（WPML） | 可（i18n） | 可 | 可 | 可 | 有限 | 有限 |
| **匯出自由** | 完全 | 完全 | 需付費 | 完全 | 不可 | 不可 | 不可 |
| **台灣金流** | 綠界支援 | 自串 | 不支援 | 無 | 不支援 | 不直接 | 無 |

### 效能比較（典型 PageSpeed Insights 分數）

```
                     行動版    桌面版
Astro（靜態）         95-100    98-100
Next.js（SSG）        90-100    95-100
Hugo（靜態）          95-100    98-100
Webflow              75-90     85-95
WordPress（優化後）    70-85     80-95
WordPress（未優化）    30-50     50-70
Squarespace          60-80     75-90
Framer               70-85     80-95
Wix                  30-60     50-75
```

### 開發時間比較

| 專案類型 | WordPress | Next.js | Webflow | Astro |
|----------|-----------|---------|---------|-------|
| 5 頁形象站 | 1-2 天 | 3-5 天 | 1-2 天 | 1-2 天 |
| 部落格（20 篇起） | 2-3 天 | 3-5 天 | 2-3 天 | 2-3 天 |
| 電商（50 品項） | 5-7 天 | 10-15 天 | N/A | N/A |
| 會員系統 | 7-14 天 | 14-21 天 | N/A | N/A |
| Landing Page | 0.5-1 天 | 1-2 天 | 0.5-1 天 | 0.5-1 天 |
| 多語系（3 語） | 5-7 天 | 7-10 天 | 3-5 天 | 3-5 天 |

### 維護複雜度比較

```
最簡單 ←─────────────────────────────→ 最複雜

Wix  Squarespace  Astro  Webflow  WordPress  Next.js+CMS

     Wix/Squarespace：客戶自己按按就好
                Astro：幾乎不用維護（靜態檔案）
             Webflow：偶爾更新 CMS 內容
           WordPress：外掛更新、安全補丁、備份
         Next.js+CMS：程式碼維護 + CMS 維護 + 部署管線
```

---

## 8. 各方案報價建議

> 以下報價為台灣市場 2026 年參考範圍，實際依需求複雜度、客戶規模、地區調整。

### WordPress 形象站

```
方案 A：模板站（套版 + 改內容）
──────────────────────────────
報價：15,000 - 30,000 TWD
工時：1-2 天
包含：
- 安裝 WordPress + 主題
- 匯入 Demo 模板
- 修改文字 / 圖片（客戶提供）
- 5 頁以內（首頁、關於、服務、作品、聯絡）
- 基本 SEO 設定
- RWD 響應式
- SSL 設定
- 聯絡表單
- Google Analytics 埋設
不包含：
- 主機費（客戶自付 $5-30/月）
- 網域費（客戶自付 $500-1000/年）
- 後續維護

方案 B：半客製站（模板 + 客製區塊）
──────────────────────────────────
報價：30,000 - 60,000 TWD
工時：3-7 天
包含：
- 方案 A 全部內容
- 客製化首頁區塊設計
- Elementor / Bricks 客製版面
- 10 頁以內
- 進階 SEO（Schema Markup）
- 效能優化（PageSpeed > 80）
- 安全加固
- 1 次免費修改

方案 C：全客製 WordPress（商業功能）
────────────────────────────────────
報價：60,000 - 150,000 TWD
工時：7-21 天
包含：
- 全客製設計（不套模板）
- 無限頁面
- WooCommerce 電商整合
- 會員系統
- 多語系
- 客製外掛開發
- 效能優化
- 3 次免費修改
- 1 個月免費維護
```

### Next.js 客製站

```
方案 D：Next.js 形象站
──────────────────────
報價：50,000 - 100,000 TWD
工時：5-10 天
包含：
- Next.js + Tailwind CSS
- Headless CMS（Sanity / Strapi）
- SSG / ISR 靜態生成
- SEO 最佳化
- RWD 響應式
- 部署到 Vercel
- CMS 後台教學
適合：重視效能、SEO 的品牌官網

方案 E：Next.js 全端應用
────────────────────────
報價：100,000 - 250,000 TWD
工時：14-30 天
包含：
- 全客製前後端
- 會員系統（Auth.js / Supabase Auth）
- 資料庫設計（PostgreSQL / MongoDB）
- API 設計與開發
- 管理後台
- 第三方服務串接（金流 / LINE / Email）
- CI/CD 自動部署
- 2 個月免費維護
適合：SaaS、平台型產品、複雜商業邏輯

方案 F：Next.js 電商
────────────────────
報價：150,000 - 350,000 TWD
工時：21-45 天
包含：
- Next.js 前端 + Shopify / Saleor 後端
- 或 Next.js + 自建電商系統
- 商品管理系統
- 購物車 + 結帳流程
- 金流串接（綠界 / LINE Pay）
- 物流串接
- 電子發票
- 會員等級 / 點數系統
- 訂單管理後台
適合：客製化電商需求
```

### Webflow / 靜態站

```
方案 G：Webflow 設計站
──────────────────────
報價：20,000 - 60,000 TWD
工時：2-5 天
包含：
- Webflow 視覺化設計
- CMS Collection 設定
- 動畫效果
- RWD 響應式
- SEO 設定
- Editor 權限設定
- 客戶操作教學
不包含：
- Webflow 月費（客戶自付 $14-39/月）

方案 H：Astro 靜態站
────────────────────
報價：15,000 - 40,000 TWD
工時：1-3 天
包含：
- Astro 靜態網站
- Tailwind CSS 設計
- Markdown 內容管理
- 部署到 Cloudflare Pages（免費）
- SEO 最佳化
- PageSpeed 100 分保證
適合：不需要 CMS 後台、由工程師維護內容的網站
```

### 維護費用建議

```
月維護方案：
────────────

基本維護：2,000 - 3,000 TWD/月
- WordPress 核心 + 外掛更新
- 每日自動備份
- 安全監控
- 每月效能報告
- 月度 30 分鐘修改額度

標準維護：3,000 - 6,000 TWD/月
- 基本維護全部內容
- 每月 2 小時修改額度
- 內容更新代操
- SEO 月報
- 主機管理

進階維護：6,000 - 15,000 TWD/月
- 標準維護全部內容
- 每月 5 小時修改額度
- A/B 測試
- 效能持續優化
- 優先回應（24 小時內）
- 技術諮詢

年約方案（建議）：
- 月維護費 x 10 個月（等於打 83 折）
- 例：基本維護 2,500/月 → 年約 25,000/年

臨時支援：
- 時薪 800 - 1,500 TWD
- 緊急處理加收 50%
```

### 報價計算公式

```
報價 = 基礎工時 x 時薪 + 複雜度加成 + 急件加成

時薪參考（台灣自由工作者 2026 年）：
- 新手（0-2 年）：600 - 1,000 TWD/hr
- 中階（2-5 年）：1,000 - 1,800 TWD/hr
- 資深（5+ 年）：1,800 - 3,000 TWD/hr

複雜度加成：
- 多語系：+30%
- 電商功能：+50%
- 會員系統：+40%
- API 串接（每個）：+10-20%
- 客製外掛：+20-50%

急件加成：
- 1 週內交件：+30%
- 3 天內交件：+50%
- 隔天交件：+100%

範例計算：
WordPress 形象站（5 頁）
= 8 小時 x 1,200 TWD + 0% 複雜度
= 9,600 TWD
→ 報價 15,000 TWD（含溝通、修改、Buffer）

Next.js 會員電商
= 120 小時 x 1,500 TWD + 50% 電商 + 40% 會員
= 180,000 x 1.9
= 342,000 TWD
→ 報價 250,000-350,000 TWD（談判空間）
```

### 合約與付款建議

```
付款方式（建議）：
───────────────

小案（< 30,000 TWD）：
- 50% 訂金 → 50% 驗收尾款

中案（30,000 - 100,000 TWD）：
- 40% 訂金 → 30% 初稿 → 30% 驗收

大案（> 100,000 TWD）：
- 30% 訂金 → 30% 初稿 → 20% 測試 → 20% 驗收

維護合約：
- 月繳或季繳
- 年約預付優惠

合約必備條款：
────────────
1. 修改次數限制（含幾次免費修改，超過另計）
2. 內容提供期限（客戶多久內要給素材，逾期延後上線）
3. 原始碼歸屬（誰擁有程式碼）
4. 維護義務期間
5. 驗收標準（明確列出功能清單）
6. 終止條款
```

---

## 附錄 A：快速決策速查卡

```
客戶說：「我要一個簡單網站」
→ 問預算 → < 20K 用 WordPress 模板 / > 20K 看需求

客戶說：「我要賣東西」
→ < 50 品項用 Shopify / > 50 品項用 WooCommerce / 客製用 Next.js

客戶說：「我要很快上線」
→ WordPress 模板站 1 天可交 / Webflow 半天可交 / Landing Page 用 Framer 2 小時

客戶說：「我要最好的效能和 SEO」
→ Next.js SSG / Astro

客戶說：「我要自己能改」
→ WordPress（最直覺的後台）/ Webflow（設計導向）

客戶說：「我預算很低」
→ 教客戶用 Wix 自己做，收教學費

客戶說：「我要 APP」
→ 那不是 CMS 的範圍，另外報價（React Native / Flutter）

客戶說：「我要跟 LINE 串接」
→ Next.js + LINE Messaging API / WordPress + 外掛
```

## 附錄 B：主機與網域速查

### 網域購買推薦

| 平台 | .com 價格 | 特色 |
|------|-----------|------|
| Cloudflare Registrar | ~$10/年 | 零加價（成本價），推薦 |
| Namecheap | ~$10/年 | 便宜穩定 |
| Google Domains | ~$12/年 | 已轉移至 Squarespace |
| GoDaddy | ~$12/年（續約貴） | 知名度高但不推薦 |

### DNS 設定速查

```
# 指向主機 IP
A Record     @     → 主機 IP（例：123.456.789.0）
A Record     www   → 主機 IP

# 指向 Vercel
CNAME        @     → cname.vercel-dns.com
A Record     @     → 76.76.21.21

# 指向 Netlify
CNAME        @     → your-site.netlify.app

# 指向 Cloudflare Pages
CNAME        @     → your-site.pages.dev

# Email 設定（Google Workspace）
MX Record    @     → aspmx.l.google.com (Priority 1)
MX Record    @     → alt1.aspmx.l.google.com (Priority 5)
TXT Record   @     → v=spf1 include:_spf.google.com ~all
```

---

> 本手冊為 OpenClaw 接案工具箱的一部分，持續更新中。
> 有問題查 `cookbook/21-接案SOP.md`（接案流程）或 `cookbook/24-通訊平台串接指南.md`（LINE / Telegram 整合）。
