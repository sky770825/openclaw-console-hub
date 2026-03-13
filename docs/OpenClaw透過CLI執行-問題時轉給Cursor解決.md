# OpenClaw 透過 CLI 執行 — 遇問題時轉給 Cursor 解決

目前要讓 **OpenClaw 透過 CLI 執行**。當 OpenClaw（小蔡）遇到問題時，由小蔡**把訊息發給 Cursor 的對話視窗**，並**提供路徑**，讓 **Cursor 的 AI** 幫忙排查與修復。

---

## 一、流程

1. **老蔡** 用 OpenClaw CLI 與小蔡互動（或小蔡在 CLI 環境執行任務）。
2. **小蔡** 遇到問題（例如：指令失敗、錯誤訊息、路徑或權限問題）。
3. **小蔡** 把以下內容整理給老蔡：
   - **問題描述**：發生什麼、錯誤訊息或現象。
   - **路徑**：相關的 workspace、專案或檔案路徑（見下方「常用路徑」）。
4. **老蔡** 把這段訊息貼到 **Cursor 的對話視窗**（就是現在這個對話），Cursor 的 AI 會依路徑與描述幫忙排查、修復。

---

## 二、常用路徑（給 Cursor AI 用）

| 用途 | 路徑 |
|------|------|
| **OpenClaw workspace**（小蔡的根目錄、MEMORY、腳本） | `~/.openclaw/workspace` 或 `/Users/caijunchang/.openclaw/workspace` |
| **任務板／說明文件** | `/Users/caijunchang/openclaw任務面版設計`（含 `docs/`） |
| **任務板前端＋後端** | `/Users/caijunchang/Downloads/openclaw-console-hub-main`（後端 `server/`） |
| **OpenClaw 設定** | `~/.openclaw/openclaw.json` |

小蔡在回報問題時，應盡量附上**與問題相關的上述路徑**，方便 Cursor 直接開檔、修改。

---

## 三、小蔡要怎麼做：執行腳本（已寫進 AGENTS.md / TOOLS.md）

小蔡用 **exec** 呼叫：`./scripts/send-to-cursor.sh "問題描述" "路徑"`。腳本路徑：`~/.openclaw/workspace/scripts/send-to-cursor.sh`。

### 方式 A：座標自動貼上（預設）— 固定流程、完全免手動

腳本**預設**使用 **座標方式**（automation），流程固定為：

1. **喚起 Cursor**（activate）
2. **按 Cmd+L 開啟聊天室**
3. **等待聊天室開啟**（延遲約 2.5 秒，確認 UI 就緒）
4. **在設定的座標上點擊**（聊天輸入框）
5. **Cmd+V 貼上、Enter 送出**

**前置設定（必要）**：  
先跑一次 `./scripts/get-cursor-chat-coordinates.sh`，在 5 秒內把滑鼠移到 Cursor **聊天輸入框**中央，取得座標後寫入 **`~/.openclaw/workspace/.env.cursor`**：
```bash
CURSOR_CHAT_CLICK_X=1234
CURSOR_CHAT_CLICK_Y=567
```
未設定座標時，腳本會報錯並提示執行 `get-cursor-chat-coordinates.sh`。

### 方式 B：Cursor Deeplink（選用）— 會有一個確認彈窗

若改設 **`SEND_TO_CURSOR_METHOD=deeplink`**，則改用 **Cursor Deeplink**（`cursor.com/link/prompt?text=...`）：開啟連結後 Cursor 會預填對話，但會跳出「Review this external prompt」確認彈窗，老蔡須手動點確認後再按 Enter 送出。

**小結**：預設已改為座標送出（automation）；要改回 Deeplink 時設 `SEND_TO_CURSOR_METHOD=deeplink`。

---

## 四、小蔡如何讀取 Cursor 的回覆、持續交流，最後回報老蔡

目前小蔡用腳本**只能「送出」到 Cursor**，Cursor 的回覆會出現在 **Cursor 的對話視窗**，**小蔡（OpenClaw）自己讀不到**。要讓小蔡「讀到回覆、繼續問、最後整理給老蔡」，可以用下面兩種方式。

### 做法一：老蔡代為轉貼（用現有腳本 + Cursor 視窗）

1. 小蔡執行 `send-to-cursor.sh` 把問題與路徑送到 Cursor。
2. Cursor 在** Cursor 視窗**裡回覆；**老蔡**把 Cursor 的這段回覆**複製**，貼回 **OpenClaw 的對話**（跟小蔡說：「這是 Cursor 的回覆：……」）。
3. 小蔡就能**讀到** Cursor 的內容，可以：
   - 若還需要追問：再執行一次 `send-to-cursor.sh`，把**追問內容**與路徑送給 Cursor（例如：「根據你剛才的回覆，請再幫我……」）。
   - 重複 2～3 直到問題解決。
4. 最後小蔡把**結論或解法**整理成一段，回覆給老蔡。

**優點**：不用改腳本，老蔡在 Cursor 也能看到完整對話。**缺點**：每一輪 Cursor 的回覆都要老蔡手動複製到 OpenClaw。

### 做法二：改用 Cursor CLI，回覆直接回傳給小蔡（已實作）

小蔡改為執行 **`./scripts/ask-cursor-cli.sh "問題描述" "路徑"`**，腳本內部會呼叫 **`agent -p "…"`**，Cursor 的**回覆會印在指令輸出**，小蔡在執行結果裡就**讀得到**。之後可以根據回覆再執行一次送追問，多輪後把結論整理給老蔡。

**安裝（只需做一次）**  
1. 安裝 Cursor CLI：  
   `curl https://cursor.com/install -fsS | bash`  
2. 在終端執行 `agent`，依提示完成登入。

**小蔡的用法**  
```bash
./scripts/ask-cursor-cli.sh "問題描述（錯誤訊息、已試步驟）" "路徑1 路徑2"
```  
追問時再執行一次，把追問內容當成「問題描述」、路徑可同前或更新。

**更換模型**：腳本預設使用 **Auto** 模型（`--model auto`）。要改用其他模型可設環境變數，例如：  
`CURSOR_AGENT_MODEL=sonnet-4.5 ./scripts/ask-cursor-cli.sh "問題" "路徑"`  
可用 `agent models` 列出所有可用模型代號。

**優點**：小蔡能直接讀取回覆，不需老蔡轉貼，可全自動多輪交流。**缺點**：對話在終端／OpenClaw 這端，不會出現在 Cursor IDE 的對話視窗。

**小結**：  
- 想讓老蔡在 **Cursor 視窗**看到完整對話 → 用**做法一**（send-to-cursor.sh + 老蔡把回覆貼回 OpenClaw）。  
- 想讓小蔡**自己讀回覆、自動多輪** → 用**做法二**（ask-cursor-cli.sh / `agent -p`），最後小蔡再整理回報老蔡。
