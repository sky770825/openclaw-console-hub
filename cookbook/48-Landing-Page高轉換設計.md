---
tags: [landing-page, conversion, A/B-testing, CTA, copywriting, analytics, performance, mobile]
date: 2026-03-05
category: cookbook
---

# 48 — Landing Page 高轉換設計

> 從零打造高轉換率的 Landing Page：結構、文案、測試、追蹤一次到位。
> 適用對象：網頁設計接案者 / 前端工程師 / 行銷人員 / 創業者
> 最後更新：2026-03-05

---

## 目錄

1. [高轉換 Landing Page 核心觀念](#1-高轉換-landing-page-核心觀念)
2. [頁面結構：五段式黃金架構](#2-頁面結構五段式黃金架構)
3. [文案撰寫公式](#3-文案撰寫公式)
4. [CTA 設計原則](#4-cta-設計原則)
5. [表單優化](#5-表單優化)
6. [A/B Testing 實作](#6-ab-testing-實作)
7. [速度優化](#7-速度優化)
8. [手機端設計](#8-手機端設計)
9. [GA4 事件追蹤](#9-ga4-事件追蹤)
10. [熱力圖分析工具](#10-熱力圖分析工具)
11. [React/Next.js Landing Page 模板代碼](#11-reactnextjs-landing-page-模板代碼)
12. [上線前檢查表](#12-上線前檢查表)
13. [轉換率診斷 SOP](#13-轉換率診斷-sop)

---

## 1. 高轉換 Landing Page 核心觀念

### 1.1 Landing Page vs 首頁

| 比較項目 | Landing Page | 首頁 (Homepage) |
|----------|-------------|-----------------|
| **目的** | 單一轉換目標 | 品牌總覽、多重入口 |
| **導航** | 極簡或無導航列 | 完整導航 |
| **連結** | 盡量少，只留 CTA | 多連結、多分類 |
| **內容** | 針對特定受眾/產品 | 涵蓋所有服務 |
| **流量來源** | 廣告、Email、社群 | 自然搜尋、直接造訪 |
| **轉換率** | 5%–15%（優秀） | 1%–3% |

### 1.2 轉換率基準

| 產業 | 平均轉換率 | 優秀轉換率 |
|------|-----------|-----------|
| SaaS | 3%–5% | 8%–12% |
| 電商 | 2%–4% | 6%–10% |
| B2B 服務 | 2%–5% | 8%–15% |
| 教育/課程 | 5%–8% | 12%–20% |
| 醫療/健康 | 2%–4% | 5%–8% |
| 房地產 | 1%–3% | 4%–7% |

### 1.3 轉換率公式

```
轉換率 = (完成目標動作的人數 / 總訪客數) x 100%

例：1000 個訪客，50 人填表 → 轉換率 = 5%

影響轉換率的三大要素：
1. 流量品質 — 進來的人對不對？（廣告受眾設定）
2. 訊息匹配 — 廣告說的和頁面寫的一致嗎？
3. 頁面體驗 — 好不好用？信不信任？動機夠不夠強？
```

### 1.4 注意力衰減模型

```
使用者進入頁面後的注意力曲線：

100% ┤ ██
 80% ┤ ████
 60% ┤ ██████
 40% ┤ █████████
 20% ┤ █████████████
  0% ┤ ████████████████████
     └─────────────────────
      0s  3s  8s  15s  30s

黃金 3 秒：使用者在 3 秒內決定要不要繼續看
黃金 8 秒：決定要不要投入閱讀
黃金 15 秒：決定要不要行動（點 CTA）
```

---

## 2. 頁面結構：五段式黃金架構

### 2.1 架構總覽

```
┌─────────────────────────────┐
│  1. HERO（英雄區）          │  ← 黃金 3 秒決勝
│     標題 + 副標題 + CTA     │
├─────────────────────────────┤
│  2. PAIN（痛點區）          │  ← 建立同理心
│     你是否有這些困擾？       │
├─────────────────────────────┤
│  3. SOLUTION（方案區）      │  ← 展示解法
│     功能/特色/差異化         │
├─────────────────────────────┤
│  4. SOCIAL PROOF（信任區）  │  ← 消除疑慮
│     見證/數據/品牌 Logo      │
├─────────────────────────────┤
│  5. CTA（行動區）           │  ← 臨門一腳
│     表單/按鈕 + 急迫感       │
└─────────────────────────────┘
```

### 2.2 第一段：Hero 英雄區

Hero 是整個頁面最重要的區塊，決定使用者留不留下來。

**必備元素：**

| 元素 | 說明 | 範例 |
|------|------|------|
| **主標題** | 一句話說明核心價值 | 「30 天打造被動收入系統」 |
| **副標題** | 補充說明怎麼做到 | 「不需要技術背景，跟著步驟就能建立你的第一個線上課程」 |
| **主視覺** | 產品截圖/使用情境/影片 | 實際儀表板截圖 |
| **CTA 按鈕** | 明確的行動指令 | 「免費試用 14 天」 |
| **信任標記** | 降低疑慮的小元素 | 「不需信用卡 / 10,000+ 用戶 / 4.9 星評分」 |

**主標題撰寫規則：**

```
好標題的公式：[具體結果] + [時間/條件] + [降低門檻]

好：「7 天內讓你的 Email 開信率從 15% 提升到 40%」
壞：「最好的 Email 行銷工具」

好：「不會寫程式也能 10 分鐘架好網站」
壞：「簡單好用的網站建立平台」

好：「每月省下 20 小時重複工作，讓團隊專注在真正重要的事」
壞：「自動化你的工作流程」
```

**Hero 區高度建議：**

```css
/* Hero 區佔滿首屏，不需要滾動就能看到完整資訊 */
.hero {
  min-height: 100vh;      /* 行動端 */
  min-height: 100svh;     /* 支援 Safari 動態工具列 */
  display: flex;
  align-items: center;
  padding: 2rem;
}

/* 桌面版可以設定最大高度避免太空曠 */
@media (min-width: 1024px) {
  .hero {
    min-height: min(100vh, 900px);
  }
}
```

### 2.3 第二段：Pain 痛點區

痛點區的目的是讓使用者覺得「對！這就是我的問題！」

**撰寫框架：**

```
情境描述 → 痛點列舉 → 情感共鳴 → 暗示需要解決方案

範例：

「你是不是每天花 3 小時回覆客戶訊息，
結果還是漏掉重要的詢問？

當你終於整理完 Excel 報表，
卻發現資料已經過時了？

你知道應該要自動化，
但光想到要學新工具就頭痛...」
```

**痛點列舉格式（推薦用圖標 + 短句）：**

```html
<div class="pain-points">
  <div class="pain-item">
    <span class="icon">&#x23F0;</span><!-- 鬧鐘 -->
    <h3>時間被瑣事吃掉</h3>
    <p>每天花 3 小時處理重複工作，沒時間做真正重要的事</p>
  </div>
  <div class="pain-item">
    <span class="icon">&#x1F4B8;</span><!-- 錢飛走 -->
    <h3>人力成本越來越高</h3>
    <p>請一個助理月薪 3 萬，但你真的需要全職人力嗎？</p>
  </div>
  <div class="pain-item">
    <span class="icon">&#x1F916;</span><!-- 機器人 -->
    <h3>自動化太複雜</h3>
    <p>試過各種工具，不是太貴就是太難，最後放棄</p>
  </div>
</div>
```

### 2.4 第三段：Solution 方案區

展示你的產品/服務如何解決上面的痛點。

**功能展示三種格式：**

**格式 A — 圖文交替（適合 SaaS）**

```
┌──────────────────────────────────────┐
│  [截圖]        功能標題              │
│                功能說明文字           │
│                「引用一句客戶評語」    │
├──────────────────────────────────────┤
│  功能標題              [截圖]        │
│  功能說明文字                        │
│  「引用一句客戶評語」                 │
└──────────────────────────────────────┘
```

**格式 B — 三欄卡片（適合服務）**

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   圖標    │  │   圖標    │  │   圖標    │
│  功能 1   │  │  功能 2   │  │  功能 3   │
│  說明文字  │  │  說明文字  │  │  說明文字  │
└──────────┘  └──────────┘  └──────────┘
```

**格式 C — Before/After 對比（適合轉型類產品）**

```
        使用前                    使用後
┌──────────────────┐    ┌──────────────────┐
│ 手動回覆客戶 3hr  │ →  │ AI 自動回覆 5min  │
│ Excel 追蹤訂單   │ →  │ 系統即時儀表板    │
│ 每月漏單 10 筆   │ →  │ 零漏單自動追蹤    │
└──────────────────┘    └──────────────────┘
```

**差異化定位（Why Us）：**

```
不要說「我們最好」，要說「我們哪裡不同」：

vs 競品 A：「他們需要工程師幫你設定，我們 10 分鐘自己搞定」
vs 競品 B：「他們月費 $99 起跳，我們 $29 就有完整功能」
vs 自己做：「你可以花 3 個月自己開發，或者現在就用現成方案」
```

### 2.5 第四段：Social Proof 信任區

信任是轉換的最後一道關卡。

**信任元素清單（按說服力排序）：**

| 排名 | 元素 | 說服力 | 取得難度 |
|------|------|--------|---------|
| 1 | 影片見證 | 最高 | 高 |
| 2 | 客戶案例（含數據） | 極高 | 中高 |
| 3 | 文字評價（含照片/公司） | 高 | 中 |
| 4 | 具體數字（使用者數/營收/節省時間） | 高 | 低 |
| 5 | 品牌 Logo 牆 | 中高 | 中 |
| 6 | 媒體報導 | 中高 | 高 |
| 7 | 認證/獎項 | 中 | 高 |
| 8 | 星等評分 | 中 | 低 |
| 9 | 安全標章（SSL/PCI） | 中低 | 低 |

**見證撰寫格式（替客戶改寫時用）：**

```
結構：[之前的狀況] → [使用後的改變] → [具體數據]

範例：
「以前我每天花 4 小時處理客服訊息，自從用了 [產品名]，
客服回覆時間從 30 分鐘縮短到 2 分鐘，
客戶滿意度從 3.2 分提升到 4.8 分。
現在我把省下來的時間拿去開發新產品。」

— 王小明，ABC 公司創辦人
```

**數字展示格式：**

```html
<div class="stats-bar">
  <div class="stat">
    <span class="number" data-target="10000">0</span>+
    <span class="label">企業用戶</span>
  </div>
  <div class="stat">
    <span class="number" data-target="98">0</span>%
    <span class="label">客戶滿意度</span>
  </div>
  <div class="stat">
    <span class="number" data-target="500">0</span>萬
    <span class="label">節省工時（小時/年）</span>
  </div>
  <div class="stat">
    <span class="number" data-target="24">0</span>/7
    <span class="label">技術支援</span>
  </div>
</div>
```

### 2.6 第五段：CTA 行動區

最後的行動呼籲，要給使用者一個「現在就要行動」的理由。

**CTA 區必備元素：**

```
1. 重申核心價值（一句話）
2. CTA 按鈕（顯眼、明確）
3. 急迫感或稀缺感（限時/限量/額外贈品）
4. 風險消除（退款保證/免費試用/不需信用卡）
5. 補充信任（安全標章/客服聯繫方式）
```

---

## 3. 文案撰寫公式

### 3.1 AIDA 公式

```
A — Attention（注意力）：用標題抓住目光
I — Interest（興趣）：用痛點/數據引起好奇
D — Desire（慾望）：用好處/見證激發渴望
A — Action（行動）：用 CTA 推動下一步

範例（線上課程 Landing Page）：

[Attention]
「90% 的自由工作者，第一年收入不到 30 萬」

[Interest]
「不是你不夠努力，是你沒有系統化的接案流程。
我們訪談了 200 位年收百萬的自由工作者，
歸納出 7 個他們共同的高收入習慣。」

[Desire]
「這堂課的學員平均在 3 個月內月收增加 40%：
- 小王：從月收 2 萬 → 8 萬（4 個月）
- 小李：從月收 3 萬 → 12 萬（6 個月）
- 小張：從兼職 → 全職自由工作者（2 個月）」

[Action]
「限時優惠倒數 48 小時 — 立即加入，附贈價值 $5,000 的接案模板包」
```

### 3.2 PAS 公式

```
P — Problem（問題）：指出讀者面臨的困境
A — Agitate（攪動）：放大問題的嚴重性
S — Solution（解方）：提出你的解決方案

範例（自動化工具 Landing Page）：

[Problem]
「你的團隊還在用 Email + Excel 管理專案嗎？」

[Agitate]
「每個月有 15% 的任務因為溝通失誤而延誤。
每次交接工作都要花 2 小時寫交接文件。
當團隊擴大到 10 人以上，這些問題會指數級惡化：
— 資訊散落在 5 個不同平台
— 沒人知道任務的最新狀態
— 老闆每天都在問『現在進度到哪了？』」

[Solution]
「[產品名] 把你的任務、文件、溝通全部整合在同一個地方。
不用再跨平台找資料，不用再手動更新進度。
一目了然的看板讓每個人都知道自己該做什麼。」
```

### 3.3 4U 公式

```
U — Useful（有用）：對讀者有明確好處
U — Urgent（急迫）：給一個現在就要行動的理由
U — Unique（獨特）：和別人不一樣的地方
U — Ultra-specific（超具體）：用數字和細節

範例（標題撰寫）：

一般：「提升你的行銷效果」
4U 版：「這 3 個 Email 標題公式讓我的開信率在 7 天內從 12% 飆到 38%
       （第 2 個最簡單，今天就能用）」

一般：「學會投資理財」
4U 版：「小資族每月 3000 元定期定額，
       用這個 ETF 組合 10 年後變 68 萬
       （附 Excel 試算表免費下載，限今天）」
```

### 3.4 文案寫作速查表

| 場景 | 用什麼公式 | 適合什麼產品 |
|------|-----------|-------------|
| 長頁面（銷售頁） | AIDA | 課程、高單價服務 |
| 短文案（Email/廣告） | PAS | 痛點明確的 B2B 產品 |
| 標題/Hook | 4U | 所有產品 |
| 功能說明 | Feature → Benefit → Proof | SaaS、工具 |
| 客戶見證 | Before → After → Bridge | 轉型/教育類 |

### 3.5 Feature-Benefit 轉換練習

```
技巧：不要說「我們有什麼」，要說「你得到什麼」

Feature（功能）         → Benefit（好處）
─────────────────────────────────────────────
256-bit 加密            → 你的資料比銀行還安全
AI 自動分類             → 再也不用手動整理，每天省 1 小時
即時同步                → 團隊每個人看到的都是最新資料
一鍵匯出                → 報告 3 分鐘就搞定，不用再加班做 PPT
24/7 客服               → 凌晨 3 點遇到問題也有人幫你
```

---

## 4. CTA 設計原則

### 4.1 CTA 文案公式

```
好的 CTA = 動詞 + 受眾想要的結果

差：「提交」「送出」「註冊」
好：「免費試用 14 天」「立即下載指南」「開始省時間」

更好的公式：
「我要 + [好處]」（第一人稱，心理擁有感）
「免費 + [動作] + [時間限制]」（降低門檻 + 急迫感）

範例：
「我要開始免費試用」
「免費下載 — 限時 48 小時」
「立即預約免費諮詢（剩餘 3 個名額）」
```

### 4.2 CTA 按鈕設計規範

```css
/* 高轉換 CTA 按鈕樣式 */
.cta-button {
  /* 尺寸：夠大、好點 */
  padding: 16px 40px;
  min-width: 200px;
  font-size: 18px;
  font-weight: 700;

  /* 顏色：和頁面主色形成對比 */
  background: #FF6B35;           /* 橘色系轉換率最高 */
  color: #FFFFFF;
  border: none;
  border-radius: 8px;

  /* 互動反饋 */
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);
}

.cta-button:hover {
  background: #E85A2A;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
}

.cta-button:active {
  transform: translateY(0);
}

/* CTA 下方的安心文字 */
.cta-subtext {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}
```

### 4.3 CTA 位置策略

```
建議在頁面上放 3–4 個 CTA：

位置 1：Hero 區（首屏）        — 高意圖訪客直接轉換
位置 2：Solution 區之後        — 了解功能後的轉換點
位置 3：Social Proof 區之後    — 被說服後的轉換點
位置 4：頁面底部（Final CTA）  — 最後一次機會

注意：所有 CTA 都連到同一個目標（表單/結帳頁），
只是文案可以根據上下文微調。
```

### 4.4 浮動 CTA（行動端必備）

```css
/* 手機端固定底部 CTA bar */
.mobile-cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 16px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: none;               /* 桌面端隱藏 */

  /* 安全區（iPhone 瀏海/底部條） */
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

@media (max-width: 768px) {
  .mobile-cta-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* 頁面底部留空間，避免 CTA bar 蓋住內容 */
  body {
    padding-bottom: 80px;
  }
}
```

---

## 5. 表單優化

### 5.1 表單欄位數量 vs 轉換率

```
欄位數量和轉換率的關係：

欄位數 │ 轉換率影響
───────┼──────────
  1    │ ████████████████  最高（只要 Email）
  2    │ ██████████████    高（名字 + Email）
  3    │ ████████████      中高
  4    │ ██████████        中
  5    │ ████████          中低
  6+   │ ██████            低（每多一個欄位約 -11% 轉換率）

原則：每個欄位都要問自己「不拿到這個資料，能不能完成服務？」
不能的才留，能的就砍掉。
```

### 5.2 表單 UX 最佳實踐

```
1. Label 放在欄位上方（不要用 placeholder 當 label）
2. 錯誤訊息即時顯示（blur 時驗證，不要等 submit）
3. 手機端用對的 input type（email/tel/number）
4. 密碼強度即時反饋
5. 自動聚焦到第一個欄位
6. Enter 鍵可以送出表單
7. 送出後顯示成功頁面（不要只跳 alert）
8. 送出按鈕載入中要 disable + 顯示 spinner
```

### 5.3 多步驟表單（Step Form）

```
適合：欄位超過 4 個的情況

步驟 1：Email（最容易填的先）
步驟 2：姓名 + 電話
步驟 3：公司名 + 需求描述

視覺設計：
┌─────────────────────────────────┐
│  [1]──────[2]──────[3]          │  ← 進度條
│   ●        ○        ○          │
│ 基本資料  聯絡方式  需求描述     │
├─────────────────────────────────┤
│                                 │
│  你的 Email                     │
│  ┌─────────────────────────┐   │
│  │ example@email.com       │   │
│  └─────────────────────────┘   │
│                                 │
│       [下一步 →]                │
│                                 │
│  已經有帳號？登入               │
│                                 │
└─────────────────────────────────┘

技巧：
- 第 1 步完成就拿到 Email → 即使使用者放棄，也能做 remarketing
- 每步 1-2 個欄位就好
- 顯示進度條增加完成動力
```

### 5.4 表單驗證模式

```typescript
// 即時驗證 + 友善錯誤訊息
const validators = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '請輸入正確的 Email 格式，例如：name@example.com'
  },
  phone: {
    pattern: /^09\d{8}$/,
    message: '請輸入 09 開頭的 10 位數手機號碼'
  },
  name: {
    minLength: 2,
    message: '請輸入至少 2 個字的姓名'
  }
};

// 驗證時機：
// 1. blur（離開欄位時）→ 顯示錯誤
// 2. input（輸入時）→ 如果之前有錯誤，即時清除
// 3. submit（送出時）→ 最終驗證，聚焦到第一個錯誤欄位
```

---

## 6. A/B Testing 實作

### 6.1 測試什麼？（依影響力排序）

| 優先級 | 測試項目 | 預期影響 | 範例 |
|--------|---------|---------|------|
| **P0** | 標題 | 20%–50% | 「省時間」vs「省 3 小時」 |
| **P0** | CTA 文案 | 10%–30% | 「免費試用」vs「開始省時間」 |
| **P1** | Hero 圖片/影片 | 10%–25% | 產品截圖 vs 使用者情境照 |
| **P1** | 頁面長度 | 10%–20% | 長頁面 vs 短頁面 |
| **P1** | 表單欄位數 | 10%–25% | 3 欄位 vs 5 欄位 |
| **P2** | CTA 按鈕顏色 | 2%–10% | 橘色 vs 綠色 |
| **P2** | 社會證明位置 | 5%–15% | Hero 區 vs CTA 區 |
| **P3** | 字型大小 | 1%–5% | 16px vs 18px |
| **P3** | 邊距/留白 | 1%–3% | 不太重要 |

### 6.2 A/B Testing 樣本量計算

```
最小樣本量公式（95% 信心水準，80% 統計檢力）：

n = 16 x p x (1-p) / (MDE)^2

p = 基準轉換率
MDE = Minimum Detectable Effect（最小可偵測效果）

範例：
基準轉換率 5%（p = 0.05）
想偵測 20% 的相對提升（MDE = 0.05 x 0.20 = 0.01）

n = 16 x 0.05 x 0.95 / 0.01^2
n = 16 x 0.0475 / 0.0001
n = 7,600（每組）
總共需要 15,200 個訪客

經驗法則：
- 每組至少 100 次轉換才能下結論
- 測試至少跑 7 天（包含平日和週末）
- 不要偷看中間結果就提早停止（peeking problem）
```

### 6.3 純前端 A/B Testing 實作

```typescript
// utils/abtest.ts
// 不依賴第三方工具的 A/B Testing 實作

type Variant = 'control' | 'variant';

interface ABTestConfig {
  testId: string;
  variants: Record<Variant, number>;  // 流量分配比例（總和 = 100）
}

export function getVariant(config: ABTestConfig): Variant {
  const storageKey = `ab_${config.testId}`;

  // 檢查是否已分配過
  const stored = localStorage.getItem(storageKey);
  if (stored === 'control' || stored === 'variant') {
    return stored;
  }

  // 隨機分配
  const random = Math.random() * 100;
  const variant: Variant = random < config.variants.control
    ? 'control'
    : 'variant';

  localStorage.setItem(storageKey, variant);
  return variant;
}

// 追蹤轉換事件
export function trackConversion(testId: string, eventName: string) {
  const variant = localStorage.getItem(`ab_${testId}`);
  if (!variant) return;

  // 送到 GA4
  if (typeof gtag === 'function') {
    gtag('event', eventName, {
      ab_test_id: testId,
      ab_variant: variant,
    });
  }

  // 也可以送到自己的後端
  fetch('/api/analytics/ab-conversion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testId,
      variant,
      eventName,
      timestamp: Date.now(),
      url: window.location.href,
    }),
  }).catch(() => {});
}

// 使用範例
const variant = getVariant({
  testId: 'hero-headline-2026-03',
  variants: { control: 50, variant: 50 },
});

if (variant === 'control') {
  // 原版標題
} else {
  // 測試版標題
}
```

### 6.4 React A/B Testing Hook

```tsx
// hooks/useABTest.ts
import { useState, useEffect } from 'react';

interface ABTestResult<T extends string> {
  variant: T;
  trackConversion: (eventName: string) => void;
}

export function useABTest<T extends string>(
  testId: string,
  variants: T[],
  weights?: number[]       // 預設平均分配
): ABTestResult<T> {
  const [variant, setVariant] = useState<T>(variants[0]);

  useEffect(() => {
    const storageKey = `ab_${testId}`;
    const stored = localStorage.getItem(storageKey) as T;

    if (stored && variants.includes(stored)) {
      setVariant(stored);
      return;
    }

    // 加權隨機分配
    const w = weights || variants.map(() => 1 / variants.length);
    const random = Math.random();
    let cumulative = 0;
    let selected = variants[0];
    for (let i = 0; i < variants.length; i++) {
      cumulative += w[i];
      if (random < cumulative) {
        selected = variants[i];
        break;
      }
    }

    localStorage.setItem(storageKey, selected);
    setVariant(selected);
  }, [testId]);

  const trackConversion = (eventName: string) => {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        ab_test_id: testId,
        ab_variant: variant,
      });
    }
  };

  return { variant, trackConversion };
}

// 使用範例
function HeroSection() {
  const { variant, trackConversion } = useABTest(
    'hero-cta-text',
    ['free-trial', 'start-saving', 'get-started']
  );

  const ctaText: Record<string, string> = {
    'free-trial': '免費試用 14 天',
    'start-saving': '開始省時間',
    'get-started': '立即開始',
  };

  return (
    <button
      onClick={() => {
        trackConversion('cta_click');
        // ...導向目標頁
      }}
    >
      {ctaText[variant]}
    </button>
  );
}
```

### 6.5 A/B Testing 工具比較

| 工具 | 價格 | 適合對象 | 特色 |
|------|------|---------|------|
| Google Optimize（已停用） | - | - | 2023 年已關閉 |
| **VWO** | $99/月起 | 行銷團隊 | 視覺化編輯器、不需工程師 |
| **Optimizely** | 客製報價 | 企業 | 功能最完整、伺服器端測試 |
| **PostHog** | 免費/開源 | 開發者 | 自架、feature flag + 分析 |
| **GrowthBook** | 免費/開源 | 開發者 | SDK 好用、Bayesian 統計 |
| **LaunchDarkly** | $10/月起 | 開發團隊 | Feature flag 為主、可做 A/B |
| 自己寫（如上） | 免費 | 預算有限 | 完全掌控、但缺統計分析 |

---

## 7. 速度優化

### 7.1 Landing Page 速度目標

```
LCP（最大內容繪製）：≤ 2.0 秒（比一般網頁更嚴格）
FCP（首次內容繪製）：≤ 1.0 秒
CLS（累計版面位移）：≤ 0.05
TBT（總阻塞時間）：≤ 100ms

為什麼要更嚴格？
- Landing Page 多半來自廣告，使用者耐心更低
- 多 1 秒載入時間 ≈ 少 7% 轉換率
- Google Ads 品質分數會受 LCP 影響
```

### 7.2 圖片優化

```html
<!-- Hero 圖片：最優先載入，用 fetchpriority="high" -->
<img
  src="/hero-800.webp"
  srcset="/hero-400.webp 400w,
          /hero-800.webp 800w,
          /hero-1200.webp 1200w,
          /hero-1600.webp 1600w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="產品使用情境"
  width="800"
  height="600"
  fetchpriority="high"
  decoding="async"
/>

<!-- 非首屏圖片：lazy loading -->
<img
  src="/feature-screenshot.webp"
  alt="功能截圖"
  width="600"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

**圖片格式選擇：**

| 格式 | 壓縮率 | 透明 | 動畫 | 適用場景 |
|------|--------|------|------|---------|
| WebP | 最佳 | 支援 | 支援 | 首選格式 |
| AVIF | 極佳 | 支援 | 部分 | 進階選擇（瀏覽器支援度注意） |
| JPEG | 中 | 不支援 | 不支援 | Fallback |
| PNG | 低 | 支援 | 不支援 | 需要完美透明時 |
| SVG | N/A | 支援 | 支援 | 圖標、插畫 |

### 7.3 字型優化

```html
<!-- 只預載首屏需要的字型 -->
<link
  rel="preload"
  href="/fonts/NotoSansTC-Bold.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<style>
  /* 用 font-display: swap 避免文字隱形（FOIT） */
  @font-face {
    font-family: 'Noto Sans TC';
    src: url('/fonts/NotoSansTC-Regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }

  @font-face {
    font-family: 'Noto Sans TC';
    src: url('/fonts/NotoSansTC-Bold.woff2') format('woff2');
    font-weight: 700;
    font-display: swap;
  }

  /* 提供 fallback 字型，減少 CLS */
  body {
    font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei',
                 -apple-system, BlinkMacSystemFont, sans-serif;
  }
</style>
```

### 7.4 JavaScript 最小化

```
Landing Page 的 JS 守則：
1. 不要用大型框架（React 首屏要多載 130KB+）
2. 如果用 Next.js，確保 Hero 區是 SSG/SSR
3. 第三方腳本用 defer/async + 延遲載入
4. 分析工具放在 requestIdleCallback 裡
```

```html
<!-- 第三方腳本延遲載入策略 -->

<!-- 1. GA4：頁面載入後 2 秒再載入 -->
<script>
  setTimeout(() => {
    const s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX';
    s.async = true;
    document.head.appendChild(s);
    s.onload = () => {
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXX');
    };
  }, 2000);
</script>

<!-- 2. 聊天插件：使用者互動後才載入 -->
<script>
  function loadChatWidget() {
    // 載入 Intercom / Crisp / LiveChat 等
    const s = document.createElement('script');
    s.src = 'https://chat-widget.example.com/widget.js';
    document.body.appendChild(s);
    // 移除監聽，只載入一次
    document.removeEventListener('scroll', loadChatWidget);
    document.removeEventListener('click', loadChatWidget);
  }
  document.addEventListener('scroll', loadChatWidget, { once: true });
  document.addEventListener('click', loadChatWidget, { once: true });
</script>
```

### 7.5 Critical CSS 內聯

```html
<head>
  <!-- 首屏關鍵 CSS 直接內聯，不等外部檔案 -->
  <style>
    /* 只放 Hero 區需要的樣式 */
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Noto Sans TC',sans-serif;color:#1a1a1a}
    .hero{min-height:100svh;display:flex;align-items:center;padding:2rem}
    .hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:700;line-height:1.3}
    .hero p{font-size:1.25rem;color:#555;margin:1rem 0 2rem}
    .cta-btn{padding:16px 40px;background:#FF6B35;color:#fff;
             border:none;border-radius:8px;font-size:18px;font-weight:700;cursor:pointer}
  </style>

  <!-- 其餘 CSS 非同步載入 -->
  <link rel="preload" href="/styles/main.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>
</head>
```

---

## 8. 手機端設計

### 8.1 行動端設計原則

```
2026 年流量分佈：
- 行動端：65%–75%（廣告流量甚至高達 85%）
- 桌面端：20%–30%
- 平板：5%–10%

所以 Landing Page 一定要 Mobile First！
```

**行動端設計 Checklist：**

| 項目 | 說明 | 常見錯誤 |
|------|------|---------|
| 字體大小 | 內文 >= 16px | 12px 太小看不清 |
| 按鈕大小 | 最小 44x44px 觸控區 | 按鈕太小、太靠近 |
| 行間距 | 1.5–1.8 倍 | 太擠不好閱讀 |
| 左右留白 | >= 16px | 文字貼邊不好看 |
| 圖片寬度 | 100% container | 圖片溢出或太小 |
| 表單 | 用對 inputmode | 打電話要跳數字鍵盤 |
| 橫向滾動 | 絕對不能有 | 用 overflow-x: hidden 除錯 |
| 底部 CTA | 固定浮動按鈕 | 只放頁面上方一個 CTA |

### 8.2 行動端排版

```css
/* 手機端排版基礎 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 手機端：單欄排版 */
.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

/* 平板端：雙欄 */
@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
}

/* 桌面端：三欄 */
@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }
}

/* 手機端文字大小：用 clamp 做流體排版 */
h1 { font-size: clamp(1.75rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
h3 { font-size: clamp(1.25rem, 3vw, 1.75rem); }
p  { font-size: clamp(1rem, 2.5vw, 1.25rem); }
```

### 8.3 手機端表單優化

```html
<!-- 手機端表單最佳實踐 -->
<form>
  <!-- Email 欄位：自動跳出 @ 鍵盤 -->
  <input
    type="email"
    inputmode="email"
    autocomplete="email"
    placeholder="your@email.com"
  />

  <!-- 電話：數字鍵盤 -->
  <input
    type="tel"
    inputmode="tel"
    autocomplete="tel"
    placeholder="0912-345-678"
  />

  <!-- 數字：純數字鍵盤（不含 +/- 等） -->
  <input
    type="text"
    inputmode="numeric"
    pattern="[0-9]*"
    placeholder="統一編號"
  />

  <!-- 姓名：首字母大寫 -->
  <input
    type="text"
    autocomplete="name"
    autocapitalize="words"
    placeholder="你的姓名"
  />
</form>

<style>
  /* 手機端表單樣式 */
  input, select, textarea {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;          /* 防止 iOS 自動放大 */
    border: 2px solid #ddd;
    border-radius: 8px;
    -webkit-appearance: none; /* 移除 iOS 預設樣式 */
    appearance: none;
  }

  input:focus {
    border-color: #FF6B35;
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
  }
</style>
```

### 8.4 Thumb Zone（拇指操作區）

```
手機螢幕的拇指操作區：

   ┌──────────────┐
   │   難以觸及    │ ← 不要放重要按鈕
   │              │
   │   可觸及區    │ ← 次要操作可以放這
   │              │
   │  ████████████ │ ← 最佳操作區（CTA 放這！）
   │  ████████████ │
   └──────────────┘

原則：
- CTA 按鈕放在螢幕下半部
- 導航/漢堡選單放在右上或右下（右手單手操作）
- 重要操作不要放在左上角（最難觸及）
```

---

## 9. GA4 事件追蹤

### 9.1 Landing Page 必追蹤事件

```javascript
// 1. 頁面瀏覽（GA4 自動追蹤，但建議加自訂參數）
gtag('event', 'page_view', {
  page_title: 'Landing Page - 產品名',
  page_location: window.location.href,
  traffic_source: new URLSearchParams(location.search).get('utm_source'),
  ab_variant: localStorage.getItem('ab_hero-headline'),
});

// 2. CTA 點擊
document.querySelectorAll('.cta-button').forEach((btn) => {
  btn.addEventListener('click', () => {
    gtag('event', 'cta_click', {
      button_text: btn.textContent?.trim(),
      button_position: btn.dataset.position,  // hero / features / bottom
      ab_variant: localStorage.getItem('ab_hero-headline'),
    });
  });
});

// 3. 表單互動
const form = document.querySelector('#lead-form');
if (form) {
  // 表單開始填寫
  const inputs = form.querySelectorAll('input, textarea');
  let formStarted = false;
  inputs.forEach((input) => {
    input.addEventListener('focus', () => {
      if (!formStarted) {
        formStarted = true;
        gtag('event', 'form_start', {
          form_id: 'lead-form',
        });
      }
    });
  });

  // 表單送出
  form.addEventListener('submit', () => {
    gtag('event', 'generate_lead', {
      form_id: 'lead-form',
      currency: 'TWD',
      value: 500,  // 每個 lead 的預估價值
    });
  });
}

// 4. 滾動深度（GA4 預設追蹤 90%，但 Landing Page 需要更細）
const scrollThresholds = [25, 50, 75, 100];
const scrollTracked = new Set();

window.addEventListener('scroll', () => {
  const scrollPercent = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  );

  for (const threshold of scrollThresholds) {
    if (scrollPercent >= threshold && !scrollTracked.has(threshold)) {
      scrollTracked.add(threshold);
      gtag('event', 'scroll_depth', {
        percent_scrolled: threshold,
        page_title: document.title,
      });
    }
  }
});

// 5. 影片播放（如果 Hero 有影片）
const video = document.querySelector('video');
if (video) {
  video.addEventListener('play', () => {
    gtag('event', 'video_start', { video_title: 'hero-video' });
  });
  video.addEventListener('ended', () => {
    gtag('event', 'video_complete', { video_title: 'hero-video' });
  });
}

// 6. 離開意圖（桌面端：滑鼠移出視窗上方）
let exitIntentShown = false;
document.addEventListener('mouseout', (e) => {
  if (e.clientY <= 0 && !exitIntentShown) {
    exitIntentShown = true;
    gtag('event', 'exit_intent', {
      page_title: document.title,
      time_on_page: Math.round(performance.now() / 1000),
    });
    // 可以在這裡顯示挽留 popup
  }
});
```

### 9.2 GA4 轉換目標設定

```
在 GA4 後台設定這些事件為轉換：

1. generate_lead — 表單送出（最重要）
2. cta_click — CTA 點擊
3. sign_up — 註冊完成
4. purchase — 購買完成

設定路徑：
GA4 後台 → Admin → Events → 找到事件 → 打開「Mark as conversion」
```

### 9.3 UTM 參數追蹤

```
Landing Page URL 格式：

https://example.com/lp/product-name
  ?utm_source=facebook         ← 流量來源
  &utm_medium=cpc              ← 媒介類型
  &utm_campaign=spring-2026    ← 活動名稱
  &utm_content=hero-a          ← 廣告素材版本
  &utm_term=自動化工具          ← 關鍵字

命名規範（統一小寫、用連字號）：

utm_source:  facebook / google / instagram / email / line / youtube
utm_medium:  cpc / organic / social / email / referral / display
utm_campaign: [年-月]-[活動名] → 2026-03-spring-sale
utm_content:  [素材版本] → video-a / image-b / text-c
```

### 9.4 GA4 自訂報表

```
建議建立的 GA4 自訂報表：

1. Landing Page 漏斗報表
   維度：Page path
   指標：Views → CTA clicks → Form starts → Form submits
   計算：每步轉換率

2. 流量來源 vs 轉換報表
   維度：utm_source + utm_campaign
   指標：Sessions、Conversion rate、Cost per lead
   用途：判斷哪個廣告管道 ROI 最高

3. 裝置 vs 轉換報表
   維度：Device category（desktop/mobile/tablet）
   指標：Sessions、Conversion rate
   用途：判斷手機端體驗是否需要優化
```

---

## 10. 熱力圖分析工具

### 10.1 工具比較

| 工具 | 價格 | 免費方案 | 熱力圖 | 錄影 | 漏斗 | 特色 |
|------|------|---------|--------|------|------|------|
| **Hotjar** | $39/月起 | 35 sessions/天 | 點擊/移動/滾動 | 有 | 有 | 最知名、UI 好用 |
| **Microsoft Clarity** | 完全免費 | 無限 | 點擊/滾動 | 有 | 有 | 免費無限量、和 GA4 整合 |
| **FullStory** | 客製報價 | 1000 sessions/月 | 有 | 有 | 有 | 企業級、AI 錯誤偵測 |
| **Mouseflow** | $31/月起 | 500 sessions/月 | 有 | 有 | 有 | 表單分析強 |
| **PostHog** | 免費/開源 | 15K sessions/月 | 有 | 有 | 有 | 開源可自架 |
| **Lucky Orange** | $32/月起 | 無 | 有 | 有 | 有 | 即時熱力圖 |

**推薦：先用 Microsoft Clarity（免費無限量），再考慮 Hotjar。**

### 10.2 Microsoft Clarity 安裝

```html
<!-- 放在 <head> 中 -->
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "YOUR_PROJECT_ID");
</script>
```

```typescript
// Next.js 整合（app router）
// app/providers.tsx
'use client';

import { useEffect } from 'react';

export function ClarityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const script = document.createElement('script');
      script.innerHTML = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
      `;
      document.head.appendChild(script);
    }
  }, []);

  return <>{children}</>;
}
```

### 10.3 熱力圖分析要看什麼

```
1. 點擊熱力圖（Click Heatmap）
   看：使用者點了什麼？有沒有點到不是連結的地方（假 affordance）？
   行動：不可點的元素被點 → 做成可點的 / 加連結
         CTA 沒人點 → 改文案 / 改顏色 / 換位置

