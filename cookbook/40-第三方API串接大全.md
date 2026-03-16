# 40 — 第三方 API 串接大全

> 給台灣接案團隊用的完整第三方 API 串接手冊。每個 API 都寫到可以直接照做。
> 最後更新：2026-03-05

---

## 目錄

1. [Google Maps API](#1-google-maps-api)
2. [Google reCAPTCHA v3](#2-google-recaptcha-v3)
3. [社群登入](#3-社群登入)
4. [社群分享按鈕](#4-社群分享按鈕)
5. [金流 API 總覽](#5-金流-api-總覽)
6. [物流 API](#6-物流-api)
7. [簡訊 API](#7-簡訊-api)
8. [天氣 API](#8-天氣-api)
9. [匯率 API](#9-匯率-api)
10. [圖片 CDN API](#10-圖片-cdn-api)
11. [AI API](#11-ai-api)
12. [搜尋引擎 API](#12-搜尋引擎-api)
13. [API 串接最佳實踐](#13-api-串接最佳實踐)
14. [n8n 串接外部 API](#14-n8n-串接外部-api)

---

## 1. Google Maps API

### 申請流程

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（或選既有專案）
3. 啟用以下 API：
   - **Maps JavaScript API** — 前端地圖嵌入
   - **Geocoding API** — 地址轉座標
   - **Directions API** — 路線規劃
   - **Places API** — 地點搜尋/自動完成
4. 建立 API Key：API 與服務 → 憑證 → 建立憑證 → API 金鑰
5. **限制 API Key**（重要！）：
   - 前端 Key：限制 HTTP 參照網址（`https://你的網域/*`）
   - 後端 Key：限制 IP 位址（伺服器 IP）

### 定價

| API | 免費額度/月 | 超過後價格 |
|-----|-----------|-----------|
| Maps JavaScript | 28,000 次載入 | $7 / 1,000 次 |
| Geocoding | 40,000 次 | $5 / 1,000 次 |
| Directions | 40,000 次 | $5 / 1,000 次 |
| Places | 依功能不同 | $2.83-17 / 1,000 次 |

> Google 每月給 $200 免費額度，小型網站通常夠用。

### 前端嵌入地圖

**方法一：iframe 嵌入（最簡單，不需 API Key）**

```html
<iframe
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3614.7!2d121.5654!3d25.033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z5Y-w5YyX101!5e0!3m2!1szh-TW!2stw!4v1234567890"
  width="600"
  height="450"
  style="border:0;"
  allowfullscreen=""
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade">
</iframe>
```

**方法二：JavaScript API（互動式地圖）**

```html
<!-- index.html -->
<div id="map" style="height: 400px; width: 100%;"></div>

<script>
function initMap() {
  // 台北 101 座標
  const taipei101 = { lat: 25.0339, lng: 121.5645 };

  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: 15,
    center: taipei101,
    mapId: 'YOUR_MAP_ID', // 選用，自訂地圖樣式
  });

  // 加標記
  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: taipei101,
    title: '台北 101',
  });

  // 資訊視窗
  const infoWindow = new google.maps.InfoWindow({
    content: '<h3>台北 101</h3><p>地標建築</p>',
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });
}
</script>

<script async
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap&v=weekly&libraries=marker">
</script>
```

**React 版本（@vis.gl/react-google-maps）**

```tsx
// components/GoogleMap.tsx
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { useState } from 'react';

interface MapProps {
  lat: number;
  lng: number;
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; title: string }>;
}

export function GoogleMapView({ lat, lng, zoom = 15, markers = [] }: MapProps) {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <Map
        style={{ width: '100%', height: '400px' }}
        defaultCenter={{ lat, lng }}
        defaultZoom={zoom}
        mapId="YOUR_MAP_ID"
      >
        {markers.map((m, i) => (
          <AdvancedMarker
            key={i}
            position={{ lat: m.lat, lng: m.lng }}
            onClick={() => setSelectedMarker(i)}
          />
        ))}

        {selectedMarker !== null && (
          <InfoWindow
            position={markers[selectedMarker]}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div>{markers[selectedMarker].title}</div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
```

### 後端 Geocoding（地址轉座標）

```typescript
// services/geocoding.ts
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY!;

interface GeoResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * 地址轉座標
 */
export async function geocode(address: string): Promise<GeoResult | null> {
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'zh-TW',
        region: 'tw',
      },
    });

    if (res.data.status !== 'OK' || !res.data.results.length) {
      console.error('Geocoding 失敗:', res.data.status);
      return null;
    }

    const result = res.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.error('Geocoding API 錯誤:', err);
    return null;
  }
}

/**
 * 座標轉地址（反向 Geocoding）
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'zh-TW',
      },
    });

    if (res.data.status !== 'OK') return null;
    return res.data.results[0]?.formatted_address || null;
  } catch {
    return null;
  }
}

/**
 * 路線規劃
 */
export async function getDirections(
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'transit' = 'driving'
) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin,
      destination,
      mode,
      key: GOOGLE_MAPS_API_KEY,
      language: 'zh-TW',
      alternatives: true,
    },
  });

  if (res.data.status !== 'OK') return null;

  return res.data.routes.map((route: any) => ({
    summary: route.summary,
    distance: route.legs[0].distance.text,
    duration: route.legs[0].duration.text,
    steps: route.legs[0].steps.map((s: any) => ({
      instruction: s.html_instructions.replace(/<[^>]*>/g, ''),
      distance: s.distance.text,
      duration: s.duration.text,
    })),
  }));
}
```

### 常見問題

| 問題 | 解法 |
|------|------|
| API Key 被盜用帳單暴增 | 設定 Key 限制（HTTP 參照/IP）+ 設定每日配額上限 |
| 地圖顯示「僅供開發」浮水印 | 確認帳單帳戶已綁信用卡，即使在免費額度內也需要 |
| Geocoding 結果不準 | 地址加上「台灣」前綴，設定 `region=tw` |
| 中文地址找不到 | 試試去掉「鄰」或樓層資訊，只留到門牌號 |

---

## 2. Google reCAPTCHA v3

### 申請流程

1. 前往 [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. 點「+」建立新網站
3. 選擇 **reCAPTCHA v3**（無需用戶互動，背景評分）
4. 填入網域名稱
5. 取得 **Site Key**（前端用）和 **Secret Key**（後端用）

### 定價

完全免費，每月 100 萬次評估。超過需聯繫 Google 申請 Enterprise 版。

### 前端整合

```html
<!-- 載入 reCAPTCHA -->
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>

<form id="contactForm">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">送出</button>
</form>

<script>
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 取得 reCAPTCHA token
  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit_contact' });

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  data.recaptchaToken = token;

  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (result.success) {
    alert('送出成功！');
  } else {
    alert('驗證失敗，請重試');
  }
});
</script>
```

**React 版本**

```tsx
// hooks/useRecaptcha.ts
import { useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export function useRecaptcha() {
  const getToken = useCallback(async (action: string): Promise<string> => {
    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        const token = await window.grecaptcha.execute(SITE_KEY, { action });
        resolve(token);
      });
    });
  }, []);

  return { getToken };
}

// 使用方式
// const { getToken } = useRecaptcha();
// const token = await getToken('submit_contact');
```

### 後端驗證（Node.js）

```typescript
// middleware/recaptcha.ts
import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;
const SCORE_THRESHOLD = 0.5; // 0.0（機器人）~ 1.0（真人），建議 0.5

export async function verifyRecaptcha(req: Request, res: Response, next: NextFunction) {
  const token = req.body.recaptchaToken;

  if (!token) {
    return res.status(400).json({ success: false, error: '缺少 reCAPTCHA token' });
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET,
          response: token,
          remoteip: req.ip,
        },
      }
    );

    const { success, score, action } = response.data;

    if (!success || score < SCORE_THRESHOLD) {
      console.warn(`reCAPTCHA 驗證失敗: score=${score}, action=${action}`);
      return res.status(403).json({
        success: false,
        error: '驗證未通過，疑似機器人',
      });
    }

    // 驗證通過，附加資訊到 request
    (req as any).recaptchaScore = score;
    next();
  } catch (err) {
    console.error('reCAPTCHA API 錯誤:', err);
    // API 失敗時放行（避免影響用戶），但記錄 log
    next();
  }
}

// 路由使用
// app.post('/api/contact', verifyRecaptcha, contactHandler);
```

### 常見問題

| 問題 | 解法 |
|------|------|
| localhost 測試報 invalid-input-response | 把 `localhost` 加入 reCAPTCHA 網域設定 |
| 分數一直很低 | 確認 action 名稱一致、檢查是否 VPN/隱私模式干擾 |
| v3 隱形標誌擋到 UI | CSS: `.grecaptcha-badge { visibility: hidden; }` 但需保留文字說明 |
| 中國用戶無法使用 | 改用 `recaptcha.net` 域名代替 `google.com` |

---

## 3. 社群登入

### 各平台比較

| 平台 | 台灣使用率 | 難度 | 免費 | 適合場景 |
|------|-----------|------|------|---------|
| LINE Login | 極高 | 中 | 是 | B2C、店家、餐飲 |
| Google OAuth | 高 | 低 | 是 | 通用、SaaS |
| Facebook Login | 中 | 中 | 是 | 社群、電商 |
| Apple Sign In | 低 | 高 | 是 | iOS App 必備 |

### 3.1 Google OAuth 2.0

**申請流程**

1. Google Cloud Console → API 與服務 → 憑證
2. 建立 OAuth 2.0 用戶端 ID
3. 應用程式類型：網頁應用程式
4. 授權重新導向 URI：`https://你的網域/auth/google/callback`
5. 取得 Client ID + Client Secret
6. 設定 OAuth 同意畫面（Consent Screen）

```typescript
// routes/auth-google.ts
import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

// 步驟 1：導向 Google 授權頁
router.get('/auth/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// 步驟 2：處理回調
router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('缺少授權碼');

  try {
    // 用 code 換 token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { id_token, access_token } = tokenRes.data;

    // 取得使用者資訊
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id, email, name, picture } = userRes.data;

    // 建立或更新使用者（你的資料庫邏輯）
    // const user = await upsertUser({ provider: 'google', providerId: id, email, name, avatar: picture });

    // 簽發 JWT
    const token = jwt.sign({ userId: id, email, name }, JWT_SECRET, { expiresIn: '7d' });

    // 導回前端，帶上 token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('Google OAuth 錯誤:', err);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

export default router;
```

### 3.2 Facebook Login

**申請流程**

1. [Facebook Developers](https://developers.facebook.com/) → 我的應用程式 → 建立應用程式
2. 選擇「消費者」類型
3. 新增產品 → Facebook Login → 設定
4. 有效的 OAuth 重新導向 URI：`https://你的網域/auth/facebook/callback`
5. 取得 App ID + App Secret

```typescript
// routes/auth-facebook.ts
import express from 'express';
import axios from 'axios';

const router = express.Router();

const FB_APP_ID = process.env.FB_APP_ID!;
const FB_APP_SECRET = process.env.FB_APP_SECRET!;
const FB_REDIRECT_URI = process.env.FB_REDIRECT_URI!;

router.get('/auth/facebook', (req, res) => {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: FB_REDIRECT_URI,
    scope: 'email,public_profile',
    response_type: 'code',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

router.get('/auth/facebook/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('缺少授權碼');

  try {
    // 換 access_token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: FB_REDIRECT_URI,
        code,
      },
    });

    const { access_token } = tokenRes.data;

    // 取使用者資訊
    const userRes = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token,
      },
    });

    const { id, name, email, picture } = userRes.data;
    // 建立/更新使用者 + 簽發 JWT...（同 Google 流程）

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?provider=facebook`);
  } catch (err) {
    console.error('Facebook OAuth 錯誤:', err);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

export default router;
```

### 3.3 LINE Login

**申請流程**

1. [LINE Developers Console](https://developers.line.biz/) → 建立 Provider
2. 建立 **LINE Login** Channel（不是 Messaging API）
3. 設定 Callback URL：`https://你的網域/auth/line/callback`
4. 取得 Channel ID + Channel Secret
5. 記得在「LINE Login 設定」中開啟 Email 權限（需申請）

```typescript
// routes/auth-line.ts
import express from 'express';
import axios from 'axios';

const router = express.Router();

const LINE_CLIENT_ID = process.env.LINE_LOGIN_CHANNEL_ID!;
const LINE_CLIENT_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET!;
const LINE_REDIRECT_URI = process.env.LINE_REDIRECT_URI!;

router.get('/auth/line', (req, res) => {
  const state = Math.random().toString(36).substring(7); // CSRF 防護
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CLIENT_ID,
    redirect_uri: LINE_REDIRECT_URI,
    state,
    scope: 'profile openid email',
  });
  // 實務上應把 state 存到 session
  res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`);
});

router.get('/auth/line/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('缺少授權碼');

  try {
    // 換 token
    const tokenRes = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CLIENT_ID,
        client_secret: LINE_CLIENT_SECRET,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, id_token } = tokenRes.data;

    // 取使用者資訊
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { userId, displayName, pictureUrl } = profileRes.data;

    // 如果需要 email，從 id_token 解碼（JWT）
    // const decoded = jwt.decode(id_token); // decoded.email

    // 建立/更新使用者 + 簽發 JWT...

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?provider=line`);
  } catch (err) {
    console.error('LINE Login 錯誤:', err);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

export default router;
```

### 3.4 Apple Sign In

**申請流程**

1. Apple Developer 帳號（年費 $99 USD）
2. Certificates, Identifiers & Profiles → Identifiers → App IDs → 啟用 Sign In with Apple
3. 建立 Services ID → Configure → 設定 Callback URL
4. 建立 Key → 下載 `.p8` 檔案
5. 需要的資訊：Team ID、Key ID、Client ID（Services ID）、`.p8` 私鑰

```typescript
// routes/auth-apple.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import axios from 'axios';

const router = express.Router();

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID!;  // Services ID
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID!;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID!;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI!;
const APPLE_PRIVATE_KEY = fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH!, 'utf8');

// Apple 要求用 JWT 生成 client_secret
function generateAppleClientSecret(): string {
  return jwt.sign({}, APPLE_PRIVATE_KEY, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: APPLE_TEAM_ID,
    subject: APPLE_CLIENT_ID,
    keyid: APPLE_KEY_ID,
  });
}

router.get('/auth/apple', (req, res) => {
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    response_type: 'code id_token',
    scope: 'name email',
    response_mode: 'form_post',
  });
  res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
});

// Apple 用 POST form_post 回傳
router.post('/auth/apple/callback', async (req, res) => {
  const { code, id_token, user } = req.body;

  try {
    const clientSecret = generateAppleClientSecret();

    const tokenRes = await axios.post(
      'https://appleid.apple.com/auth/token',
      new URLSearchParams({
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: APPLE_REDIRECT_URI,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // 解碼 id_token 拿 sub（Apple User ID）、email
    const decoded = jwt.decode(tokenRes.data.id_token) as any;
    const { sub, email } = decoded;

    // Apple 只在第一次登入時給 name（存在 user JSON 裡）
    const userName = user ? JSON.parse(user) : null;

    // 建立/更新使用者...
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?provider=apple`);
  } catch (err) {
    console.error('Apple Sign In 錯誤:', err);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

export default router;
```

### 統一 Passport.js 方案

如果專案需要同時支援多個社群登入，建議用 Passport.js：

```bash
npm install passport passport-google-oauth20 passport-facebook passport-line-auth
```

```typescript
// config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';

// Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  // 建立/更新使用者
  // const user = await upsertUser('google', profile);
  done(null, profile);
}));

// Facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FB_APP_ID!,
  clientSecret: process.env.FB_APP_SECRET!,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
}, async (accessToken, refreshToken, profile, done) => {
  done(null, profile);
}));
```

### 社群登入常見問題

| 問題 | 解法 |
|------|------|
| Facebook 審查過不了 | 確認隱私權政策頁面、資料刪除回調 URL 都設好 |
| LINE 拿不到 email | 需在 LINE Developers 提交 email 權限申請（審核約 1-3 天） |
| Apple 只給一次名字 | 第一次登入時立即存名字，之後 Apple 不會再給 |
| OAuth redirect_uri 不符 | 確認 URL 完全一致（含結尾斜線、http/https） |

---

## 4. 社群分享按鈕

### 純連結方式（最輕量，不需 SDK）

```typescript
// utils/share.ts

/** 產生各平台分享連結 */
export function getShareUrls(url: string, title: string, description?: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || '');

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDesc}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
  };
}
```

### React 分享按鈕組件

```tsx
// components/ShareButtons.tsx
import { getShareUrls } from '../utils/share';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  platforms?: Array<'facebook' | 'line' | 'twitter' | 'linkedin'>;
}

export function ShareButtons({
  url,
  title,
  description,
  platforms = ['facebook', 'line', 'twitter', 'linkedin'],
}: ShareButtonsProps) {
  const shareUrls = getShareUrls(url, title, description);

  const labels: Record<string, string> = {
    facebook: 'Facebook',
    line: 'LINE',
    twitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
  };

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {platforms.map((p) => (
        <button
          key={p}
          onClick={() => openShare(shareUrls[p])}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: {
              facebook: '#1877F2',
              line: '#06C755',
              twitter: '#1DA1F2',
              linkedin: '#0A66C2',
            }[p],
            color: 'white',
          }}
        >
          {labels[p]}
        </button>
      ))}
    </div>
  );
}
```

### Open Graph 標籤（分享預覽必備）

```html
<!-- 在 <head> 中加入 -->
<meta property="og:type" content="website" />
<meta property="og:title" content="頁面標題" />
<meta property="og:description" content="頁面描述" />
<meta property="og:image" content="https://你的網域/og-image.jpg" />
<meta property="og:url" content="https://你的網域/page" />
<meta property="og:site_name" content="網站名稱" />
<meta property="og:locale" content="zh_TW" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="頁面標題" />
<meta name="twitter:description" content="頁面描述" />
<meta name="twitter:image" content="https://你的網域/og-image.jpg" />

