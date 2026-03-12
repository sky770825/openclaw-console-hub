# Notion Skill 基礎架構開發規格

> **任務來源**: Autopilot 循環  
> **建立時間**: 2026-02-12  
> **負責人**: OpenClaw Agent  

---

## 📋 任務摘要

建立 OpenClaw Notion Skill 的基礎架構，包含 API 連接、認證機制、型別定義。

---

## 🔍 技術研究發現

### Notion API 認證方式

根據 [Notion 官方文件](https://developers.notion.com/reference/authentication)：

1. **Bearer Token 認證**
   - 使用 HTTP Authorization Header
   - 格式: `Authorization: Bearer {INTEGRATION_TOKEN}`
   - 每個 Integration 創建時會獲得獨立的 Token

2. **OAuth 流程 (Public Integration)**
   - 需註冊 OAuth Client ID 和 Client Secret
   - 使用者授權後交換 Access Token
   - Token Endpoint: `POST https://api.notion.com/v1/oauth/token`

3. **官方 SDK**
   - [@notionhq/client](https://github.com/makenotion/notion-sdk-js)
   - TypeScript 原生支援
   - 初始化後可重複使用 Client 實例

---

## 🏗️ 架構設計

### 1. 檔案結構

```
skills/notion/
├── src/
│   ├── index.ts              # Skill 入口點
│   ├── auth/
│   │   ├── token-auth.ts     # Bearer Token 認證
│   │   └── oauth-client.ts   # OAuth 流程 (選配)
│   ├── api/
│   │   ├── client.ts         # Notion Client 封裝
│   │   ├── database.ts       # Database API 操作
│   │   ├── pages.ts          # Page API 操作
│   │   └── blocks.ts         # Block API 操作
│   ├── types/
│   │   ├── notion.ts         # Notion API 型別定義
│   │   └── skill.ts          # Skill 內部型別
│   └── utils/
│       └── error-handler.ts  # 錯誤處理
├── config/
│   └── schema.json           # Skill 配置 Schema
├── skill.json                # Skill 元數據
└── README.md                 # 使用說明
```

### 2. 核心型別定義 (TypeScript)

```typescript
// types/notion.ts
export interface NotionConfig {
  token: string;
  baseUrl?: string;
  version?: string;
}

export interface Database {
  id: string;
  title: RichTextItem[];
  properties: Record<string, Property>;
  url: string;
}

export interface Page {
  id: string;
  created_time: string;
  last_edited_time: string;
  properties: Record<string, PropertyValue>;
  url: string;
}

export interface QueryDatabaseResponse {
  results: Page[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface CreatePageRequest {
  parent: { database_id: string } | { page_id: string };
  properties: Record<string, PropertyValue>;
  children?: Block[];
}

// types/skill.ts
export interface NotionSkillOptions {
  auth: NotionAuthConfig;
}

export interface NotionAuthConfig {
  type: 'token' | 'oauth';
  token?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface SkillContext {
  client: NotionClient;
  config: NotionConfig;
}
```

### 3. API Client 實作設計

```typescript
// api/client.ts
import { Client } from '@notionhq/client';
import { NotionConfig } from '../types/notion';

export class NotionClient {
  private client: Client;
  
  constructor(config: NotionConfig) {
    this.client = new Client({
      auth: config.token,
      baseUrl: config.baseUrl,
      notionVersion: config.version || '2022-06-28',
    });
  }
  
  // 獲取底層 Client 用於進階操作
  getRawClient(): Client {
    return this.client;
  }
  
  // 封裝常用操作
  async queryDatabase(databaseId: string, filter?: any) {
    return this.client.databases.query({
      database_id: databaseId,
      filter,
    });
  }
  
  async createPage(params: CreatePageParameters) {
    return this.client.pages.create(params);
  }
  
  async updatePage(pageId: string, properties: any) {
    return this.client.pages.update({
      page_id: pageId,
      properties,
    });
  }
}
```

### 4. Skill 配置 Schema

```json
{
  "skill": {
    "id": "notion",
    "name": "Notion",
    "version": "0.1.0",
    "description": "與 Notion 工作區整合，支援 Database、Page、Block 操作",
    "author": "OpenClaw",
    "license": "MIT"
  },
  "config": {
    "auth": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["token", "oauth"],
          "description": "認證方式"
        },
        "token": {
          "type": "string",
          "description": "Internal Integration Token"
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "notionVersion": {
          "type": "string",
          "default": "2022-06-28"
        }
      }
    }
  },
  "actions": [
    {
      "name": "query_database",
      "description": "查詢 Database 內容",
      "parameters": {
        "database_id": "string",
        "filter": "object?",
        "sorts": "array?"
      }
    },
    {
      "name": "create_page",
      "description": "建立新頁面",
      "parameters": {
        "parent": "object",
        "properties": "object"
      }
    },
    {
      "name": "update_page",
      "description": "更新頁面內容",
      "parameters": {
        "page_id": "string",
        "properties": "object"
      }
    }
  ]
}
```

---

## 📦 相依套件

```json
{
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🔧 安裝步驟

1. **建立 Notion Integration**
   - 前往 https://www.notion.so/my-integrations
   - 點擊 "New integration"
   - 複製 Internal Integration Token

2. **分享頁面給 Integration**
   - 在 Notion 頁面點擊 "Share"
   - 新增 Integration

3. **設定 OpenClaw Skill**
   ```bash
   openclaw skill install notion
   openclaw skill config notion token=your_token_here
   ```

---

## ✅ 驗證清單

- [ ] Token 認證正常運作
- [ ] 可成功查詢 Database
- [ ] 可建立新 Page
- [ ] 可更新現有 Page
- [ ] 錯誤處理機制完善
- [ ] TypeScript 型別完整

---

## 📝 備註

- 本規格涵蓋基礎架構，實際實作時需參考 Notion SDK 文件
- OAuth 流程為選配功能，可先實作 Token 認證
- 建議先建立測試用的 Notion 工作區進行開發