2. 滾動熱力圖（Scroll Heatmap）
   看：使用者滾到哪裡就離開了？
   行動：如果 60% 的人在 Social Proof 前就離開 → 把信任元素往上移
         如果 CTA 只有 20% 的人看到 → 在更上面加 CTA

3. 移動熱力圖（Move Heatmap，僅桌面端）
   看：使用者視線停留在哪裡？（滑鼠移動 ≈ 視線移動）
   行動：眼球集中的區域放重要資訊

4. 錄影回放（Session Recording）
   看：使用者實際的操作路徑和卡點
   行動：找出 rage click（狂點）、dead click（無效點擊）、
         迷路行為（來回滾動）

分析頻率：
- 上線第一週：每天看 10 個 session recording
- 之後：每週看 1 次熱力圖 + 5 個 recording
- A/B Testing 期間：兩個版本都要看
```

---

## 11. React/Next.js Landing Page 模板代碼

### 11.1 Next.js Landing Page 完整模板

```tsx
// app/lp/[slug]/page.tsx
// Next.js 14+ App Router Landing Page 模板

import type { Metadata } from 'next';
import { HeroSection } from './components/HeroSection';
import { PainSection } from './components/PainSection';
import { SolutionSection } from './components/SolutionSection';
import { SocialProofSection } from './components/SocialProofSection';
import { CTASection } from './components/CTASection';
import { FloatingCTA } from './components/FloatingCTA';
import { TrackingProvider } from './components/TrackingProvider';