<!-- LINE 特別支援 -->
<!-- LINE 會讀 og:image，建議圖片 1200x630px -->
```

### 常見問題

| 問題 | 解法 |
|------|------|
| Facebook 分享預覽不更新 | 用 [Sharing Debugger](https://developers.facebook.com/tools/debug/) 刷新快取 |
| LINE 分享沒縮圖 | 確認 `og:image` 是 HTTPS 絕對路徑，圖片 > 200x200px |
| 分享連結被截斷 | 所有參數都要 `encodeURIComponent` |

---

## 5. 金流 API 總覽

> 完整金流串接代碼請參考 [cookbook/30-會員系統與金流串接.md](./30-會員系統與金流串接.md)

### 台灣四大金流比較

| 金流 | 適合場景 | 手續費 | 撥款週期 | 串接難度 | 支援付款方式 |
|------|---------|--------|---------|---------|-------------|
| **綠界 ECPay** | 中小型電商、個人賣家 | 信用卡 2.75% | T+7~15 天 | 中 | 信用卡/ATM/超商代碼/超商條碼/WebATM |
| **藍新 NewebPay** | 中大型電商、企業 | 信用卡 2.6% | T+7 天 | 中 | 信用卡/ATM/超商/LINE Pay/Apple Pay/Google Pay |
| **LINE Pay** | LINE 生態圈、O2O | 3.0% | T+3~7 天 | 中高 | LINE Pay 餘額/信用卡 |
| **Stripe** | 跨國電商、SaaS | 3.4% + $0.30 | T+2~7 天 | 低 | 信用卡/Apple Pay/Google Pay |

### 快速選擇指南

```
客戶需要金流？
  │
  ├─ 只賣台灣？
  │   ├─ 小型/個人 → 綠界 ECPay
  │   ├─ 中大型/企業 → 藍新 NewebPay
  │   └─ LINE 為主 → LINE Pay + 綠界/藍新
  │
  └─ 有海外客戶？ → Stripe（+ 綠界/藍新做台灣在地付款）
