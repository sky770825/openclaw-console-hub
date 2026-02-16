# 大家經常遇到的 OpenClaw 問題 — 總覽

下面依**主題**整理常見狀況與對應說明文件，方便快速對號入座。

> **延伸閱讀**：若想了解**網路與官方文檔**上大家常遇問題集中在哪、以及**必學／建議學的技能**，見 [網路與官方-常見問題與必學技能](./網路與官方-常見問題與必學技能.md)。

---

## 一、Gateway／連線

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| `Invalid --bind`、Bot 不啟動 | `gateway.bind` 填了 `0.0.0.0`，應改為 `lan` 等 | [OpenClaw-修復紀錄報告](./OpenClaw-修復紀錄報告.md)、[Gateway-外部連線-bind設定說明](./Gateway-外部連線-bind設定說明.md) |
| `Refusing to bind gateway to lan without auth` | 非 loopback 時必須設 token | 同上修復紀錄 |
| `gateway token mismatch` | 客戶端沒帶 token 或與 config 不一致 | 同上修復紀錄 |
| `Gateway daemon command failed` | launchd 沒起來或 port 被佔用 | 同上修復紀錄 |
| Control UI 連不上 / health 失敗 | 本機連線需帶同一 token，或預設 dev-local | 同上修復紀錄 §3.3、storage |
| **`device identity required`**（Chrome 擴充 WS 被關） | 擴充連線沒帶 Gateway token | 同上修復紀錄、「瀏覽器控制經常失敗」 |
| 要從外網／LAN 連 Gateway | bind、auth、防火牆設定 | [Gateway-外部連線-bind設定說明](./Gateway-外部連線-bind設定說明.md) |

---

## 二、瀏覽器控制

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| **瀏覽器控制經常失敗**（連不到、no tab、tab not found、timeout） | Gateway 未開、擴充未掛分頁、token 未帶、targetId 失效 | [瀏覽器控制經常失敗-排查說明](./瀏覽器控制經常失敗-排查說明.md) |
| `targetUrl required`（navigate / open） | 呼叫端傳 `url` 未傳 `targetUrl` | 已修：同時接受 `url`／`targetUrl`，見修復紀錄 §3.2 |
| Chrome 擴充「沒有分頁連接」 | 要在**該分頁**點擴充圖示掛上（badge ON） | 瀏覽器控制經常失敗-排查說明 |

---

## 三、任務執行／Agent 行為

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| **任務執行經常中斷、沒有回應** | 逾時（Gateway/工具/模型）、連線斷、context 過長、Run 卡住 | [任務執行中斷與沒有回應-排查說明](./任務執行中斷與沒有回應-排查說明.md) |
| 跑一段時間就停、沒有錯誤 | 多為某層 timeout（如 10s／30s） | 同上 |
| 長對話後開始中斷或亂掉 | context 滿、compaction 觸發 | 同上（可調 compaction、reserveTokens） |

---

## 四、Bot／模型

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| **Bot 沒反應** | 預設模型無 API key、或 Ollama 沒在跑 | [bot沒回應-檢查](./bot沒回應-檢查.md)、修復紀錄 |
| **Telegram 傳給 OpenClaw 沒有反應** | 私訊要配對、群組要 @ 且可能需白名單、或主模型 429 導致 fallback 很慢 | [Telegram傳給OpenClaw沒有反應-排查](./Telegram傳給OpenClaw沒有反應-排查.md) |
| **An unknown error occurred** | 模型 API 失敗或工具錯誤被轉成通用訊息 | [Gemini未知錯誤與英文回覆-說明](./Gemini未知錯誤與英文回覆-說明.md) |
| **回覆很慢** | 本機 Ollama 本來就慢 | [回覆很慢與洩漏個人資訊-說明](./回覆很慢與洩漏個人資訊-說明.md) |
| 回覆裡出現一堆個人資訊（USER.md/MEMORY 被貼出） | 本機小模型易把 workspace 背景當回覆 | 同上；可改預設為雲端模型或精簡 USER.md |
| 只想用本機模型、不用 API | Ollama 等本機模型設定 | [不用API的本機模型-openclaw](./不用API的本機模型-openclaw.md)、[OpenClaw接Ollama-檢查清單](./OpenClaw接Ollama-檢查清單.md) |
| **每次溝通想控制在約 4K token 或更少** | 預設會帶較多歷史與 tool 結果（約 18K） | [每次溝通Token控制在4K或更少](./每次溝通Token控制在4K或更少.md) |
| **用 QMD 存記憶、每次只按需提取以省 token** | 歷史存 QMD，session 少帶歷史，用 memory_search 補足 | [用QMD記憶減少每次溝通的Token](./用QMD記憶減少每次溝通的Token.md) |
| Ollama 開機自動啟動 | launchd / 系統設定 | [開機自動啟動Ollama](./開機自動啟動Ollama.md)、[ollama-launch-openclaw-說明](./ollama-launch-openclaw-說明.md) |

