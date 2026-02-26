# 知識庫自動整合

以下來自 docs/ 摘要。

---

## Gemini-2.5-Pro-重複回覆後無反應-排查

# Gemini 2.5 Pro 切換後重複回覆、接著無反應 — 原因與處理
> **說明：** 目前 OpenClaw 已移除 Gemini／Claude，僅使用 Kimi + Ollama。此文件為當時排查紀錄，供參考。見 [OPENCLAW-模型變更-僅Kimi與Ollama.md](./OPENCLAW-模型變更-僅Kimi與Ollama.md)。
## 現象

---

## OPENCLAW-Telegram與模型傳輸-深度檢查-2026-02-12

# Telegram 與 OpenClaw 模型傳輸 — 深度檢查報告（2026-02-12）
## 1. 檢查總覽
| 項目 | 狀態 | 說明 |

---

## OPENCLAW-排查報告-2026-02-12

# OpenClaw 可疑項目完整排查報告
檢查時間：2026-02-12  
範圍：`~/.openclaw/`、專案 `.env`、Gateway 日誌、agent 層設定。

---

## OPENCLAW-模型代碼檢查-2026-02-12

# OpenClaw 模型代碼檢查報告（2026-02-12）
## 1. 設定檔 `~/.openclaw/openclaw.json`
### 結構檢查：通過

---

## OPENCLAW-模型變更-僅Kimi與Ollama

# OpenClaw 模型變更說明（2026-02）
## 目前設定
**已移除：** Google Gemini、Anthropic Claude 的 provider 與金鑰。

---

## Ollama-Telegram回覆速度-實測與優化

# Ollama Telegram 回覆速度 — 實測與優化
## 實測結果（優化前）
- **System context**：約 32K tokens（knowledge_auto 過大）

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

## OpenClaw-API-Key與模型切換-讀取來源

# OpenClaw API Key 與模型切換：寫在哪、從哪讀
## 一、API Key 寫在哪裡／從哪裡讀
OpenClaw 會從以下來源解析各 provider 的 API key（優先順序依實作，通常 **config 內 key > 環境變數 > auth-profiles**）：

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

## OpenClaw-成本優化配置-Gemini主力

# OpenClaw 成本優化配置（Gemini 主力）
## 目前結構
| 層級   | 模型               | 用途                 |

---

## OpenClaw-瀏覽器自動化安全指令

# OpenClaw 核心指令 v2（防護強化版）
> 身份：**小蔡**，瀏覽器自動化助手。  
> 優先序：**安全 > 老蔡指令 > 任務**。

---

## OpenClaw-還原檔與備份位置

# OpenClaw 還原檔／備份檔位置
## 會影響設定的備份（建議刪除以免被還原）
| 路徑 | 說明 |

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

## OpenClaw沒反應與Telegram排查

# OpenClaw 沒反應 / Telegram 沒訊息 — 排查說明
## 一、OpenClaw 任務板「沒反應」
通常代表：**前端打不到後端 API**，畫面空白或按鈕無效。

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

## Telegram-設定排查

# Telegram 設定排查
針對 `~/.openclaw/openclaw.json` 與相關檔案的 Telegram 設定檢查。
---

---

## Telegram傳給OpenClaw沒有反應-排查

# Telegram 傳給 OpenClaw 沒有反應 — 排查說明
## 可能原因總覽
| 情況 | 說明 | 對應做法 |

---

## Telegram與OpenClaw-穩定性建議

# Telegram 與 OpenClaw 穩定性建議
> 目標：減少因代碼或設定變動導致整個系統掛掉，讓 Telegram 與 OpenClaw 更穩定。
---

---

## Telegram與點擊延遲排查

# Telegram 與點擊功能延遲排查
## 一、Telegram ↔ OpenClaw 回應慢
### 流程概述

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

## openclaw-json-ollama-fix

# 修復 openclaw.json 的 Ollama「Invalid input」錯誤
錯誤訊息：
Config invalid

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

## 模型不回話-排查步驟

# 模型不回話 — 排查步驟
當 OpenClaw 2.9 的模型沒有回話時（任務板執行沒輸出、或 Telegram/WhatsApp 沒回覆），依下面順序檢查。
---

---

## 測試結果-目前跑的是哪一個OpenClaw

# 測試結果 — 目前跑的是哪一個 OpenClaw
> 已用指令實際檢查，結論如下。
...(已截斷)