```

### 申請要點

| 金流 | 需要文件 | 審核時間 |
|------|---------|---------|
| 綠界 | 身分證/公司登記 + 銀行帳號 | 3-7 個工作天 |
| 藍新 | 公司登記 + 負責人身分證 + 銀行帳號 | 5-10 個工作天 |
| LINE Pay | 公司登記 + LINE OA | 7-14 個工作天 |
| Stripe | Email 即可開始，收款需身分驗證 | 即時（身分驗證 1-3 天） |

> 金流串接的完整 Node.js 代碼、交易流程圖、Webhook 處理都在 cookbook/30，這裡不重複。

---

## 6. 物流 API

### 各物流比較

| 物流 | 取貨方式 | API 整合方式 | 適合場景 | 運費參考 |
|------|---------|-------------|---------|---------|
| 綠界物流（整合） | 超商取貨/宅配 | REST API | 一次串所有超商 | 依通路 |
| 7-ELEVEN 交貨便 | 超商取貨 | 透過綠界/藍新 | B2C 小包裹 | 60-65 元 |
| 全家好賣+ | 超商取貨 | 透過綠界/藍新 | B2C 小包裹 | 60-65 元 |
| 黑貓宅急便 | 宅配 | EDI/API | 中大型包裹 | 90-220 元 |
| 中華郵政 | 郵局寄件 | WebService | 公家單位偏好 | 45-180 元 |

### 綠界物流 API（推薦，一次搞定超商+宅配）

**申請流程**

1. 綠界帳號登入 → 廠商後台 → 物流整合
2. 開通物流服務（需上傳營業登記）
3. 取得 MerchantID + HashKey + HashIV（與金流共用帳號，物流用另組 Key）

```typescript
// services/ecpay-logistics.ts
import crypto from 'crypto';
import axios from 'axios';

const MERCHANT_ID = process.env.ECPAY_LOGISTICS_MERCHANT_ID!;
const HASH_KEY = process.env.ECPAY_LOGISTICS_HASH_KEY!;
const HASH_IV = process.env.ECPAY_LOGISTICS_HASH_IV!;

// 測試環境：https://logistics-stage.ecpay.com.tw
// 正式環境：https://logistics.ecpay.com.tw
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://logistics.ecpay.com.tw'
  : 'https://logistics-stage.ecpay.com.tw';

/** 產生綠界物流 CheckMacValue */
function generateCheckMac(params: Record<string, string>): string {
  // 1. 按英文字母排序
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  // 2. 加上 HashKey/HashIV
  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;
  // 3. URL encode（小寫）
  const encoded = encodeURIComponent(raw).toLowerCase();
  // 4. MD5
  return crypto.createHash('md5').update(encoded).digest('hex').toUpperCase();
}

/** 產生超商取貨地圖（讓用戶選門市） */
export function getCvsMapUrl(orderId: string, callbackUrl: string): string {
  return `${BASE_URL}/Express/map?MerchantID=${MERCHANT_ID}`
    + `&LogisticsType=CVS`
    + `&LogisticsSubType=UNIMART`  // UNIMART=7-11, FAMI=全家, HILIFE=萊爾富, OKMART=OK
    + `&IsCollection=Y`            // Y=貨到付款, N=僅配送
    + `&ServerReplyURL=${encodeURIComponent(callbackUrl)}`;
}

/** 接收用戶選擇的門市資訊 */
// POST callbackUrl 會收到：
// CVSStoreID, CVSStoreName, CVSAddress, CVSTelephone

/** 建立物流訂單（超商取貨） */
export async function createCvsOrder(options: {
  orderId: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  receiverStoreId: string;  // 從地圖選門市拿到
  goodsName: string;
  goodsAmount: number;      // 代收金額（0 = 不代收）
  subType?: 'UNIMART' | 'FAMI' | 'HILIFE' | 'OKMART';
}) {
  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: options.orderId,
    MerchantTradeDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
    LogisticsType: 'CVS',
    LogisticsSubType: options.subType || 'UNIMART',
    GoodsName: options.goodsName,
    GoodsAmount: String(options.goodsAmount),
    SenderName: options.senderName,
    SenderPhone: options.senderPhone,
    ReceiverName: options.receiverName,
    ReceiverPhone: options.receiverPhone,
    ReceiverStoreID: options.receiverStoreId,
    ServerReplyURL: `${process.env.API_BASE_URL}/api/logistics/callback`,
    IsCollection: options.goodsAmount > 0 ? 'Y' : 'N',
  };

  params.CheckMacValue = generateCheckMac(params);

  const res = await axios.post(`${BASE_URL}/Express/Create`, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // 回傳：1|AllPayLogisticsID（成功）或 0|ErrorMessage（失敗）
  const [status, value] = (res.data as string).split('|');
  if (status !== '1') throw new Error(`綠界物流錯誤: ${value}`);

  return { logisticsId: value };
}

