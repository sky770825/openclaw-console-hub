# 知識庫自動整合

以下來自 docs/ 摘要。

---

## Ollama-加速回覆

# 讓 Ollama 回覆速度加快
## 1. Bot 已做的調整
- **對話歷程**：只送最近 6 則訊息（約 3 回合），減少 token、加快推理。

---

## Ollama接另一個bot-說明

# Ollama 接另一個 Bot — 說明
同一個本機 Ollama 可以接多個 Telegram Bot，或讓其他程式（例如 Discord bot）共用連線。
---

---

## OpenClaw-17K-Token來源明細

# OpenClaw 17K Token 來源明細
OpenClaw Gateway 會把 **workspace 的 7 個 bootstrap 檔案**整份讀進 system prompt。目前這 7 個檔的**字數加總 ≈ 17,125 字元**；中文為主的內容大約 **1 字元 ≈ 1 token**，所以整體約 **~17K token** 就是來自這裡。
---

---

## OpenClaw-Copilot-auth-token-optional-說明

# OpenClaw Copilot「auth token optional」是什麼？
在 OpenClaw 裡，**GitHub Copilot** 這個 model provider 的 **auth token 是 optional（選填）** 的意思如下。
---

---

## OpenClaw-Copilot-顯示Not-Connected-排查

# OpenClaw Copilot 已打開卻顯示 Not Connected — 排查
> 「Copilot 已經打開」通常指在設定裡啟用了 **GitHub Copilot** 或 **Copilot Proxy** provider；「Not Connected」可能來自**兩種不同**的狀態，要分開看。
---

---

## OpenClaw-修復紀錄報告

# OpenClaw 修復紀錄報告
本文件整理本次會話中完成的修復與設定變更，供日後排查與修復時參考。
---

---

## OpenClaw-瀏覽器自動化安全指令

# OpenClaw 核心指令 v2（防護強化版）
> 身份：**小蔡**，瀏覽器自動化助手。  
> 優先序：**安全 > 老蔡指令 > 任務**。

---

## OpenClaw必學技能-檢查結果

# OpenClaw 必學技能 — 檢查結果
本表對照 [網路與官方-常見問題與必學技能](./網路與官方-常見問題與必學技能.md) 的「必學／強烈建議學」項目，依你目前環境與設定做勾選。  
檢查時間：依你執行檢查當日為準（本檔可重跑 `openclaw status` / `openclaw gateway status` 後手動更新）。

---

## OpenClaw技能-自我進化與升級資源

# OpenClaw 技能：自我進化與升級資源
整理可讓 Agent 自我進化、升級或強化記憶的**技能**與**外掛**，以及 GitHub / ClawHub 上的相關資源。
---

---

## OpenClaw接Ollama-檢查清單

# OpenClaw 接 Ollama 模型 — 檢查清單
你目前的設定**已經接好** OpenClaw ↔ Ollama，預設使用 **ollama/mistral**。
**重要**：Ollama、Google、OpenAI、Antigravity 等模型**都會保留**在設定裡，不會刪除；切換時只要改「預設模型（primary）」即可，其它模型仍可當 fallback 或手動切換。

---

## OpenClaw為什麼終端一直在跑

# 為什麼 OpenClaw 終端一直在讀寫／運行？
## 結論：有，OpenClaw 正在執行
你的環境裡 **OpenClaw Gateway 是常駐程式**，會一直跑、持續做連線與寫入，所以對應的那個終端會看起來「一直在動」。

---

## OpenClaw為什麼還是19K-Token-與已修正方式

# 為什麼傳輸還有 19K Token？與已修正方式
## 原因說明
OpenClaw **在程式層**會把 workspace 的幾個檔案**整份**讀進 system prompt，其中包含 **MEMORY.md**。也就是說：

---

## OpenClaw無法使用瀏覽器-解決步驟

# OpenClaw 無法使用瀏覽器 — 解決步驟
當 OpenClaw 無法使用瀏覽器時，多半是「連線／擴充／分頁掛上」其中一環沒接好。依下面順序檢查，通常可以恢復。
---

---

## OpenClaw環境檢查與建議

# OpenClaw 整體環境檢查與建議
檢查範圍：`~/.openclaw/` 主設定、workspace、cron、安全與敏感資訊。  
目的：找出可調整與可加強之處。

