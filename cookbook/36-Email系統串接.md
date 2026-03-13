# 36 — Email 系統串接

> 給接案公司 / 自由工作者的完整 Email 系統串接手冊。從選型到部署、從模板開發到可送達性優化，每個段落都寫到可以直接照做。
> 最後更新：2026-03-05

---

## 目錄

1. [Email 服務選型比較](#1-email-服務選型比較)
2. [Resend（推薦）](#2-resend推薦)
3. [SendGrid](#3-sendgrid)
4. [Nodemailer + Gmail SMTP（免費方案）](#4-nodemailer--gmail-smtp免費方案)
5. [Email 類型模板](#5-email-類型模板)
6. [HTML Email 開發指南](#6-html-email-開發指南)
7. [React Email 快速開發](#7-react-email-快速開發)
8. [Email 可送達性（SPF / DKIM / DMARC）](#8-email-可送達性spf--dkim--dmarc)
9. [退訂 / 取消訂閱機制](#9-退訂--取消訂閱機制)
10. [n8n 自動化 Email 流程](#10-n8n-自動化-email-流程)
11. [常見問題與排查](#11-常見問題與排查)

---

## 1. Email 服務選型比較

### 五大服務一覽

| 服務 | 免費額度 | 付費起始 | 串接難度 | DX（開發體驗） | 最適合場景 |
|------|---------|---------|---------|--------------|-----------|
| **Resend** | 3,000 封/月 + 1 域名 | $20/月 5 萬封 | ★☆☆ 極簡 | ★★★★★ | 現代前端團隊、React 專案 |
| **SendGrid** | 100 封/天（永久免費） | $19.95/月 5 萬封 | ★★☆ 中等 | ★★★★ | 大量行銷信、完整分析 |
| **Mailgun** | 5,000 封/月（前 3 個月） | $35/月 5 萬封 | ★★☆ 中等 | ★★★ | API 導向開發者 |
| **Amazon SES** | 62,000 封/月（從 EC2 發） | $0.10/千封 | ★★★ 較繁 | ★★★ | 大量寄信、AWS 生態 |
| **Nodemailer + SMTP** | Gmail 500 封/天 | 依 SMTP 供應商 | ★☆☆ 簡單 | ★★★ | 小專案、原型驗證 |

### 選擇決策樹

```
客戶需要寄 Email？
  │
  ├─ 每月 < 500 封？ → Nodemailer + Gmail SMTP（免費、5 分鐘搞定）
  │
  ├─ 前端用 React / Next.js？ → Resend + React Email（現代化開發體驗）
  │
  ├─ 需要行銷信 + 分析報表？ → SendGrid（完整 Marketing 功能）
  │
  ├─ 已在 AWS 生態？ → Amazon SES（最便宜大量方案）
  │
  └─ 純 API 寄信、不需 UI？ → Mailgun 或 Resend
```

### 各服務特色重點

| 功能 | Resend | SendGrid | Mailgun | SES | Nodemailer |
|------|--------|----------|---------|-----|------------|
| REST API | v | v | v | v | x（SMTP） |
| React Email 整合 | v 原生 | x | x | x | x |
| 模板引擎 | React Email | Dynamic Templates | Handlebars | SES Templates | 自己寫 |
| Webhook（開信/點擊） | v | v | v | SNS 通知 | x |
| 行銷名單管理 | x | v 完整 | x | x | x |
| 專屬 IP | 付費版 | 付費版 | 付費版 | 免費 | N/A |
| 中文支援品質 | 良 | 優 | 普通 | 普通 | 依 SMTP |
| n8n 原生節點 | x（用 HTTP） | v | x（用 HTTP） | v | v（SMTP） |

---

## 2. Resend（推薦）

> Resend 是 2023 年崛起的現代 Email 服務，由前 Vercel 工程師打造。最大賣點是與 React Email 原生整合，讓前端工程師可以用 JSX 寫 Email 模板。

### 2.1 帳號與域名設定

**步驟一：註冊帳號**
1. 前往 https://resend.com/signup
2. 用 GitHub 或 Email 註冊
3. 免費方案：3,000 封/月、1 個自訂域名

**步驟二：取得 API Key**
1. Dashboard → API Keys → Create API Key
2. 命名（如 `my-project-prod`），權限選 `Full access`
3. **複製 API Key，只會顯示一次**

**步驟三：設定自訂域名（強烈建議）**
1. Dashboard → Domains → Add Domain
2. 輸入你的域名（如 `mail.yoursite.com`）
3. Resend 會提供 DNS 記錄，加到你的 DNS：

```
# 需要加到 DNS 的記錄（Resend Dashboard 會提供實際值）
類型    主機名                          值
TXT     _resend.mail.yoursite.com       驗證碼（Resend 提供）
MX      send.mail.yoursite.com          feedback-smtp.resend.com（優先級 10）
TXT     mail.yoursite.com               v=spf1 include:resend.dev ~all
CNAME   resend._domainkey.mail.yoursite.com    DKIM 值（Resend 提供）
```

4. 等待驗證通過（通常 5-30 分鐘）

### 2.2 Node.js SDK 串接

**安裝：**

```bash
npm install resend
```

**基本寄信：**

```typescript
// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// 最簡單的寄信
async function sendEmail() {
  const { data, error } = await resend.emails.send({
    from: '你的品牌 <hello@mail.yoursite.com>',  // 必須用已驗證的域名
    to: ['user@example.com'],
    subject: '歡迎加入！',
    html: '<h1>歡迎！</h1><p>感謝您的註冊。</p>',
  });

  if (error) {
    console.error('寄信失敗:', error);
    return null;
  }

  console.log('寄信成功, ID:', data?.id);
  return data;
}
```

**Express.js 中的實際用法：**

```typescript
// server/src/routes/email.ts
import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/welcome — 發送歡迎信
router.post('/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: '缺少 email 或 name' });
    }

    const { data, error } = await resend.emails.send({
      from: '你的品牌 <hello@mail.yoursite.com>',
      to: [email],
      subject: `${name}，歡迎加入！`,
      html: getWelcomeEmailHTML(name),
    });

    if (error) {
      console.error('寄信失敗:', error);
      return res.status(500).json({ error: '寄信失敗', detail: error.message });
    }

    res.json({ success: true, emailId: data?.id });
  } catch (err) {
    console.error('Email route error:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// POST /api/email/reset-password — 密碼重設信
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken } = req.body;
    const resetUrl = `https://yoursite.com/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: '你的品牌 <security@mail.yoursite.com>',
      to: [email],
      subject: '密碼重設請求',
      html: getPasswordResetHTML(resetUrl),
    });

    if (error) {
      return res.status(500).json({ error: '寄信失敗' });
    }

    // 不回傳 token，避免洩漏
    res.json({ success: true, message: '重設信已寄出' });
  } catch (err) {
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

export default router;
```

**批次寄信（Batch API）：**

```typescript
// 一次寄給多人（各自獨立信件，不是 CC/BCC）
const { data, error } = await resend.batch.send([
  {
    from: '品牌 <hello@mail.yoursite.com>',
    to: ['user1@example.com'],
    subject: '專屬優惠',
    html: '<p>User1 的專屬內容</p>',
  },
  {
    from: '品牌 <hello@mail.yoursite.com>',
    to: ['user2@example.com'],
    subject: '專屬優惠',
    html: '<p>User2 的專屬內容</p>',
  },
]);
// 批次 API 一次最多 100 封
```

### 2.3 Resend Webhook（追蹤開信/點擊）

```typescript
// server/src/routes/resend-webhook.ts
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

router.post('/webhook/resend', (req, res) => {
  // 1. 驗證 webhook 簽名（生產環境必做）
  const signature = req.headers['resend-signature'] as string;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;

  // 驗簽邏輯（Resend 文件有完整範例）
  // ...

  // 2. 處理事件
  const event = req.body;

  switch (event.type) {
    case 'email.sent':
      console.log(`Email ${event.data.email_id} 已送出`);
      break;
    case 'email.delivered':
      console.log(`Email ${event.data.email_id} 已送達`);
      break;
    case 'email.opened':
      console.log(`Email ${event.data.email_id} 被開啟`);
      // 更新資料庫記錄
      break;
    case 'email.clicked':
      console.log(`Email ${event.data.email_id} 連結被點擊`);
      break;
    case 'email.bounced':
      console.log(`Email ${event.data.email_id} 退信`);
      // 標記無效 email
      break;
    case 'email.complained':
      console.log(`Email ${event.data.email_id} 被檢舉為垃圾信`);
      // 立即移出名單
      break;
  }

  res.status(200).json({ received: true });
});

export default router;
```

---

## 3. SendGrid

> SendGrid 是老牌 Email 服務（Twilio 旗下），功能最齊全，適合需要行銷信功能 + 完整分析報表的專案。

### 3.1 帳號設定

1. 前往 https://sendgrid.com → 註冊
2. 免費方案：100 封/天（永久免費）
3. Settings → API Keys → Create API Key → **Full Access**
4. 設定 Sender Identity：Settings → Sender Authentication → 驗證域名

### 3.2 Node.js 串接

**安裝：**

```bash
npm install @sendgrid/mail
```

**基本寄信：**

```typescript
// src/lib/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// 單封寄信
async function sendEmail(to: string, subject: string, html: string) {
  const msg = {
    to,
    from: {
      email: 'hello@yoursite.com',  // 已驗證的寄件者
      name: '你的品牌',
    },
    subject,
    html,
    // 可選：純文字版（建議提供，提升可送達性）
    text: html.replace(/<[^>]*>/g, ''),
  };

  try {
    const [response] = await sgMail.send(msg);
    console.log('寄信成功, 狀態碼:', response.statusCode);
    return response;
  } catch (error: any) {
    console.error('寄信失敗:', error?.response?.body || error.message);
    throw error;
  }
}
```

### 3.3 Dynamic Templates（動態模板）

SendGrid 最強的功能之一是在 Dashboard 上管理 Email 模板，程式只需傳入變數。

**步驟一：在 SendGrid Dashboard 建立模板**
1. Email API → Dynamic Templates → Create Dynamic Template
2. 用 Design Editor 或 Code Editor 設計模板
3. 模板中用 `{{variable}}` 插入變數，支援 Handlebars 語法
4. 記下 Template ID（如 `d-xxxxxxxxxxxxxxxxxxxxxxxxx`）

**步驟二：程式端呼叫模板**

```typescript
// 使用 Dynamic Template 寄信
async function sendWithTemplate(
  to: string,
  templateId: string,
  dynamicData: Record<string, any>
) {
  const msg = {
    to,
    from: { email: 'hello@yoursite.com', name: '你的品牌' },
    templateId,
    dynamicTemplateData: dynamicData,
  };

  const [response] = await sgMail.send(msg);
  return response;
}

// 實際使用
await sendWithTemplate(
  'user@example.com',
  'd-xxxxxxxxxxxx',  // Template ID
  {
    name: '王小明',
    orderNumber: 'ORD-20260305-001',
    items: [
      { name: '官網設計', price: 'NT$50,000' },
      { name: '主機代管 x12', price: 'NT$12,000' },
    ],
    total: 'NT$62,000',
  }
);
```

**模板中的 Handlebars 語法：**

```html
<!-- SendGrid Dynamic Template 範例 -->
<h1>Hi {{name}}，</h1>
<p>您的訂單 #{{orderNumber}} 已確認。</p>

<table>
  <tr><th>項目</th><th>金額</th></tr>
  {{#each items}}
  <tr>
    <td>{{this.name}}</td>
    <td>{{this.price}}</td>
  </tr>
  {{/each}}
</table>

<p><strong>總計：{{total}}</strong></p>

{{#if hasDiscount}}
  <p>折扣已套用！</p>
{{/if}}
```

### 3.4 SendGrid 進階功能速查

```typescript
// 帶附件
const msg = {
  to: 'user@example.com',
  from: 'hello@yoursite.com',
  subject: '您的報價單',
  html: '<p>請查收附件中的報價單。</p>',
  attachments: [
    {
      content: fs.readFileSync('/path/to/quote.pdf').toString('base64'),
      filename: '報價單.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ],
};

// 排程寄信（未來某時間寄出）
const msg = {
  to: 'user@example.com',
  from: 'hello@yoursite.com',
  subject: '定時寄出',
  html: '<p>這封信會在指定時間寄出</p>',
  sendAt: Math.floor(new Date('2026-03-10T09:00:00+08:00').getTime() / 1000),
};

// 分類標籤（用於分析報表）
const msg = {
  // ...
  categories: ['transactional', 'order-confirmation'],
  customArgs: {
    orderId: 'ORD-001',
    source: 'website',
  },
};
```

---

## 4. Nodemailer + Gmail SMTP（免費方案）

> 最簡單的方案，適合小型專案、原型驗證、每天寄信量 < 500 封。零成本。

### 4.1 Gmail 應用程式密碼設定

**重要：不能用 Gmail 登入密碼，必須建立「應用程式密碼」。**

1. 前往 https://myaccount.google.com/apppasswords
2. 前提：必須開啟兩步驟驗證
3. 選擇應用程式 → 其他（自訂名稱）→ 輸入 `My Project Email`
4. 產生 16 位密碼（如 `abcd efgh ijkl mnop`）
5. **複製密碼，只會顯示一次**

### 4.2 Nodemailer 串接

**安裝：**

```bash
npm install nodemailer
npm install -D @types/nodemailer  # TypeScript 用
```

**完整範例：**

```typescript
// src/lib/mailer.ts
import nodemailer from 'nodemailer';

// 建立 SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        // your@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // 16 位應用程式密碼
  },
});

// 驗證連線（建議啟動時檢查）
transporter.verify((error) => {
  if (error) {
    console.error('SMTP 連線失敗:', error);
  } else {
    console.log('SMTP 連線成功，可以寄信');
  }
});

// 通用寄信函式
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export async function sendMail(options: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"你的品牌" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      attachments: options.attachments,
    });

    console.log('寄信成功, MessageId:', info.messageId);
    return info;
  } catch (error) {
    console.error('寄信失敗:', error);
    throw error;
  }
}
```

**在 Express.js 路由中使用：**

```typescript
// server/src/routes/contact.ts
import { Router } from 'express';
import { sendMail } from '../lib/mailer';

const router = Router();

// POST /api/contact — 客戶聯絡表單
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // 1. 寄通知給自己（站長）
    await sendMail({
      to: 'owner@yoursite.com',
      subject: `[網站表單] ${name} 來信`,
      html: `
        <h2>新的客戶詢問</h2>
        <p><strong>姓名：</strong>${name}</p>
        <p><strong>Email：</strong>${email}</p>
        <p><strong>電話：</strong>${phone || '未提供'}</p>
        <p><strong>訊息：</strong></p>
        <p>${message}</p>
        <hr>
        <p style="color:#999">來自網站聯絡表單 — ${new Date().toLocaleString('zh-TW')}</p>
      `,
    });

    // 2. 寄自動回覆給客戶
    await sendMail({
      to: email,
      subject: '感謝您的來信，我們已收到！',
      html: `
        <h2>${name} 您好，</h2>
        <p>感謝您透過網站與我們聯繫。</p>
        <p>我們已收到您的訊息，將在 <strong>1 個工作天內</strong> 回覆您。</p>
        <br>
        <p>你的品牌團隊</p>
      `,
    });

    res.json({ success: true, message: '訊息已送出' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: '寄信失敗，請稍後再試' });
  }
});

export default router;
```

### 4.3 Gmail SMTP 限制（必讀）

| 限制項目 | 數值 |
|---------|------|
| 每天寄信上限 | 500 封（@gmail.com）/ 2,000 封（Google Workspace） |
| 每封收件人上限 | 500 人 |
| 附件大小上限 | 25 MB |
| 被鎖定後恢復時間 | 24 小時 |
| From 地址 | 只能用該 Gmail 帳號 |

**超過限制怎麼辦？** 升級到 Resend 或 SendGrid，改動只需換 transporter 設定，其他程式碼不用動。

### 4.4 其他 SMTP 供應商

如果不想用 Gmail，以下 SMTP 也可以直接替換：

```typescript
// Outlook / Hotmail
const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: { user: 'you@outlook.com', pass: 'your-password' },
});

// 自訂 SMTP（如 Hinet、企業信箱）
const transporter = nodemailer.createTransport({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false, // true = 465, false = 587
  auth: { user: 'you@domain.com', pass: 'password' },
});

// Zoho Mail
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: { user: 'you@zoho.com', pass: 'password' },
});
```

---

## 5. Email 類型模板

> 以下是接案常見的 5 種 Email 模板，直接複製修改品牌資訊即可使用。所有模板都已考慮 Email Client 相容性。

### 5.1 歡迎信（Welcome Email）

```typescript
function getWelcomeEmailHTML(name: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>歡迎加入</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2563eb;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;">歡迎加入！</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                ${name} 您好，
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                感謝您註冊成為會員！我們非常高興您的加入。
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#374151;">
                您現在可以開始使用所有功能：
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">
                      開始使用
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
                如果按鈕無法點擊，請複製以下連結到瀏覽器：<br>
                <a href="${loginUrl}" style="color:#2563eb;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                你的品牌 | 台北市某某區某某路 123 號<br>
                <a href="{{unsubscribeUrl}}" style="color:#9ca3af;">取消訂閱</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

### 5.2 密碼重設信（Password Reset）

```typescript
function getPasswordResetHTML(resetUrl: string, expireMinutes: number = 30): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;">

          <tr>
            <td style="padding:32px;text-align:center;">
              <div style="width:64px;height:64px;margin:0 auto 16px;background-color:#fef3c7;border-radius:50%;line-height:64px;font-size:28px;">
                &#128274;
              </div>
              <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">密碼重設請求</h1>
              <p style="margin:0;font-size:14px;color:#6b7280;">我們收到了重設密碼的請求</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px;">
              <p style="font-size:16px;color:#374151;">
                點擊下方按鈕重設密碼。此連結將在 <strong>${expireMinutes} 分鐘</strong> 後失效。
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:16px 0;">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">
                      重設密碼
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-top:16px;">
                <p style="margin:0;font-size:14px;color:#991b1b;">
                  如果您沒有要求重設密碼，請忽略此信件，您的密碼不會被更改。
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                這是系統自動寄出的信件，請勿直接回覆。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

### 5.3 訂單確認信（Order Confirmation）

```typescript
interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

interface OrderData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: string;
  tax: string;
  total: string;
}

function getOrderConfirmationHTML(order: OrderData): string {
  const itemsHTML = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">
        ${item.name}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">
        ${item.price}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;">

          <tr>
            <td style="background-color:#059669;padding:32px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">&#9989;</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;">訂單確認</h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">訂單編號：${order.orderNumber}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;color:#374151;">${order.customerName} 您好，</p>
              <p style="font-size:16px;color:#374151;">感謝您的訂購！以下是您的訂單明細：</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
                <tr style="background-color:#f3f4f6;">
                  <th style="padding:12px 0;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;">項目</th>
                  <th style="padding:12px 0;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;">數量</th>
                  <th style="padding:12px 0;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;">金額</th>
                </tr>
                ${itemsHTML}
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;">小計</td>
                  <td style="padding:4px 0;font-size:14px;color:#374151;text-align:right;">${order.subtotal}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;">稅額（5%）</td>
                  <td style="padding:4px 0;font-size:14px;color:#374151;text-align:right;">${order.tax}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:bold;color:#111827;border-top:2px solid #111827;">總計</td>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:bold;color:#111827;text-align:right;border-top:2px solid #111827;">${order.total}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                訂單日期：${order.orderDate}<br>
                如有問題請聯繫：support@yoursite.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

### 5.4 預約通知信（Appointment Notification）

```typescript
interface AppointmentData {
  customerName: string;
  serviceName: string;
  date: string;       // e.g. "2026 年 3 月 10 日（二）"
  time: string;       // e.g. "14:00 - 15:00"
  location: string;
  staffName?: string;
  notes?: string;
  calendarUrl?: string;
}

function getAppointmentNotificationHTML(apt: AppointmentData): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;">

          <tr>
            <td style="background-color:#7c3aed;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;">&#128197; 預約確認</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;color:#374151;">${apt.customerName} 您好，</p>
              <p style="font-size:16px;color:#374151;">您的預約已確認，以下是預約詳情：</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="background-color:#f5f3ff;border-radius:8px;margin:24px 0;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:80px;">服務</td>
                        <td style="padding:8px 0;font-size:16px;color:#111827;font-weight:bold;">${apt.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">日期</td>
                        <td style="padding:8px 0;font-size:16px;color:#111827;font-weight:bold;">${apt.date}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">時間</td>
                        <td style="padding:8px 0;font-size:16px;color:#111827;font-weight:bold;">${apt.time}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">地點</td>
                        <td style="padding:8px 0;font-size:16px;color:#111827;">${apt.location}</td>
                      </tr>
                      ${apt.staffName ? `
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">服務人員</td>
                        <td style="padding:8px 0;font-size:16px;color:#111827;">${apt.staffName}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${apt.notes ? `
              <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;border-radius:0 6px 6px 0;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  <strong>注意事項：</strong> ${apt.notes}
                </p>
              </div>` : ''}

              ${apt.calendarUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:16px 0;">
                    <a href="${apt.calendarUrl}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:6px;">
                      加入 Google 日曆
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                如需取消或改期，請至少提前 24 小時聯繫我們。<br>
                聯絡電話：02-1234-5678
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

### 5.5 月報 / 週報信（Monthly Report）

```typescript
interface ReportData {
  recipientName: string;
  reportPeriod: string;  // e.g. "2026 年 2 月"
  stats: {
    visitors: number;
    pageViews: number;
    conversions: number;
    conversionRate: string;
  };
  highlights: string[];
  nextSteps: string[];
  dashboardUrl: string;
}

function getMonthlyReportHTML(report: ReportData): string {
  const highlightsHTML = report.highlights.map(h =>
    `<li style="padding:4px 0;font-size:14px;color:#374151;">${h}</li>`
  ).join('');

  const nextStepsHTML = report.nextSteps.map(s =>
    `<li style="padding:4px 0;font-size:14px;color:#374151;">${s}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;">

          <tr>
            <td style="background-color:#1e3a5f;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;">${report.reportPeriod} 成效報告</h1>
              <p style="margin:8px 0 0;color:#93c5fd;font-size:14px;">每月定期為您彙整</p>
            </td>
          </tr>

          <!-- 數據卡片 -->
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;color:#374151;">${report.recipientName} 您好，</p>
              <p style="font-size:16px;color:#374151;">以下是 ${report.reportPeriod} 的網站成效摘要：</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background-color:#eff6ff;border-radius:8px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:bold;color:#1d4ed8;">${report.stats.visitors.toLocaleString()}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">訪客數</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background-color:#f0fdf4;border-radius:8px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:bold;color:#16a34a;">${report.stats.pageViews.toLocaleString()}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">瀏覽量</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background-color:#fefce8;border-radius:8px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:bold;color:#ca8a04;">${report.stats.conversions}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">轉換次數</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background-color:#fdf2f8;border-radius:8px;padding:20px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:bold;color:#db2777;">${report.stats.conversionRate}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">轉換率</p>
                    </div>
                  </td>
                </tr>
              </table>

              <h3 style="color:#111827;font-size:16px;margin:24px 0 12px;">本月重點</h3>
              <ul style="padding-left:20px;margin:0;">${highlightsHTML}</ul>

              <h3 style="color:#111827;font-size:16px;margin:24px 0 12px;">下月計畫</h3>
              <ul style="padding-left:20px;margin:0;">${nextStepsHTML}</ul>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:24px 0 0;">
                    <a href="${report.dashboardUrl}" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:6px;">
                      查看完整報表
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                你的品牌 | 此報告每月自動寄出<br>
                <a href="{{unsubscribeUrl}}" style="color:#9ca3af;">取消訂閱月報</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

---

## 6. HTML Email 開發指南

> HTML Email 開發是整個前端領域中相容性最差的部分。以下是必須知道的坑和正確做法。

### 6.1 Email Client 相容性地獄

| CSS 功能 | Gmail | Outlook | Apple Mail | Yahoo |
|---------|-------|---------|------------|-------|
| Flexbox | x | x | v | x |
| Grid | x | x | v | x |
| `<div>` 排版 | 部分 | x | v | 部分 |
| `<table>` 排版 | v | v | v | v |
| Inline CSS | v | v | v | v |
| `<style>` 標籤 | v | 部分 | v | v |
| `@media` 查詢 | v | x | v | v |
| `background-image` | v | x | v | v |
| Web fonts | x | x | v | x |
| CSS 動畫 | x | x | v | x |
| `border-radius` | v | x（方角） | v | v |
| `max-width` | v | x | v | v |
| `margin: 0 auto` | v | x | v | v |

### 6.2 Email HTML 鐵律

**1. 用 Table Layout，不用 Div**

```html
<!-- 錯誤 -->
<div style="display:flex; justify-content:center;">
  <div style="width:600px;">內容</div>
</div>

<!-- 正確 -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
        <tr>
          <td>內容</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

**2. 所有樣式用 Inline CSS**

```html
<!-- 錯誤 -->
<style>
  .title { color: #333; font-size: 24px; }
</style>
<h1 class="title">標題</h1>

<!-- 正確 -->
<h1 style="color:#333333;font-size:24px;margin:0;padding:0;">標題</h1>
```

**3. 圖片必須用絕對 URL + 加 alt + 設寬高**

```html
<!-- 錯誤 -->
<img src="/images/logo.png">

<!-- 正確 -->
<img src="https://yoursite.com/images/logo.png"
     alt="品牌 Logo"
     width="150"
     height="50"
     style="display:block;border:0;outline:none;">
```

**4. 按鈕用 Table + `<a>`，不用 `<button>`**

```html
<!-- 正確的 bulletproof button（所有 Email client 都能點） -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius:6px;background-color:#2563eb;">
      <a href="https://yoursite.com"
         style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">
        點擊按鈕
      </a>
    </td>
  </tr>
</table>
```

**5. 安全字體清單**

```css
/* 只用這些字體，其他都不保險 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

/* 中文加上 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', 'PingFang TC', sans-serif;
```

### 6.3 MJML — Email 開發框架

MJML 是 Mailjet 開發的 Email 標記語言，寫起來像正常 HTML，自動產出相容各 client 的 Table Layout。

**安裝：**

```bash
npm install mjml
```

**MJML 範例模板：**

```xml
<!-- welcome.mjml -->
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" />
      <mj-text font-size="16px" color="#374151" line-height="1.6" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f4f4f5">
    <mj-section background-color="#2563eb" padding="32px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="24px" font-weight="bold">
          歡迎加入！
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="32px">
      <mj-column>
        <mj-text>
          {{name}} 您好，感謝您註冊成為會員！
        </mj-text>

        <mj-button background-color="#2563eb" color="#ffffff" href="{{loginUrl}}"
                   border-radius="6px" font-size="16px" padding="24px 0">
          開始使用
        </mj-button>

        <mj-text font-size="14px" color="#6b7280">
          如果按鈕無法點擊，請複製此連結：{{loginUrl}}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f9fafb" padding="24px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#9ca3af">
          你的品牌 | 台北市某某區某某路 123 號
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

**用程式編譯 MJML：**

```typescript
import mjml2html from 'mjml';
import fs from 'fs';

// 讀取 MJML 模板
const mjmlTemplate = fs.readFileSync('./templates/welcome.mjml', 'utf-8');

// 替換變數
const filled = mjmlTemplate
  .replace('{{name}}', '王小明')
  .replace(/\{\{loginUrl\}\}/g, 'https://yoursite.com/login');

// 編譯成 HTML
const { html, errors } = mjml2html(filled);

if (errors.length > 0) {
  console.error('MJML 編譯錯誤:', errors);
}

// html 就是可以直接寄出的 Email HTML
console.log(html);
```

### 6.4 Email 測試工具

| 工具 | 用途 | 費用 |
|------|------|------|
| [Litmus](https://litmus.com) | 90+ Email client 預覽 | $99/月起 |
| [Email on Acid](https://www.emailonacid.com) | 多平台預覽 + 可送達性分析 | $74/月起 |
| [Mailtrap](https://mailtrap.io) | 開發環境測試信箱（不會寄出） | 免費 100 封/月 |
| [Can I Email](https://www.caniemail.com) | CSS 相容性查詢（像 Can I Use） | 免費 |
| [HTML Email Check](https://htmlemailcheck.com) | 快速檢查 HTML 語法 | 免費 |

**開發時建議用 Mailtrap（不會真的寄出）：**

```typescript
// 開發環境用 Mailtrap
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,    // Mailtrap Dashboard 取得
    pass: process.env.MAILTRAP_PASS,
  },
});
```

---

## 7. React Email 快速開發

> React Email 讓你用 React 元件寫 Email 模板，擁有 TypeScript 型別安全、元件複用、即時預覽。搭配 Resend 是 2024-2026 最推薦的組合。

### 7.1 安裝與初始化

```bash
# 安裝核心套件
npm install @react-email/components react-email

# 或使用 create-email 建立獨立的 Email 專案
npx create-email@latest my-emails
cd my-emails
npm install
```

### 7.2 建立 Email 元件

```tsx
// emails/WelcomeEmail.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
  Preview,
  Tailwind,
} from '@react-email/components';

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export default function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <Html lang="zh-TW">
      <Head />
      <Preview>歡迎加入！開始使用你的帳號</Preview>

      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white rounded-lg mx-auto my-10 max-w-[600px]">

            {/* Header */}
            <Section className="bg-blue-600 rounded-t-lg px-8 py-8 text-center">
              <Heading className="text-white text-2xl m-0">
                歡迎加入！
              </Heading>
            </Section>

            {/* Body */}
            <Section className="px-8 py-8">
              <Text className="text-gray-700 text-base">
                {name} 您好，
              </Text>
              <Text className="text-gray-700 text-base">
                感謝您註冊成為會員！我們非常高興您的加入。
              </Text>
              <Text className="text-gray-700 text-base">
                您現在可以開始使用所有功能：
              </Text>

              <Section className="text-center my-8">
                <Button
                  href={loginUrl}
                  className="bg-blue-600 text-white font-bold px-8 py-3 rounded-md text-base"
                >
                  開始使用
                </Button>
              </Section>

              <Text className="text-gray-500 text-sm">
                如果按鈕無法點擊，請複製以下連結到瀏覽器：
                <br />
                <a href={loginUrl} className="text-blue-600">{loginUrl}</a>
              </Text>
            </Section>

            <Hr className="border-gray-200" />

            {/* Footer */}
            <Section className="px-8 py-6 text-center">
              <Text className="text-gray-400 text-xs m-0">
                你的品牌 | 台北市某某區某某路 123 號
              </Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### 7.3 密碼重設 Email 元件

```tsx
// emails/PasswordResetEmail.tsx
import {
  Html, Head, Body, Container, Section,
  Text, Button, Heading, Preview, Tailwind,
} from '@react-email/components';

interface PasswordResetEmailProps {
  resetUrl: string;
  expireMinutes?: number;
}

export default function PasswordResetEmail({
  resetUrl,
  expireMinutes = 30,
}: PasswordResetEmailProps) {
  return (
    <Html lang="zh-TW">
      <Head />
      <Preview>您的密碼重設連結（{expireMinutes} 分鐘內有效）</Preview>

      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white rounded-lg mx-auto my-10 max-w-[600px]">

            <Section className="px-8 py-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 leading-[64px] text-3xl">
                &#128274;
              </div>
              <Heading className="text-gray-900 text-xl m-0">
                密碼重設請求
              </Heading>
              <Text className="text-gray-500 text-sm">
                我們收到了重設密碼的請求
              </Text>
            </Section>

            <Section className="px-8 pb-8">
              <Text className="text-gray-700 text-base">
                點擊下方按鈕重設密碼。此連結將在{' '}
                <strong>{expireMinutes} 分鐘</strong> 後失效。
              </Text>

              <Section className="text-center my-6">
                <Button
                  href={resetUrl}
                  className="bg-red-600 text-white font-bold px-8 py-3 rounded-md text-base"
                >
                  重設密碼
                </Button>
              </Section>

              <Section className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                <Text className="text-red-800 text-sm m-0">
                  如果您沒有要求重設密碼，請忽略此信件，您的密碼不會被更改。
                </Text>
              </Section>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### 7.4 在 API 中使用 React Email

```typescript
// server/src/lib/email-service.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '../../emails/WelcomeEmail';
import PasswordResetEmail from '../../emails/PasswordResetEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  // 寄歡迎信
  static async sendWelcome(to: string, name: string) {
    const html = await render(WelcomeEmail({
      name,
      loginUrl: `${process.env.APP_URL}/dashboard`,
    }));

    return resend.emails.send({
      from: '品牌 <hello@mail.yoursite.com>',
      to: [to],
      subject: `${name}，歡迎加入！`,
      html,
    });
  }

  // 寄密碼重設信
  static async sendPasswordReset(to: string, resetToken: string) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const html = await render(PasswordResetEmail({
      resetUrl,
      expireMinutes: 30,
    }));

    return resend.emails.send({
      from: '品牌 <security@mail.yoursite.com>',
      to: [to],
      subject: '密碼重設請求',
      html,
    });
  }
}
```

### 7.5 React Email 本地預覽

```bash
# 啟動開發伺服器，即時預覽
npx react-email dev --dir ./emails --port 3333

# 瀏覽器開啟 http://localhost:3333 即可預覽所有 Email 元件
```

### 7.6 共用元件（DRY 原則）

```tsx
// emails/components/EmailLayout.tsx
import {
  Html, Head, Body, Container, Section,
  Text, Hr, Preview, Tailwind,
} from '@react-email/components';
import { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="zh-TW">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white rounded-lg mx-auto my-10 max-w-[600px]">
            {children}

            <Hr className="border-gray-200" />
            <Section className="px-8 py-6 text-center">
              <Text className="text-gray-400 text-xs m-0">
                你的品牌 | 台北市某某區某某路 123 號
                <br />
                <a href="{{unsubscribeUrl}}" className="text-gray-400 underline">
                  取消訂閱
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

---

## 8. Email 可送達性（SPF / DKIM / DMARC）

> 寄信不難，信進收件匣才難。以下 DNS 設定是避免進垃圾郵件的關鍵。

### 8.1 三大認證機制

```
寄信伺服器 → 收信伺服器
              │
              ├─ SPF 檢查：這台伺服器有權代表這個域名寄信嗎？
              ├─ DKIM 檢查：這封信真的是這個域名寄出的嗎？（數位簽名）
              └─ DMARC 檢查：SPF 和 DKIM 沒過的話怎麼處理？
```

### 8.2 SPF 設定

SPF（Sender Policy Framework）告訴收信伺服器「哪些 IP 有權代表我的域名寄信」。

**DNS 設定（TXT 記錄）：**

```
# 只用 Resend
類型: TXT
主機: @（或留空）
值:   v=spf1 include:resend.dev ~all

# 只用 SendGrid
值:   v=spf1 include:sendgrid.net ~all

# 只用 Gmail SMTP
值:   v=spf1 include:_spf.google.com ~all

# 同時用 Resend + Gmail（多個 include）
值:   v=spf1 include:resend.dev include:_spf.google.com ~all

# 同時用 SendGrid + Mailgun
值:   v=spf1 include:sendgrid.net include:mailgun.org ~all
```

**重要規則：**
- 一個域名只能有一條 SPF 記錄
- 多個服務用多個 `include:` 合併在同一條
- `~all` = soft fail（建議）、`-all` = hard fail（嚴格）
- 最多 10 次 DNS lookup（include 太多會超過限制）

### 8.3 DKIM 設定

DKIM（DomainKeys Identified Mail）用非對稱加密簽署每封信，收信方驗簽確認真偽。

**各服務的 DKIM 設定方式：**

```
# Resend — Dashboard 自動產生，加一條 CNAME
類型: CNAME
主機: resend._domainkey.mail.yoursite.com
值:   （Resend Dashboard 提供的值）

# SendGrid — Settings → Sender Authentication → Domain Authentication
# 會產生 3 條 CNAME 記錄，照貼即可

# Gmail / Google Workspace — Admin Console → Apps → Google Workspace → Gmail → Authenticate email
# 產生 TXT 記錄（google._domainkey）
```

### 8.4 DMARC 設定

DMARC 告訴收信伺服器：當 SPF 和 DKIM 驗證失敗時，該怎麼處理這封信。

**DNS 設定（TXT 記錄）：**

```
# 初始設定（只監控，不阻擋）
類型: TXT
主機: _dmarc
值:   v=DMARC1; p=none; rua=mailto:dmarc-reports@yoursite.com

# 建議的漸進策略
# 第一週：p=none（只收報告，不阻擋）
v=DMARC1; p=none; rua=mailto:dmarc@yoursite.com

# 確認正常後：p=quarantine（可疑信進垃圾郵件匣）
v=DMARC1; p=quarantine; pct=50; rua=mailto:dmarc@yoursite.com

# 完全確認後：p=reject（直接拒收）
v=DMARC1; p=reject; rua=mailto:dmarc@yoursite.com
```

**DMARC 參數說明：**

| 參數 | 說明 | 建議值 |
|------|------|-------|
| `p` | 政策（none/quarantine/reject） | 從 none 開始 |
| `pct` | 套用百分比 | 100（預設） |
| `rua` | 彙總報告收件地址 | 你的 Email |
| `ruf` | 失敗報告收件地址 | 可選 |
| `adkim` | DKIM 對齊模式（r=relaxed/s=strict） | r |
| `aspf` | SPF 對齊模式 | r |

### 8.5 驗證 DNS 設定

```bash
# 檢查 SPF
dig TXT yoursite.com +short
# 應該看到 "v=spf1 include:resend.dev ~all"

# 檢查 DKIM
dig TXT resend._domainkey.mail.yoursite.com +short

# 檢查 DMARC
dig TXT _dmarc.yoursite.com +short

# 線上工具
# https://mxtoolbox.com/SuperTool.aspx — 一站式檢查 SPF/DKIM/DMARC
# https://mail-tester.com — 寄一封信，10 分評分（目標 9+）
```

### 8.6 提升可送達性的 15 個技巧

1. **務必設定 SPF + DKIM + DMARC** — 三個都要有，缺一個都會扣分
2. **用自訂域名寄信** — 不要用 `@gmail.com`，用 `@yoursite.com`
3. **HTML + 純文字版都提供** — `text` 欄位不要空白
4. **From 名稱要有辨識度** — `品牌名 <hello@yoursite.com>` 而非 `noreply@`
5. **Subject 不要全大寫、不要太多驚嘆號** — `歡迎加入！` 可以，`!!!免費!!!馬上領取!!!` 不行
6. **圖文比例至少 60% 文字、40% 圖片** — 全圖片的信最容易被攔
7. **第一封信不要放過多連結** — 新域名剛開始寄，慢慢增加
8. **提供明確的退訂連結** — 讓人退訂比被標垃圾好
9. **控制發信頻率** — 不要一天寄 5 封，一週 1-2 封為佳
10. **新域名要暖機（Warm-up）** — 前幾天每天寄 50-100 封，逐步增加
11. **及時處理 Bounce 和 Complaint** — 退信 email 立即移出名單
12. **避免短網址（bit.ly）** — 垃圾信常用，會被加分
13. **寄件 IP 信譽** — 用知名服務（Resend/SendGrid）的共享 IP 通常沒問題
14. **List-Unsubscribe header** — 讓 Gmail 顯示「取消訂閱」按鈕
15. **定期清理名單** — 移除 6 個月沒開信的地址

---

## 9. 退訂 / 取消訂閱機制

> CAN-SPAM Act（美國）、GDPR（歐盟）、個資法（台灣）都要求商業信件必須提供退訂機制。不做會被罰。

### 9.1 法規要求速查

| 法規 | 適用範圍 | 退訂要求 | 罰則 |
|------|---------|---------|------|
| CAN-SPAM | 美國 | 10 天內完成退訂 | 每封 $46,517 USD |
| GDPR | 歐盟 | 隨時可退、一鍵退訂 | 營收 4% 或 2000 萬歐元 |
| 台灣個資法 | 台灣 | 當事人要求停止行銷 | 2-20 萬台幣 |
| CASL | 加拿大 | 10 天內完成退訂 | 每封 $10M CAD |

### 9.2 一鍵退訂實作

**資料庫設計（Supabase）：**

```sql
-- 退訂記錄表
CREATE TABLE email_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,                -- 退訂原因（可選）
  source TEXT,                -- 從哪封信退訂
  ip_address TEXT,
  UNIQUE(email)
);

-- Email 偏好設定表（進階版，讓用戶選擇要收哪些類型）
CREATE TABLE email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  marketing BOOLEAN DEFAULT TRUE,        -- 行銷信
  transactional BOOLEAN DEFAULT TRUE,    -- 交易通知
  product_updates BOOLEAN DEFAULT TRUE,  -- 產品更新
  monthly_report BOOLEAN DEFAULT TRUE,   -- 月報
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);
```

**退訂 Token 生成與驗證：**

```typescript
// src/lib/unsubscribe.ts
import crypto from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'your-secret-key';

// 產生退訂 token（不需要存資料庫，用 HMAC 驗證）
export function generateUnsubscribeToken(email: string): string {
  const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
  hmac.update(email);
  return hmac.digest('hex');
}

// 產生退訂 URL
export function getUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  return `${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// 驗證退訂 token
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
```

**退訂 API：**

```typescript
// server/src/routes/unsubscribe.ts
import { Router } from 'express';
import { verifyUnsubscribeToken } from '../lib/unsubscribe';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /unsubscribe — 退訂頁面（瀏覽器開啟）
router.get('/', async (req, res) => {
  const { email, token } = req.query;

  if (!email || !token || !verifyUnsubscribeToken(email as string, token as string)) {
    return res.status(400).send('無效的退訂連結');
  }

  // 顯示退訂確認頁面
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center;">
      <h1>取消訂閱</h1>
      <p>您確定要取消訂閱 <strong>${email}</strong> 嗎？</p>
      <form method="POST" action="/unsubscribe">
        <input type="hidden" name="email" value="${email}">
        <input type="hidden" name="token" value="${token}">
        <button type="submit"
          style="background:#dc2626;color:white;border:none;padding:12px 32px;font-size:16px;border-radius:6px;cursor:pointer;">
          確認取消訂閱
        </button>
      </form>
      <p style="margin-top:24px;color:#999;font-size:14px;">
        取消訂閱後，您將不再收到行銷信件。<br>交易通知（如訂單確認）不受影響。
      </p>
    </body>
    </html>
  `);
});

// POST /unsubscribe — 執行退訂
router.post('/', async (req, res) => {
  const { email, token } = req.body;

  if (!verifyUnsubscribeToken(email, token)) {
    return res.status(400).send('無效的退訂請求');
  }

  // 寫入退訂記錄
  await supabase.from('email_unsubscribes').upsert({
    email,
    unsubscribed_at: new Date().toISOString(),
    ip_address: req.ip,
  });

  res.send(`
    <html lang="zh-TW">
    <body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center;">
      <h1>已取消訂閱</h1>
      <p>${email} 已從我們的郵件名單中移除。</p>
      <p style="color:#999;font-size:14px;">如果這是誤操作，您隨時可以重新訂閱。</p>
    </body>
    </html>
  `);
});

export default router;
```

### 9.3 寄信前檢查退訂

```typescript
// 寄信前一律檢查退訂狀態
async function canSendMarketingEmail(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .eq('email', email)
    .single();

  return !data; // 如果有記錄 = 已退訂 = 不能寄
}

// 在寄信函式中加入檢查
async function sendMarketingEmail(to: string, subject: string, html: string) {
  // 行銷信一律檢查退訂
  if (!(await canSendMarketingEmail(to))) {
    console.log(`跳過已退訂用戶: ${to}`);
    return null;
  }

  return resend.emails.send({ from: '...', to: [to], subject, html });
}
```

### 9.4 List-Unsubscribe Header

Gmail、Outlook 等 Email Client 會自動偵測這個 header，在信件頂部顯示「取消訂閱」按鈕。

```typescript
// Resend 加 header
await resend.emails.send({
  from: '品牌 <hello@mail.yoursite.com>',
  to: [email],
  subject: '本月精選',
  html: emailHTML,
  headers: {
    'List-Unsubscribe': `<${getUnsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
});

// SendGrid 加 header
const msg = {
  to: email,
  from: 'hello@yoursite.com',
  subject: '本月精選',
  html: emailHTML,
  headers: {
    'List-Unsubscribe': `<${getUnsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
};

// Nodemailer 加 header
await transporter.sendMail({
  from: '"品牌" <hello@yoursite.com>',
  to: email,
  subject: '本月精選',
  html: emailHTML,
  list: {
    unsubscribe: {
      url: getUnsubscribeUrl(email),
      comment: '取消訂閱',
    },
  },
});
```

---

## 10. n8n 自動化 Email 流程

> 用 n8n 自動化 Email 寄送，適合定期報告、事件觸發通知、批次行銷信等場景。

### 10.1 Workflow 1 — 客戶表單自動回覆

```
[Webhook] → [Code: 驗證 + 清理] → [Send Email: 通知站長] → [Send Email: 自動回覆客戶]
                                                          → [Google Sheets: 記錄]
```

**n8n Workflow JSON：**

```json
{
  "name": "客戶表單自動回覆",
  "nodes": [
    {
      "id": "webhook-1",
      "name": "接收表單",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "path": "contact-form",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      }
    },
    {
      "id": "code-1",
      "name": "驗證與清理",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [470, 300],
      "parameters": {
        "jsCode": "const { name, email, phone, message } = $input.first().json.body;\n\nif (!name || !email || !message) {\n  throw new Error('缺少必填欄位');\n}\n\n// 基本 email 格式驗證\nif (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {\n  throw new Error('Email 格式不正確');\n}\n\nreturn [{\n  json: {\n    name: name.trim(),\n    email: email.trim().toLowerCase(),\n    phone: phone || '未提供',\n    message: message.trim(),\n    receivedAt: new Date().toISOString()\n  }\n}];"
      }
    },
    {
      "id": "email-owner",
      "name": "通知站長",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2.1,
      "position": [690, 200],
      "parameters": {
        "fromEmail": "notifications@yoursite.com",
        "toEmail": "owner@yoursite.com",
        "subject": "=[網站表單] {{ $json.name }} 來信",
        "emailType": "html",
        "html": "=<h2>新的客戶詢問</h2><p><b>姓名：</b>{{ $json.name }}</p><p><b>Email：</b>{{ $json.email }}</p><p><b>電話：</b>{{ $json.phone }}</p><p><b>訊息：</b></p><p>{{ $json.message }}</p><hr><p style='color:#999'>收到時間：{{ $json.receivedAt }}</p>"
      }
    },
    {
      "id": "email-customer",
      "name": "自動回覆客戶",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2.1,
      "position": [690, 400],
      "parameters": {
        "fromEmail": "hello@yoursite.com",
        "toEmail": "={{ $json.email }}",
        "subject": "感謝您的來信，我們已收到！",
        "emailType": "html",
        "html": "=<h2>{{ $json.name }} 您好，</h2><p>感謝您透過網站與我們聯繫。</p><p>我們已收到您的訊息，將在 <b>1 個工作天內</b> 回覆您。</p><br><p>你的品牌團隊</p>"
      }
    }
  ],
  "connections": {
    "接收表單": {
      "main": [[{ "node": "驗證與清理", "type": "main", "index": 0 }]]
    },
    "驗證與清理": {
      "main": [
        [
          { "node": "通知站長", "type": "main", "index": 0 },
          { "node": "自動回覆客戶", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

### 10.2 Workflow 2 — 每週/月定期報告

```
[Schedule Trigger] → [HTTP Request: 取數據] → [Code: 整理報告] → [Send Email: 寄給客戶]
```

**n8n 節點設定：**

```json
{
  "name": "每月寄送客戶報告",
  "nodes": [
    {
      "id": "schedule-1",
      "name": "每月 1 號早上 9 點",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [250, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 9 1 * *"
            }
          ]
        }
      }
    },
    {
      "id": "http-ga",
      "name": "取 GA 數據",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [470, 300],
      "parameters": {
        "method": "POST",
        "url": "https://analyticsdata.googleapis.com/v1beta/properties/PROPERTY_ID:runReport",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "googleAnalyticsOAuth2",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "dateRanges",
              "value": "=[{\"startDate\": \"30daysAgo\", \"endDate\": \"yesterday\"}]"
            },
            {
              "name": "metrics",
              "value": "=[{\"name\": \"activeUsers\"}, {\"name\": \"screenPageViews\"}, {\"name\": \"conversions\"}]"
            }
          ]
        }
      }
    },
    {
      "id": "code-report",
      "name": "整理報告 HTML",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [690, 300],
      "parameters": {
        "jsCode": "const data = $input.first().json;\n\n// 從 GA 回應取出數值\nconst visitors = data.rows?.[0]?.metricValues?.[0]?.value || '0';\nconst pageViews = data.rows?.[0]?.metricValues?.[1]?.value || '0';\nconst conversions = data.rows?.[0]?.metricValues?.[2]?.value || '0';\n\nconst now = new Date();\nconst lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);\nconst period = `${lastMonth.getFullYear()} 年 ${lastMonth.getMonth() + 1} 月`;\n\nreturn [{\n  json: {\n    period,\n    visitors: parseInt(visitors).toLocaleString(),\n    pageViews: parseInt(pageViews).toLocaleString(),\n    conversions,\n    html: `<h1>${period} 網站成效報告</h1><table style='width:100%;border-collapse:collapse'><tr><td style='padding:20px;background:#eff6ff;text-align:center;border-radius:8px'><div style='font-size:28px;font-weight:bold;color:#1d4ed8'>${parseInt(visitors).toLocaleString()}</div><div style='font-size:12px;color:#6b7280'>訪客數</div></td><td style='padding:20px;background:#f0fdf4;text-align:center;border-radius:8px'><div style='font-size:28px;font-weight:bold;color:#16a34a'>${parseInt(pageViews).toLocaleString()}</div><div style='font-size:12px;color:#6b7280'>瀏覽量</div></td><td style='padding:20px;background:#fefce8;text-align:center;border-radius:8px'><div style='font-size:28px;font-weight:bold;color:#ca8a04'>${conversions}</div><div style='font-size:12px;color:#6b7280'>轉換</div></td></tr></table>`\n  }\n}];"
      }
    },
    {
      "id": "send-report",
      "name": "寄報告",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2.1,
      "position": [910, 300],
      "parameters": {
        "fromEmail": "report@yoursite.com",
        "toEmail": "client@example.com",
        "subject": "={{ $json.period }} 網站成效報告",
        "emailType": "html",
        "html": "={{ $json.html }}"
      }
    }
  ],
  "connections": {
    "每月 1 號早上 9 點": {
      "main": [[{ "node": "取 GA 數據", "type": "main", "index": 0 }]]
    },
    "取 GA 數據": {
      "main": [[{ "node": "整理報告 HTML", "type": "main", "index": 0 }]]
    },
    "整理報告 HTML": {
      "main": [[{ "node": "寄報告", "type": "main", "index": 0 }]]
    }
  }
}
```

### 10.3 Workflow 3 — 新用戶歡迎信序列（Drip Campaign）

```
[Webhook: 新用戶註冊]
  → [Send Email: 歡迎信（立即）]
  → [Wait: 3 天]
  → [Send Email: 功能介紹信]
  → [Wait: 7 天]
  → [Send Email: 進階技巧信]
```

**n8n 節點設定：**

```json
{
  "name": "新用戶歡迎信序列",
  "nodes": [
    {
      "id": "webhook-reg",
      "name": "新用戶註冊",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "path": "new-user",
        "httpMethod": "POST"
      }
    },
    {
      "id": "email-welcome",
      "name": "歡迎信（立即）",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2.1,
      "position": [470, 300],
      "parameters": {
        "fromEmail": "hello@yoursite.com",
        "toEmail": "={{ $json.body.email }}",
        "subject": "=歡迎加入！{{ $json.body.name }}",
        "emailType": "html",
        "html": "=<h1>歡迎加入！</h1><p>{{ $json.body.name }} 您好，感謝您的註冊。</p>"
      }
    },
    {
      "id": "wait-3d",
      "name": "等待 3 天",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1.1,
      "position": [690, 300],
      "parameters": {
        "amount": 3,
        "unit": "days"
      }
    },
    {
      "id": "check-unsub-1",
      "name": "檢查是否退訂",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [910, 300],
      "parameters": {
        "method": "GET",
        "url": "=https://yoursite.com/api/check-unsubscribe?email={{ $json.body.email }}"
      }
    },
    {
      "id": "if-unsub",
      "name": "已退訂？",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [1130, 300],
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict" },
          "conditions": [
            {
              "leftValue": "={{ $json.unsubscribed }}",
              "rightValue": false,
              "operator": { "type": "boolean", "operation": "equals" }
            }
          ]
        }
      }
    },
    {
      "id": "email-features",
      "name": "功能介紹信",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2.1,
      "position": [1350, 200],
      "parameters": {
        "fromEmail": "hello@yoursite.com",
        "toEmail": "={{ $json.body.email }}",
        "subject": "3 個你可能還不知道的功能",
        "emailType": "html",
        "html": "<h1>讓您更上手的 3 個功能</h1><p>...</p>"
      }
    }
  ],
  "connections": {
    "新用戶註冊": {
      "main": [[{ "node": "歡迎信（立即）", "type": "main", "index": 0 }]]
    },
    "歡迎信（立即）": {
      "main": [[{ "node": "等待 3 天", "type": "main", "index": 0 }]]
    },
    "等待 3 天": {
      "main": [[{ "node": "檢查是否退訂", "type": "main", "index": 0 }]]
    },
    "檢查是否退訂": {
      "main": [[{ "node": "已退訂？", "type": "main", "index": 0 }]]
    },
    "已退訂？": {
      "main": [
        [{ "node": "功能介紹信", "type": "main", "index": 0 }],
        []
      ]
    }
  }
}
```

### 10.4 Workflow 4 — 用 Resend API 寄信（n8n HTTP Request）

n8n 沒有 Resend 原生節點，但用 HTTP Request 節點就能呼叫 Resend API：

```json
{
  "id": "resend-send",
  "name": "Resend 寄信",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "method": "POST",
    "url": "https://api.resend.com/emails",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "Bearer {{ $env.RESEND_API_KEY }}"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"from\": \"品牌 <hello@mail.yoursite.com>\",\n  \"to\": [\"{{ $json.email }}\"],\n  \"subject\": \"{{ $json.subject }}\",\n  \"html\": \"{{ $json.html }}\"\n}"
  }
}
```

### 10.5 n8n Email 節點（SMTP）Credential 設定

```
n8n Dashboard → Credentials → Add Credential → SMTP

