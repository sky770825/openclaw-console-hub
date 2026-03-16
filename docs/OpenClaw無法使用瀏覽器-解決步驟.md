# OpenClaw 無法使用瀏覽器 — 解決步驟

當 OpenClaw 無法使用瀏覽器時，多半是「連線／擴充／分頁掛上」其中一環沒接好。依下面順序檢查，通常可以恢復。

---

## OpenClaw 可以自己做的排查（自我檢查）

執行 **`openclaw doctor`** 時，OpenClaw 會自動檢查：

- **Gateway** 是否在跑、連線與 auth 是否正常
- **Browser relay（extension）** 是否可連（例如 `http://127.0.0.1:18792/json/version`）
  - 若可連：會提示「Browser relay (extension) reachable at ...」，並建議用 `openclaw browser --browser-profile chrome tabs` 確認已掛上的分頁
  - 若不可連：會列出未達的 relay 位址、對應的 **Relay Service URL**（`ws://.../extension`），以及「先啟動 Gateway、確認 Chrome 擴充已安裝並在分頁上點圖示掛上」等建議

因此「無法使用瀏覽器」時，可先跑一次：

```bash
openclaw doctor
```

依輸出中的 **Gateway** 與 **Browser** 區塊依序處理。若要再確認瀏覽器控制與已掛上分頁，可接著執行：

```bash
openclaw browser status
openclaw browser --browser-profile chrome tabs
```

---

## 一、先確認這三件事（多數情況卡在這裡）

### 1. Gateway 有在跑

- 終端執行：`openclaw gateway start`（或從 OpenClaw.app 啟動）。
- 確認沒有報錯、沒有馬上退出。
- 若你設了 `gateway.auth.token`，Control UI / 擴充 / 其他客戶端都要用同一個 token。

### 2. 瀏覽器控制與 Relay 有起來

- Gateway 啟動時會一併啟動「瀏覽器控制服務」（預設 port **18791**）與「Extension Relay」（預設 port **18792**）。
- 若你改了 `gateway.port`，18791 / 18792 會跟著推：control = gateway+2，relay = control+1。
- 確認設定裡沒有把瀏覽器關掉：`browser.enabled` 不要設成 `false`（預設為 `true`）。

**快速檢查 relay 是否在聽：**

```bash
# 預設 relay 在 18792
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18792/json/version
```

若回傳 `200` 或能看到 JSON，代表 relay 有在跑。

### 3. Chrome 擴充已安裝並連到 Relay

- **安裝擴充**（若還沒做）：
  ```bash
  openclaw browser extension install
  openclaw browser extension path   # 記下印出的路徑
  ```
- Chrome → `chrome://extensions` → 開啟「開發者模式」→「載入未封裝項目」→ 選上面印出的目錄。
- 擴充裡若有「Relay Service URL」或「Gateway」設定，請設成：
  - **Relay Service URL**：`ws://127.0.0.1:18792/extension`  
  - 若你改了 gateway port，relay 的 port 會是 **gateway + 3**（例如 gateway 18789 → relay 18792）。
- 若有 **Auth Token**，要與 `~/.openclaw/openclaw.json` 的 `gateway.auth.token` 一致，否則可能出現 `device identity required`（WS 1008）。

**擴充圖示狀態：**

- **ON**：已連上 relay，且目前分頁已掛上，可被控制。
- **…**：正在連線到 relay（檢查 Gateway 是否有跑、URL 是否正確）。
- **!**：連不到 relay（檢查 18792 是否有在聽、防火牆、URL）。

---

## 二、一定要做的：在要控制的分頁上「掛上」擴充

OpenClaw **不會**自動控制你正在看的那個分頁，必須手動掛上：

1. 打開你**要給 OpenClaw 控制的那個網頁**。
2. 在**該分頁**上，點工具列上的 **OpenClaw 擴充圖示**。
3. 確認圖示變成 **ON**（已連接）。

若沒做這步，會出現：

- `Chrome extension relay is running, but no tab is connected`
- `tab not found` / `no attached Chrome tabs`

每次開新分頁或重新整理後，要**再點一次**該分頁的擴充圖示重新掛上。

**自動重連與重新掛上（擴充內建）：**  
若你使用的 OpenClaw 已包含「擴充自動重連」改動，則 Gateway 重啟或 relay 斷線後，擴充會自動重試連線，並在連上後**自動把先前掛上的分頁重新掛上**（無需手動再點）。請先執行 `openclaw browser extension install` 再在 Chrome 裡重新載入擴充，才會套用此行為。

**本機定時檢查 relay（選用）：**  
專案內有腳本 `scripts/check-relay-and-gateway.sh`，可背景執行、每 60 秒檢查 relay 是否活著；若掛了可選擇自動啟動 Gateway。用法：`./scripts/check-relay-and-gateway.sh`（僅檢查與提醒）；若希望 relay 掛掉時自動啟動 Gateway：`AUTO_START_GATEWAY=1 ./scripts/check-relay-and-gateway.sh`。`RELAY_PORT`、`CHECK_INTERVAL` 可自訂。

---

## 三、你從哪裡「使用瀏覽器」？（客戶端設定）

