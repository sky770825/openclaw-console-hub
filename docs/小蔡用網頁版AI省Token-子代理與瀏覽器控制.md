# 小蔡用網頁版 AI 省 Token — 子代理與瀏覽器控制

## 架構原則（老蔡要求）

- **OpenClaw 由小蔡負責**。小蔡是**主代理**（main agent），不是子代理。
- **小蔡必須分配任務給 browser**：由小蔡決定何時、用哪個網頁版 AI，然後**派給 browser** 去執行。
- **browser 開啟網頁版**：實際開啟 ChatGPT / Claude / Gemini 網頁、輸入、取回覆的動作，由 **browser 工具**完成；小蔡負責下指令（navigate、type、snapshot 等）並整理結果給老蔡。
- 這樣**生成發生在網頁版**，省 OpenClaw Token；小蔡的角色是**協調與派發**，不自己用 OpenClaw 模型做長篇生成。

---

老蔡的想法：讓小蔡利用瀏覽器上的 ChatGPT、Claude、Gemini **網頁版** 來發想和生成內容，省 OpenClaw 的 Token，改用老蔡在這些平台的訂閱額度。

目前 OpenClaw 的實際狀況與**可實現做法**如下。

---

## 一、現狀：sessions_spawn 與瀏覽器的關係

- **sessions_spawn** 啟動的**子代理**，預設是使用 OpenClaw 內建配置的模型（例如你指定 `model="gemini-flash"`），在 OpenClaw 環境下跑任務，**仍然消耗 OpenClaw 的 API Token**。
- **瀏覽器**（browser 工具）是**主代理**可以用的：小蔡可以打開 ChatGPT / Claude / Gemini 網頁。但「讓子代理去控制瀏覽器、在網頁裡輸入提示、讀取回覆、整理結果」**不是** sessions_spawn 的內建能力，會牽涉到瀏覽器自動化與權限設計。

**結論**：  
要省 Token，關鍵是「**生成內容的那一步發生在網頁版**」，而不是再開一個用 OpenClaw 模型的子代理。所以**不需要先經過子代理**，讓**小蔡（主代理）直接控制頁面**就能達成。

---

## 二、如何實現：讓小蔡「控制頁面」用網頁版 AI

這裡的「小蔡」= OpenClaw 主代理（老蔡的對話對象）。  
目標：小蔡能**自己**打開網頁版 AI、輸入問題、拿到回覆、整理給老蔡，從而省下 OpenClaw Token。

### 做法一：小蔡直接用 browser 工具（現在就能做）

**不開子代理**，由小蔡自己用既有 **browser** 工具完成整段流程：

1. **browser_navigate**（或 open）→ 打開 https://claude.ai 或 https://chat.openai.com 或 Gemini 網頁版
2. **browser_snapshot** → 取得頁面結構，找到輸入框的 ref
3. **browser_type** / **browser_fill** → 在輸入框輸入老蔡的問題（或你幫老蔡整理好的 prompt）
4. 送出（例如點擊送出鈕）
5. 等待幾秒後 **browser_snapshot** → 取得回覆區塊
6. 從 snapshot 擷取回覆文字，整理後回給老蔡

這樣就是**小蔡在控制頁面**，不需要 sessions_spawn，也不需要子代理。  
省 Token 的原因：**真正生成內容的是網頁版 Claude/ChatGPT/Gemini**，OpenClaw 這邊只負責「操作瀏覽器 + 整理結果」，送進模型的只有你的系統提示、少量對話與工具輸出，不會把「長篇生成」算在 OpenClaw 的 token 上。

**你需要確認的**：  
小蔡的環境是否有 **browser** / **cursor-ide-browser** 這類 MCP 或技能可用。若有，在 **AGENTS.md** 或 **TOOLS.md** 寫清楚：「要省 Token 且問題適合時，用 browser 工具開 Claude / ChatGPT / Gemini 網頁，輸入問題、擷取回覆、整理給老蔡」，小蔡就會依指引執行。

---

### 做法二：做一個「網頁版 AI」Skill（進階、可選）

若希望小蔡**不要每次都自己下多步 browser 指令**，可以開發一個 **Skill**，把「開哪個站、輸入什麼、取回覆」包成一個動作：

- 例如：`ask_web_ai(prompt, provider="claude")`
- Skill 內部用 **Playwright** 或 **OpenClaw 的 browser 能力**，自動完成：開頁 → 輸入 prompt → 等回覆 → 擷取文字 → 回傳給小蔡
- 小蔡只需呼叫一次這個 Skill，再把回傳內容整理給老蔡

這樣仍然是**小蔡（主代理）在「控制」流程**，只是「控制頁面」的細節被封裝在 Skill 裡，不用子代理，也不會多一層 OpenClaw 模型呼叫。

---

### 關於「子代理 + 控制頁面」

若你希望的形式是「**小蔡開一個子代理，由子代理去控制頁面**」：

- **目前**：sessions_spawn 子代理預設**沒有** browser 工具，且子代理若仍用 gemini-flash 等，就還是會耗 OpenClaw Token；要省 Token 必須讓「生成」發生在網頁端。
- **未來可行方向**：  
  - OpenClaw 讓 **spawned session 也能使用 browser 工具**，並給子代理一個「只做瀏覽器流程、不呼叫 LLM」的輕量角色；或  
  - 子代理其實是**一個只跑「開網頁 → 輸入 → 取回覆」腳本/Skill 的 runner**，不自己呼叫模型，這樣就等同做法二，只是介面做成「子代理」的樣子。

所以：**要實現「小蔡可以執行並控制頁面」現在就能做，用「主代理 + browser 工具」即可；不必等子代理支援瀏覽器。**

---

## 三、給小蔡的指引（建議寫進 AGENTS.md / TOOLS.md）

可以明確寫給小蔡：

- 當老蔡的問題**適合用網頁版 AI**（單純問答、翻譯、草稿、不需讀 workspace 或本機工具）時，**不要**用 OpenClaw 的模型生成長回覆，改為：
  1. 用 **browser** 工具打開 **claude.ai** 或 **chat.openai.com** 或 **Gemini 網頁版**（依老蔡訂閱或偏好）；
  2. 在該頁面輸入問題（或整理後的 prompt）；
  3. 取得網頁上的回覆後，擷取文字、整理成易讀格式再回給老蔡。
- 這樣可以**大大節省 OpenClaw 的 Token**，改為使用老蔡在 ChatGPT / Claude / Gemini 的訂閱額度。

小蔡（OpenClaw 主代理）只要具備 browser 工具並看到這段指引，就能**直接控制頁面**達成上述流程，無需依賴 sessions_spawn 或子代理。

---

## 四、一句話總結

- **sessions_spawn 子代理**：目前是用 OpenClaw 模型跑任務，沒有內建「把任務丟給瀏覽器裡的網頁版 AI」。
- **要實現「小蔡用網頁版 AI 省 Token」**：讓**小蔡（主代理）直接用 browser 工具**打開 ChatGPT / Claude / Gemini 網頁、輸入問題、擷取回覆、整理給老蔡；不必也不依賴子代理。
- 進階可做 **Skill** 把「開頁 → 輸入 → 取回覆」包成一個呼叫；若未來要「子代理控制頁面」，需 OpenClaw 讓 spawned session 也能用 browser，或改由子代理觸發上述 Skill。
