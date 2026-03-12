# EasyClaw Pro 網站部署指南

## 部署前準備

### 1. 網域準備
- 註冊網域: `easyclaw.pro` 或 `easyclaw.co`
- 設定 DNS 指向部署平台

### 2. 部署平台選擇

#### 推薦: Vercel（最簡單）
```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
cd projects/easyclaw-pro/modules/website/dist
vercel --prod
```

#### 替代: Netlify
```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 部署
cd projects/easyclaw-pro/modules/website/dist
netlify deploy --prod --dir=.
```

#### 替代: GitHub Pages
1. 建立 GitHub repository
2. 將 `dist/` 內容推送到 `gh-pages` 分支
3. 設定 GitHub Pages 從該分支部署

## 收費系統整合

### Stripe 整合（國際市場）

1. 註冊 Stripe 帳號
2. 建立產品和價格：
   - 標準方案: $30 USD（約 NT$899）
   - 進階方案: $50 USD（約 NT$1,499）
3. 將 Stripe 結帳連結加入 Pricing 按鈕

```html
<!-- Pricing.tsx 修改 -->
<Link
  href="https://buy.stripe.com/xxxxx"  <!-- Stripe 付款連結 -->
  className="..."
>
  選擇標準方案
</Link>
```

### 綠界 ECPay（台灣市場）

1. 註冊綠界會員
2. 申請信用卡收款服務
3. 整合綠界 SDK

### PayPal（替代方案）

建立 PayPal 按鈕：
```html
<form action="https://www.paypal.com/cgi-bin/webscr" method="post">
  <input type="hidden" name="cmd" value="_xclick">
  <input type="hidden" name="business" value="your@email.com">
  <input type="hidden" name="item_name" value="EasyClaw Pro - 標準方案">
  <input type="hidden" name="amount" value="30.00">
  <input type="hidden" name="currency_code" value="USD">
  <button type="submit">付款</button>
</form>
```

## 自動部署腳本

### GitHub Actions（推薦）

建立 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 後端 API 規劃

### 付款後自動部署流程

```
1. 用戶付款成功
   ↓
2. Stripe webhook → 觸發部署 API
   ↓
3. API 生成專屬部署腳本
   ↓
4. 發送郵件給用戶（含腳本 + 教學）
   ↓
5. 用戶執行腳本完成部署
```

### 需要的 API 端點

```
POST /api/deploy
  - 接收 Stripe webhook
  - 生成部署腳本
  - 發送通知郵件

GET /api/status/:userId
  - 查詢部署狀態

POST /api/support
  - 支援請求
```

## SEO 與分析

### 加入 Google Analytics

在 `layout.tsx` 加入：
```tsx
import Script from 'next/script'

// ...
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  strategy="afterInteractive"
/>
```

### 加入 Facebook Pixel

```tsx
<Script id="facebook-pixel" strategy="afterInteractive">
  {`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    ...
  `}
</Script>
```

## 測試清單

- [ ] 網站在不同裝置正常顯示
- [ ] 所有連結可點擊
- [ ] 付款流程順暢
- [ ] 部署腳本可正常執行
- [ ] 郵件通知正確發送
- [ ] SSL 憑證正確安裝
- [ ] 載入速度 < 3 秒

## 上線後監控

- 使用 Vercel Analytics 監控流量
- 設定 Uptime Robot 監控網站可用性
- 定期檢查 Stripe 付款記錄

## 聯絡整合

### Telegram Bot 通知

當有新訂單時，發送通知到管理員 Telegram：
```javascript
fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  body: JSON.stringify({
    chat_id: ADMIN_CHAT_ID,
    text: `新訂單: ${orderId} - ${plan}`
  })
})
```
