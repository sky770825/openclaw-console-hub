# Sentry 進階設定指南

> 整理日期：2026-02-11
> 涵蓋：React + Express、Source Maps、錯誤分群、告警

---

## 完整初始化設定

### 共用設定檔

```typescript
// sentry.ts - 共用設定
export const sentryConfig = {
  dsn: process.env.SENTRY_DSN,
  
  // 環境區分
  environment: process.env.NODE_ENV,
  
  // 發布版本追蹤（用於回滾）
  release: process.env.SENTRY_RELEASE || '1.0.0',
  
  // 取樣率設定
  tracesSampleRate: 0.1,        // 效能追蹤：10% 請求
  profilesSampleRate: 0.01,     // 性能分析：1% 請求
  replaysSessionSampleRate: 0.1, // Session Replay：10% 使用者
  replaysOnErrorSampleRate: 1.0, // 錯誤發生時 100% 錄製
  
  // 錯誤過濾（減少噪音）
  beforeSend(event) {
    // 忽略特定錯誤
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
    ];
    
    if (event.exception?.values?.[0]?.value && 
        ignoredErrors.some(e => event.exception.values[0].value.includes(e))) {
      return null;
    }
    
    // 清理敏感資料
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    
    return event;
  },
};
```

### React 初始化

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  ...sentryConfig,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({ 
      colorScheme: 'system',
      showBranding: false,
    }),
  ],
});
```

### Express 初始化

```typescript
// app.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  ...sentryConfig,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration(),
  ],
});

// 錯誤處理中間件（放在所有路由之後）
app.use(Sentry.Handlers.errorHandler());
```

---

## Source Map 上傳（CI/CD）

```yaml
# .github/workflows/sentry-sourcemaps.yml
name: Upload Source Maps to Sentry

on:
  push:
    branches: [main]

jobs:
  upload-sourcemaps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build with source maps
        run: npm run build
        env:
          GENERATE_SOURCEMAP: true
      
      - name: Upload source maps to Sentry
        run: |
          npm install -g @sentry/cli
          sentry-cli releases new "$GITHUB_SHA"
          sentry-cli releases files "$GITHUB_SHA" upload-sourcemaps ./dist
          sentry-cli releases finalize "$GITHUB_SHA"
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: your-org
          SENTRY_PROJECT: your-project
```

---

## 錯誤分群與上下文

```typescript
// 自定義錯誤上下文（幫助分群）
Sentry.withScope((scope) => {
  scope.setTag('section', 'task-execution');
  scope.setContext('task', {
    taskId: task.id,
    agent: task.agentType,
    attempt: retryCount,
  });
  scope.setLevel('warning');
  
  Sentry.captureException(error);
});
```

---

## 告警規則建議

| 類型 | 條件 | 通知方式 |
|------|------|---------|
| **立即通知** | Production 新錯誤、錯誤量驟增 (>10x) | Email + Slack |
| **每日摘要** | 所有未解決錯誤 | Email |
| **每週報告** | 錯誤趨勢、效能指標 | Email |

---

## 任務板整合建議

1. 申請 Sentry 帳號並建立專案
2. 安裝 `@sentry/react` 和 `@sentry/node`
3. 設定 DSN 到環境變數
4. 建立 GitHub Actions 自動上傳 Source Maps
5. 設定告警規則