### 從 OpenClaw Control UI / 網頁設定

- 若畫面有 **Relay Service URL**，請設成：`ws://127.0.0.1:18792/extension`（或你實際的 relay port）。
- **Gateway URL** 設成：`ws://127.0.0.1:18789`（或你實際的 gateway port）。
- 有 **Auth Token** 的話要與 `gateway.auth.token` 一致。
- 儲存後再試一次。

### 從 Cursor / VS Code / 其他 IDE 的 OpenClaw 整合

- 在該 IDE 的 OpenClaw 設定裡，**Relay Service URL** 填：`ws://127.0.0.1:18792/extension`。
- 確認 Gateway 在本機有跑、Chrome 擴充已連上且分頁已掛上（圖示 ON）。

### 從 CLI 測試

```bash
# 列出目前透過擴充連接的分頁（會用到 relay + chrome profile）
openclaw browser --browser-profile chrome tabs
```

若這裡就失敗，代表 Gateway / relay / 擴充 / 分頁掛上 其中一項有問題，先依「一、二」修好再試。

---

## 四、沙箱模式（Agent 在沙箱裡跑時）

若 Agent 是在**沙箱**裡執行，預設可能不允許使用「主機的瀏覽器」：

- 改在**非沙箱**環境跑，或
- 在設定裡開啟：`agents.defaults.sandbox.browser.allowHostControl: true`，且呼叫 browser 工具時使用 `target="host"`（或你環境對應的 host target）。

---

## 五、常見錯誤與對照

| 現象 / 錯誤 | 可能原因 | 對應步驟 |
|-------------|----------|----------|
| **Can't reach the OpenClaw browser control service** / timeout | Gateway 沒跑或 port 錯 | 啟動 Gateway、確認 port（18789 / 18791） |
| **device identity required**（WS 1008） | 擴充或客戶端沒帶 token / token 錯 | 擴充與設定檔用同一個 `gateway.auth.token` |
| **Chrome extension relay is running, but no tab is connected** | 擴充有連上，但沒分頁掛上 | 在要控制的分頁點擴充圖示，確認 ON |
| **Chrome extension relay for profile "chrome" is not reachable** | Relay 沒起來或 URL 錯 | 確認 18792 有在聽、Relay URL 為 `ws://127.0.0.1:18792/extension` |
| **tab not found** / **no attached Chrome tabs** | 分頁關了或沒掛上、或擴充重連後斷開 | 在目標分頁再點一次擴充圖示掛上；若**反覆發生**可改用 **profile=openclaw**（見下方） |
| 擴充圖示一直 **!** | 連不到 relay | Gateway 有跑嗎？`curl http://127.0.0.1:18792/json/version` 有回應嗎？ |

---

## tab not found 反覆發生：改用 OpenClaw 獨立瀏覽器（profile=openclaw）

若 **Gateway 重啟或 Chrome 擴充重連後，經常很快斷開**，導致一再出現 **tab not found**，可改為使用 **OpenClaw 託管的獨立瀏覽器**，不依賴擴充連線：

- **作法：** 在 ClawHub / 任務板 / 呼叫 browser 工具時，指定 **`profile="openclaw"`**（或介面上的「使用 OpenClaw 瀏覽器」選項）。
- **效果：** OpenClaw 會啟動一個**獨立的 Chromium 視窗**（專用使用者資料），由 Gateway 直接控制，不需擴充、連線較穩定。
- **注意：** 開的是**新視窗**，不是你我平常在用的 Chrome。若任務是要操作「某個已開的網頁」，需在該 OpenClaw 瀏覽器裡打開同一個網址再操作。

**建議流程：**

1. 先試：手動重新整理 ClawHub 頁面，並在要控制的分頁上確認擴充為 **ON**。
2. 若仍常 **tab not found** → 改用 **profile=openclaw**，排除擴充不穩問題。
3. 之後若要再試擴充：Gateway 啟動後，在目標分頁**重新點一次**擴充圖示變成 ON 再測。

---

## 六、建議操作順序（從頭做一次）

1. 啟動 Gateway：`openclaw gateway start`。
2. 確認 relay：`curl -s http://127.0.0.1:18792/json/version` 有回應。
3. Chrome 打開，載入 OpenClaw 擴充，設定 Relay Service URL：`ws://127.0.0.1:18792/extension`（與 token 若需要）。
4. 打開要控制的網頁，在**該分頁**點擴充圖示 → 確認 **ON**。
5. 在 Control UI / Cursor 等處設定好 Gateway URL 與 Relay Service URL，儲存。
6. 再試一次「使用瀏覽器」；或用 `openclaw browser --browser-profile chrome tabs` 測試。

若仍失敗，請看 Gateway 終端輸出或瀏覽器擴充的 Console 錯誤訊息，對照上表與「一、二」逐步排除。

---

## 相關文件

- [瀏覽器控制經常失敗-排查說明](./瀏覽器控制經常失敗-排查說明.md)
- [OpenClaw-修復紀錄報告](./OpenClaw-修復紀錄報告.md)（Gateway token、Control UI 本機連線）
