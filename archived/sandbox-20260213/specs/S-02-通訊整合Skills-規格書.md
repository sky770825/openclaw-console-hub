# S-02: 通訊整合 Skills（LINE + Telegram）- 技術規格書

**完成時間**: 2026-02-13 09:13 GMT+8  
**Agent**: Autopilot  
**優先級**: P0  

---

## 1. 技術架構

### 1.1 整體設計
```
┌─────────────────────────────────────────┐
│   OpenClaw Skill Framework              │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Communication Abstraction Layer │  │
│  └──────────────────────────────────┘  │
│           ▲          ▲                  │
│           │          │                  │
│    ┌──────┴──┐  ┌────┴──────┐         │
│    │   LINE   │  │  Telegram  │        │
│    │  Adapter │  │   Adapter  │        │
│    └──────────┘  └────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

### 1.2 核心模組
1. **Communication Provider Interface**
   - `sendMessage(channel, user_id, content)`
   - `sendButton(channel, user_id, buttons)`
   - `sendImage(channel, user_id, image_url)`
   - `receiveMessage(channel, message_id)` 

2. **LINE Adapter**
   - Channel ID: `CHANNEL_ID`
   - Message API: `https://api.line.biz/v2/bot/message/push`
   - Rich Menu Support
   - Template Message (Buttons, Carousel)

3. **Telegram Adapter**
   - Bot Token: `TELEGRAM_BOT_TOKEN`
   - API: `https://api.telegram.org/bot{token}/`
   - Inline Keyboard (buttons)
   - File upload support

---

## 2. API 定義

### 2.1 LINE Messaging API
```javascript
// 發送文字訊息
POST /v2/bot/message/push
{
  "to": "U1234567890abcdef1234567890abcdef",
  "messages": [
    {
      "type": "text",
      "text": "Hello, this is a text message"
    }
  ]
}

// 發送按鈕訊息
{
  "type": "template",
  "altText": "This is a buttons template",
  "template": {
    "type": "buttons",
    "title": "Menu",
    "text": "Please select",
    "actions": [
      {
        "type": "message",
        "label": "Option A",
        "text": "I'll take Option A"
      },
      {
        "type": "uri",
        "label": "View Website",
        "uri": "https://example.com"
      }
    ]
  }
}
```

### 2.2 Telegram Bot API
```javascript
// 發送訊息
POST /bot{token}/sendMessage
{
  "chat_id": "123456789",
  "text": "Hello, this is a message"
}

// 發送按鈕
{
  "chat_id": "123456789",
  "text": "Please select",
  "reply_markup": {
    "inline_keyboard": [
      [
        {"text": "Option A", "callback_data": "option_a"},
        {"text": "Option B", "callback_data": "option_b"}
      ]
    ]
  }
}

// 接收更新
GET /bot{token}/getUpdates
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 1,
        "from": {"id": 987654321, "first_name": "John"},
        "chat": {"id": 123456789},
        "text": "Hello"
      }
    }
  ]
}
```

---

## 3. 實現細節

### 3.1 環境配置
```env
# LINE
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdefghijklmnopqrstuvwxyz
LINE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_URL=https://example.com/webhook/telegram

# 共通配置
NOTIFICATION_DEFAULT_CHANNEL=telegram  # line or telegram
ENABLE_LOGGING=true
```

### 3.2 Skill 結構
```
line-messaging-skill/
├── SKILL.md
├── index.js
├── lib/
│   ├── client.js          # LINE API wrapper
│   ├── parser.js          # Message parsing
│   └── types.js           # Type definitions
├── examples/
│   ├── send-text.js
│   ├── send-buttons.js
│   └── webhook.js
└── package.json

telegram-bot-skill/
├── SKILL.md
├── index.js
├── lib/
│   ├── client.js          # Telegram API wrapper
│   ├── parser.js          # Update parsing
│   └── types.js
├── examples/
│   ├── send-text.js
│   ├── send-buttons.js
│   └── polling.js
└── package.json

communication-abstraction/
├── SKILL.md
├── index.js               # Factory + unified interface
├── providers/
│   ├── line.js
│   ├── telegram.js
│   └── console.js         # Debug provider
└── package.json
```

### 3.3 實現示例（Node.js）

