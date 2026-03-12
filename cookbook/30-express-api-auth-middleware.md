# 30 — Express.js API 認證中介軟體

> 從 server/src/middlewares/auth.ts 提煉的標準實踐。用於保護 API 端點，支援 Bearer Token 和多層級權限。

---

## 一、核心概念

此中介軟體提供三層權限：
- admin: 最高權限，可讀可寫可管理。
- write: 可寫入權限，同時也具備讀取權限。
- read: 僅可讀取權限。

金鑰從環境變數讀取，並透過 HTTP Header (Authorization: Bearer <key> 或 x-api-key: <key>) 進行驗證。

---

## 二、程式碼範本

``typescript
import { Request, Response, NextFunction } from 'express';

// 從環境變數讀取你的 API Keys
const ADMIN_KEY = process.env.ADMIN_KEY?.trim();
const WRITE_KEY = process.env.WRITE_KEY?.trim();
const READ_KEY = process.env.READ_KEY?.trim();

// 使用 Set 提高查找效率
const adminKeySet = new Set<string>();
const writeKeySet = new Set<string>();
const readKeySet = new Set<string>();

if (ADMIN_KEY) {
  adminKeySet.add(ADMIN_KEY);
  writeKeySet.add(ADMIN_KEY);
  readKeySet.add(ADMIN_KEY);
}
if (WRITE_KEY) {
  writeKeySet.add(WRITE_KEY);
  readKeySet.add(WRITE_KEY);
}
if (READ_KEY) {
  readKeySet.add(READ_KEY);
}

/
  從請求 Header 讀取 API Key
 /
function getApiKey(req: Request): string | null {
  const headerKey = req.header('x-api-key')?.trim();
  if (headerKey) return headerKey;

  const auth = req.header('authorization')?.trim();
  if (!auth) return null;

  const match = auth.match(/^bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/
  Express 中介軟體
 /
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const key = getApiKey(req);

  if (!key) {
    return res.status(401).json({ error: 'Missing API Key' });
  }

  // 判斷請求方法決定所需權限
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());

  if (isWriteMethod) {
    if (writeKeySet.has(key)) {
      return next(); // 寫入權限通過
    }
  } else {
    if (readKeySet.has(key)) {
      return next(); // 讀取權限通過
    }
  }

  return res.status(403).json({ error: 'Invalid API Key or Insufficient Permissions' });
}

`

---

## 三、如何使用

在你的 Express 應用程式中，將它作為路由的中介軟體掛載。

`typescript
// server.ts
import express from 'express';
import { requireAuth } from './middlewares/auth';

const app = express();

// 所有 /api/v1/* 的路由都需要認證
app.use('/api/v1', requireAuth);

// 你的 API 路由
app.get('/api/v1/data', (req, res) => {
  res.json({ message: 'This is protected data.' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
`

---

## 四、環境變數設定 (.env)

`
ADMIN_KEY=your-super-secret-admin-key
WRITE_KEY=your-secret-write-key
READ_KEY=your-public-read-key
``