Host:     smtp.gmail.com（或你的 SMTP 供應商）
Port:     587（TLS）或 465（SSL）
User:     your@gmail.com
Password: 16 位應用程式密碼
Secure:   勾選（465 用 SSL）或不勾（587 用 STARTTLS）
```

---

## 11. 常見問題與排查

### 11.1 Gmail SMTP 相關

**Q: 寄信出現 `Invalid login: 534-5.7.9 Application-specific password required`**

A: 你用了 Gmail 登入密碼而非應用程式密碼。
1. 確認已開啟兩步驟驗證
2. 前往 https://myaccount.google.com/apppasswords 產生 16 位密碼
3. 用那個 16 位密碼取代登入密碼

**Q: 寄信出現 `Daily user sending quota exceeded`**

A: 超過 Gmail 每日 500 封限制。
- 等 24 小時後自動恢復
- 長期方案：改用 Resend/SendGrid（免費額度更高）

**Q: Gmail 寄出的信 From 顯示的是 Gmail 地址而非自訂域名**

A: Gmail SMTP 強制 From 為帳號 Email，無法改。要自訂域名需改用 Resend/SendGrid/SES。

### 11.2 被標為垃圾郵件

**Q: 信寄出了但進客戶的垃圾郵件匣**

A: 逐步排查：
1. 檢查 SPF/DKIM/DMARC 是否都設定正確
   ```bash
   dig TXT yoursite.com +short
   dig TXT _dmarc.yoursite.com +short
   ```
2. 到 https://mail-tester.com 寄一封測試信，看評分（目標 9+）
3. 檢查 Email 內容：
   - 是否全圖片無文字？
   - Subject 有沒有太多驚嘆號或全大寫？
   - 有沒有短網址（bit.ly）？
   - 有沒有退訂連結？
4. 檢查域名信譽：https://www.google.com/postmaster/ （Google Postmaster Tools）
5. 新域名需要暖機，前幾天每天少量發送

**Q: 信一直進 Gmail「促銷」分頁而非「主要」**

A: Gmail 的分類是機器學習，無法 100% 控制，但可以優化：
- 減少圖片比例
- 不要用太多連結
- 用純文字風格的設計
- 要求用戶把你加到通訊錄
- 內容像個人 email 而非廣告（用名字稱呼、不要太花俏）

### 11.3 圖片不顯示

**Q: Email 中的圖片在某些 Client 不顯示**

A: 常見原因與解法：

| 原因 | 解法 |
|------|------|
| 用了相對路徑 | 改成絕對 URL：`https://yoursite.com/images/logo.png` |
| 圖片在 localhost | 圖片必須在公開可訪問的 URL |
| 圖片太大（>1MB） | 壓縮到 200KB 以下，寬度不超過 600px |
| Gmail 預設不載入圖片 | 加 `alt` 文字，讓用戶知道這裡有圖 |
| Outlook 擋圖 | 設定 `width` 和 `height` 屬性，避免版面跑掉 |
| CID 嵌入方式不相容 | 改用 URL 方式載入圖片 |