/** 查詢物流狀態 */
export async function queryLogisticsStatus(logisticsId: string) {
  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    AllPayLogisticsID: logisticsId,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };
  params.CheckMacValue = generateCheckMac(params);

  const res = await axios.post(`${BASE_URL}/Helper/QueryLogisticsTradeInfo/V4`, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return res.data; // 包含 LogisticsStatus、HandlingCharge 等
}
```

### 黑貓宅急便

```typescript
// services/tcat.ts
// 黑貓沒有公開 REST API，通常透過以下方式整合：
// 1. 透過綠界物流（LogisticsSubType: 'TCAT'）
// 2. EDI 檔案上傳（大量出貨）
// 3. 黑貓 B2C 平台手動出單

// 透過綠界串黑貓宅配
export async function createTcatOrder(options: {
  orderId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  goodsName: string;
  temperature: '0001' | '0002' | '0003'; // 常溫/冷藏/冷凍
}) {
  // 用綠界物流 API，LogisticsType 改成 Home
  const params: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: options.orderId,
    LogisticsType: 'Home',
    LogisticsSubType: 'TCAT',
    GoodsName: options.goodsName,
    SenderName: options.senderName,
    SenderPhone: options.senderPhone,
    SenderZipCode: '',
    SenderAddress: options.senderAddress,
    ReceiverName: options.receiverName,
    ReceiverPhone: options.receiverPhone,
    ReceiverZipCode: '',
    ReceiverAddress: options.receiverAddress,
    Temperature: options.temperature,
    ServerReplyURL: `${process.env.API_BASE_URL}/api/logistics/callback`,
    // ... 其他參數
  };
  // 同樣呼叫綠界 /Express/Create
}
```

### 物流常見問題

| 問題 | 解法 |
|------|------|
| 超商門市選擇地圖打不開 | 確認網域有加入綠界白名單 |
| 測試環境下單成功但收不到取貨通知 | 測試環境不會真的出貨，只驗 API 流程 |
| 7-11 門市代碼不對 | UNIMART 門市代碼固定 6 碼，確認格式 |
| 貨到付款金額限制 | 超商取貨代收上限 2 萬元，宅配依物流商規定 |

---

## 7. 簡訊 API

### 三大服務比較

| 服務 | 適合場景 | 台灣價格 | 國際簡訊 | API 品質 | 到達率 |
|------|---------|---------|---------|---------|--------|
| **三竹簡訊** | 台灣企業、銀行等級 | ~0.8-1.2 元/則 | 支援 | 穩定 | 99%+ |
| **Every8d** | 台灣中小企業 | ~0.7-1.0 元/則 | 支援 | 穩定 | 98%+ |
| **Twilio** | 國際化、開發者友善 | ~1.5-2.0 元/則 | 優秀 | 最佳 | 97%+ |

### 7.1 三竹簡訊（MITAKE）

**申請流程**

1. [三竹官網](https://sms.mitake.com.tw/) 註冊帳號
2. 儲值點數（1 點 = 1 則簡訊，最低 1000 點）
3. 取得帳號（UserName）+ 密碼（Password）

```typescript
// services/sms-mitake.ts
import axios from 'axios';

const MITAKE_USER = process.env.MITAKE_USERNAME!;
const MITAKE_PASS = process.env.MITAKE_PASSWORD!;
const MITAKE_URL = 'https://smsapi.mitake.com.tw/api/mtk/SmSend';

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  remaining?: number;
}

/** 發送單則簡訊 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  // 三竹格式：手機號需為 09 開頭
  const normalizedPhone = phone.replace(/^(\+886|886)/, '0').replace(/[-\s]/g, '');

  try {
    const res = await axios.post(
      MITAKE_URL,
      `username=${MITAKE_USER}&password=${MITAKE_PASS}&dstaddr=${normalizedPhone}&smbody=${encodeURIComponent(message)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'text',
      }
    );

    // 回傳格式：[數字]\nmsgid=xxx\nstatuscode=x\nAccountPoint=xxx
    const lines = (res.data as string).split('\n');
    const statusLine = lines.find(l => l.startsWith('statuscode='));
    const msgIdLine = lines.find(l => l.startsWith('msgid='));
    const pointLine = lines.find(l => l.startsWith('AccountPoint='));

    const statusCode = statusLine?.split('=')[1];

    if (statusCode === '1' || statusCode === '0') {
      return {
        success: true,
        messageId: msgIdLine?.split('=')[1],
        remaining: Number(pointLine?.split('=')[1]),
      };
    }

    return { success: false, error: `StatusCode: ${statusCode}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** 批次發送（不同內容） */
export async function sendSmsBatch(messages: Array<{ phone: string; message: string }>): Promise<SmsResult[]> {
  // 三竹批次 API 用 INI 格式
  const body = messages.map((m, i) => {
    const phone = m.phone.replace(/^(\+886|886)/, '0').replace(/[-\s]/g, '');
    return `[${i}]\ndstaddr=${phone}\nsmbody=${m.message}`;
  }).join('\n');

  const res = await axios.post(
    MITAKE_URL,
    `username=${MITAKE_USER}&password=${MITAKE_PASS}&encoding=UTF8\n${body}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'text',
    }
  );

  // 解析每則回傳結果...
  return [{ success: true }]; // 簡化
}

/** 查詢剩餘點數 */
export async function getBalance(): Promise<number> {
  const res = await axios.get(
    `https://smsapi.mitake.com.tw/api/mtk/SmQuery?username=${MITAKE_USER}&password=${MITAKE_PASS}`,
    { responseType: 'text' }
  );
  const match = (res.data as string).match(/AccountPoint=(\d+)/);
  return match ? Number(match[1]) : 0;
}
```

### 7.2 Every8d

**申請流程**

1. [Every8d 官網](https://www.every8d.com/) 註冊
2. 取得 UID + PWD
3. 儲值（最低 500 元起）

```typescript
// services/sms-every8d.ts
import axios from 'axios';

const E8D_UID = process.env.EVERY8D_UID!;
const E8D_PWD = process.env.EVERY8D_PWD!;
const E8D_URL = 'https://oms.every8d.com/API21/HTTP/sendSMS.ashx';

export async function sendSms(phone: string, message: string) {
  const normalizedPhone = phone.replace(/^(\+886|886)/, '0').replace(/[-\s]/g, '');

  const res = await axios.get(E8D_URL, {
    params: {
      UID: E8D_UID,
      PWD: E8D_PWD,
      SB: '',  // 簡訊主旨（手機不會顯示，可留空）
      MSG: message,
      DEST: normalizedPhone,
    },
    responseType: 'text',
  });

  // 回傳格式：Credit,Sent,Cost,Unsent,BatchID
  // 例如：89.0,1,1.0,0,220310120000001
  const parts = (res.data as string).split(',');
  const credit = parseFloat(parts[0]);
  const sent = parseInt(parts[1]);

  if (credit < 0) {
    throw new Error(`Every8d 錯誤: ${res.data}`);
  }

  return { success: sent > 0, remaining: credit, batchId: parts[4] };
}

/** 查詢餘額 */
export async function getCredit(): Promise<number> {
  const res = await axios.get('https://oms.every8d.com/API21/HTTP/getCredit.ashx', {
    params: { UID: E8D_UID, PWD: E8D_PWD },
    responseType: 'text',
  });
  return parseFloat(res.data as string);
}
```

### 7.3 Twilio

**申請流程**

1. [Twilio 官網](https://www.twilio.com/) 註冊
2. 取得 Account SID + Auth Token
3. 購買電話號碼（或使用 Messaging Service）
4. 試用帳號有 $15 免費額度

```typescript
// services/sms-twilio.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER!; // 例如 +12025551234

