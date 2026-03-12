# Express.js 安全性強化指南

> 整理日期：2026-02-11
> 涵蓋：CORS、Rate Limiting、JWT、Helmet

---

## 完整安全中間件設定

```typescript
// security.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// 1. CORS 設定（白名單模式最安全）
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://app.yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 預檢請求快取 24 小時
};

// 2. Rate Limiting（基本保護）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 每 IP 100 請求
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Redis store for distributed systems
  // store: new RedisStore({ client: redis }),
});

// 3. Slow Down（漸進式懲罰）
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // 50 請求後開始延遲
  delayMs: 500, // 每次增加 500ms
});

// 4. Helmet（安全標頭）
// 自動設定 X-Content-Type-Options, X-Frame-Options, CSP 等

export function setupSecurity(app: express.Application) {
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use('/api/', limiter);
  app.use('/api/', speedLimiter);
}
```

---

## JWT 安全最佳實踐

```typescript
// auth.ts
import jwt from 'jsonwebtoken';

// Token 設定
const ACCESS_TOKEN_EXPIRY = '15m';   // 短效 Access Token
const REFRESH_TOKEN_EXPIRY = '7d';   // 長效 Refresh Token

// 產生 Token 對
export function generateTokens(payload: { userId: string }) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'taskboard-api',
  });
  
  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' }, 
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
}

// 驗證 Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN
  
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}
```

---

## 安全檢查清單

- [ ] CORS 使用白名單而非 `*`
- [ ] Rate Limiting 啟用（防止暴力破解）
- [ ] Helmet 標頭設定
- [ ] JWT 短效 Access + 長效 Refresh 機制
- [ ] 敏感資料不記錄在日誌
- [ ] 使用 HTTPS (HSTS)

---

## 任務板整合建議

1. 安裝套件：`helmet`, `cors`, `express-rate-limit`, `express-slow-down`
2. 建立 `security.ts` 中間件
3. 在 `app.ts` 中引入 `setupSecurity(app)`
4. 設定 JWT 雙 Token 機制