**最佳做法：**

```html
<!-- 正確的圖片寫法 -->
<img
  src="https://yoursite.com/images/hero.jpg"
  alt="最新產品介紹"
  width="600"
  height="300"
  style="display:block;border:0;outline:none;max-width:100%;height:auto;"
>

<!-- 背景圖片（Outlook 不支援 CSS background-image，需用 VML）-->
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">
<v:fill type="tile" src="https://yoursite.com/images/bg.jpg" color="#333333" />
<v:textbox inset="0,0,0,0">
<![endif]-->
<div style="background-image:url('https://yoursite.com/images/bg.jpg');background-color:#333333;padding:40px;">
  <p style="color:#ffffff;">內容文字</p>
</div>
<!--[if mso]>
</v:textbox>
</v:rect>
<![endif]-->
```

### 11.4 其他常見問題

**Q: Resend 出現 `Missing required field: from`**

A: `from` 欄位的域名必須已在 Resend Dashboard 驗證。免費方案可用 `onboarding@resend.dev` 測試。

**Q: SendGrid 出現 `403 Forbidden`**

A: API Key 權限不夠，到 Dashboard 確認 Key 有 `Mail Send` 權限。或帳號尚未完成 Sender Identity 驗證。

**Q: Email 中的中文變成亂碼**