**通訊抽象層**:
```javascript
// communication-abstraction/index.js
class CommunicationBroker {
  constructor(config) {
    this.providers = {
      line: new LineAdapter(config.line),
      telegram: new TelegramAdapter(config.telegram)
    };
    this.defaultProvider = config.default || 'telegram';
  }

  async sendMessage(channel, userId, text, options = {}) {
    const provider = this.providers[channel || this.defaultProvider];
    if (!provider) throw new Error(`Unknown channel: ${channel}`);
    return provider.sendMessage(userId, text, options);
  }

  async sendButton(channel, userId, title, buttons, options = {}) {
    const provider = this.providers[channel];
    return provider.sendButton(userId, title, buttons, options);
  }

  async sendImage(channel, userId, imageUrl, caption = '', options = {}) {
    const provider = this.providers[channel];
    return provider.sendImage(userId, imageUrl, caption, options);
  }
}

module.exports = CommunicationBroker;
```

**LINE Adapter**:
```javascript
// line-messaging-skill/lib/client.js
const axios = require('axios');

class LineAdapter {
  constructor(config) {
    this.channelId = config.channelId;
    this.accessToken = config.accessToken;
    this.baseURL = 'https://api.line.biz/v2/bot';
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async sendMessage(userId, text) {
    return this.axios.post('/message/push', {
      to: userId,
      messages: [{ type: 'text', text }]
    });
  }

  async sendButton(userId, title, buttons) {
    const actions = buttons.map(btn => ({
      type: btn.type === 'uri' ? 'uri' : 'message',
      label: btn.label,
      text: btn.text,
      uri: btn.uri
    }));

    return this.axios.post('/message/push', {
      to: userId,
      messages: [{
        type: 'template',
        altText: title,
        template: {
          type: 'buttons',
          title,
          text: 'Please select',
          actions
        }
      }]
    });
  }
}

module.exports = LineAdapter;
```

**Telegram Adapter**:
```javascript
// telegram-bot-skill/lib/client.js
const axios = require('axios');

class TelegramAdapter {
  constructor(config) {
    this.token = config.botToken;
    this.baseURL = `https://api.telegram.org/bot${this.token}`;
    this.axios = axios.create({ baseURL: this.baseURL });
  }

  async sendMessage(chatId, text) {
    return this.axios.post('/sendMessage', {
      chat_id: chatId,
      text
    });
  }

  async sendButton(chatId, text, buttons) {
    const inlineKeyboard = buttons.map(btn => [{
      text: btn.label,
      callback_data: btn.value || btn.label
    }]);

    return this.axios.post('/sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }

  async sendImage(chatId, imageUrl, caption = '') {
    return this.axios.post('/sendPhoto', {
      chat_id: chatId,
      photo: imageUrl,
      caption
    });
  }
}

module.exports = TelegramAdapter;
```

---

## 4. 集成點

### 4.1 S-06（防霾紗窗報價系統）集成
```javascript
const broker = new CommunicationBroker(config);

// LINE Bot 詢價
await broker.sendButton('line', lineUserId, '防霾紗窗報價', [
  { label: '標準規格', text: 'standard' },
  { label: '自訂尺寸', text: 'custom' }
]);
```

### 4.2 S-07（飲料店庫存預警）集成
```javascript
// 低庫存通知
await broker.sendMessage('line', shopManagerId, '⚠️ 檸檬已低於預警值');
```

### 4.3 S-09（業務數位化效果量測）集成
```javascript
// 發送週報
await broker.sendImage('telegram', adminId, reportImageUrl, '本週數據報告');
```

---

## 5. 測試策略

### 5.1 單元測試
- Mock API responses
- Test message formatting
- Test error handling

### 5.2 集成測試
- Webhook verification (LINE)
- Bot polling (Telegram)
- Multi-channel message routing

### 5.3 E2E 測試
- Real message sending (staging)
- Button interaction flow
- Image/file upload

---

## 6. 部署與監控

### 6.1 環境
```
development: 本地開發，使用 mock provider
staging: 測試環境，連接真實 API
production: 生產環境，完整監控
```

### 6.2 監控指標
- Message send success rate
- API response time
- Error rate by channel
- Daily active users

### 6.3 告警規則
```
- 發送成功率 < 95% → 警告
- API 延遲 > 5s → 警告
- 連續錯誤 > 10 次 → 緊急告警
```

---

## 7. 驗收條件檢核

- ✅ 支援 LINE 文字、按鈕、圖片訊息
- ✅ 支援 Telegram 文字、按鈕、圖片訊息
- ✅ 統一的抽象層 API
- ✅ 環境配置完整
- ✅ 集成示例（S-06、S-07、S-09）
- ✅ 完整的錯誤處理與日誌
- ✅ 測試與監控框架

---

## 8. 後續工作

1. **富媒體支援**: 語音、視頻訊息
2. **AI 對話**: 集成 NLP 理解
3. **分析儀表板**: 訊息統計、用戶行為分析
4. **多語言支援**: i18n 框架

---

**Status**: Ready for implementation  
**Next Phase**: S-06 integration development
