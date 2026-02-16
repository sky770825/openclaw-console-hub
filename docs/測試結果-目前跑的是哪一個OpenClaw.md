# 測試結果 — 目前跑的是哪一個 OpenClaw

> 已用指令實際檢查，結論如下。

---

## 結論：你現在用的是「全域安裝的 OpenClaw」

| 項目 | 結果 |
|------|------|
| **你打的 `openclaw` 實際指向** | `/Users/caijunchang/.nvm/versions/node/v22.22.0/bin/openclaw` |
| **該指令真正執行的檔案** | `~/.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/openclaw.mjs` → 載入同目錄的 `dist/entry.js` |
| **那份有沒有我們改的輕量模式？** | **沒有**。該目錄沒有 `casual-chat-classifier.ts`，dist 裡也沒有對應的輕量／bootstrapMode 邏輯。 |
| **改過的那份在哪裡？** | **openclaw任務面版設計/openclaw-main**（有 casual-chat-classifier、bootstrapMode、輪數注入）。 |

所以：**目前執行的是「全域 npm 安裝的 OpenClaw」，不是改過的那份，因此還是約 18K。**

---

## 怎麼改：讓系統改跑「改過的那份」

任選一種即可。

### 做法 A：從改過的目錄直接跑（建議）

```bash
cd /Users/caijunchang/openclaw任務面版設計/openclaw-main
pnpm install
pnpm build
node openclaw.mjs gateway start
```

之後要開 gateway 都從這個目錄執行上面最後一行。  
Workspace 仍會用 **~/.openclaw/workspace**（AGENTS、MEMORY 等不變）。

### 做法 B：讓全域的 `openclaw` 改指到改過的那份

```bash
cd /Users/caijunchang/openclaw任務面版設計/openclaw-main
pnpm build
npm link
```

之後直接打 `openclaw gateway start` 就會用這份。  
（若之後又執行 `npm i -g openclaw` 會蓋掉，需再 link 一次。）

---

## 驗證方式

1. **一定要從改過的目錄跑**（或先 `npm link`），再發 **「你好」**，看 token 是否降到約 0.5K～1K。
2. **看 gateway log**：已加一行 log，會印出 `bootstrapMode=light` 或 `bootstrapMode=full` 以及 prompt 前 60 字。若你看到 `bootstrapMode=full` 即使發「你好」，代表當時跑的仍不是改過的程式，或 prompt 格式有前綴（已加「去掉前綴再判斷」的邏輯，請重新 build 再試）。
3. **若 prompt 有前綴**（例如 `[message_id: xxx]\n\n你好`）：分類器已改為先去掉這類 metadata 行，只對實際內文判斷是否為招呼，所以「你好」仍應觸發 light。