export async function sendSms(phone: string, message: string) {
  // Twilio 手機號需 E.164 格式：+886912345678
  let normalizedPhone = phone.replace(/[-\s]/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+886' + normalizedPhone.substring(1);
  }
  if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+886' + normalizedPhone;
  }

  try {
    const msg = await client.messages.create({
      body: message,
      from: FROM_NUMBER,
      to: normalizedPhone,
    });

    return {
      success: true,
      messageId: msg.sid,
      status: msg.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      code: err.code,
    };
  }
}

/** OTP 驗證碼流程 */
export async function sendOtp(phone: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // 實務上 OTP 存到 Redis，設 5 分鐘過期
  // await redis.set(`otp:${phone}`, otp, 'EX', 300);

  await sendSms(phone, `您的驗證碼為 ${otp}，5 分鐘內有效。請勿告知他人。`);
  return otp;
}
```

### 簡訊常見問題

| 問題 | 解法 |
|------|------|
| 簡訊被當垃圾訊息 | 內容避免純數字、加上品牌名前綴（如「[OO公司]」） |
| 手機號格式不對 | 統一轉換：`09xx → +8869xx`（Twilio）或 `09xx`（三竹/Every8d） |
| 國際簡訊太貴 | 台灣用戶用三竹/Every8d，海外用 Twilio |
| OTP 驗證碼被截取 | 設短過期（5分鐘）、限重試次數、加 IP 限流 |

---

## 8. 天氣 API

### 兩大服務比較

| 服務 | 免費額度 | 台灣資料 | 預報天數 | 回應速度 |
|------|---------|---------|---------|---------|
| **中央氣象署 Open Data** | 無限（需註冊） | 最精準 | 7 天 | 中等 |
| **OpenWeatherMap** | 60 次/分、100 萬次/月 | 一般 | 5 天（免費）/ 16 天（付費） | 快 |

### 8.1 中央氣象署 Open Data（CWA）

**申請流程**

1. 前往 [CWA 開放資料平台](https://opendata.cwa.gov.tw/) 註冊會員
2. 取得授權碼（Authorization Key）
3. 完全免費，無額度限制

```typescript
// services/weather-cwa.ts
import axios from 'axios';

const CWA_API_KEY = process.env.CWA_API_KEY!;
const CWA_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

interface WeatherForecast {
  location: string;
  forecasts: Array<{
    startTime: string;
    endTime: string;
    weather: string;       // 天氣現象
    minTemp: string;
    maxTemp: string;
    rainChance: string;    // 降雨機率
  }>;
}

/**
 * 取得台灣各縣市天氣預報（36 小時）
 * 資料集 ID：F-C0032-001
 */
export async function getForecast36h(location?: string): Promise<WeatherForecast[]> {
  const params: Record<string, string> = {
    Authorization: CWA_API_KEY,
    format: 'JSON',
  };
  if (location) params.locationName = location; // 例如：臺北市

  const res = await axios.get(`${CWA_BASE}/F-C0032-001`, { params });

  const records = res.data.records.location;
  return records.map((loc: any) => ({
    location: loc.locationName,
    forecasts: loc.weatherElement[0].time.map((t: any, i: number) => ({
      startTime: t.startTime,
      endTime: t.endTime,
      weather: loc.weatherElement[0].time[i].parameter.parameterName,
      minTemp: loc.weatherElement[2].time[i].parameter.parameterName,
      maxTemp: loc.weatherElement[4].time[i].parameter.parameterName,
      rainChance: loc.weatherElement[1].time[i].parameter.parameterName + '%',
    })),
  }));
}

/**
 * 取得各縣市一週天氣預報
 * 資料集 ID：F-D0047-091（全台）
 */
export async function getForecastWeek(location: string): Promise<any> {
  const res = await axios.get(`${CWA_BASE}/F-D0047-091`, {
    params: {
      Authorization: CWA_API_KEY,
      format: 'JSON',
      locationName: location,
    },
  });
  return res.data.records.locations[0]?.location[0];
}

/**
 * 取得目前天氣觀測資料
 * 資料集 ID：O-A0003-001（自動氣象站）
 */
export async function getCurrentWeather(stationName?: string): Promise<any> {
  const params: Record<string, string> = {
    Authorization: CWA_API_KEY,
    format: 'JSON',
  };
  if (stationName) params.StationName = stationName;

  const res = await axios.get(`${CWA_BASE}/O-A0003-001`, { params });
  return res.data.records.Station;
}
```

### 8.2 OpenWeatherMap

**申請流程**

1. [OpenWeatherMap](https://openweathermap.org/api) 註冊
2. 取得 API Key（免費方案即可）
3. 新 Key 啟用需等 10 分鐘到 2 小時

```typescript
// services/weather-owm.ts
import axios from 'axios';

const OWM_KEY = process.env.OPENWEATHERMAP_API_KEY!;
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

interface CurrentWeather {
  city: string;
  temp: number;       // 攝氏
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  wind: number;       // m/s
}

/** 目前天氣 */
export async function getCurrentWeather(city: string): Promise<CurrentWeather> {
  const res = await axios.get(`${OWM_BASE}/weather`, {
    params: {
      q: city,
      appid: OWM_KEY,
      units: 'metric',   // 攝氏
      lang: 'zh_tw',     // 中文描述
    },
  });

  const d = res.data;
  return {
    city: d.name,
    temp: d.main.temp,
    feelsLike: d.main.feels_like,
    humidity: d.main.humidity,
    description: d.weather[0].description,
    icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
    wind: d.wind.speed,
  };
}

/** 用座標查天氣（更精確） */
export async function getWeatherByCoords(lat: number, lon: number): Promise<CurrentWeather> {
  const res = await axios.get(`${OWM_BASE}/weather`, {
    params: { lat, lon, appid: OWM_KEY, units: 'metric', lang: 'zh_tw' },
  });
  const d = res.data;
  return {
    city: d.name,
    temp: d.main.temp,
    feelsLike: d.main.feels_like,
    humidity: d.main.humidity,
    description: d.weather[0].description,
    icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
    wind: d.wind.speed,
  };
}

