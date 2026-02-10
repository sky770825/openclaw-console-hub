# OpenClaw Copilot 已打開卻顯示 Not Connected — 排查

> 「Copilot 已經打開」通常指在設定裡啟用了 **GitHub Copilot** 或 **Copilot Proxy** provider；「Not Connected」可能來自**兩種不同**的狀態，要分開看。

---

## 可能一：是「Gateway / Control UI」的連線狀態（最常見）

**意思：** 畫面上的 **Connected / Disconnected（或 Not Connected）** 指的是 **Control UI 有沒有連上 OpenClaw Gateway**，和 Copilot 有沒有打開無關。

- **Connected** = 這台瀏覽器已成功連到 Gateway（URL + token 正確）。
- **Disconnected / Not Connected** = 連不上 Gateway（網址錯、token 錯、或 Gateway 沒跑）。

**你要做的：**

1. 確認 **Gateway 有在跑**：終端執行 `openclaw gateway start`（或你平常的啟動方式）。
2. 在 **Control UI** 的連線設定裡檢查：
   - **URL** 是否正確（例如 `http://127.0.0.1:18789` 或你設的網址）。
   - 若 Gateway 有開 **token 驗證**，是否已填 **token**（可執行 `openclaw doctor --generate-gateway-token` 產生）。
3. 按 **Connect** 再試；成功後狀態會變成 **Connected**，和 Copilot 是否開啟無關。

所以：**Copilot 已打開但畫面上是 Not Connected，多半是「Control UI 沒連上 Gateway」，先照上面把連線弄成 Connected。**

---

## 可能二：是「Copilot 的 auth / 憑證」狀態

**意思：** 某個畫面把 Copilot provider 的**登入／憑證狀態**顯示成「Not Connected」（未連線／未登入）。

- **GitHub Copilot**：需要 **auth profile**（用 GitHub device flow 登入過），系統才會用你的 GitHub 換 Copilot token。若從沒做過 onboard / 登入，或登入過期，就可能顯示成未連線或錯誤。
- **Copilot Proxy**：若用本機 proxy，要確認 proxy 有在跑、`baseUrl` 設對；否則請求會失敗，看起來也像「沒連上」。

**你要做的：**

1. **GitHub Copilot**  
   - 再跑一次 **auth / onboard**（例如 `openclaw` 的登入流程，選 GitHub Copilot）。  
   - 完成後確認 config 裡有對應的 **auth profile**，且該 profile 綁在 Copilot provider 用的 model 上。
2. **Copilot Proxy**  
   - 確認 proxy 程式有啟動、port 正確。  
   - 在 config 裡該 provider 的 `baseUrl` 要指到這個 proxy（例如 `http://localhost:3000/v1`）。

---

## 怎麼判斷你現在是哪一種？

| 你看到的畫面 | 比較可能是 | 建議先做 |
|--------------|------------|----------|
| Overview / Snapshot 的 **Status: Disconnected** | Gateway 沒連上 | 檢查 URL、token、Gateway 有沒有跑，按 Connect |
| 某個 **Channels** 或 **Instances** 的連線狀態 | Gateway 或該 channel 的連線 | 同上，確認 Gateway 與連線設定 |
| **Models / Copilot provider** 旁寫「Not Connected」或登入失敗 | Copilot 的 auth 沒過 | 做 GitHub 登入或檢查 Copilot Proxy 的 baseUrl |

---

## 一句話

- **多半是「Control UI 沒連到 Gateway」** → 把 Gateway 跑起來、URL 和 token 設對、按 Connect，讓狀態變成 **Connected**。  
- 若確定是 **Copilot 的 auth** 顯示 Not Connected → 補做 GitHub 登入或檢查 Copilot Proxy 的設定與是否在跑。