A: 確保 HTML 有 `<meta charset="UTF-8">`，且 `Content-Type` header 正確：
```typescript
// Nodemailer 設定
await transporter.sendMail({
  // ...
  encoding: 'utf-8',
  textEncoding: 'base64',  // 中文用 base64 編碼更安全
});
```

**Q: 附件太大寄不出去**

A: 各服務限制不同：
| 服務 | 附件大小上限 |
|------|------------|
| Gmail SMTP | 25 MB |
| Resend | 40 MB |
| SendGrid | 30 MB |
| Mailgun | 25 MB |
| SES | 10 MB（API）/ 40 MB（SMTP）|

超過限制的解法：把檔案上傳到雲端（S3/Google Drive），信裡放下載連結。

**Q: 短時間寄太多信被限速**

A: 各服務都有每秒/每分鐘限制：
| 服務 | 速率限制 |
|------|---------|
| Gmail SMTP | ~20 封/秒 |
| Resend Free | 1 封/秒 |
| Resend Pro | 50 封/秒 |
| SendGrid Free | ~100 封/天（不是秒） |
| SES | 預設 1 封/秒，可申請提高 |

**批次寄信建議加 delay：**

```typescript
// 批次寄信加延遲，避免被限速
async function sendBatch(emails: Array<{ to: string; subject: string; html: string }>) {
  for (let i = 0; i < emails.length; i++) {
    try {
      await sendMail(emails[i]);
      console.log(`[${i + 1}/${emails.length}] 寄出: ${emails[i].to}`);

      // 每封間隔 1 秒（免費方案）
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`寄信失敗: ${emails[i].to}`, err);
      // 被限速就等久一點
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

---

## 接案報價參考

| 功能項目 | 工時 | 建議報價（NTD） |
|---------|------|----------------|
| 基本 SMTP 寄信（表單通知） | 2-4 hr | 3,000 - 5,000 |
| Resend/SendGrid 串接 + 1 種模板 | 4-8 hr | 8,000 - 15,000 |
| 完整 Email 系統（3-5 種模板 + 退訂） | 2-3 天 | 20,000 - 35,000 |
| React Email 客製模板（每個） | 2-4 hr | 5,000 - 8,000 |
| 行銷信自動化（n8n + 排程） | 1-2 天 | 15,000 - 25,000 |
| Drip Campaign（歡迎序列 3-5 封） | 2-3 天 | 20,000 - 35,000 |
| SPF/DKIM/DMARC 設定 | 1-2 hr | 3,000 - 5,000 |
| Email 可送達性優化（含暖機） | 3-5 天 | 30,000 - 50,000 |

---

## .env 範例

```bash
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx

# Gmail SMTP（Nodemailer）
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Mailtrap（開發環境）
MAILTRAP_USER=xxxxxxxxxxxx
MAILTRAP_PASS=xxxxxxxxxxxx

# 退訂機制
UNSUBSCRIBE_SECRET=your-hmac-secret-key

# 應用程式
APP_URL=https://yoursite.com
```

---

> 寫到這裡就可以直接開工了。選好服務、設好 DNS、複製模板、接上 n8n 自動化，Email 系統就搞定。