/** 5 天預報（每 3 小時一筆） */
export async function getForecast5d(city: string) {
  const res = await axios.get(`${OWM_BASE}/forecast`, {
    params: { q: city, appid: OWM_KEY, units: 'metric', lang: 'zh_tw' },
  });
  return res.data.list.map((item: any) => ({
    datetime: item.dt_txt,
    temp: item.main.temp,
    description: item.weather[0].description,
    icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`,
    rainChance: item.pop * 100, // 降雨機率百分比
  }));
}
```

### 天氣 API 常見問題

| 問題 | 解法 |
|------|------|
| CWA 資料集太多不知道用哪個 | 36h 預報用 `F-C0032-001`，一週用 `F-D0047-091`，即時觀測用 `O-A0003-001` |
| OWM 城市名找不到台灣城市 | 改用座標查詢（lat/lon），或用英文「Taipei」「Kaohsiung」 |
| 資料更新頻率 | CWA 每 3-6 小時更新，OWM 免費版每 10 分鐘 |
| 要在前端顯示天氣 icon | OWM 有現成 icon URL，CWA 需自己對應圖片 |

---

## 9. 匯率 API

### 兩大服務比較

| 服務 | 免費額度 | 更新頻率 | 幣別數 | 歷史匯率 |
|------|---------|---------|--------|---------|
| **ExchangeRate-API** | 1,500 次/月 | 每日 | 160+ | 付費版 |
| **Open Exchange Rates** | 1,000 次/月 | 每小時 | 170+ | 付費版 |

### 9.1 ExchangeRate-API

**申請流程**

1. [ExchangeRate-API](https://www.exchangerate-api.com/) 免費註冊
2. 取得 API Key
3. 免費版：每月 1,500 次、每日更新

```typescript
// services/exchange-rate.ts
import axios from 'axios';

const ER_API_KEY = process.env.EXCHANGERATE_API_KEY!;

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/** 取得以某幣為基準的所有匯率 */
export async function getRates(baseCurrency: string = 'TWD'): Promise<ExchangeRates> {
  const res = await axios.get(
    `https://v6.exchangerate-api.com/v6/${ER_API_KEY}/latest/${baseCurrency}`
  );

  return {
    base: res.data.base_code,
    date: res.data.time_last_update_utc,
    rates: res.data.conversion_rates,
  };
}

/** 幣別轉換 */
export async function convert(
  from: string,
  to: string,
  amount: number
): Promise<{ result: number; rate: number }> {
  const res = await axios.get(
    `https://v6.exchangerate-api.com/v6/${ER_API_KEY}/pair/${from}/${to}/${amount}`
  );

  return {
    result: res.data.conversion_result,
    rate: res.data.conversion_rate,
  };
}

// 使用範例
// const { result, rate } = await convert('USD', 'TWD', 100);
// console.log(`100 USD = ${result} TWD (匯率: ${rate})`);
```

### 9.2 Open Exchange Rates

```typescript
// services/open-exchange-rates.ts
import axios from 'axios';

const OXR_APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID!;

/** 取得最新匯率（免費版基準幣為 USD） */
export async function getLatestRates(): Promise<Record<string, number>> {
  const res = await axios.get('https://openexchangerates.org/api/latest.json', {
    params: { app_id: OXR_APP_ID },
  });
  return res.data.rates; // { TWD: 31.5, JPY: 154.2, ... }
}

/** 手動換算（免費版只能用 USD 為基準） */
export function convertFromUsd(rates: Record<string, number>, from: string, to: string, amount: number): number {
  const fromRate = rates[from]; // 1 USD = ? FROM
  const toRate = rates[to];     // 1 USD = ? TO
  return (amount / fromRate) * toRate;
}
```

### 匯率快取策略

```typescript
// services/exchange-cache.ts
// 匯率不需即時，建議快取 1-24 小時

let cachedRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 小時

export async function getCachedRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_TTL) {
    return cachedRates.rates;
  }

  const rates = await getLatestRates(); // 任一 API
  cachedRates = { rates, timestamp: Date.now() };
  return rates;
}
```

---

## 10. 圖片 CDN API

### 兩大服務比較

| 服務 | 免費額度 | 強項 | 適合場景 |
|------|---------|------|---------|
| **Cloudinary** | 25 Credits/月 (~25GB 頻寬) | 功能全面、轉換強大 | 通用、電商 |
| **imgix** | 無免費（$10/月起） | 即時渲染速度快 | 大量圖片、媒體 |

### 10.1 Cloudinary

**申請流程**

1. [Cloudinary](https://cloudinary.com/) 免費註冊
2. 取得 Cloud Name + API Key + API Secret
3. 免費版：每月 25 Credits（約 25GB 頻寬 + 25,000 次轉換）

```typescript
// services/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/** 上傳圖片 */
export async function uploadImage(filePath: string, options?: {
  folder?: string;
  publicId?: string;
  transformation?: object[];
}) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: options?.folder || 'uploads',
    public_id: options?.publicId,
    transformation: options?.transformation,
    quality: 'auto',
    fetch_format: 'auto',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/** 產生動態轉換 URL（不需重新上傳） */
export function getTransformedUrl(publicId: string, options: {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  quality?: 'auto' | number;
  format?: 'webp' | 'avif' | 'auto';
  blur?: number;
  grayscale?: boolean;
  overlay?: string;     // 浮水印
}): string {
  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  if (options.blur) transformations.push(`e_blur:${options.blur}`);
  if (options.grayscale) transformations.push('e_grayscale');

  const transform = transformations.join(',');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

// 使用範例
// 電商商品縮圖：300x300 填滿，自動品質+WebP
// getTransformedUrl('products/shoe1', { width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'webp' })

// OG 分享圖：1200x630
// getTransformedUrl('blog/post1', { width: 1200, height: 630, crop: 'fill' })

/** 刪除圖片 */
export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

/** 產生上傳簽章（讓前端直傳 Cloudinary） */
export function getUploadSignature(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
  };
}
```

### 10.2 imgix

```typescript
// services/imgix.ts
// imgix 不需上傳，它從你的來源（S3、GCS、Web Folder）即時渲染

const IMGIX_DOMAIN = process.env.IMGIX_DOMAIN!; // 例如：your-source.imgix.net

/** 產生 imgix 轉換 URL */
export function getImgixUrl(path: string, params: {
  w?: number;       // 寬度
  h?: number;       // 高度
  fit?: 'crop' | 'clip' | 'fill' | 'scale';
  auto?: string;    // 'compress,format' 自動壓縮+轉格式
  q?: number;       // 品質 1-100
  blur?: number;    // 模糊
  txt?: string;     // 文字浮水印
  'txt-size'?: number;
}): string {
  const url = new URL(`https://${IMGIX_DOMAIN}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });
  return url.toString();
}

// 使用範例
// getImgixUrl('photos/hero.jpg', { w: 800, h: 600, fit: 'crop', auto: 'compress,format' })
// → https://your-source.imgix.net/photos/hero.jpg?w=800&h=600&fit=crop&auto=compress%2Cformat
```

### 圖片 CDN 常見問題

| 問題 | 解法 |
|------|------|
| Cloudinary 免費額度不夠 | 設定 `quality: 'auto'` 和 `fetch_format: 'auto'` 大幅減少頻寬 |
| 圖片第一次載入慢 | CDN 尚未快取，第二次起就快。可用 eager transformation 預熱 |
| 浮水印要求 | Cloudinary overlay 功能：`l_watermark,w_100,o_50` |
| 前端直傳安全問題 | 使用 signed upload（後端產生簽章） |

---

## 11. AI API

### 三大服務比較

| 服務 | 模型 | 定價（輸入/輸出每百萬 token） | 最適場景 |
|------|------|------|---------|
| **OpenAI** | GPT-4o / GPT-4o-mini | $2.50/$10（4o）/ $0.15/$0.60（mini） | 通用、對話 |
| **Google Gemini** | 2.5 Flash / 2.5 Pro | 免費（Flash）/ $1.25/$10（Pro） | 多模態、免費額度大 |
| **Anthropic Claude** | Opus 4 / Sonnet 4 | $15/$75（Opus）/ $3/$15（Sonnet） | 長文、程式碼、推理 |

### 11.1 OpenAI

**申請流程**

1. [OpenAI Platform](https://platform.openai.com/) 註冊
2. 建立 API Key
3. 預先儲值（Pay-as-you-go）

```typescript
// services/ai-openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** 基本對話 */
export async function chat(message: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: message });

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // 便宜好用
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return res.choices[0].message.content || '';
}

/** 串流輸出（SSE） */
export async function chatStream(
  message: string,
  onChunk: (text: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: message }],
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    fullText += text;
    onChunk(text);
  }
  return fullText;
}

/** 產生圖片 */
export async function generateImage(prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });
  return res.data[0].url!;
}

/** 文字轉向量（embedding） */
export async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}
```

### 11.2 Google Gemini

**申請流程**

1. [Google AI Studio](https://aistudio.google.com/) 取得 API Key
2. 免費版（Gemini Flash）：每分鐘 15 次、每日 1,500 次
3. 付費用 Vertex AI（Google Cloud Console）

```typescript
// services/ai-gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/** 基本對話 */
export async function chat(message: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(message);
  return result.response.text();
}

/** 圖片分析（多模態） */
export async function analyzeImage(imageBase64: string, prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    },
  ]);

  return result.response.text();
}

/** 帶系統指示的對話 */
export async function chatWithSystem(message: string, systemInstruction: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });

  const result = await model.generateContent(message);
  return result.response.text();
}
```

### 11.3 Anthropic Claude

**申請流程**

1. [Anthropic Console](https://console.anthropic.com/) 註冊
2. 建立 API Key
3. 預先儲值

```typescript
// services/ai-claude.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** 基本對話 */
export async function chat(message: string, systemPrompt?: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  const textBlock = res.content.find(b => b.type === 'text');
  return textBlock?.text || '';
}

/** 串流輸出 */
export async function chatStream(
  message: string,
  onChunk: (text: string) => void
): Promise<string> {
  let fullText = '';

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return fullText;
}
```

### AI API 在網站中的實際應用

```typescript
// routes/ai-features.ts — 接案常見 AI 功能
import express from 'express';
import { chat } from '../services/ai-openai';

const router = express.Router();

/** 客服 AI 助理 */
router.post('/api/chatbot', async (req, res) => {
  const { message, context } = req.body;
  const systemPrompt = `你是 ${context.companyName} 的客服助理。
  公司資訊：${context.about}
  營業時間：${context.hours}
  用繁體中文回答，態度親切。不確定的事說「請聯繫真人客服」。`;

  const reply = await chat(message, systemPrompt);
  res.json({ reply });
});

/** 商品描述生成器 */
router.post('/api/generate-description', async (req, res) => {
  const { productName, features, tone } = req.body;
  const prompt = `為以下商品寫一段吸引人的描述（${tone || '專業'}風格）：
  商品名：${productName}
  特色：${features.join('、')}
  字數：100-200 字，繁體中文。`;

  const description = await chat(prompt);
  res.json({ description });
});

export default router;
```

### AI API 常見問題

| 問題 | 解法 |
|------|------|
| 回應太慢 | 用串流（stream），讓用戶即時看到文字產生 |
| API 費用爆炸 | 設每日用量上限 + 用戶限流 + 用小模型（GPT-4o-mini / Flash） |
| 回答不準確 | 在 system prompt 給足夠的背景資料（公司簡介、FAQ 等） |
| 中文斷句奇怪 | 在 prompt 明確要求「用繁體中文、自然語氣」 |

---

## 12. 搜尋引擎 API

### 三大服務比較

| 服務 | 類型 | 免費額度 | 強項 | 適合場景 |
|------|------|---------|------|---------|
| **Algolia** | SaaS 全託管 | 10,000 筆 + 10,000 搜尋/月 | 速度極快、前端 UI 套件 | 電商、媒體 |
| **MeiliSearch** | 自架（開源） | 無限 | 中文友善、設定簡單 | 中小型網站 |
| **Elasticsearch** | 自架（開源） | 無限 | 功能最強大 | 大型、複雜搜尋需求 |

### 12.1 Algolia

**申請流程**

1. [Algolia](https://www.algolia.com/) 免費註冊
2. 建立 Application → 取得 Application ID
3. 取得 Search-Only API Key（前端用）和 Admin API Key（後端用）

```typescript
// services/search-algolia.ts
import algoliasearch from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY! // 後端用 Admin Key
);
const index = client.initIndex('products'); // 索引名稱

/** 建立/更新索引 */
export async function indexProducts(products: Array<{
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}>) {
  const objects = products.map(p => ({
    objectID: p.id, // Algolia 必須有 objectID
    ...p,
  }));

  await index.saveObjects(objects);
}

/** 設定搜尋參數 */
export async function configureIndex() {
  await index.setSettings({
    searchableAttributes: ['name', 'description', 'category'],
    attributesForFaceting: ['category', 'filterOnly(price)'],
    customRanking: ['desc(popularity)', 'asc(price)'],
    // 中文分詞支援
    queryLanguages: ['zh'],
    indexLanguages: ['zh'],
  });
}

/** 搜尋 */
export async function search(query: string, options?: {
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  facetFilters?: string[];
}) {
  const result = await index.search(query, {
    page: options?.page || 0,
    hitsPerPage: options?.hitsPerPage || 20,
    filters: options?.filters,        // 例如：'price < 1000'
    facetFilters: options?.facetFilters, // 例如：['category:3C']
  });

  return {
    hits: result.hits,
    total: result.nbHits,
    page: result.page,
    totalPages: result.nbPages,
    processingTimeMs: result.processingTimeMS,
  };
}
```

**前端即時搜尋（React InstantSearch）**

```tsx
// components/AlgoliaSearch.tsx
import algoliasearch from 'algoliasearch/lite';
import { InstantSearch, SearchBox, Hits, RefinementList, Pagination } from 'react-instantsearch';

const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_SEARCH_KEY // 前端只能用 Search-Only Key
);

function ProductHit({ hit }: { hit: any }) {
  return (
    <div className="product-card">
      <img src={hit.image} alt={hit.name} />
      <h3>{hit.name}</h3>
      <p>{hit.description}</p>
      <span>NT$ {hit.price}</span>
    </div>
  );
}

export function ProductSearch() {
  return (
    <InstantSearch searchClient={searchClient} indexName="products">
      <SearchBox placeholder="搜尋商品..." />
      <div style={{ display: 'flex' }}>
        <aside>
          <h4>分類</h4>
          <RefinementList attribute="category" />
        </aside>
        <main>
          <Hits hitComponent={ProductHit} />
          <Pagination />
        </main>
      </div>
    </InstantSearch>
  );
}
```

### 12.2 MeiliSearch

**申請 / 安裝**

```bash
# Docker 安裝（推薦）
docker run -d --name meilisearch \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  -e MEILI_MASTER_KEY='YOUR_MASTER_KEY' \
  getmeili/meilisearch:latest

# 或用 Meilisearch Cloud（SaaS 版）
# https://www.meilisearch.com/cloud
```

```typescript
// services/search-meili.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY,
});

/** 建立索引 + 匯入資料 */
export async function setupIndex(products: any[]) {
  const index = client.index('products');

  // 設定可搜尋欄位
  await index.updateSearchableAttributes(['name', 'description', 'category']);

  // 設定可篩選欄位
  await index.updateFilterableAttributes(['category', 'price', 'inStock']);

  // 設定排序欄位
  await index.updateSortableAttributes(['price', 'createdAt']);

  // 匯入資料
  await index.addDocuments(products, { primaryKey: 'id' });
}

/** 搜尋 */
export async function search(query: string, options?: {
  filter?: string;
  sort?: string[];
  limit?: number;
  offset?: number;
}) {
  const index = client.index('products');

  return index.search(query, {
    filter: options?.filter,      // 例如：'price < 1000 AND category = "3C"'
    sort: options?.sort,          // 例如：['price:asc']
    limit: options?.limit || 20,
    offset: options?.offset || 0,
  });
}
```

### 搜尋引擎常見問題

| 問題 | 解法 |
|------|------|
| Algolia 免費額度不夠 | 評估 MeiliSearch（自架免費） |
| 中文搜尋效果差 | Algolia 設定 `queryLanguages: ['zh']`，MeiliSearch 原生支援中文 |
| 資料同步問題 | 資料庫更新時同步推送到搜尋引擎（可透過 n8n 自動化） |
| 搜尋延遲高 | Algolia / MeiliSearch 都在 50ms 內，Elasticsearch 需調校 |

---

## 13. API 串接最佳實踐

### 13.1 環境變數管理

```bash
# .env（本地開發，絕對不要 commit）
# Google
GOOGLE_MAPS_CLIENT_KEY=AIzaSyA...
GOOGLE_MAPS_SERVER_KEY=AIzaSyB...
RECAPTCHA_SITE_KEY=6Lc...
RECAPTCHA_SECRET_KEY=6Lc...

# 社群登入
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
LINE_LOGIN_CHANNEL_ID=123456789
LINE_LOGIN_CHANNEL_SECRET=abc123...

# 金流
ECPAY_MERCHANT_ID=2000132
ECPAY_HASH_KEY=5294y06JbISpM5x9
ECPAY_HASH_IV=v77hoKGq4kWxNNIS

# 簡訊
MITAKE_USERNAME=xxx
MITAKE_PASSWORD=xxx

# AI
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
// config/env.ts — 集中管理 + 啟動時驗證
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  // 依專案需求列出必要的 key
] as const;

export function validateEnv(): void {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('缺少必要環境變數:', missing.join(', '));
    process.exit(1);
  }
}

// 在 app 啟動時呼叫
// validateEnv();
```

### 13.2 錯誤處理 + 重試

```typescript
// utils/api-client.ts
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;   // 毫秒
  maxDelay: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/** 帶重試的 API 呼叫 */
export async function fetchWithRetry<T>(
  config: AxiosRequestConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios(config);
      return res.data as T;
    } catch (err) {
      lastError = err as Error;
      const axiosErr = err as AxiosError;

      // 不重試的情況：4xx 客戶端錯誤（除了 429 限流）
      if (axiosErr.response) {
        const status = axiosErr.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw err;
        }
      }

      // 最後一次也失敗就不等了
      if (attempt === maxRetries) break;

      // 指數退避 + 隨機抖動
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      console.warn(`API 呼叫失敗（第 ${attempt + 1} 次），${delay}ms 後重試...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 13.3 超時設定

```typescript
// utils/timeout.ts

/** 為任何 Promise 加上超時 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `操作超時（${timeoutMs}ms）`)),
        timeoutMs
      )
    ),
  ]);
}

// 使用範例
// const result = await withTimeout(
//   geocode('台北市信義區'),
//   5000,
//   'Geocoding API 超時'
// );

// axios 也可直接設定
// axios.get(url, { timeout: 5000 })
```

### 13.4 快取策略

```typescript
// utils/cache.ts

/** 簡單的記憶體快取（適合單機小專案） */
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>();

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

// 使用範例
const weatherCache = new SimpleCache<any>();

async function getWeatherCached(city: string) {
  const cacheKey = `weather:${city}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return cached;

  const data = await getCurrentWeather(city);
  weatherCache.set(cacheKey, data, 30 * 60 * 1000); // 快取 30 分鐘
  return data;
}
```

```typescript
// utils/redis-cache.ts（中大型專案用 Redis）
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}
```

### 13.5 Rate Limiting（限流保護）

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

// 通用 API 限流
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 100,                    // 每個 IP 最多 100 次
  message: { error: '請求過於頻繁，請稍後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI 功能限流（成本較高）
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 分鐘
  max: 10,               // 每分鐘 10 次
  message: { error: 'AI 功能限流中，請稍後再試' },
});

// 簡訊限流
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,                // 每分鐘 3 則
  message: { error: '簡訊發送過於頻繁' },
});

// 使用
// app.use('/api/', apiLimiter);
// app.use('/api/chatbot', aiLimiter);
// app.use('/api/sms', smsLimiter);
```

### 13.6 API 費用監控

```typescript
// utils/api-usage.ts

interface ApiCall {
  service: string;
  endpoint: string;
  timestamp: Date;
  cost?: number;
}

const usageLogs: ApiCall[] = [];

/** 記錄 API 呼叫 */
export function logApiCall(service: string, endpoint: string, cost?: number): void {
  usageLogs.push({ service, endpoint, timestamp: new Date(), cost });

  // 每 100 筆寫入資料庫或檔案（避免記憶體膨脹）
  if (usageLogs.length > 100) {
    flushLogs();
  }
}

/** 取得今日用量摘要 */
export function getTodayUsage(): Record<string, number> {
  const today = new Date().toDateString();
  const todayLogs = usageLogs.filter(l => l.timestamp.toDateString() === today);

  const usage: Record<string, number> = {};
  for (const log of todayLogs) {
    usage[log.service] = (usage[log.service] || 0) + 1;
  }
  return usage;
}

function flushLogs(): void {
  // 寫入檔案/資料庫，然後清空
  usageLogs.length = 0;
}
```

### 13.7 .env 安全檢查清單

```
1. [ ] .env 已加入 .gitignore
2. [ ] 前端只用 VITE_XXX（不暴露 Secret Key）
3. [ ] API Key 有設定限制（IP/HTTP Referrer/配額）
4. [ ] 生產環境 Key 與開發環境分開
5. [ ] Secret Key 絕不出現在前端程式碼
6. [ ] 團隊成員用密碼管理器（1Password / Bitwarden）分享 Key
7. [ ] 金流 Key 只有負責工程師有存取權
```

---

## 14. n8n 串接外部 API

### HTTP Request 節點基本用法

HTTP Request 是 n8n 最萬用的節點，任何有 API 的服務都可以串。

**GET 請求（取得資料）**

```json
{
  "nodes": [
    {
      "name": "取得天氣",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [400, 300],
      "parameters": {
        "method": "GET",
        "url": "https://api.openweathermap.org/data/2.5/weather",
        "qs": {
          "q": "Taipei",
          "appid": "={{ $env.OPENWEATHERMAP_API_KEY }}",
          "units": "metric",
          "lang": "zh_tw"
        }
      }
    }
  ]
}
```

**POST 請求（發送資料）**

```json
{
  "name": "發送簡訊",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "parameters": {
    "method": "POST",
    "url": "https://smsapi.mitake.com.tw/api/mtk/SmSend",
    "contentType": "form-urlencoded",
    "body": {
      "username": "={{ $env.MITAKE_USERNAME }}",
      "password": "={{ $env.MITAKE_PASSWORD }}",
      "dstaddr": "={{ $json.phone }}",
      "smbody": "={{ $json.message }}"
    }
  }
}
```

**帶 Header 認證**

```json
{
  "name": "呼叫 OpenAI",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "headers": {
      "Authorization": "Bearer {{ $env.OPENAI_API_KEY }}",
      "Content-Type": "application/json"
    },
    "body": {
      "model": "gpt-4o-mini",
      "messages": [
        { "role": "user", "content": "={{ $json.question }}" }
      ]
    },
    "options": {
      "timeout": 30000
    }
  }
}
```

### 常見 n8n + API 整合模式

**模式一：Webhook 接收 → 處理 → 回覆**

```
Webhook (接收表單) → reCAPTCHA 驗證 (HTTP Request) → 存入資料庫 → 發通知
```

**模式二：定時任務 → 取資料 → 通知**

```
Cron (每天 8:00) → 取匯率 (HTTP Request) → 判斷漲跌 → LINE 通知
```

**模式三：資料同步**

```
Webhook (商品更新) → 同步 Algolia 索引 (HTTP Request) → 清 CDN 快取
```

### n8n 錯誤處理

```json
{
  "name": "API 呼叫",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com/data",
    "options": {
      "timeout": 10000,
      "retry": {
        "enabled": true,
        "maxRetries": 3,
        "retryInterval": 1000
      }
    }
  },
  "continueOnFail": true
}
```

設定 `continueOnFail: true` 後，可以用 IF 節點判斷 `{{ $json.error }}` 是否存在，走不同的後續流程（例如：失敗時通知管理員）。

### n8n 常見問題

| 問題 | 解法 |
|------|------|
| 環境變數怎麼設 | n8n Settings → Environment Variables，或用 `.env` 檔案 |
| API 回傳格式奇怪 | 在 HTTP Request 後加 Code 節點手動 parse |
| 認證怎麼存 | n8n Credentials 功能，支援 OAuth2、API Key、Header Auth 等 |
| Webhook 接收不到 | 確認 n8n URL 可被外部存取（需 HTTPS + 正確的 WEBHOOK_URL 設定） |

---

## 附錄：API 串接報價參考

接案時各 API 串接工時參考（含測試）：

| API 項目 | 估計工時 | 報價參考（TWD） |
|---------|---------|---------------|
| Google Maps 嵌入（靜態） | 1-2 小時 | 2,000-4,000 |
| Google Maps 互動式 + Geocoding | 4-8 小時 | 8,000-15,000 |
| reCAPTCHA v3（前端+後端） | 2-3 小時 | 4,000-6,000 |
| 單一社群登入（Google/FB/LINE） | 4-6 小時 | 8,000-12,000 |
| 多重社群登入（3 個以上） | 12-20 小時 | 25,000-40,000 |
| 社群分享按鈕 + OG 標籤 | 1-2 小時 | 2,000-4,000 |
| 金流串接（綠界/藍新） | 16-24 小時 | 30,000-50,000 |
| 物流串接（綠界物流） | 8-16 小時 | 15,000-30,000 |
| 簡訊 OTP 驗證 | 4-6 小時 | 8,000-12,000 |
| 天氣/匯率 API 顯示 | 2-4 小時 | 4,000-8,000 |
| 圖片 CDN 整合 | 4-8 小時 | 8,000-15,000 |
| AI 聊天機器人 | 8-16 小時 | 15,000-30,000 |
| 全站搜尋（Algolia/Meili） | 8-16 小時 | 15,000-30,000 |

> 以上為參考值，實際依複雜度和客戶需求調整。