---

## OpenClaw透過CLI執行-問題時轉給Cursor解決

# OpenClaw 透過 CLI 執行 — 遇問題時轉給 Cursor 解決
目前要讓 **OpenClaw 透過 CLI 執行**。當 OpenClaw（小蔡）遇到問題時，由小蔡**把訊息發給 Cursor 的對話視窗**，並**提供路徑**，讓 **Cursor 的 AI** 幫忙排查與修復。
---

---

## OpenClaw透過Cursor-CLI編程

# 如何使用 OpenClaw 透過 Cursor CLI 執行 Cursor 並輸入訊息來進行編程
以下依「先裝 Cursor CLI → 終端直接跑 → 讓 OpenClaw 代為執行」的順序說明。
---

---

## OpenClaw連上Notion-說明

# OpenClaw 如何連上 Notion
OpenClaw 沒有「Notion 頻道」（不像 Telegram），而是透過 **Notion API + Notion Skill** 讓 Agent 能讀寫你的 Notion 頁面與資料庫。
---

---

## QMD記憶索引-連線與檢查

# QMD 記憶索引 — 連線與檢查
QMD 是 OpenClaw 的**選用記憶後端**（memory backend）。預設為 `builtin`（OpenClaw 內建向量索引）；若設為 `qmd`，則改由 **QMD 側車程式**負責索引與搜尋。
---

---

## Telegram傳給OpenClaw沒有反應-排查

# Telegram 傳給 OpenClaw 沒有反應 — 排查說明
## 可能原因總覽
| 情況 | 說明 | 對應做法 |

---

## bot沒回應-檢查

# Bot 沒回應 — 檢查清單（本機 Ollama）
## 不是「沒有 API」的問題
用 **ollama/llama3.2**（或 mistral、qwen2.5:14b）時，**不需要任何雲端 API**。

---

## ollama-launch-openclaw-說明

