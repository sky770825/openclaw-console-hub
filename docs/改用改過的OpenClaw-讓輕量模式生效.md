# 改用改過的 OpenClaw — 讓輕量模式生效

> 我們改的 Token 優化（一般聊天輕量、自動寫入輪數提示）在 **openclaw任務面版設計/openclaw-main**；你現在若用全域安裝的 `openclaw` 或從 **~/.openclaw/workspace** 跑，會是舊程式。照下面做就會改跑「有改過的那份」。

---

## 做法一：從改過的 openclaw-main 建置並啟動（建議）

**重點：** 在「改過的那份」目錄建置，並**從那裡**啟動 gateway；workspace（AGENTS、MEMORY 等）仍會用 **~/.openclaw/workspace**，不用搬檔案。

### 步驟

1. **進入改過的專案**
   ```bash
   cd /Users/caijunchang/openclaw任務面版設計/openclaw-main
   ```

2. **安裝依賴（若還沒裝）**
   ```bash
   pnpm install
   ```
   （若沒有 pnpm：`npm install -g pnpm` 或改用 `npm install`，再視專案用 `npm run build`）

3. **建置**
   ```bash
   pnpm build
   ```

4. **從這個目錄啟動 gateway**
   ```bash
   node openclaw.mjs gateway start
   ```
   或若專案有 script：
   ```bash
   pnpm start -- gateway start
   ```

5. **之後要跑 gateway 時**  
   都先 `cd` 到 **openclaw任務面版設計/openclaw-main**，再執行上面第 4 步的指令。  
   這樣讀的還是 **~/.openclaw/workspace**（AGENTS、MEMORY、skills），但**執行的程式**是這份有輕量模式的。

### 驗證

- 發一句 **「你好」** 或 **「嗨」**，看該次請求 token 是否降到約 0.5K～1K（不再約 18K）。

---

## 做法二：用改過的 build 取代全域的 openclaw（進階）

若你習慣打 `openclaw gateway start`（全域指令），可以讓這個指令改跑「改過的那份」：

1. 在 **openclaw-main** 建置（同上 1～3）。
2. 做**全域連結**（二擇一）：
   - **npm：** 在 openclaw-main 目錄執行  
     `npm link`  
     之後全域的 `openclaw` 會指向這份 build。
   - **pnpm：**  
     `pnpm link --global`  
     （依你實際用哪個套件管理員。）

3. 之後直接打 `openclaw gateway start` 就會用改過的程式。  
   **注意：** 若之後用 `npm i -g openclaw` 會再蓋掉，要再 link 一次。

---

## 做法三：把改過的檔案複製到 ~/.openclaw/workspace（僅當你「從 workspace 目錄跑」時才有用）

**只有**在你本來就是「在 ~/.openclaw/workspace 目錄下執行 `node scripts/run-node.mjs gateway start`」或從那裡 build 再跑時，複製才有用。  
若你是用全域的 `openclaw` 指令，複製到 workspace 的 src 不會影響執行中的程式。

若確定是從 workspace 跑，要複製的檔案：

| 從（openclaw-main） | 到（~/.openclaw/workspace） |
|---------------------|-----------------------------|
| `src/agents/casual-chat-classifier.ts` | `src/agents/casual-chat-classifier.ts` |
| `src/agents/bootstrap-files.ts` | `src/agents/bootstrap-files.ts` |
| `src/agents/pi-embedded-runner/run/attempt.ts` | `src/agents/pi-embedded-runner/run/attempt.ts` |

複製後在 **~/.openclaw/workspace** 目錄重新 build，再從那裡啟動 gateway。

---

## 建議

- **最單純：** 用 **做法一**，每次要跑就 `cd` 到 openclaw-main，建置後 `node openclaw.mjs gateway start`。
- **想用全域指令：** 用 **做法二** 做一次 `npm link` / `pnpm link --global`。
- 做完任一做法後，用「你好」測一次，確認 token 有降，就代表已改用改過的 OpenClaw。