export const metadata: Metadata = {
  title: '30 天打造被動收入系統 | 品牌名',
  description: '不需要技術背景，跟著步驟就能建立你的第一個線上課程。已有 10,000+ 學員成功。',
  openGraph: {
    title: '30 天打造被動收入系統',
    description: '不需要技術背景，跟著步驟就能建立你的第一個線上課程。',
    images: [{ url: '/og-landing.jpg', width: 1200, height: 630 }],
  },
  robots: {
    index: false,     // Landing Page 通常不需要 SEO 索引
    follow: false,
  },
};

export default function LandingPage() {
  return (
    <TrackingProvider>
      <main className="landing-page">
        <HeroSection />
        <PainSection />
        <SolutionSection />
        <SocialProofSection />
        <CTASection />
        <FloatingCTA />
      </main>
    </TrackingProvider>
  );
}
```

### 11.2 Hero Section 組件

```tsx
// app/lp/[slug]/components/HeroSection.tsx
'use client';

import { useRef } from 'react';
import styles from './HeroSection.module.css';

export function HeroSection() {
  const ctaRef = useRef<HTMLButtonElement>(null);

  const handleCTA = () => {
    // 追蹤點擊
    if (typeof gtag === 'function') {
      gtag('event', 'cta_click', {
        button_position: 'hero',
        button_text: '免費試用 14 天',
      });
    }
    // 滾動到表單
    document.getElementById('signup-form')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* 信任標記 */}
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            已有 10,000+ 用戶加入
          </div>

          {/* 主標題 */}
          <h1 className={styles.title}>
            30 天打造你的
            <span className={styles.highlight}>被動收入系統</span>
          </h1>

          {/* 副標題 */}
          <p className={styles.subtitle}>
            不需要技術背景，不需要龐大資金。
            跟著我們的步驟式教學，從零開始建立你的第一個線上課程。
          </p>

          {/* CTA 區 */}
          <div className={styles.ctaGroup}>
            <button
              ref={ctaRef}
              className={styles.ctaPrimary}
              onClick={handleCTA}
            >
              免費試用 14 天
            </button>
            <button className={styles.ctaSecondary}>
              觀看 2 分鐘介紹
            </button>
          </div>

          {/* 安心文字 */}
          <p className={styles.ctaSubtext}>
            不需要信用卡 &middot; 隨時取消 &middot; 無隱藏費用
          </p>

          {/* 品牌 Logo 牆 */}
          <div className={styles.logos}>
            <span className={styles.logosLabel}>信任我們的企業：</span>
            <div className={styles.logosGrid}>
              {['brand1', 'brand2', 'brand3', 'brand4', 'brand5'].map((b) => (
                <img
                  key={b}
                  src={`/logos/${b}.svg`}
                  alt={b}
                  className={styles.logo}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hero 圖片 */}
        <div className={styles.visual}>
          <img
            src="/hero-dashboard.webp"
            alt="產品儀表板截圖"
            width={700}
            height={500}
            fetchPriority="high"
            className={styles.heroImage}
          />
        </div>
      </div>
    </section>
  );
}
```

### 11.3 Hero Section 樣式

```css
/* app/lp/[slug]/components/HeroSection.module.css */

.hero {
  min-height: 100svh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%);
  padding: 80px 0 40px;
  overflow: hidden;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  align-items: center;
}