---

## 五、記憶與索引（QMD）

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| **QMD 記憶索引有沒有連上？** | 需設 `memory.backend: "qmd"`、系統有 `qmd` 指令、索引正常 | [QMD記憶索引-連線與檢查](./QMD記憶索引-連線與檢查.md) |
| `openclaw memory status` 顯示 builtin | 未啟用 QMD 或 QMD 失敗後 fallback | 同上 |

---

## 六、安裝與指令

| 現象 | 一句話原因 | 對應文件 |
|------|-------------|----------|
| 終端找不到 `openclaw` 指令 | PATH 沒含 OpenClaw 安裝路徑 | openclaw-main 官方：Install、[Node 安裝與 PATH](/install/node#troubleshooting) |
| Linux 上 Chrome CDP 啟動失敗（port 18800） | 權限、display、Chrome 路徑等 | openclaw-main： [Browser Troubleshooting (Linux)](/tools/browser-linux-troubleshooting) |

---

## 七、預防性：需要注意而容易忽略的項目

若想**事先**避免常見坑，可照這份清單定期看一眼（安全、Telegram/通道、Gateway 更新、模型/Ollama、日常檢查）：

- **[需要注意而容易忽略的檢查清單](./需要注意而容易忽略的檢查清單.md)**

---

## 八、一份總表：修復紀錄常見錯誤

所有「錯誤訊息 ↔ 解法」的對照表與快速檢查清單，都在：

- **[OpenClaw-修復紀錄報告](./OpenClaw-修復紀錄報告.md)**  
  - § 五、常見錯誤與對照解法（表格）  
  - § 七、快速修復檢查清單  

若你遇到的錯誤訊息在總表裡，可直接對照該表與連結過去的細部說明。

---

## 九、依「情境」快速找

- **我要連上 Gateway / 用 Control UI**  
  → 修復紀錄（bind、token、device identity）、Gateway-外部連線-bind設定說明  
- **我要用瀏覽器工具 / Chrome 擴充**  
  → 瀏覽器控制經常失敗-排查說明、修復紀錄（targetUrl、device identity）  
- **任務跑一半就斷、或沒回應**  
  → 任務執行中斷與沒有回應-排查說明  
- **Bot 不回、或回很慢、或出現未知錯誤**  
  → bot沒回應-檢查、回覆很慢與洩漏個人資訊、Gemini未知錯誤與英文回覆  
- **我要用 QMD 記憶**  
  → QMD記憶索引-連線與檢查  
- **我要用本機 Ollama、不想用雲端 API**  
  → 不用API的本機模型-openclaw、OpenClaw接Ollama-檢查清單、開機自動啟動Ollama  

---

*本總覽整理自目前專案內既有說明；若你遇到未列出的問題，可先查 [OpenClaw-修復紀錄報告](./OpenClaw-修復紀錄報告.md) 與 openclaw-main 官方 docs（Gateway troubleshooting、Install、Tools）。*