# ollama launch openclaw 說明
## 這個指令在做什麼
根據 [Ollama 文件](https://docs.ollama.com/integrations/openclaw)：

---

## ollama_bot2-開機自動啟動

# ollama_bot2 開機自動啟動（LaunchAgent）
已建立 **LaunchAgent**，登入後會自動執行 `ollama_bot2.py`，Telegram bot 會常駐。
---

---

## ollama與Claude-說明

# Ollama 與 Claude 說明
## 1. Ollama 裡沒有「Claude」模型
- **Ollama** 只能跑**開源、可下載**的模型（如 Mistral、Qwen、Llama），不能跑 Anthropic 的 **Claude**。

---

## 任務執行中斷與沒有回應-排查說明

# 任務執行中斷與沒有回應 — 排查說明
執行任務時**不確定會跑多久**，但**經常中途中斷、之後就沒有回應**，多半與逾時、連線或 session 長度有關。可依下列方向排查。
---

---

## 任務板執行功能與Agent控制-透過瀏覽器使用AI省Token

# 任務板執行功能與 Agent 控制 — 透過瀏覽器使用 AI 省 Token
說明兩件事：**讓 Agent 控制任務板（含執行功能）**，以及 **透過瀏覽器使用 ChatGPT / Claude 以節省 Token**。
---

---

## 大家經常遇到的OpenClaw問題

# 大家經常遇到的 OpenClaw 問題 — 總覽
下面依**主題**整理常見狀況與對應說明文件，方便快速對號入座。
> **延伸閱讀**：若想了解**網路與官方文檔**上大家常遇問題集中在哪、以及**必學／建議學的技能**，見 [網路與官方-常見問題與必學技能](./網路與官方-常見問題與必學技能.md)。

---

## 改用改過的OpenClaw-讓輕量模式生效

# 改用改過的 OpenClaw — 讓輕量模式生效
> 我們改的 Token 優化（一般聊天輕量、自動寫入輪數提示）在 **openclaw任務面版設計/openclaw-main**；你現在若用全域安裝的 `openclaw` 或從 **~/.openclaw/workspace** 跑，會是舊程式。照下面做就會改跑「有改過的那份」。
---

---

## 測試結果-目前跑的是哪一個OpenClaw

# 測試結果 — 目前跑的是哪一個 OpenClaw
> 已用指令實際檢查，結論如下。
---

---

## 瀏覽器控制經常失敗-排查說明

# 瀏覽器控制經常失敗 — 排查說明
控制瀏覽器（Chrome 擴充 / openclaw 內建瀏覽器）時若**經常失敗**，多半是下列幾類原因之一。依序檢查可縮小範圍。
---

---

## 開機自動啟動Ollama

# 開機自動啟動 Ollama（macOS）
已幫你建立 **LaunchAgent**，登入後會自動執行 `ollama serve`，不需手動開 Ollama app。
---

---

## 需要注意而容易忽略的檢查清單

# OpenClaw — 需要注意而容易忽略的檢查清單
依你目前環境整理：**安全、通道、Gateway、模型、日常** 幾類，方便定期看一眼、避免事後才發現問題。
---

---

## Gateway-外部連線-bind設定說明

# Gateway 改 bind 後機器人沒反應 — 原因與正確設定
## 為什麼改成 0.0.0.0 後 Bot 會失效？
有兩個常見原因：

---

## Gemini未知錯誤與英文回覆-說明

# Gemini 2.5 Flash：「An unknown error occurred」與只傳英文
## 你的模型都有保留
目前 **agents.defaults.models** 裡的模型全部保留，沒有刪除：

---

## RAG-定時更新說明

# RAG 定時更新說明
## 機制
- **consolidate_knowledge.py**：掃描 `docs/*.md`，萃取各檔摘要，寫入 `knowledge/knowledge_auto.md`

---

## Telegram任務指令-parser與webhook驗簽規格

# Telegram 任務指令 Parser 與 Webhook 驗簽規格
## 1) 目標
- 讓使用者在 Telegram 以單行指令交辦任務。

---

## Telegram任務橋接-Express範例啟動說明

# Telegram 任務橋接 Express 範例啟動說明
範例檔：
- `scripts/telegram-task-bridge-example.js`

---

## Token優化-更新紀錄

# Token 優化 — 更新紀錄
> 若你測出來還是約 18K，請先對照本紀錄：**你實際跑的是不是這份程式**、以及**是否用「純招呼」觸發輕量模式**。
---

---

## Token優化與後續建議

# Token 優化總覽與後續建議
> 目前已做的自動調節（一般聊天輕量、索引對齊、主題與比例）已經能把一般招呼壓到約 0.5K、任務時約 18～19K。以下是**還可再優化**與**你可能沒想到**的幾點建議。
---

---

## 不用API的本機模型-openclaw

# OpenClaw 不用 API 的本機模型方案
以下都是**本機運行、不需任何雲端 API key**的用法（Telegram bot token 仍需要，那是通道不是 LLM）。
---

---

## 動態載入與按需記憶-可行做法

# 動態載入上下文與按需記憶 — 有辦法解決嗎？
> 訴求：不要每輪都把 23K 上下文全送進去；改為「當前對話 + 必要系統指令 + 當前任務相關記憶」動態載入，且只有提到關鍵字、需要從 MEMORY 讀取時才把該部分記憶加入。  
> 結論：**部分已有、部分可做、部分需架構改動。**

---

## 同視窗上下文過長-處理方式

# 同視窗上下文過長 — 處理方式
同一視窗聊久了會累積很多上下文，五段、十段後常常已經換話題，舊內容仍佔用 Token。可以這樣處理：
---

---

## 回覆很慢與洩漏個人資訊-說明

# 回覆很慢 + 回覆裡出現一堆你的資訊
## 原因
1. **很慢**

---

## 執行延續性-主動恢復與完成流程

# 執行延續性 — 主動恢復與完成流程
**問題**：Agent 說「要去看網站」或「我去查一下」之後就沒有後續，必須等使用者再回一句，它才會繼續執行。執行缺乏延續性。
**目標**：讓 Agent 在**同一輪（或同一 run）內**把說要做
...(已截斷)

## 小蔡用網頁版AI省Token-子代理與瀏覽器控制

# 小蔡用網頁版 AI 省 Token — 子代理與瀏覽器控制
## 架構原則（老蔡要求）
- **OpenClaw 由小蔡負責**。小蔡是**主代理**（main agent），不是
...(已截斷)