@media (min-width: 1024px) {
  .container {
    grid-template-columns: 1fr 1fr;
    gap: 60px;
  }
}

/* 信任標記 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}

.badgeDot {
  width: 8px;
  height: 8px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 標題 */
.title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  color: #1a1a2e;
  margin-bottom: 20px;
}

.highlight {
  color: #FF6B35;
  display: inline-block;
}

/* 副標題 */
.subtitle {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  color: #555;
  line-height: 1.7;
  margin-bottom: 32px;
  max-width: 540px;
}

/* CTA 按鈕群 */
.ctaGroup {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.ctaPrimary {
  padding: 16px 40px;
  background: #FF6B35;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(255, 107, 53, 0.4);
}

.ctaPrimary:hover {
  background: #e85a2a;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
}

.ctaSecondary {
  padding: 16px 32px;
  background: transparent;
  color: #1a1a2e;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctaSecondary:hover {
  border-color: #FF6B35;
  color: #FF6B35;
}

.ctaSubtext {
  font-size: 13px;
  color: #888;
}

/* Logo 牆 */
.logos {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid #e0e0e0;
}

.logosLabel {
  font-size: 13px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.logosGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  margin-top: 16px;
  opacity: 0.6;
}

.logo {
  height: 28px;
  width: auto;
}

/* Hero 圖片 */
.visual {
  position: relative;
}

.heroImage {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
```

### 11.4 Social Proof 組件

```tsx
// app/lp/[slug]/components/SocialProofSection.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SocialProofSection.module.css';

interface Testimonial {
  name: string;
  title: string;
  company: string;
  avatar: string;
  quote: string;
  result: string;
}

const testimonials: Testimonial[] = [
  {
    name: '王小明',
    title: '創辦人',
    company: 'ABC 科技',
    avatar: '/avatars/wang.jpg',
    quote: '以前每天花 4 小時處理客服訊息，現在只需要 30 分鐘。',
    result: '客服效率提升 87%',
  },
  {
    name: '李小花',
    title: '行銷總監',
    company: 'XYZ 媒體',
    avatar: '/avatars/li.jpg',
    quote: '團隊協作效率明顯提升，不再有任務掉球的情況。',
    result: '專案交付準時率 98%',
  },
  {
    name: '張大偉',
    title: '技術長',
    company: 'DEF 新創',
    avatar: '/avatars/zhang.jpg',
    quote: '部署時間從 2 小時縮短到 10 分鐘，工程師可以專注在開發。',
    result: '部署速度提升 12 倍',
  },
];

// 數字滾動動畫 Hook
function useCountUp(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.round(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export function SocialProofSection() {
  const stat1 = useCountUp(10000);
  const stat2 = useCountUp(98);
  const stat3 = useCountUp(500);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* 數字統計 */}
        <div className={styles.statsBar}>
          <div className={styles.stat} ref={stat1.ref}>
            <span className={styles.statNumber}>{stat1.count.toLocaleString()}+</span>
            <span className={styles.statLabel}>企業用戶</span>
          </div>
          <div className={styles.stat} ref={stat2.ref}>
            <span className={styles.statNumber}>{stat2.count}%</span>
            <span className={styles.statLabel}>客戶滿意度</span>
          </div>
          <div className={styles.stat} ref={stat3.ref}>
            <span className={styles.statNumber}>{stat3.count}萬+</span>
            <span className={styles.statLabel}>節省工時/年</span>
          </div>
        </div>

        {/* 見證卡片 */}
        <h2 className={styles.sectionTitle}>
          他們已經成功了，你也可以
        </h2>
        <div className={styles.testimonialGrid}>
          {testimonials.map((t) => (
            <div key={t.name} className={styles.testimonialCard}>
              <div className={styles.stars}>{'★'.repeat(5)}</div>
              <p className={styles.quote}>「{t.quote}」</p>
              <div className={styles.result}>{t.result}</div>
              <div className={styles.author}>
                <img
                  src={t.avatar}
                  alt={t.name}
                  className={styles.avatar}
                  loading="lazy"
                  width={48}
                  height={48}
                />
                <div>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorTitle}>
                    {t.title}，{t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 11.5 Lead Form 組件

```tsx
// app/lp/[slug]/components/LeadForm.tsx
'use client';

import { useState, useRef, type FormEvent } from 'react';
import styles from './LeadForm.module.css';

interface FormData {
  email: string;
  name: string;
  company: string;
}

interface FormErrors {
  email?: string;
  name?: string;
}

export function LeadForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '', name: '', company: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = '請輸入 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '請輸入正確的 Email 格式';
    }

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = '請輸入至少 2 個字的姓名';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: window.location.pathname,
          utm: Object.fromEntries(new URLSearchParams(window.location.search)),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Submit failed');

      setIsSubmitted(true);

      // GA4 轉換追蹤
      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', {
          form_id: 'landing-lead-form',
          currency: 'TWD',
          value: 500,
        });
      }
    } catch (err) {
      alert('送出失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.successMessage}>
        <div className={styles.successIcon}>&#10003;</div>
        <h3>感謝你的申請！</h3>
        <p>我們會在 24 小時內寄送免費試用連結到你的信箱。</p>
        <p className={styles.checkSpam}>
          沒收到嗎？請檢查垃圾郵件匣，或聯繫 support@example.com
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      id="signup-form"
    >
      <h3 className={styles.formTitle}>立即開始免費試用</h3>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          你的姓名 <span className={styles.required}>*</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (errors.name) setErrors({ ...errors, name: undefined });
          }}
          placeholder="王小明"
        />
        {errors.name && <p className={styles.error}>{errors.name}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>
          Email <span className={styles.required}>*</span>
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          placeholder="you@company.com"
        />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="company" className={styles.label}>
          公司名稱（選填）
        </label>
        <input
          id="company"
          type="text"
          autoComplete="organization"
          className={styles.input}
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          placeholder="ABC 科技有限公司"
        />
      </div>

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={isSubmitting}
      >
        {isSubmitting ? '送出中...' : '開始免費試用 14 天'}
      </button>

      <p className={styles.terms}>
        點擊送出即表示你同意我們的
        <a href="/terms">服務條款</a>和<a href="/privacy">隱私政策</a>。
        不需要信用卡，隨時可取消。
      </p>
    </form>
  );
}
```

### 11.6 Tracking Provider（GA4 + Clarity 統一管理）

```tsx
// app/lp/[slug]/components/TrackingProvider.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    // 延遲 2 秒載入分析工具，不影響 LCP
    const timer = setTimeout(() => {
      // GA4
      if (GA_ID) {
        const gaScript = document.createElement('script');
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        gaScript.async = true;
        document.head.appendChild(gaScript);
        gaScript.onload = () => {
          window.dataLayer = window.dataLayer || [];
          function gtag(...args: unknown[]) {
            window.dataLayer.push(args);
          }
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', GA_ID, {
            send_page_view: true,
          });
        };
      }

      // Microsoft Clarity
      if (CLARITY_ID) {
        const clarityScript = document.createElement('script');
        clarityScript.innerHTML = `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `;
        document.head.appendChild(clarityScript);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 路由變更時追蹤
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_search: searchParams.toString(),
      });
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// 全域類型宣告
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
```

### 11.7 Exit Intent Popup 組件

```tsx
// app/lp/[slug]/components/ExitIntentPopup.tsx
'use client';

import { useEffect, useState } from 'react';
import styles from './ExitIntentPopup.module.css';

export function ExitIntentPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 只在桌面端啟用（行動端沒有 mouseout 上方的概念）
    if (window.innerWidth < 1024) return;

    // 已經顯示過就不再顯示
    if (sessionStorage.getItem('exit_intent_shown')) return;

    const handleMouseOut = (e: MouseEvent) => {
      // 滑鼠移出視窗上方
      if (e.clientY <= 0) {
        setShow(true);
        sessionStorage.setItem('exit_intent_shown', 'true');
        document.removeEventListener('mouseout', handleMouseOut);

        // 追蹤
        if (typeof gtag === 'function') {
          gtag('event', 'exit_intent_popup_shown', {
            page_path: window.location.pathname,
            time_on_page: Math.round(performance.now() / 1000),
          });
        }
      }
    };

    // 延遲 5 秒才開始偵測（避免使用者剛進來就觸發）
    const timer = setTimeout(() => {
      document.addEventListener('mouseout', handleMouseOut);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  if (!show) return null;

  return (
    <div className={styles.overlay} onClick={() => setShow(false)}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.close}
          onClick={() => setShow(false)}
          aria-label="關閉"
        >
          &times;
        </button>

        <h2 className={styles.title}>等等！別走</h2>
        <p className={styles.subtitle}>
          我們為你準備了一份特別優惠：
        </p>

        <div className={styles.offer}>
          <span className={styles.discount}>首月 5 折</span>
          <span className={styles.code}>優惠碼：STAY50</span>
        </div>

        <p className={styles.expiry}>
          此優惠將在 15 分鐘後失效
        </p>

        <button
          className={styles.ctaBtn}
          onClick={() => {
            if (typeof gtag === 'function') {
              gtag('event', 'exit_intent_cta_click');
            }
            document.getElementById('signup-form')?.scrollIntoView({
              behavior: 'smooth',
            });
            setShow(false);
          }}
        >
          我要這個優惠
        </button>

        <button
          className={styles.dismissBtn}
          onClick={() => setShow(false)}
        >
          不用了，我不需要省錢
        </button>
      </div>
    </div>
  );
}
```

---

## 12. 上線前檢查表

### 12.1 內容與文案

```
[ ] 主標題清楚傳達核心價值（不超過 15 個字）
[ ] 副標題補充說明如何做到
[ ] 痛點區至少列出 3 個受眾真實困擾
[ ] 功能區每個功能都用「好處」而不是「功能」描述
[ ] 見證區有真實客戶名字、職稱、公司
[ ] CTA 文案用動詞開頭（「開始」「取得」「下載」）
[ ] 所有文字沒有錯字、語法正確
[ ] 手機端文字不會太小（>=16px）
```

### 12.2 設計與體驗

```
[ ] Hero 區首屏看得完整（不需滾動才能看到 CTA）
[ ] CTA 按鈕和頁面主色形成對比
[ ] 頁面至少有 3 個 CTA 按鈕（首屏/中段/底部）
[ ] 行動端有浮動 CTA bar
[ ] 沒有橫向滾動
[ ] 圖片都設定 width/height（避免 CLS）
[ ] 表單欄位不超過 4 個
[ ] 表單有即時驗證和友善錯誤訊息
[ ] 404 頁面不會讓人迷路
```

### 12.3 效能

```
[ ] LCP <= 2.0 秒
[ ] CLS <= 0.05
[ ] TBT <= 100ms
[ ] PageSpeed Insights 分數 >= 90（手機端）
[ ] 圖片全部用 WebP/AVIF 格式
[ ] Hero 圖片用 fetchpriority="high"
[ ] 非首屏圖片用 loading="lazy"
[ ] 字型用 font-display: swap
[ ] 第三方腳本延遲載入（GA4、聊天插件）
[ ] Critical CSS 內聯
```

### 12.4 追蹤與分析

```
[ ] GA4 已安裝並測試可收到事件
[ ] CTA 點擊事件追蹤（含 button_position）
[ ] 表單開始填寫事件追蹤
[ ] 表單送出事件追蹤（設為轉換）
[ ] 滾動深度追蹤（25%/50%/75%/100%）
[ ] UTM 參數解析並帶入追蹤事件
[ ] Microsoft Clarity 或 Hotjar 已安裝
[ ] A/B Test 已設定並正確分流
```

### 12.5 SEO & Meta

```
[ ] title tag 包含關鍵字 + 品牌名（50-60 字元）
[ ] meta description 有行動呼籲（150-160 字元）
[ ] og:image 已設定（1200x630）
[ ] og:title 和 og:description 已設定
[ ] favicon 已設定
[ ] robots meta 設定正確（Landing Page 通常 noindex）
[ ] canonical URL 設定正確
```

### 12.6 法律與合規

```
[ ] 隱私政策連結
[ ] 服務條款連結
[ ] Cookie 同意橫幅（GDPR/個資法）
[ ] 表單有同意條款勾選
[ ] 退款/取消政策清楚標示
```

---

## 13. 轉換率診斷 SOP

### 13.1 轉換率低的 5 大原因與對策

```
症狀 1：流量高但轉換率 < 1%
────────────────────────────
原因：流量品質差（受眾不對）
診斷：看 GA4 的受眾資料、廣告關鍵字是否精準
對策：縮窄廣告受眾、用否定關鍵字排除不相關搜尋

症狀 2：跳出率 > 70%，平均停留 < 10 秒
────────────────────────────
原因：訊息不匹配（廣告說 A，頁面說 B）
診斷：比對廣告文案和 Landing Page 標題
對策：確保標題包含廣告中的核心關鍵字和承諾

症狀 3：滾動深度低（50% 訪客沒滾到第二段）
────────────────────────────
原因：Hero 區沒有吸引力 / 載入太慢
診斷：看 LCP 速度、Hero 區標題是否有說服力
對策：優化 LCP、A/B 測試標題、加入社會證明到首屏

症狀 4：表單開始填但沒送出（form abandonment > 60%）
────────────────────────────
原因：表單太長或問了敏感資訊
診斷：用 Hotjar 看使用者卡在哪個欄位
對策：減少欄位、用多步驟表單、移除非必要欄位

症狀 5：手機端轉換率明顯低於桌面端
────────────────────────────
原因：手機端體驗差
診斷：用手機實際測試完整流程
對策：
  - 加浮動 CTA bar
  - 表單用對的 inputmode
  - 文字放大到 16px 以上
  - 按鈕放大到 44px 以上觸控區
  - 簡化手機端內容（不需要和桌面端完全一樣）
```

### 13.2 週期性優化流程

```
每週（15 分鐘）：
  1. 查看 GA4 轉換率趨勢
  2. 看 5 個 Clarity session recording
  3. 記錄觀察到的問題

每月（2 小時）：
  1. 分析上月各管道轉換率
  2. 看熱力圖找出點擊/滾動模式
  3. 決定本月要 A/B 測試什麼
  4. 啟動 1-2 個 A/B Test

每季（半天）：
  1. 全面檢視 Landing Page 效能
  2. 更新見證/數據/截圖
  3. 根據累積的 A/B Test 結果重新設計
  4. 競品 Landing Page 研究
```

### 13.3 快速贏面清單（Quick Wins）

```
不需要改設計，就能提升轉換率的做法：

1. 在 CTA 旁邊加上「不需信用卡」           → +5%–15%
2. 加上 countdown timer（限時優惠）         → +3%–10%
3. 數字統計加上滾動動畫                     → +2%–5%
4. 表單從 5 個欄位減到 3 個                  → +10%–25%
5. CTA 按鈕文案從「送出」改成「免費試用」   → +5%–15%
6. 在表單上方加一句見證                      → +3%–8%
7. 把最強的見證移到首屏                      → +5%–12%
8. 手機端加浮動 CTA bar                     → +8%–20%
9. 頁面速度從 4 秒優化到 2 秒               → +7%–15%
10. Exit Intent Popup 加限時優惠             → +3%–10%
```

---

## 附錄 A：Landing Page 文案模板庫

### A.1 SaaS 產品

```
標題：[動詞] + [受眾的目標] + [時間/條件]
副標題：[如何做到] + [降低門檻]

範例組合：

組合 1（效率類）：
標題：「把每天 3 小時的重複工作，變成 3 分鐘」
副標題：「無需寫程式，拖拉式介面 5 分鐘就能設定你的第一個自動化流程」

組合 2（成長類）：
標題：「讓你的 Email 名單在 30 天內成長 3 倍」
副標題：「AI 幫你寫文案、設計表單、分眾投遞，你只需要專注在產品」

組合 3（省錢類）：
標題：「用一個工具取代你每月 $500 美金的 SaaS 訂閱」
副標題：「整合 CRM、Email、分析、客服，不再需要 5 個不同平台」
```

### A.2 線上課程

```
標題：「[受眾] 也能 [達成結果] 的 [方法/系統]」
副標題：「[去除阻礙] + [社會證明]」

範例：
標題：「零基礎也能月入 10 萬的自由接案系統」
副標題：「不需要人脈、不需要經驗，1,200 位學員已經證明可行」
```

### A.3 B2B 服務

```
標題：「讓 [受眾角色] 的 [痛點] 變成 [正面結果]」
副標題：「[方法] + [時間框架] + [風險消除]」

範例：
標題：「讓行銷團隊不再猜測，用數據做決策」
副標題：「30 分鐘免費諮詢，幫你找出最有效的行銷管道。已服務 200+ 品牌」
```

---

## 附錄 B：常見 Landing Page 錯誤

| # | 錯誤 | 為什麼不好 | 怎麼修 |
|---|------|-----------|--------|
| 1 | 放完整導航列 | 使用者會離開 LP 去逛別的頁面 | 移除導航，只留 logo + CTA |
| 2 | CTA 只寫「送出」 | 沒有動機，不知道送出後會怎樣 | 改成「開始免費試用」「取得報價」 |
| 3 | 沒有社會證明 | 使用者不信任你 | 加見證/數字/Logo 牆 |
| 4 | 功能列表太長 | 資訊過載，使用者不知道重點 | 最多 3-6 個功能，用圖標+短句 |
| 5 | 圖片用 stock photo | 假假的、不專業 | 用真實產品截圖或客製插畫 |
| 6 | 表單問太多問題 | 填表門檻太高 | 只問必要的（Email + 姓名就好） |
| 7 | 沒有行動端優化 | 65%+ 流量在手機上 | Mobile First 設計 |
| 8 | 載入速度太慢 | 多 1 秒 = 少 7% 轉換 | 優化圖片/JS/CSS |
| 9 | 沒有追蹤事件 | 無法知道什麼有效什麼沒效 | 安裝 GA4 + 事件追蹤 |
| 10 | 一個頁面兩個目標 | 分散注意力 | 一頁一目標 |

---

> 本手冊持續更新。如有新的高轉換技巧或模板，請補充到對應章節。
