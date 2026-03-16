# Token 優化 — 更新紀錄

> 若你測出來還是約 18K，請先對照本紀錄：**你實際跑的是不是這份程式**、以及**是否用「純招呼」觸發輕量模式**。

---

## 一、程式改了哪裡（都在 openclaw-main 裡）

| 項目 | 檔案路徑 | 說明 |
|------|----------|------|
| **一般聊天輕量模式** | `openclaw-main/src/agents/casual-chat-classifier.ts` | 新增：`isCasualChat(text)` 判斷是否為招呼／閒聊 |
| | `openclaw-main/src/agents/bootstrap-files.ts` | 新增 `bootstrapMode: "full" \| "light"`；light 時只載 IDENTITY + USER（前 200 字）+ 一句規則 |
| | `openclaw-main/src/agents/pi-embedded-runner/run/attempt.ts` | 每輪用 `params.prompt` 呼叫 `isCasualChat`，傳入 `bootstrapMode`；可設 config `casualChatLightBootstrap: false` 關閉 |
| **自動化寫入（輪數提示）** | `openclaw-main/src/agents/pi-embedded-runner/run/attempt.ts` | 在 system prompt 末尾注入「本對話約 N 個 user 回合。若 ≥15 請…」；閾值可設 `autoWriteMemoryThresholdTurns` |

**Workspace（~/.openclaw/workspace）** 的 AGENTS.md、MEMORY.md、MEMORY_TOPIC、index_state 等是「行為與內容」設定，不影響「用哪一份 OpenClaw 程式」。

---

## 二、為什麼你測還是 18K？—— 可能原因

### 1. 實際跑的 OpenClaw 不是這份程式

- 我們改的是 **`openclaw任務面版設計/openclaw-main/`** 底下的程式。
- 若你是用 **全域安裝**（例如 `npm i -g openclaw` 或別處 clone）跑 `openclaw gateway start`，跑的是**安裝目錄或別的路徑**的程式，不會帶入這些修改。
- **要讓修改生效：** 必須用**這份 openclaw-main** 來跑 gateway，例如：
  - 在此目錄 `npm run build`（或專案既有的 build 指令），再用 `node dist/...` 或 `openclaw gateway start` 且確保指向此 build；或
  - 用專案提供的 dev/start 腳本，明確從 `openclaw任務面版設計/openclaw-main` 啟動。

### 2. 沒有用「純招呼」觸發輕量模式

- **輕量模式**只在 **`isCasualChat(params.prompt) === true`** 時觸發，也就是**本輪使用者訊息**要是純招呼／極短閒聊，例如：
  - 「你好」「嗨」「哈囉」「早安」「hi」「hello」「好喔」「ok」
  - 且**不能**含任務觸發詞（幫我、請你、記下來、查一下…）
- 若你送的是「你好，想問一下…」或任何一句較長/有任務感的內容，會走 **full**，還是約 17～18K。

**建議驗證方式：** 單獨送一句 **「你好」** 或 **「嗨」**（不要加其他字），再看該次請求的 token；若走輕量，應約 **0.5K～1K**（只看 system/bootstrap 部分）。

### 3. Token 數字看的是哪一段

- 18K 若是 **「整次 request 的總 token」**（system + bootstrap + 對話歷史 + 本輪 user），那麼：
  - **輕量時**：system + bootstrap 約 0.5K，總量會接近「0.5K + 對話輪數」。
  - **Full 時**：system + bootstrap 約 17～18K，所以總量很容易就 18K+。
- 若你看到的 18K 是 **「每次都約 18K」**，且你確定送的是「你好」或「嗨」，那幾乎可以確定**當時跑的程式沒有帶入我們的輕量邏輯**（見上一段）。

### 4. 關閉了輕量模式

- Config 裡若設了 **`agents.defaults.casualChatLightBootstrap: false`**，會強制永遠 full，不會變 0.5K。
- 可檢查 `openclaw.json`（或你使用的 config）裡是否有這項，若有請改為 `true` 或刪除（預設為 true）。

---

## 三、建議你現在做這三件事

1. **確認執行來源**  
   在跑 gateway 的那台機器上，確認 `openclaw gateway start`（或你用的指令）實際執行的程式來自 **`openclaw任務面版設計/openclaw-main`** 的 build，而不是別處安裝的 OpenClaw。

2. **用純招呼測一次**  
   只發 **「你好」** 或 **「嗨」**，看該次請求 token；若仍約 18K，就是上面 1 或 4 的問題。

3. **看 log 是否有 light**  
   若程式有打 log（例如 bootstrap 相關），可搜尋是否有 `bootstrapMode` 或 "light" 之類的關鍵字，確認有走到輕量分支。

---

## 四、本專案文件與程式對照（方便你查）

- 設計與行為說明：`docs/記憶與對話-一般聊天輕量模式設計.md`
- Token 來源與可達範圍：`docs/OpenClaw-17K-Token來源明細.md`
- 自動化寫入：`docs/記憶-自動化寫入設計.md`
- 程式實作：`openclaw-main/src/agents/`（casual-chat-classifier、bootstrap-files、pi-embedded-runner/run/attempt.ts）

若你願意提供：**你是怎麼啟動 gateway 的（指令、目錄）** 以及 **發的 exact 一句話**，可以更精準判斷是「沒跑到這份程式」還是「沒觸發 light」。  

**目前沒有在別處另建「更新紀錄」；這份就是更新紀錄。** 之後若有新改動，可繼續補在這份文件裡。
