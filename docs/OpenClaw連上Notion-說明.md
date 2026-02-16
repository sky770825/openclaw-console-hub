# OpenClaw 如何連上 Notion

OpenClaw 沒有「Notion 頻道」（不像 Telegram），而是透過 **Notion API + Notion Skill** 讓 Agent 能讀寫你的 Notion 頁面與資料庫。

---

## 一、取得 Notion API 金鑰

1. 打開 [Notion 整合頁](https://www.notion.so/my-integrations)。
2. 新增一個整合，複製 **API Key**（通常以 `ntn_` 或 `secret_` 開頭）。

---

## 二、設定金鑰給 OpenClaw 用

任選一種方式，讓 OpenClaw / Agent 能拿到金鑰：

**方式 A：環境變數（建議）**

```bash
export NOTION_API_KEY="ntn_你的金鑰"
```

若用 Gateway，在啟動前設好，或寫進 `~/.openclaw/openclaw.json` 對應的 env 設定（若你的部署有支援）。

**方式 B：檔案（Skill 說明裡的寫法）**

```bash
mkdir -p ~/.config/notion
echo "ntn_你的金鑰" > ~/.config/notion/api_key
```

若 Skill 或你自訂的腳本是讀這個路徑，就會用到。

---

## 三、讓 Notion 頁面／資料庫允許整合存取

在 Notion 裡對要讓 OpenClaw 操作的**頁面或資料庫**：

1. 點右上角 **「…」** → **「Connect to」**（或「新增連線」）。
2. 選擇你剛建立的那個**整合**。

沒做這步的話，API 會回權限錯誤。

---

## 四、啟用 Notion Skill

OpenClaw 內建 **notion** Skill（`openclaw-main/skills/notion/SKILL.md`），裡面是 Notion API 用法與範例，Agent 會依此呼叫 API。

- **若用 OpenClaw 原始碼 / 同機 skills：**  
  通常已包含 `skills/notion`，只要 **NOTION_API_KEY** 有設、Agent 能載入 skills，就會用到。
- **若用 ClawHub 管理 skills：**
  ```bash
  clawhub install notion
  clawhub update --all
  ```
- **跨 Agent 共用：**  
  可把 Notion Skill 放到 `~/.openclaw/skills/notion/SKILL.md`（目錄結構與 SKILL.md 內容可參考 openclaw-main 裡的 notion skill）。

---

## 五、確認 Agent 有帶到金鑰

Notion Skill 的 metadata 標註需要 `NOTION_API_KEY`。請確認：

- 執行 Agent 的環境（例如跑 Gateway 的 shell、systemd、launchd）有設 `NOTION_API_KEY`，或
- 你用的啟動方式會讀 `~/.config/notion/api_key` 並當成 NOTION_API_KEY 傳給 Agent。

設好後，在對話裡請 Agent「用 Notion API 查／建頁面／查資料庫」等，就會依 Skill 文件去呼叫 Notion。

---

## 六、Notion 已經記錄好的資料 + 在 Notion 裡撰寫

你已經在 Notion 裡建好的頁面與資料庫，可以當成 **記憶庫** 使用；Agent 既能 **讀** 也能 **寫**。

### 讀取（Notion 已記錄好的資料）

- **搜尋**：請 Agent「用 Notion 搜尋關鍵字 / 某個頁面」→ 依 Notion Skill 呼叫 `POST /v1/search` 或 `GET /v1/pages/{id}`、`GET /v1/blocks/{id}/children` 取回內容。
- **本機 MEMORY.md 只放索引**：在 MEMORY.md 裡只列「關鍵字 → 對應 Notion 頁面 ID 或資料庫名稱」，不貼完整內容。需要時再請 Agent 依關鍵字去 Notion 查，或直接說「去 Notion 的 OOO 頁面看一下」。
- 這樣 **詳細內容都在 Notion**，本機不重複存，送給模型的輸入也可以保持精簡（按需才從 Notion 拉）。

### 撰寫（在 Notion 裡寫入新內容）

Notion API 支援寫入，Agent 可以：

- **新增頁面**：`POST /v1/pages`（在指定 parent 頁或 database 下建立新頁）。
- **在頁面後追加區塊**：`PATCH /v1/blocks/{page_id}/children`，例如追加 paragraph、heading、list。
- **更新頁面屬性**：`PATCH /v1/pages/{page_id}`，更新 properties（如 Status、Date、標題）。
- **在資料庫新增一筆**：`POST /v1/pages`，`parent: {"database_id": "xxx"}`, 填好 properties。

所以「記下來」的流程可以變成：**Agent 把新記憶寫進 Notion**（新頁或追加到既有頁），不必只寫本機 MEMORY_FULL。你只要在 Notion 裡預先建好「記憶／日誌」用的頁面或資料庫，並把該頁/資料庫 **Connect to** 你的整合，Agent 就能在裡面撰寫。

### 建議流程（與本機索引對齊）

1. **Notion**：放完整記錄（已記錄好的 + Agent 新寫入的）。
2. **本機 MEMORY.md**：只放「關鍵字 → Notion 頁面/資料庫 ID 或名稱」的索引，方便決定「要查哪一頁」。
3. **對話時**：問到過去的事 → Agent 先看 MEMORY.md 或直接搜尋 Notion → 用 API 讀取該頁/該段 → 再根據內容回答；要記新事 → Agent 用 API 在 Notion 裡新增或追加內容。

---

## 七、常用用途（FAQ 建議）

- **每個客戶一個 Notion 頁面**：放上下文、偏好、當前工作；在對話開始時請 Agent「去拿某個 Notion 頁面」當上下文。
- **查詢／建立資料庫項目**：依 Skill 裡的範例，請 Agent 搜尋、建立或更新 page / database（data source）。
- **記憶庫在 Notion**：已記錄好的資料在 Notion 讀取；新記憶也寫入 Notion，本機 MEMORY.md 只維護索引。

---

## 相關

- OpenClaw 內建 Notion Skill：`openclaw-main/skills/notion/SKILL.md`
- Notion API：<https://developers.notion.com>
- FAQ（Notion / HeyGen）：`openclaw-main/docs/zh-CN/help/faq.md` 搜尋「Notion」
