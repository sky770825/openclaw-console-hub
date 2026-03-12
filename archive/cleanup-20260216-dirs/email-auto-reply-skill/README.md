# Email Auto-Reply AI Skill

使用 **Ollama** 本地 AI 分析未讀郵件、產生回覆草稿，並可選 **Telegram** 通知。支援 **Gmail**（googleapis）與 **IMAP** 讀取。

## 功能

- 讀取未讀郵件（Gmail API / IMAP）
- 使用 Ollama 分析郵件內容與意圖
- AI 產生回覆草稿
- 人工確認後發送（或設定為自動發送）
- Telegram 通知新郵件摘要與草稿預覽

## 技術

- **Node.js** + **TypeScript**
- **googleapis**：Gmail 讀取與發送
- **imap** + **mailparser**：IMAP 收信
- **Ollama API**：內容分析與草稿生成
- **node-telegram-bot-api**：Telegram 通知
- 設定檔：**JSON**

## 安裝

```bash
npm install
npm run build
```

## 設定

1. 複製範例設定並編輯：

   ```bash
   cp config.sample.json config.json
   ```

2. **provider**：`"gmail"` 或 `"imap"`。

3. **Gmail**（OAuth2）  
   - 到 [Google Cloud Console](https://console.cloud.google.com/) 建立 OAuth 2.0 憑證（桌面應用），取得 `clientId`、`clientSecret`； redirect URI 設為 `http://localhost:3333`。  
   - 首次執行前請跑一次授權腳本：`npx ts-node scripts/gmail-oauth.ts`，在瀏覽器完成授權後 token 會存成 `gmail-token.json`（或 `config.gmail.tokenPath` 指定路徑）。

4. **IMAP**  
   - 填寫 `imap.user`、`imap.password`、`imap.host`、`imap.port`、`imap.tls`。  
   - 發送郵件需自行搭配 SMTP 或其它方式；本 MVP 在 IMAP 下僅產生草稿與 Telegram 通知。

5. **Ollama**  
   - 本機安裝並啟動 [Ollama](https://ollama.ai/)，預設 `http://localhost:11434`。  
   - 設定 `ollama.model`（例如 `llama3.2`）。

6. **Telegram**（選用）  
   - 建立 Bot（@BotFather），取得 `botToken`。  
   - 取得與 Bot 對話的 `chatId`（可透過 [getUpdates](https://core.telegram.org/bots/api#getupdates) 取得）。  
   - `telegram.enabled: true` 才會發送通知。

7. **sendAfterConfirm**  
   - `true`：只產生草稿與通知，不自動發送（預設）。  
   - `false`：在 Gmail 下會自動發送回覆。

8. **maxUnread**（選用）：每次最多處理幾封未讀，預設 20。

## 使用

```bash
# 使用預設 config.json
npm start

# 指定設定檔
CONFIG_PATH=./my-config.json npm start

# 自動發送（僅 Gmail；覆蓋 sendAfterConfirm）
AUTO_SEND=1 npm start
```

流程：讀取未讀 → 每封經 Ollama 分析 → 產生回覆草稿 → 若啟用 Telegram 則發送摘要與草稿預覽 → 若 `sendAfterConfirm=false` 且為 Gmail 則自動寄出回覆。

## 專案結構

```
src/
  config.ts    # 載入 config.json
  types.ts     # 共用型別
  gmail.ts     # Gmail 讀取 / 發送 / 標已讀
  imap.ts      # IMAP 未讀讀取
  ollama.ts    # Ollama 分析與草稿生成
  telegram.ts  # Telegram 通知
  draft.ts     # 單封處理流程（分析→草稿→可選發送）
  index.ts     # 主程式
config.sample.json
config.json    # 自行建立，勿提交
```

## 授權

MIT
