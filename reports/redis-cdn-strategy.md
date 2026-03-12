# Redis + CDN 快取策略

> 整理日期：2026-02-11
> 來源：2026 最新實務指南

---

## 三層快取架構

```
┌─────────────────────────────────────────┐
│  L1: 瀏覽器快取 (Browser Cache)          │
│  Cache-Control, ETag, LocalStorage       │
├─────────────────────────────────────────┤
│  L2: CDN 邊緣快取 (Cloudflare/AWS)       │
│  靜態資源、API 響應快取                   │
├─────────────────────────────────────────┤
│  L3: 應用程式快取 (Redis)                │
│  資料庫查詢結果、Session、Rate Limit      │
└─────────────────────────────────────────┘
```

---

## Redis 實務程式碼

### 1. 基本設定 (ioredis)

```typescript
// redis-client.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

export default redis;
```

### 2. Cache-Aside Pattern（最常用）

```typescript
// cache.ts
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFn();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

// 使用範例
const tasks = await getCachedOrFetch(
  `tasks:user:${userId}`,
  () => db.tasks.findMany({ where: { userId } }),
  60 // 快取 1 分鐘
);
```

### 3. 快取失效策略

| 策略 | 使用場景 | 代碼 |
|------|---------|------|
| **TTL** | 資料可接受短暫過期 | `redis.setex(key, 300, value)` |
| **主動失效** | 資料更新時立即清除 | `redis.del(key)` |
| **Cache Warming** | 預熱熱門資料 | 啟動時預載 |

---

## CDN 設定建議

### Cloudflare 設定

```javascript
// _headers (靜態網站) 或 Express 中間件
res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年（靜態資源）
res.setHeader('Cache-Control', 'public, s-maxage=300');     // 5分鐘（API 邊緣快取）
```

---

## 任務板整合建議

- 安裝 Redis npm 套件
- 設定 Redis 連線
- 實作快取裝飾器
- 加入效能監控埋點
