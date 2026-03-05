# 48 — Landing Page 高轉換設計

> 適用對象：接案網頁設計師、數位行銷人員、前端工程師
> 最後更新：2026-03-05

---

## 目錄

1. [Landing Page 心理學](#1-landing-page-心理學)
2. [高轉換 LP 結構（12 區塊模板）](#2-高轉換-lp-結構12-區塊模板)
3. [Hero Section 設計](#3-hero-section-設計)
4. [文案撰寫技巧](#4-文案撰寫技巧)
5. [CTA 按鈕設計](#5-cta-按鈕設計)
6. [社會證明](#6-社會證明)
7. [表單設計](#7-表單設計)
8. [行動版 LP 設計](#8-行動版-lp-設計)
9. [速度與效能](#9-速度與效能)
10. [A/B Testing](#10-ab-testing)
11. [追蹤與分析](#11-追蹤與分析)
12. [LP 建站工具](#12-lp-建站工具)
13. [LP 範例模板](#13-lp-範例模板)
14. [LP QA Checklist（上線前 20 項檢查）](#14-lp-qa-checklist上線前-20-項檢查)

---

## 1. Landing Page 心理學

### 1.1 AIDA 模型

每個高轉換 LP 都遵循 AIDA 心理路徑：

```
Attention（注意）→ Interest（興趣）→ Desire（渴望）→ Action（行動）
   Hero 區          痛點+方案         社會證明+定價        CTA 按鈕
```

| 階段 | 目標 | LP 區塊對應 | 停留時間 |
|------|------|------------|---------|
| **Attention** | 3 秒內抓住目光 | Hero 標題 + 主視覺 | 0-3 秒 |
| **Interest** | 讓訪客想繼續看 | 痛點描述 + 解決方案 | 3-15 秒 |
| **Desire** | 產生「我也要」的感覺 | 社會證明 + 功能利益 | 15-60 秒 |
| **Action** | 讓他按下按鈕 | CTA + 表單 + 定價 | 60+ 秒 |

### 1.2 F 型閱讀模式

Nielsen Norman Group 眼球追蹤研究顯示，使用者閱讀網頁呈 F 型：

```
████████████████████████   ← 第一橫：讀完整標題
████████████████████████
██████████████             ← 第二橫：讀副標題（較短）
██████████████
████                       ← 往下只掃左側
████
████
████
```

**設計對策：**

- 標題放最上方，完整呈現價值主張
- 副標題比標題短，但資訊密度更高
- 左側放重點資訊（icon、數字、粗體關鍵字）
- 每個區塊開頭都要有吸引力（因為使用者只看開頭）

### 1.3 視覺動線設計

```
Z 型動線（適合簡潔 LP）        Gutenberg 對角線（適合長頁面）

1 ──→ 2                       [強] ─── [弱]
      │                         │        │
      ↓                         ↓        ↓
3 ──→ 4 (CTA)                 [弱] ─── [強=CTA]
```

**Z 型動線實作：**

```html
<section class="hero">
  <!-- 1. 左上：Logo/品牌 -->
  <nav>Logo .............. 選單</nav>

  <!-- 2. 右上→左下：標題橫跨 -->
  <h1>用 AI 把你的客服效率提升 300%</h1>

  <!-- 3. 左下：說明文字 -->
  <p>不需要寫程式，5 分鐘設定完成</p>

  <!-- 4. 右下 or 中間：CTA -->
  <button>免費試用 14 天</button>
</section>
```

### 1.4 決策疲勞

**核心原理：** 人在一天中做越多決策，判斷力越差。LP 要減少訪客的決策負擔。

| 問題 | 解法 | 轉換率影響 |
|------|------|-----------|
| 太多選項 | 定價最多 3 個方案 | 選項從 5→3，轉換率 +20% |
| 太多 CTA | 整頁只有 1 個目標動作 | 單一 CTA 比多重 CTA 高 13.5% |
| 太多文字 | 用 icon + 短句取代長段落 | 精簡 50% 文字，轉換率 +58% |
| 表單太長 | 欄位從 11 個降到 4 個 | 減少欄位，轉換率 +120% |

**Hick's Law（希克定律）：**

```
決策時間 = log2(選項數量 + 1)
```

選項越少，訪客越快行動。**一個 LP 只做一件事。**

### 1.5 其他關鍵心理效應

| 效應 | 說明 | LP 應用 |
|------|------|--------|
| **錨定效應** | 先看到的數字影響判斷 | 定價表先放最貴方案，中間方案顯得便宜 |
| **稀缺性** | 越少越想要 | 「限時優惠」「僅剩 12 個名額」 |
| **社會認同** | 別人都用 = 安全 | 「超過 10,000 家企業信賴」 |
| **損失厭惡** | 怕失去 > 想得到 | 「別讓競爭對手搶先一步」 |
| **互惠原則** | 先給好處 | 免費試用、免費電子書、免費諮詢 |
| **承諾一致** | 小 yes → 大 yes | 先按「了解更多」→ 再填表單 |

---

## 2. 高轉換 LP 結構（12 區塊模板）

### 2.1 完整結構圖

```
┌─────────────────────────────────────┐
│  0. 頂部通知列（選用）                │  ← 限時優惠 / 公告
├─────────────────────────────────────┤
│  1. Hero Section                     │  ← 標題 + 副標 + CTA + 主視覺
├─────────────────────────────────────┤
│  2. 社會證明（Logo 列）               │  ← 「信賴我們的品牌」
├─────────────────────────────────────┤
│  3. 痛點區                           │  ← 「你是否遇到這些問題？」
├─────────────────────────────────────┤
│  4. 解決方案                         │  ← 「我們如何解決」
├─────────────────────────────────────┤
│  5. 功能 / 特色區                    │  ← 3-6 個核心功能（icon + 標題 + 說明）
├─────────────────────────────────────┤
│  6. 運作流程                         │  ← 「3 步驟開始」
├─────────────────────────────────────┤
│  7. 客戶見證                         │  ← 真人照片 + 引言 + 公司名
├─────────────────────────────────────┤
│  8. 數據成果                         │  ← 大數字：「300% 效率提升」
├─────────────────────────────────────┤
│  9. 定價方案                         │  ← 2-3 個方案，推薦標示
├─────────────────────────────────────┤
│ 10. FAQ                              │  ← 5-8 個常見問題（手風琴）
├─────────────────────────────────────┤
│ 11. 最終 CTA                         │  ← 最後一次說服 + 大按鈕
├─────────────────────────────────────┤
│ 12. Footer                           │  ← 法律資訊 / 聯絡方式
└─────────────────────────────────────┘
```

### 2.2 各區塊轉換貢獻度

| 區塊 | 轉換貢獻度 | 必要性 | 備註 |
|------|-----------|--------|------|
| Hero Section | 極高 | 必要 | 決定 70% 訪客去留 |
| 痛點區 | 高 | 必要 | 引起共鳴是轉換基礎 |
| 解決方案 | 高 | 必要 | 承接痛點，給出答案 |
| 功能特色 | 中高 | 必要 | 具體說明產品價值 |
| 社會證明 | 高 | 必要 | 信任感是轉換催化劑 |
| 客戶見證 | 高 | 強烈建議 | 真人故事最有說服力 |
| 定價方案 | 中高 | 視業務 | SaaS 必要，服務業選用 |
| FAQ | 中 | 建議 | 消除最後疑慮 |
| 最終 CTA | 高 | 必要 | 最後一擊 |

### 2.3 12 區塊 HTML 骨架

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>產品名稱 — 一句話價值主張</title>
  <meta name="description" content="120 字以內的頁面描述，包含主要關鍵字">
</head>
<body>

  <!-- 0. 頂部通知列 -->
  <div class="announcement-bar">
    限時優惠：前 100 名註冊享 6 折 → <a href="#pricing">立即查看</a>
  </div>

  <!-- 1. Hero Section -->
  <section id="hero" class="hero">
    <div class="hero-content">
      <h1>主標題：一句話說清楚產品價值</h1>
      <p class="subtitle">副標題：補充說明、降低疑慮</p>
      <div class="hero-cta">
        <a href="#signup" class="btn-primary">主要 CTA</a>
        <a href="#demo" class="btn-secondary">次要 CTA</a>
      </div>
    </div>
    <div class="hero-visual">
      <img src="hero-image.webp" alt="產品使用情境" loading="eager">
    </div>
  </section>

  <!-- 2. Logo 社會證明 -->
  <section class="logo-bar">
    <p>超過 2,000 家企業信賴</p>
    <div class="logos">
      <img src="logo1.svg" alt="客戶A" loading="lazy">
      <img src="logo2.svg" alt="客戶B" loading="lazy">
      <img src="logo3.svg" alt="客戶C" loading="lazy">
    </div>
  </section>

  <!-- 3. 痛點區 -->
  <section id="problems" class="pain-points">
    <h2>你是否也遇到這些問題？</h2>
    <div class="pain-grid">
      <div class="pain-item">
        <span class="pain-icon">&#x26A0;</span>
        <h3>痛點 1 標題</h3>
        <p>具體描述這個問題如何影響他們</p>
      </div>
      <!-- 重複 2-3 個痛點 -->
    </div>
  </section>

  <!-- 4. 解決方案 -->
  <section id="solution" class="solution">
    <h2>我們的解決方案</h2>
    <p>一段話說明你的產品如何解決上述痛點</p>
    <img src="solution-diagram.webp" alt="解決方案示意圖" loading="lazy">
  </section>

  <!-- 5. 功能特色 -->
  <section id="features" class="features">
    <h2>為什麼選擇我們</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <div class="feature-icon"><!-- SVG icon --></div>
        <h3>功能名稱</h3>
        <p>這個功能帶給使用者什麼好處</p>
      </div>
      <!-- 重複 3-6 個功能 -->
    </div>
  </section>

  <!-- 6. 運作流程 -->
  <section id="how-it-works" class="process">
    <h2>3 步驟輕鬆開始</h2>
    <div class="steps">
      <div class="step">
        <span class="step-number">1</span>
        <h3>註冊帳號</h3>
        <p>30 秒完成，不需信用卡</p>
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <h3>設定偏好</h3>
        <p>回答 3 個問題，AI 自動配置</p>
      </div>
      <div class="step">
        <span class="step-number">3</span>
        <h3>開始使用</h3>
        <p>立即體驗效率提升</p>
      </div>
    </div>
  </section>

  <!-- 7. 客戶見證 -->
  <section id="testimonials" class="testimonials">
    <h2>客戶怎麼說</h2>
    <div class="testimonial-grid">
      <blockquote class="testimonial-card">
        <p>「使用後客服回覆時間從 24 小時降到 2 小時，客戶滿意度提升 40%。」</p>
        <footer>
          <img src="avatar1.webp" alt="王大明" loading="lazy">
          <cite>王大明，ABC 科技 執行長</cite>
        </footer>
      </blockquote>
    </div>
  </section>

  <!-- 8. 數據成果 -->
  <section class="stats">
    <div class="stat-item">
      <span class="stat-number">300%</span>
      <span class="stat-label">效率提升</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">10,000+</span>
      <span class="stat-label">活躍用戶</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">99.9%</span>
      <span class="stat-label">正常運行時間</span>
    </div>
  </section>

  <!-- 9. 定價方案 -->
  <section id="pricing" class="pricing">
    <h2>選擇適合你的方案</h2>
    <div class="pricing-grid">
      <div class="pricing-card">
        <h3>入門版</h3>
        <div class="price">NT$0<span>/月</span></div>
        <ul>
          <li>功能 A</li>
          <li>功能 B</li>
        </ul>
        <a href="#signup" class="btn-secondary">免費開始</a>
      </div>
      <div class="pricing-card featured">
        <span class="badge">最受歡迎</span>
        <h3>專業版</h3>
        <div class="price">NT$990<span>/月</span></div>
        <ul>
          <li>入門版所有功能</li>
          <li>功能 C</li>
          <li>功能 D</li>
        </ul>
        <a href="#signup" class="btn-primary">開始免費試用</a>
      </div>
      <div class="pricing-card">
        <h3>企業版</h3>
        <div class="price">聯繫我們</div>
        <ul>
          <li>專業版所有功能</li>
          <li>功能 E</li>
          <li>專屬客服</li>
        </ul>
        <a href="#contact" class="btn-secondary">聯繫業務</a>
      </div>
    </div>
  </section>

  <!-- 10. FAQ -->
  <section id="faq" class="faq">
    <h2>常見問題</h2>
    <details>
      <summary>可以免費試用嗎？</summary>
      <p>可以！我們提供 14 天免費試用，不需要綁定信用卡。</p>
    </details>
    <details>
      <summary>隨時可以取消嗎？</summary>
      <p>隨時都能取消，不綁約、不收違約金。</p>
    </details>
  </section>

  <!-- 11. 最終 CTA -->
  <section class="final-cta">
    <h2>準備好提升你的業務了嗎？</h2>
    <p>加入超過 10,000 家企業的行列</p>
    <a href="#signup" class="btn-primary btn-large">免費試用 14 天</a>
    <p class="reassurance">不需信用卡 / 隨時取消 / 5 分鐘上手</p>
  </section>

  <!-- 12. Footer -->
  <footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h4>產品</h4>
        <a href="#features">功能</a>
        <a href="#pricing">定價</a>
      </div>
      <div>
        <h4>公司</h4>
        <a href="/about">關於我們</a>
        <a href="/contact">聯繫我們</a>
      </div>
      <div>
        <h4>法律</h4>
        <a href="/privacy">隱私政策</a>
        <a href="/terms">服務條款</a>
      </div>
    </div>
    <p class="copyright">&copy; 2026 品牌名稱. All rights reserved.</p>
  </footer>

</body>
</html>
```

---

## 3. Hero Section 設計

### 3.1 標題公式（10 種高轉換模板）

| # | 公式 | 範例 |
|---|------|------|
| 1 | **動詞 + 成果 + 時間** | 「在 5 分鐘內建立你的線上商店」 |
| 2 | **不用 X 也能 Y** | 「不用寫程式也能打造 AI 客服」 |
| 3 | **數字 + 成果** | 「幫助 10,000+ 企業節省 40% 行銷費用」 |
| 4 | **問句直擊痛點** | 「還在手動整理客戶名單？」 |
| 5 | **一句話定位** | 「最簡單的團隊專案管理工具」 |
| 6 | **Before/After** | 「把 3 小時的報表工作縮短到 3 分鐘」 |
| 7 | **客戶代言** | 「被 Google、Netflix、Spotify 採用的設計系統」 |
| 8 | **消除風險** | 「免費試用 14 天，不滿意全額退費」 |
| 9 | **排他性** | 「專為台灣中小企業打造的 ERP」 |
| 10 | **對比法** | 「別花 50 萬請工程師，月付 990 就搞定」 |

### 3.2 副標題原則

```
主標題 = 說「什麼」（What）
副標題 = 說「怎麼做」或「為什麼」（How / Why）
```

**好的副標題範例：**

```html
<h1>用 AI 把客服效率提升 300%</h1>
<p class="subtitle">
  自動回覆常見問題、智能分派工單、即時翻譯 12 種語言。
  超過 2,000 家企業已在使用。
</p>
```

**副標題 Checklist：**
- 控制在 20-30 字（中文）
- 補充主標題沒說的資訊
- 包含具體數字或事實
- 降低一個疑慮（免費？快速？簡單？）

### 3.3 CTA 按鈕配置

```html
<!-- 雙按鈕配置（最常見） -->
<div class="hero-cta">
  <!-- 主按鈕：高對比色、動作明確 -->
  <a href="#signup" class="btn-primary">免費開始使用</a>

  <!-- 次按鈕：低調、給猶豫的人 -->
  <a href="#demo" class="btn-secondary">觀看 2 分鐘 Demo</a>
</div>

<!-- 按鈕下方小字（降低疑慮） -->
<p class="cta-reassurance">不需信用卡 &bull; 30 秒註冊 &bull; 隨時取消</p>
```

### 3.4 背景圖 vs 影片

| 項目 | 靜態圖片 | 背景影片 | 動態插圖 |
|------|---------|---------|---------|
| 載入速度 | 快 | 慢（+2-5MB） | 中等 |
| 注意力 | 中 | 高 | 高 |
| 行動版表現 | 好 | 差（耗電耗流量） | 好 |
| 轉換率影響 | 基準 | +10-20%（桌面） | +5-15% |
| 適合場景 | 所有場景 | SaaS 產品展示 | 科技/新創 |

**背景影片最佳實踐：**

```html
<!-- 桌面版才載入影片，手機版顯示靜態圖 -->
<div class="hero-bg">
  <picture>
    <source media="(min-width: 768px)" type="video/mp4">
    <img src="hero-fallback.webp" alt="產品展示">
  </picture>
  <video autoplay muted loop playsinline
         poster="hero-fallback.webp"
         class="hero-video desktop-only">
    <source src="hero-bg.mp4" type="video/mp4">
  </video>
</div>

<style>
.hero-video {
  display: none;
}
@media (min-width: 768px) {
  .hero-video {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    z-index: -1;
  }
}
</style>
```

---

## 4. 文案撰寫技巧

### 4.1 PAS 框架

```
Problem（問題）→ Agitate（加深痛感）→ Solution（解決方案）
```

**範例：**

```html
<!-- P: Problem -->
<h2>每天花 3 小時手動整理客戶資料？</h2>

<!-- A: Agitate -->
<p>
  人工整理不只浪費時間，更容易出錯。
  一筆錯誤的聯絡資訊，可能讓你失去一張百萬訂單。
  你的競爭對手已經在用自動化了——你還在用 Excel？
</p>

<!-- S: Solution -->
<p>
  CRM Pro 自動匯整所有通路的客戶資料，
  即時更新、零錯誤、每天幫你省下 3 小時。
</p>
```

### 4.2 Features vs Benefits

**Features 說的是「產品有什麼」，Benefits 說的是「使用者得到什麼」。**

| Feature（功能）| Benefit（好處）| 寫在 LP 上的版本 |
|---------------|---------------|-----------------|
| 256-bit 加密 | 你的資料絕對安全 | 「銀行級加密保護你的每一筆交易」 |
| AI 自動分類 | 不用手動整理 | 「AI 幫你自動整理，每天省 2 小時」 |
| 即時同步 | 團隊不會用到舊資料 | 「所有人永遠看到最新版本」 |
| 14 天免費 | 零風險嘗試 | 「免費用 14 天，不滿意一鍵取消」 |
| 99.9% Uptime | 不會突然掛掉 | 「24/7 穩定運行，你的客戶隨時都能下單」 |

**公式：**

```
[功能] + so that（所以）+ [使用者好處]
```

### 4.3 Action Words（行動詞彙）

**CTA 按鈕必用動詞開頭：**

| 類型 | 動詞 | 範例 |
|------|------|------|
| 開始類 | 開始、啟動、體驗 | 「開始免費試用」 |
| 獲取類 | 取得、下載、領取 | 「領取免費攻略」 |
| 加入類 | 加入、註冊、預約 | 「加入 10,000+ 用戶行列」 |
| 了解類 | 了解、探索、查看 | 「查看定價方案」 |
| 立即類 | 立即、馬上、今天 | 「立即開始」 |

**避免使用：**
- 「提交」（Submit）— 暗示你要交出什麼
- 「購買」（Buy）— 太直接，增加心理壓力
- 「點擊這裡」— 沒有傳達任何價值

### 4.4 數字的力量

數字比文字更有說服力，大腦處理數字的速度比文字快 20%。

| 弱版本 | 強版本 |
|--------|--------|
| 「很多客戶信賴我們」 | 「12,847 家企業信賴我們」 |
| 「快速部署」 | 「5 分鐘完成部署」 |
| 「大幅提升效率」 | 「效率提升 300%」 |
| 「節省成本」 | 「平均每月節省 NT$15,000」 |
| 「高客戶滿意度」 | 「客戶滿意度 4.9/5.0」 |

**數字使用原則：**
- 奇數比偶數更吸引注意（例外：10 的倍數）
- 越精確越可信（「12,847」比「12,000」可信）
- 百分比和金額交替使用
- 大數字用千分位（12,847 不是 12847）

---

## 5. CTA 按鈕設計

### 5.1 顏色選擇

| 顏色 | 心理效應 | 適合場景 | A/B Test 數據 |
|------|---------|---------|--------------|
| **橘色** | 急迫、活力 | 免費試用、立即行動 | 比灰色高 32.5% |
| **綠色** | 安全、確認 | 結帳、確認訂閱 | 比紅色高 21%（Dmix 測試） |
| **紅色** | 緊急、熱情 | 限時優惠、立即購買 | 比綠色高 34%（Performable） |
| **藍色** | 信任、專業 | B2B、金融、醫療 | 比白底高 9% |

**重點不是「哪個顏色最好」，而是「對比度」。**

```css
/* 高對比原則：CTA 顏色不能跟頁面主色一樣 */

/* 差：藍色網站 + 藍色按鈕（看不到） */
.btn-primary { background: #2563EB; } /* 跟 nav 一樣藍 */

/* 好：藍色網站 + 橘色按鈕（跳出來） */
.btn-primary { background: #F97316; } /* 互補色，一眼就看到 */
```

### 5.2 大小與間距

```css
.btn-primary {
  /* 最小尺寸：44x44px（Apple HIG 觸控規範） */
  min-height: 48px;
  min-width: 200px;
  padding: 14px 32px;

  /* 字體 */
  font-size: 18px;       /* 不要小於 16px */
  font-weight: 700;
  letter-spacing: 0.5px;

  /* 外觀 */
  border-radius: 8px;    /* 圓角比直角轉換率高 2-5% */
  border: none;
  cursor: pointer;

  /* 顏色 */
  background: #F97316;
  color: #FFFFFF;

  /* 陰影（增加「可點擊感」） */
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);

  /* 過渡動畫 */
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
}

.btn-primary:active {
  transform: translateY(0);
}
```

### 5.3 按鈕文字

| 類別 | 差 | 好 | 更好 |
|------|-----|-----|------|
| 通用 | Submit | 免費註冊 | 開始我的免費試用 |
| 下載 | Download | 下載指南 | 領取我的免費行銷攻略 |
| 電商 | Buy | 加入購物車 | 立即以 6 折入手 |
| SaaS | Sign Up | 免費試用 | 免費試用 14 天，不綁卡 |

**按鈕文字公式：**

```
[動詞] + [使用者得到什麼] + [降低風險的修飾]

範例：
「領取」+「免費 SEO 檢查報告」          → 領取免費 SEO 檢查報告
「開始」+「14 天免費試用」+「不需信用卡」 → 開始 14 天免費試用（不需信用卡）
```

### 5.4 位置與數量

**CTA 出現位置：**
- Hero Section 上方（Above the fold）— 必要
- 功能區塊結束後 — 建議
- 客戶見證後 — 建議
- 頁面最底部（最終 CTA）— 必要
- 固定導航列右上角 — 選用

**數量規則：**
- 整頁只有「一個目標」（例如：註冊免費試用）
- 可以有多個按鈕，但都指向同一個目標
- 次要 CTA 最多 1 個（如「觀看 Demo」）

### 5.5 A/B Test 實際結果統計

| 測試項目 | 變體 A | 變體 B | 勝出 | 轉換率差異 |
|---------|--------|--------|------|-----------|
| 按鈕文字 | 「免費試用」 | 「開始我的免費試用」 | B | +90%（ContentVerve） |
| 按鈕顏色 | 綠色 | 紅色 | 紅色 | +21%（HubSpot） |
| 按鈕位置 | 頁面底部 | Above the fold | 兩者都放 | +17% |
| 按鈕大小 | 標準（200px） | 加大（300px） | 加大 | +11% |
| 按鈕周邊 | 無留白 | 大量留白 | 留白 | +232%（VWO） |
| 箭頭符號 | 無箭頭 | 有 → 箭頭 | 箭頭 | +26%（Helzberg） |
| 第一人稱 | 「開始免費試用」 | 「開始我的免費試用」 | 第一人稱 | +25% |

---

## 6. 社會證明

### 6.1 五種社會證明類型

| 類型 | 信任強度 | 實作難度 | 適合階段 |
|------|---------|---------|---------|
| **客戶 Logo 牆** | 中高 | 低 | 起步期就能做 |
| **數據統計** | 高 | 低 | 有真實數據時 |
| **客戶見證** | 最高 | 中 | 有滿意客戶時 |
| **評分星級** | 高 | 低 | 有第三方評分時 |
| **Case Study** | 最高 | 高 | 成熟期 |

### 6.2 Logo 牆

```html
<section class="trust-logos">
  <p class="trust-text">受到這些領先企業信賴</p>
  <div class="logo-grid">
    <!-- 用灰階、統一高度 -->
    <img src="logos/google.svg" alt="Google" height="32" loading="lazy">
    <img src="logos/microsoft.svg" alt="Microsoft" height="32" loading="lazy">
    <img src="logos/shopee.svg" alt="Shopee" height="32" loading="lazy">
    <img src="logos/linepay.svg" alt="LINE Pay" height="32" loading="lazy">
    <img src="logos/asus.svg" alt="ASUS" height="32" loading="lazy">
  </div>
</section>

<style>
.logo-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  flex-wrap: wrap;
}
.logo-grid img {
  filter: grayscale(100%);
  opacity: 0.6;
  transition: all 0.3s;
}
.logo-grid img:hover {
  filter: grayscale(0%);
  opacity: 1;
}
</style>
```

**Logo 牆原則：**
- 數量：5-8 個（太少不夠力，太多太雜）
- 灰階處理，hover 才顯示原色
- 統一高度（32-40px）
- 優先放知名品牌（即使是小案子）

### 6.3 客戶見證

```html
<div class="testimonial-card">
  <div class="testimonial-rating">
    <span>&#9733;</span><span>&#9733;</span><span>&#9733;</span>
    <span>&#9733;</span><span>&#9733;</span>
  </div>
  <blockquote>
    <p>
      「導入後的第一個月，<mark>客服處理時間減少 60%</mark>，
      客戶滿意度從 3.2 提升到 4.7。」
    </p>
  </blockquote>
  <div class="testimonial-author">
    <img src="avatars/chen.webp" alt="陳經理"
         width="48" height="48" loading="lazy">
    <div>
      <strong>陳志明</strong>
      <span>ABC 科技 客服主管</span>
    </div>
  </div>
</div>
```

**高轉換見證 Checklist：**
- 真人照片（非素材庫）
- 全名 + 職稱 + 公司名
- 包含具體數字（「60%」「4.7 分」）
- 用 `<mark>` 標記關鍵成果
- 控制在 2-3 句話

### 6.4 Case Study 展示方式

```html
<div class="case-study-card">
  <img src="case/abc-tech.webp" alt="ABC 科技案例" loading="lazy">
  <div class="case-content">
    <span class="case-industry">SaaS / 客服</span>
    <h3>ABC 科技如何在 3 個月內將客戶滿意度提升 47%</h3>
    <div class="case-metrics">
      <div>
        <span class="metric-value">-60%</span>
        <span class="metric-label">處理時間</span>
      </div>
      <div>
        <span class="metric-value">+47%</span>
        <span class="metric-label">客戶滿意度</span>
      </div>
      <div>
        <span class="metric-value">3 個月</span>
        <span class="metric-label">回收期</span>
      </div>
    </div>
    <a href="/cases/abc-tech" class="case-link">閱讀完整案例 &rarr;</a>
  </div>
</div>
```

---

## 7. 表單設計

### 7.1 欄位最少化

**每多一個欄位，轉換率平均下降 7%。**

| 欄位數 | 平均轉換率 | 建議 |
|--------|-----------|------|
| 1-2 個 | 25%+ | 只要 Email（最佳） |
| 3-4 個 | 15-20% | Name + Email + Phone |
| 5-7 個 | 5-10% | 勉強接受 |
| 8+ 個 | < 3% | 不要，拆成兩步 |

```html
<!-- 最簡表單（最高轉換率） -->
<form class="signup-form">
  <input type="email" placeholder="你的 Email" required>
  <button type="submit" class="btn-primary">免費開始使用</button>
  <p class="form-note">不需信用卡，30 秒完成</p>
</form>
```

### 7.2 漸進式表單（Multi-Step Form）

把長表單拆成多步，每步 2-3 個欄位，降低心理壓力。

```html
<form class="multi-step-form" id="leadForm">
  <!-- Step 1 -->
  <div class="form-step active" data-step="1">
    <h3>第 1 步：基本資訊</h3>
    <div class="progress-bar">
      <div class="progress" style="width: 33%"></div>
    </div>
    <input type="text" name="name" placeholder="你的姓名" required>
    <input type="email" name="email" placeholder="Email" required>
    <button type="button" class="btn-primary" onclick="nextStep(2)">
      下一步 &rarr;
    </button>
  </div>

  <!-- Step 2 -->
  <div class="form-step" data-step="2">
    <h3>第 2 步：你的需求</h3>
    <div class="progress-bar">
      <div class="progress" style="width: 66%"></div>
    </div>
    <select name="budget" required>
      <option value="">預算範圍</option>
      <option value="30k">NT$30,000 以下</option>
      <option value="30-80k">NT$30,000 - 80,000</option>
      <option value="80k+">NT$80,000 以上</option>
    </select>
    <select name="timeline" required>
      <option value="">期望時程</option>
      <option value="1m">1 個月內</option>
      <option value="3m">1-3 個月</option>
      <option value="3m+">不急</option>
    </select>
    <button type="button" class="btn-primary" onclick="nextStep(3)">
      下一步 &rarr;
    </button>
  </div>

  <!-- Step 3 -->
  <div class="form-step" data-step="3">
    <h3>最後一步！</h3>
    <div class="progress-bar">
      <div class="progress" style="width: 100%"></div>
    </div>
    <input type="tel" name="phone" placeholder="聯絡電話">
    <textarea name="message" placeholder="簡單描述你的專案"></textarea>
    <button type="submit" class="btn-primary">
      送出，取得免費報價
    </button>
  </div>
</form>

<script>
function nextStep(step) {
  document.querySelectorAll('.form-step').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelector(`[data-step="${step}"]`).classList.add('active');
}
</script>

<style>
.form-step { display: none; }
.form-step.active { display: block; }
.progress-bar {
  height: 4px;
  background: #E5E7EB;
  border-radius: 2px;
  margin-bottom: 24px;
}
.progress {
  height: 100%;
  background: #F97316;
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
```

### 7.3 Inline Validation

```html
<style>
.form-group { position: relative; margin-bottom: 16px; }

.form-group input:valid {
  border-color: #10B981;
}
.form-group input:invalid:not(:placeholder-shown) {
  border-color: #EF4444;
}

/* 即時錯誤訊息 */
.error-msg {
  color: #EF4444;
  font-size: 13px;
  margin-top: 4px;
  display: none;
}
.form-group input:invalid:not(:placeholder-shown) ~ .error-msg {
  display: block;
}
</style>

<div class="form-group">
  <input type="email" id="email" placeholder="your@email.com" required>
  <span class="error-msg">請輸入有效的 Email 地址</span>
</div>
```

**表單 UX 原則：**
- Label 放在欄位上方（不是左邊）
- Placeholder 不能取代 Label
- 錯誤訊息在欄位下方即時顯示
- 成功狀態用綠色勾勾
- 送出按鈕在表單正下方
- 密碼欄位提供顯示/隱藏切換

---

## 8. 行動版 LP 設計

### 8.1 Thumb Zone（拇指熱區）

```
         手機螢幕
┌──────────────────────┐
│   !!  困難區域  !!    │  ← 別放主要 CTA
│                      │
│   ~~ 勉強可及 ~~      │
│                      │
│   == 自然觸及 ==      │  ← 主要操作放這
│                      │
│ ████ 拇指熱區 ████   │  ← CTA 按鈕最佳位置
└──────────────────────┘
```

**設計對策：**
- 主 CTA 放在螢幕下半部
- 導航列的「漢堡選單」放右上角（右手拇指可及）
- 表單欄位寬度 100%
- 按鈕最小 48px 高

### 8.2 堆疊式排版

桌面版的並排欄位，手機版全部改成上下堆疊。

```css
/* 桌面版：三欄 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

/* 手機版：單欄堆疊 */
@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  /* Hero 區塊改成圖片在上、文字在下 */
  .hero {
    flex-direction: column;
  }
  .hero-visual {
    order: -1; /* 圖片移到上方 */
  }

  /* 標題字體縮小 */
  h1 { font-size: 28px; line-height: 1.3; }
  h2 { font-size: 22px; }

  /* 按鈕全寬 */
  .btn-primary, .btn-secondary {
    width: 100%;
    text-align: center;
  }
}
```

### 8.3 固定底部 CTA

```html
<!-- 固定在手機底部的 CTA 列 -->
<div class="sticky-cta" id="stickyCta">
  <a href="#signup" class="btn-primary">免費開始使用</a>
</div>

<style>
.sticky-cta {
  display: none; /* 桌面版隱藏 */
}

@media (max-width: 768px) {
  .sticky-cta {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    background: #FFFFFF;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
  }
  .sticky-cta .btn-primary {
    width: 100%;
    text-align: center;
  }

  /* 防止被固定 CTA 擋住頁尾內容 */
  body { padding-bottom: 80px; }
}
</style>

<script>
// 只在捲過 Hero 區後才顯示
const hero = document.getElementById('hero');
const stickyCta = document.getElementById('stickyCta');

const observer = new IntersectionObserver(([entry]) => {
  stickyCta.style.display = entry.isIntersecting ? 'none' : 'block';
}, { threshold: 0 });

if (hero && stickyCta) observer.observe(hero);
</script>
```

### 8.4 行動版 LP 關鍵數據

| 指標 | 目標值 | 說明 |
|------|--------|------|
| 首屏載入 | < 2.5 秒 | LCP（Largest Contentful Paint） |
| 可互動時間 | < 3 秒 | FID（First Input Delay） |
| 按鈕觸控區 | >= 48x48 px | Apple / Google 規範 |
| 字體最小值 | 16px | 避免 iOS 自動縮放 |
| 行動轉換率 | 桌面的 50-70% | 行動轉換率通常較低，這是正常的 |

---

## 9. 速度與效能

### 9.1 為什麼 LP 必須 < 3 秒載入

| 載入時間 | 跳出率增加 | 轉換率影響 |
|---------|-----------|-----------|
| 1 秒 | 基準 | 基準 |
| 2 秒 | +6% | -7% |
| 3 秒 | +32% | -20% |
| 5 秒 | +90% | -38% |
| 10 秒 | +123% | -62% |

Google 研究：行動頁面載入從 1 秒增加到 3 秒，跳出率增加 32%。

### 9.2 圖片壓縮

```bash
# WebP 格式轉換（品質 80，肉眼無差）
# macOS 安裝 cwebp
brew install webp

# 單張轉換
cwebp -q 80 hero.png -o hero.webp

# 批次轉換整個資料夾
for f in images/*.{png,jpg}; do
  cwebp -q 80 "$f" -o "${f%.*}.webp"
done
```

```html
<!-- 自適應圖片（根據螢幕寬度載入不同尺寸） -->
<picture>
  <source srcset="hero-400.webp" media="(max-width: 480px)" type="image/webp">
  <source srcset="hero-800.webp" media="(max-width: 1024px)" type="image/webp">
  <source srcset="hero-1200.webp" type="image/webp">
  <img src="hero-1200.jpg" alt="產品展示"
       width="1200" height="600"
       loading="eager"
       decoding="async">
</picture>

<!-- 非首屏圖片全部 lazy load -->
<img src="feature1.webp" alt="功能一" loading="lazy" decoding="async">
```

**圖片壓縮對照表：**

| 格式 | 適用場景 | 壓縮率 | 瀏覽器支援 |
|------|---------|--------|-----------|
| **WebP** | 照片、插圖（萬用） | 比 JPEG 小 25-35% | 97%+ |
| **AVIF** | 照片（最小） | 比 WebP 再小 20% | 92% |
| **SVG** | Logo、Icon | 向量無損 | 100% |
| **JPEG** | 照片（Fallback） | 基準 | 100% |
| **PNG** | 需要透明底 | 較大 | 100% |

### 9.3 CDN 設定

```html
<!-- 使用 CDN 載入第三方資源 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- DNS 預解析 -->
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```

**推薦 CDN 服務：**

| 服務 | 免費方案 | 適合場景 |
|------|---------|---------|
| **Cloudflare** | 無限流量 | 所有 LP（首選） |
| **Vercel Edge** | 100GB/月 | Next.js / React LP |
| **Netlify** | 100GB/月 | 靜態 LP |
| **BunnyCDN** | $0.01/GB | 圖片多的 LP |

### 9.4 Lazy Load 與資源優先級

```html
<head>
  <!-- 預載首屏關鍵資源 -->
  <link rel="preload" href="hero-1200.webp" as="image">
  <link rel="preload" href="fonts/inter-var.woff2" as="font"
        type="font/woff2" crossorigin>

  <!-- 關鍵 CSS 內聯 -->
  <style>
    /* 只放首屏需要的 CSS（Hero Section） */
    .hero { min-height: 100vh; display: flex; align-items: center; }
    .btn-primary {
      background: #F97316; color: #fff;
      padding: 14px 32px; border-radius: 8px;
      font-size: 18px; font-weight: 700;
      border: none; cursor: pointer;
    }
  </style>

  <!-- 非關鍵 CSS 延遲載入 -->
  <link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">
</head>

<body>
  <!-- 首屏圖片：loading="eager"（立即載入） -->
  <img src="hero.webp" loading="eager" fetchpriority="high" alt="Hero">

  <!-- 非首屏圖片：loading="lazy"（延遲載入） -->
  <img src="feature1.webp" loading="lazy" alt="Feature 1">

  <!-- 第三方腳本延遲載入 -->
  <script src="analytics.js" defer></script>
  <script src="chat-widget.js" async></script>
</body>
```

### 9.5 LP 效能檢查清單

```bash
# 用 Lighthouse 跑效能分數
npx lighthouse https://your-lp.com --output html --output-path report.html

# 或用 PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://your-lp.com&strategy=mobile"
```

| 指標 | 目標 | 工具 |
|------|------|------|
| LCP | < 2.5 秒 | Lighthouse / PageSpeed Insights |
| FID / INP | < 200ms | Chrome DevTools |
| CLS | < 0.1 | Lighthouse |
| 頁面大小 | < 1.5MB | Chrome DevTools Network |
| 請求數 | < 30 | Chrome DevTools Network |
| Lighthouse 分數 | > 90 | Lighthouse |

---

## 10. A/B Testing

### 10.1 Google Optimize 替代方案（已於 2023 年停用）

| 工具 | 價格 | 適合對象 | 特色 |
|------|------|---------|------|
| **VWO** | $0-$357/月 | 中大型企業 | 視覺化編輯器、熱力圖 |
| **Optimizely** | 需洽詢 | 企業級 | 功能最完整 |
| **Google Tag Manager + GA4** | 免費 | 所有人 | 需要自行寫程式 |
| **PostHog** | 免費開源 | 工程師 | Feature Flags + A/B |
| **Vercel Toolbar** | 隨 Vercel 方案 | 用 Vercel 的團隊 | Edge Middleware 分流 |
| **自建** | 免費 | 工程師 | 完全控制 |

### 10.2 用 GA4 + GTM 自建 A/B Test

```html
<!-- 方法：用 JavaScript 隨機分組，GA4 追蹤 -->
<script>
(function() {
  // 取得或建立使用者分組（存在 cookie 確保一致性）
  function getVariant() {
    const cookie = document.cookie.match(/ab_variant=(\w+)/);
    if (cookie) return cookie[1];
    const variant = Math.random() < 0.5 ? 'control' : 'variant_b';
    document.cookie = `ab_variant=${variant};max-age=2592000;path=/`;
    return variant;
  }

  const variant = getVariant();

  // 根據分組修改頁面
  if (variant === 'variant_b') {
    // 測試不同的 CTA 文字
    document.addEventListener('DOMContentLoaded', function() {
      const ctaBtn = document.querySelector('.btn-primary');
      if (ctaBtn) ctaBtn.textContent = '立即免費體驗';
    });
  }

  // 送到 GA4
  gtag('event', 'ab_test_impression', {
    test_name: 'hero_cta_text',
    variant: variant
  });
})();
</script>
```

### 10.3 該測試什麼（優先順序）

| 優先級 | 測試項目 | 預期影響 | 最低樣本量 |
|--------|---------|---------|-----------|
| 最高 | 標題文案 | +10-50% | 1,000 訪客/組 |
| 最高 | CTA 按鈕文字 | +5-30% | 1,000 |
| 高 | CTA 按鈕顏色 | +5-20% | 2,000 |
| 高 | Hero 主視覺 | +5-25% | 2,000 |
| 中 | 表單欄位數量 | +10-50% | 500 |
| 中 | 定價呈現方式 | +5-15% | 2,000 |
| 低 | 按鈕圓角 vs 方角 | +1-5% | 5,000 |
| 低 | 字體選擇 | +0-3% | 10,000 |

### 10.4 統計顯著性

```
樣本量計算公式（簡化版）：

n = (Z^2 * p * (1-p)) / E^2

Z = 1.96（95% 信賴度）
p = 基準轉換率
E = 最小可偵測差異

範例：
基準轉換率 5%，想偵測 20% 的相對提升（5% → 6%）
n = (1.96^2 * 0.05 * 0.95) / 0.01^2 = 1,825 人/組
```

**白話說：每組至少要 1,000-2,000 個訪客，跑至少 2 週。**

不要因為幾百個人的結果就下結論。

---

## 11. 追蹤與分析

### 11.1 GA4 事件追蹤

```html
<!-- GA4 基本設定 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>

<!-- LP 關鍵事件追蹤 -->
<script>
// CTA 點擊
document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('click', () => {
    gtag('event', 'cta_click', {
      button_text: btn.textContent.trim(),
      button_location: btn.closest('section')?.id || 'unknown'
    });
  });
});

// 表單送出
document.querySelector('#leadForm')?.addEventListener('submit', () => {
  gtag('event', 'generate_lead', {
    currency: 'TWD',
    value: 1000  // 預估每個 lead 價值
  });
});

// 捲動深度追蹤
let scrollTracked = {};
window.addEventListener('scroll', () => {
  const scrollPct = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );
  [25, 50, 75, 100].forEach(threshold => {
    if (scrollPct >= threshold && !scrollTracked[threshold]) {
      scrollTracked[threshold] = true;
      gtag('event', 'scroll_depth', { percent: threshold });
    }
  });
});

// 影片播放（如果有）
document.querySelector('video')?.addEventListener('play', () => {
  gtag('event', 'video_play', { video_title: 'hero_demo' });
});
</script>
```

### 11.2 UTM 參數

```
基本格式：
https://your-lp.com/?utm_source=來源&utm_medium=媒介&utm_campaign=活動名

完整範例：
https://your-lp.com/
  ?utm_source=facebook
  &utm_medium=cpc
  &utm_campaign=spring_2026
  &utm_content=hero_video_v2
  &utm_term=AI客服
```

| 參數 | 說明 | 範例值 |
|------|------|--------|
| `utm_source` | 流量來源 | facebook, google, newsletter, linkedin |
| `utm_medium` | 媒介類型 | cpc, email, social, organic |
| `utm_campaign` | 活動名稱 | spring_2026, product_launch |
| `utm_content` | 廣告素材 | hero_video, banner_a |
| `utm_term` | 關鍵字 | AI客服, 網頁設計 |

### 11.3 熱力圖工具

| 工具 | 價格 | 特色 |
|------|------|------|
| **Microsoft Clarity** | 免費 | Session Recording + 熱力圖 + 免費無限制 |
| **Hotjar** | $0-$80/月 | 最知名，UX 團隊愛用 |
| **PostHog** | 免費開源 | 自架可控 |
| **FullStory** | 需洽詢 | 企業級，搜尋功能強 |

**Clarity 安裝（推薦，完全免費）：**

```html
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,"clarity","script","YOUR_PROJECT_ID");
</script>
```

### 11.4 轉換率計算

```
轉換率 = (轉換次數 / 訪客總數) x 100%

範例：
1,000 個訪客，50 人填了表單
轉換率 = 50 / 1,000 = 5%
```

**各類 LP 平均轉換率（業界基準）：**

| LP 類型 | 平均轉換率 | 優秀轉換率 | 頂尖轉換率 |
|---------|-----------|-----------|-----------|
| SaaS 免費試用 | 3-5% | 8-12% | 15%+ |
| 電子書/白皮書下載 | 5-10% | 15-25% | 30%+ |
| 線上課程報名 | 2-5% | 8-15% | 20%+ |
| 實體商品銷售 | 1-3% | 5-8% | 10%+ |
| 諮詢預約 | 3-8% | 10-20% | 25%+ |
| 電商產品頁 | 1-3% | 3-5% | 8%+ |

---

## 12. LP 建站工具

### 12.1 工具比較

| 工具 | 價格 | 學習曲線 | 客製化程度 | 適合誰 |
|------|------|---------|-----------|--------|
| **Unbounce** | $99-$625/月 | 低 | 中 | 行銷人員，不想碰程式碼 |
| **Instapage** | $199/月起 | 低 | 中 | 需要大量 LP 的廣告團隊 |
| **Webflow** | $14-$39/月 | 中 | 高 | 設計師，想要精準控制 |
| **Framer** | $0-$30/月 | 中 | 高 | 設計師，動態效果強 |
| **Carrd** | $9-$49/年 | 極低 | 低 | 超簡單一頁式 LP |
| **WordPress + Elementor** | $0-$59/年 | 低 | 中高 | 已有 WP 站的人 |
| **自建 React + Tailwind** | 免費 | 高 | 最高 | 前端工程師 |
| **自建 Next.js** | 免費 | 高 | 最高 | 需要 SSR/SEO 的 LP |

### 12.2 自建 React + Tailwind LP 骨架

```bash
# 建立專案
npm create vite@latest my-landing-page -- --template react-ts
cd my-landing-page
npm install
npm install -D tailwindcss @tailwindcss/vite
```

```tsx
// src/App.tsx — 單頁 LP 結構
import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 送到後端 API
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-6 py-20 max-w-6xl mx-auto flex flex-col
                          md:flex-row items-center gap-12">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900
                         leading-tight">
            用 AI 把你的客服效率
            <span className="text-orange-500">提升 300%</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            自動回覆常見問題、智能分派工單、即時翻譯 12 種語言。
          </p>
          <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="輸入你的 Email"
              className="flex-1 px-4 py-3 border border-gray-300
                         rounded-lg text-base"
              required
            />
            <button type="submit"
                    className="px-6 py-3 bg-orange-500 text-white
                               font-semibold rounded-lg hover:bg-orange-600
                               transition-colors whitespace-nowrap">
              免費試用
            </button>
          </form>
          <p className="mt-2 text-sm text-gray-400">
            不需信用卡 &bull; 30 秒註冊
          </p>
        </div>
        <div className="flex-1">
          <img src="/hero.webp" alt="產品畫面"
               className="rounded-xl shadow-2xl" />
        </div>
      </section>

      {/* Logo Bar */}
      <section className="py-12 bg-gray-50">
        <p className="text-center text-gray-500 mb-6">
          超過 2,000 家企業信賴
        </p>
        <div className="flex justify-center items-center gap-12
                        flex-wrap px-6 opacity-60">
          {['Google','Microsoft','Shopee','ASUS','LINE'].map(name => (
            <span key={name} className="text-xl font-bold text-gray-400">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          為什麼選擇我們
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'AI 自動回覆', desc: '處理 80% 常見問題，客服只需處理複雜案件' },
            { title: '智能工單分派', desc: '根據問題類型自動分派給最適合的客服人員' },
            { title: '即時多語翻譯', desc: '支援 12 種語言即時翻譯，服務全球客戶' },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-xl border
                                          border-gray-200 hover:shadow-lg
                                          transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 bg-orange-500 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          準備好提升你的業務了嗎？
        </h2>
        <p className="text-lg mb-8 opacity-90">
          加入超過 10,000 家企業的行列
        </p>
        <a href="#hero"
           className="inline-block px-8 py-4 bg-white text-orange-500
                      font-bold rounded-lg text-lg hover:bg-gray-100
                      transition-colors">
          免費試用 14 天
        </a>
      </section>
    </div>
  );
}
```

---

## 13. LP 範例模板

### 13.1 SaaS 產品 LP

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CloudTask — 最簡單的團隊專案管理工具</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#1a1a1a; }
    .container { max-width:1100px; margin:0 auto; padding:0 24px; }

    /* Hero */
    .saas-hero { padding:80px 0; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; }
    .saas-hero h1 { font-size:48px; line-height:1.2; margin-bottom:16px; }
    .saas-hero .subtitle { font-size:20px; opacity:0.9; margin-bottom:32px; }
    .saas-hero .cta-group { display:flex; gap:12px; flex-wrap:wrap; }
    .btn-white { padding:14px 32px; background:#fff; color:#667eea; border:none; border-radius:8px; font-size:16px; font-weight:700; cursor:pointer; text-decoration:none; }
    .btn-ghost { padding:14px 32px; background:transparent; color:#fff; border:2px solid rgba(255,255,255,0.5); border-radius:8px; font-size:16px; cursor:pointer; text-decoration:none; }

    /* Features */
    .saas-features { padding:80px 0; }
    .saas-features h2 { text-align:center; font-size:32px; margin-bottom:48px; }
    .feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:32px; }
    .feat-card { padding:24px; border:1px solid #e5e7eb; border-radius:12px; }
    .feat-card h3 { font-size:20px; margin-bottom:8px; }
    .feat-card p { color:#6b7280; line-height:1.6; }

    /* Pricing */
    .saas-pricing { padding:80px 0; background:#f9fafb; }
    .price-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:48px; }
    .price-card { background:#fff; padding:32px; border-radius:12px; border:2px solid #e5e7eb; text-align:center; }
    .price-card.popular { border-color:#667eea; position:relative; }
    .price-card.popular::before { content:"最受歡迎"; position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:#667eea; color:#fff; padding:4px 16px; border-radius:20px; font-size:13px; }
    .price-amount { font-size:48px; font-weight:700; margin:16px 0; }
    .price-amount span { font-size:16px; font-weight:400; color:#6b7280; }
    .price-card ul { list-style:none; text-align:left; margin:24px 0; }
    .price-card li { padding:8px 0; border-bottom:1px solid #f3f4f6; }
    .price-card li::before { content:"\2713 "; color:#10b981; font-weight:700; }
    .btn-primary-saas { display:block; padding:14px; background:#667eea; color:#fff; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer; text-decoration:none; text-align:center; }

    @media(max-width:768px) {
      .saas-hero h1 { font-size:32px; }
      .feat-grid, .price-grid { grid-template-columns:1fr; }
    }
  </style>
</head>
<body>

  <section class="saas-hero">
    <div class="container">
      <h1>專案管理，終於變簡單了</h1>
      <p class="subtitle">看板、時間軸、自動化工作流程——你的團隊需要的全部在這裡。免費開始，隨團隊成長升級。</p>
      <div class="cta-group">
        <a href="#signup" class="btn-white">免費開始使用</a>
        <a href="#demo" class="btn-ghost">觀看 Demo &rarr;</a>
      </div>
    </div>
  </section>

  <section class="saas-features">
    <div class="container">
      <h2>為什麼 2,000+ 團隊選擇 CloudTask</h2>
      <div class="feat-grid">
        <div class="feat-card">
          <h3>看板視圖</h3>
          <p>拖拉即可更新任務狀態，直覺操作，5 分鐘上手。</p>
        </div>
        <div class="feat-card">
          <h3>自動化工作流程</h3>
          <p>任務到期自動通知、狀態變更自動指派，省下 60% 管理時間。</p>
        </div>
        <div class="feat-card">
          <h3>即時協作</h3>
          <p>留言、附件、@標註——團隊溝通不再需要切換工具。</p>
        </div>
      </div>
    </div>
  </section>

  <section class="saas-pricing">
    <div class="container">
      <h2 style="text-align:center;font-size:32px;">選擇適合你的方案</h2>
      <div class="price-grid">
        <div class="price-card">
          <h3>免費版</h3>
          <div class="price-amount">$0<span>/月</span></div>
          <ul>
            <li>最多 5 人</li>
            <li>無限專案</li>
            <li>基本看板</li>
          </ul>
          <a href="#signup" class="btn-primary-saas">免費開始</a>
        </div>
        <div class="price-card popular">
          <h3>專業版</h3>
          <div class="price-amount">$12<span>/人/月</span></div>
          <ul>
            <li>無限人數</li>
            <li>自動化工作流程</li>
            <li>時間軸視圖</li>
            <li>進階報表</li>
          </ul>
          <a href="#signup" class="btn-primary-saas">開始 14 天免費試用</a>
        </div>
        <div class="price-card">
          <h3>企業版</h3>
          <div class="price-amount">聯繫我們</div>
          <ul>
            <li>專業版所有功能</li>
            <li>SSO 單一登入</li>
            <li>專屬客服經理</li>
            <li>SLA 保證</li>
          </ul>
          <a href="#contact" class="btn-primary-saas">聯繫業務團隊</a>
        </div>
      </div>
    </div>
  </section>

</body>
</html>
```

### 13.2 線上課程 LP

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 行銷實戰班 — 30 天掌握 AI 行銷全技能</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#1a1a1a; }
    .container { max-width:900px; margin:0 auto; padding:0 24px; }

    .course-hero { padding:80px 0; background:#0f172a; color:#fff; text-align:center; }
    .course-hero .tag { display:inline-block; background:#f59e0b; color:#0f172a; padding:4px 12px; border-radius:20px; font-size:14px; font-weight:600; margin-bottom:16px; }
    .course-hero h1 { font-size:42px; line-height:1.3; margin-bottom:16px; }
    .course-hero .subtitle { font-size:18px; opacity:0.8; margin-bottom:12px; }
    .course-hero .stats { display:flex; justify-content:center; gap:32px; margin:24px 0; flex-wrap:wrap; }
    .course-hero .stat { text-align:center; }
    .course-hero .stat strong { display:block; font-size:24px; color:#f59e0b; }
    .btn-yellow { display:inline-block; padding:16px 40px; background:#f59e0b; color:#0f172a; border:none; border-radius:8px; font-size:18px; font-weight:700; cursor:pointer; text-decoration:none; }
    .urgency { margin-top:12px; color:#f87171; font-size:14px; }

    .curriculum { padding:60px 0; }
    .curriculum h2 { font-size:28px; text-align:center; margin-bottom:32px; }
    .module { border:1px solid #e5e7eb; border-radius:8px; margin-bottom:12px; overflow:hidden; }
    .module summary { padding:16px 20px; font-weight:600; cursor:pointer; background:#f9fafb; }
    .module-content { padding:16px 20px; }
    .module-content li { padding:4px 0; color:#6b7280; }

    .instructor { padding:60px 0; background:#f9fafb; }
    .instructor-flex { display:flex; gap:32px; align-items:center; flex-wrap:wrap; }
    .instructor-photo { width:200px; height:200px; border-radius:50%; background:#d1d5db; flex-shrink:0; }
    .instructor-info h3 { font-size:24px; margin-bottom:8px; }
    .instructor-info p { color:#6b7280; line-height:1.7; }

    .guarantee { padding:40px 0; text-align:center; }
    .guarantee-box { display:inline-block; padding:24px 40px; border:2px solid #10b981; border-radius:12px; }
    .guarantee-box h3 { color:#10b981; margin-bottom:8px; }

    @media(max-width:768px) {
      .course-hero h1 { font-size:28px; }
      .instructor-flex { flex-direction:column; text-align:center; }
    }
  </style>
</head>
<body>

  <section class="course-hero">
    <div class="container">
      <span class="tag">2026 全新改版</span>
      <h1>AI 行銷實戰班<br>30 天掌握 AI 行銷全技能</h1>
      <p class="subtitle">從 ChatGPT 到 AI 廣告投放，手把手教你用 AI 把行銷效率翻 3 倍</p>
      <div class="stats">
        <div class="stat"><strong>30+</strong>堂影片課程</div>
        <div class="stat"><strong>12</strong>個實戰專案</div>
        <div class="stat"><strong>2,847</strong>位學員</div>
        <div class="stat"><strong>4.9/5.0</strong>學員評分</div>
      </div>
      <a href="#signup" class="btn-yellow">立即報名 — 早鳥價 NT$2,490</a>
      <p class="urgency">早鳥優惠倒數 3 天，原價 NT$4,990</p>
    </div>
  </section>

  <section class="curriculum">
    <div class="container">
      <h2>課程大綱</h2>
      <details class="module">
        <summary>模組一：AI 行銷基礎（第 1-7 天）</summary>
        <div class="module-content">
          <ul>
            <li>1-1 AI 行銷全景圖：工具、流程、策略</li>
            <li>1-2 ChatGPT / Claude 進階提示工程</li>
            <li>1-3 AI 文案產生器實作</li>
            <li>1-4 實戰：用 AI 一天產出一個月的社群內容</li>
          </ul>
        </div>
      </details>
      <details class="module">
        <summary>模組二：AI 廣告投放（第 8-14 天）</summary>
        <div class="module-content">
          <ul>
            <li>2-1 Meta 廣告 + AI 受眾分析</li>
            <li>2-2 Google Ads AI 出價策略</li>
            <li>2-3 AI 生成廣告素材（圖片 + 影片）</li>
            <li>2-4 實戰：NT$5,000 預算跑一波完整廣告</li>
          </ul>
        </div>
      </details>
      <details class="module">
        <summary>模組三：AI 數據分析（第 15-21 天）</summary>
        <div class="module-content">
          <ul>
            <li>3-1 GA4 + AI 報表自動化</li>
            <li>3-2 用 AI 做競品分析</li>
            <li>3-3 預測模型入門</li>
          </ul>
        </div>
      </details>
    </div>
  </section>

  <section class="instructor">
    <div class="container">
      <div class="instructor-flex">
        <div class="instructor-photo"></div>
        <div class="instructor-info">
          <h3>講師：林小明</h3>
          <p>
            前 Google 台灣行銷經理，10 年數位行銷經驗。
            曾操盤年度預算超過 NT$5,000 萬的廣告專案。
            2024 年起專注 AI 行銷教學，已培訓超過 2,800 位學員。
          </p>
        </div>
      </div>
    </div>
  </section>

  <section class="guarantee">
    <div class="container">
      <div class="guarantee-box">
        <h3>30 天無條件退費保證</h3>
        <p>不滿意，30 天內申請全額退費，不問原因。</p>
      </div>
    </div>
  </section>

</body>
</html>
```

### 13.3 實體商品 LP

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AirDesk Pro — 升降桌界的 iPhone</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#1a1a1a; }
    .container { max-width:1100px; margin:0 auto; padding:0 24px; }

    .product-hero { padding:80px 0; display:flex; align-items:center; gap:48px; flex-wrap:wrap; max-width:1100px; margin:0 auto; padding-left:24px; padding-right:24px; }
    .product-hero .visual { flex:1; min-width:300px; background:#f3f4f6; border-radius:16px; height:400px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:14px; }
    .product-hero .info { flex:1; min-width:300px; }
    .product-hero h1 { font-size:36px; line-height:1.3; }
    .product-hero .tagline { font-size:18px; color:#6b7280; margin:12px 0 24px; }
    .product-hero .price-box { display:flex; align-items:baseline; gap:12px; margin-bottom:24px; }
    .product-hero .price-now { font-size:36px; font-weight:700; color:#dc2626; }
    .product-hero .price-original { font-size:18px; color:#9ca3af; text-decoration:line-through; }
    .product-hero .discount-tag { background:#fef2f2; color:#dc2626; padding:4px 8px; border-radius:4px; font-size:14px; font-weight:600; }
    .btn-red { display:inline-block; padding:16px 40px; background:#dc2626; color:#fff; border:none; border-radius:8px; font-size:18px; font-weight:700; cursor:pointer; text-decoration:none; }
    .shipping-note { margin-top:12px; color:#6b7280; font-size:14px; }

    .specs { padding:60px 0; background:#f9fafb; }
    .specs h2 { text-align:center; font-size:28px; margin-bottom:32px; }
    .spec-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; text-align:center; }
    .spec-item strong { display:block; font-size:28px; color:#dc2626; }
    .spec-item span { color:#6b7280; font-size:14px; }

    .reviews { padding:60px 0; }
    .reviews h2 { text-align:center; font-size:28px; margin-bottom:32px; }
    .review-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:24px; }
    .review-card { padding:24px; border:1px solid #e5e7eb; border-radius:12px; }
    .review-stars { color:#f59e0b; margin-bottom:8px; }
    .review-card p { color:#374151; line-height:1.6; margin-bottom:8px; }
    .review-author { color:#9ca3af; font-size:14px; }

    @media(max-width:768px) {
      .product-hero { flex-direction:column; }
      .product-hero h1 { font-size:28px; }
      .spec-grid { grid-template-columns:repeat(2,1fr); }
      .review-grid { grid-template-columns:1fr; }
    }
  </style>
</head>
<body>

  <div class="product-hero">
    <div class="visual">[產品圖片 / 360度旋轉展示]</div>
    <div class="info">
      <h1>AirDesk Pro 電動升降桌</h1>
      <p class="tagline">靜音馬達 / 記憶高度 / 竹木桌面 / 5 年保固</p>
      <div class="price-box">
        <span class="price-now">NT$12,900</span>
        <span class="price-original">NT$18,900</span>
        <span class="discount-tag">省 NT$6,000</span>
      </div>
      <a href="#order" class="btn-red">立即訂購 — 免運費</a>
      <p class="shipping-note">預計 3-5 個工作天到貨 / 30 天鑑賞期</p>
    </div>
  </div>

  <section class="specs">
    <div class="container">
      <h2>產品規格</h2>
      <div class="spec-grid">
        <div class="spec-item">
          <strong>35dB</strong>
          <span>超靜音馬達</span>
        </div>
        <div class="spec-item">
          <strong>62-127cm</strong>
          <span>升降範圍</span>
        </div>
        <div class="spec-item">
          <strong>100kg</strong>
          <span>最大承重</span>
        </div>
        <div class="spec-item">
          <strong>5 年</strong>
          <span>全機保固</span>
        </div>
      </div>
    </div>
  </section>

  <section class="reviews">
    <div class="container">
      <h2>顧客評價（4.9 / 5.0，1,247 則評價）</h2>
      <div class="review-grid">
        <div class="review-card">
          <div class="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p>「馬達真的超安靜，開會時調整高度完全不會干擾。桌面質感很好，組裝也很簡單。」</p>
          <span class="review-author">李先生 / 軟體工程師 / 2026-02-15</span>
        </div>
        <div class="review-card">
          <div class="review-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p>「用了三個月，腰痛明顯改善。記憶高度功能很方便，一鍵切換站坐姿。」</p>
          <span class="review-author">張小姐 / 設計師 / 2026-01-28</span>
        </div>
      </div>
    </div>
  </section>

</body>
</html>
```

### 13.4 服務業 LP（網頁設計接案）

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebCraft Studio — 台北專業網頁設計公司</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#1a1a1a; }
    .container { max-width:1100px; margin:0 auto; padding:0 24px; }

    .svc-hero { padding:100px 0; background:linear-gradient(135deg,#1e293b 0%,#334155 100%); color:#fff; text-align:center; }
    .svc-hero h1 { font-size:42px; line-height:1.3; margin-bottom:16px; }
    .svc-hero .subtitle { font-size:18px; opacity:0.8; margin-bottom:32px; max-width:600px; margin-left:auto; margin-right:auto; }
    .btn-teal { display:inline-block; padding:16px 40px; background:#14b8a6; color:#fff; border:none; border-radius:8px; font-size:18px; font-weight:700; cursor:pointer; text-decoration:none; }

    .svc-process { padding:60px 0; }
    .svc-process h2 { text-align:center; font-size:28px; margin-bottom:40px; }
    .process-steps { display:flex; gap:32px; flex-wrap:wrap; justify-content:center; }
    .process-step { flex:1; min-width:200px; max-width:250px; text-align:center; }
    .step-num { width:48px; height:48px; background:#14b8a6; color:#fff; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; margin-bottom:12px; }
    .process-step h3 { margin-bottom:8px; }
    .process-step p { color:#6b7280; font-size:14px; }

    .portfolio { padding:60px 0; background:#f9fafb; }
    .portfolio h2 { text-align:center; font-size:28px; margin-bottom:32px; }
    .portfolio-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
    .portfolio-card { background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; }
    .portfolio-thumb { height:200px; background:#d1d5db; }
    .portfolio-info { padding:16px; }
    .portfolio-info h3 { font-size:16px; margin-bottom:4px; }
    .portfolio-info span { color:#6b7280; font-size:13px; }

    .consult-form { padding:60px 0; }
    .consult-form h2 { text-align:center; font-size:28px; margin-bottom:8px; }
    .consult-form .form-subtitle { text-align:center; color:#6b7280; margin-bottom:32px; }
    .form-box { max-width:500px; margin:0 auto; }
    .form-box input, .form-box select, .form-box textarea { width:100%; padding:12px; border:1px solid #d1d5db; border-radius:8px; font-size:16px; margin-bottom:16px; }
    .form-box textarea { height:100px; resize:vertical; }

    @media(max-width:768px) {
      .svc-hero h1 { font-size:28px; }
      .portfolio-grid { grid-template-columns:1fr; }
    }
  </style>
</head>
<body>

  <section class="svc-hero">
    <div class="container">
      <h1>讓你的網站成為最強業務員</h1>
      <p class="subtitle">我們幫台灣中小企業打造高轉換率網站。從設計到上線，最快 14 天交付。</p>
      <a href="#consult" class="btn-teal">免費諮詢 + 網站健檢</a>
    </div>
  </section>

  <section class="svc-process">
    <div class="container">
      <h2>合作流程</h2>
      <div class="process-steps">
        <div class="process-step">
          <div class="step-num">1</div>
          <h3>免費諮詢</h3>
          <p>30 分鐘線上會議，了解你的需求與目標</p>
        </div>
        <div class="process-step">
          <div class="step-num">2</div>
          <h3>提案報價</h3>
          <p>3 個工作天內提供設計提案與報價單</p>
        </div>
        <div class="process-step">
          <div class="step-num">3</div>
          <h3>設計開發</h3>
          <p>確認後 14 天內完成設計、開發、測試</p>
        </div>
        <div class="process-step">
          <div class="step-num">4</div>
          <h3>上線交付</h3>
          <p>協助上線 + 教學 + 30 天免費維護</p>
        </div>
      </div>
    </div>
  </section>

  <section class="portfolio">
    <div class="container">
      <h2>近期作品</h2>
      <div class="portfolio-grid">
        <div class="portfolio-card">
          <div class="portfolio-thumb"></div>
          <div class="portfolio-info">
            <h3>ABC 牙醫診所</h3>
            <span>醫療 / 預約系統 / RWD</span>
          </div>
        </div>
        <div class="portfolio-card">
          <div class="portfolio-thumb"></div>
          <div class="portfolio-info">
            <h3>好食光餐廳</h3>
            <span>餐飲 / 線上點餐 / LINE 串接</span>
          </div>
        </div>
        <div class="portfolio-card">
          <div class="portfolio-thumb"></div>
          <div class="portfolio-info">
            <h3>CloudSync SaaS</h3>
            <span>科技 / SaaS LP / A/B Testing</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="consult-form" id="consult">
    <div class="container">
      <h2>免費諮詢 + 網站健檢</h2>
      <p class="form-subtitle">填寫以下表單，我們會在 24 小時內回覆你</p>
      <div class="form-box">
        <input type="text" placeholder="你的姓名" required>
        <input type="email" placeholder="Email" required>
        <input type="tel" placeholder="聯絡電話">
        <select>
          <option value="">預算範圍</option>
          <option>NT$30,000 以下</option>
          <option>NT$30,000 - 80,000</option>
          <option>NT$80,000 - 150,000</option>
          <option>NT$150,000 以上</option>
        </select>
        <textarea placeholder="簡單描述你的專案需求"></textarea>
        <button type="submit" class="btn-teal" style="width:100%;border:none;cursor:pointer;">
          送出，取得免費報價
        </button>
      </div>
    </div>
  </section>

</body>
</html>
```

---

## 14. LP QA Checklist（上線前 20 項檢查）

上線前逐一檢查，全部通過才能發布。

### 內容與文案

| # | 檢查項目 | 通過 |
|---|---------|------|
| 1 | 標題在 3 秒內傳達核心價值主張 | [ ] |
| 2 | 所有文案無錯字、語法正確 | [ ] |
| 3 | CTA 按鈕文字使用動詞開頭、明確說出好處 | [ ] |
| 4 | 有社會證明（客戶見證 / Logo / 數據） | [ ] |
| 5 | FAQ 回答了最常見的 5 個疑慮 | [ ] |

### 設計與 UX

| # | 檢查項目 | 通過 |
|---|---------|------|
| 6 | CTA 按鈕與背景有高對比度、一眼可見 | [ ] |
| 7 | 手機版排版正確（iPhone SE ~ iPhone 16 Pro Max） | [ ] |
| 8 | 手機版 CTA 在 Thumb Zone 內可觸及 | [ ] |
| 9 | 所有圖片有 alt 文字 | [ ] |
| 10 | 表單欄位不超過必要數量（<= 5 個） | [ ] |

### 技術與效能

| # | 檢查項目 | 通過 |
|---|---------|------|
| 11 | PageSpeed Insights 行動版分數 > 90 | [ ] |
| 12 | 頁面載入時間 < 3 秒（行動網路） | [ ] |
| 13 | 所有圖片使用 WebP 格式 + lazy loading | [ ] |
| 14 | HTTPS 啟用、無混合內容警告 | [ ] |
| 15 | 所有連結可正常運作（無 404） | [ ] |

### 追蹤與分析

| # | 檢查項目 | 通過 |
|---|---------|------|
| 16 | GA4 已安裝，事件追蹤已設定（CTA 點擊、表單送出、捲動深度） | [ ] |
| 17 | UTM 參數在各廣告渠道已正確設定 | [ ] |
| 18 | 熱力圖工具已安裝（Clarity 或 Hotjar） | [ ] |
| 19 | Facebook Pixel / Google Ads 轉換追蹤已設定（如有投廣告） | [ ] |
| 20 | 轉換目標已在 GA4 設為 Key Event | [ ] |

### 快速驗證腳本

```bash
# 1. 檢查頁面是否正常回應
curl -s -o /dev/null -w "%{http_code}" https://your-lp.com

# 2. 檢查 HTTPS
curl -sI https://your-lp.com | grep -i "strict-transport"

# 3. 檢查載入時間
curl -s -o /dev/null -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://your-lp.com

# 4. 檢查 meta tags
curl -s https://your-lp.com | grep -E "<title>|<meta name=\"description\""

# 5. 檢查圖片有無 alt
curl -s https://your-lp.com | grep -oP '<img[^>]*>' | grep -v 'alt='

# 6. 跑 Lighthouse
npx lighthouse https://your-lp.com --output json --quiet | \
  python3 -c "import json,sys;d=json.load(sys.stdin);cats=d['categories']; \
  [print(f\"{k}: {int(v['score']*100)}\") for k,v in cats.items()]"
```

---

## 附錄：關鍵數據速查

| 指標 | 業界平均 | 良好 | 優秀 |
|------|---------|------|------|
| LP 轉換率 | 2-5% | 5-10% | 10%+ |
| 跳出率 | 60-70% | 40-60% | <40% |
| 平均停留時間 | 30-60 秒 | 1-3 分鐘 | 3+ 分鐘 |
| CTA 點擊率 | 2-5% | 5-10% | 10%+ |
| 表單完成率 | 20-30% | 30-50% | 50%+ |
| 行動版佔比 | 55-70% | — | — |
| 頁面載入時間 | 3-5 秒 | 2-3 秒 | <2 秒 |

---

> 本文件為 OpenClaw Cookbook 系列第 48 號。
> 有任何問題或建議，請回報至任務面板。
