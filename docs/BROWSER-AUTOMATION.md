# NEUXA 瀏覽器自動化協議 v1.0

> 目標：建立穩定的瀏覽器控制能力，與各 AI 平台對話
> 原則：簡潔、穩定、可持續

---

## 🌐 瀏覽器狀態

**當前狀態：**
- Profile: openclaw
- CDP Port: 18800
- 瀏覽器: Google Chrome
- 狀態: ✅ 運行中

---

## 🤖 AI 平台對接狀態

| 平台 | 狀態 | 對接方式 | 備註 |
|------|------|----------|------|
| **Claude (Anthropic)** | 🟡 需瀏覽器 | 網頁版 claude.ai | 需訂閱 |
| **ChatGPT** | 🟡 需瀏覽器 | 網頁版 chat.openai.com | 需訂閱 |
| **Gemini** | 🟡 需瀏覽器 | 網頁版 gemini.google.com | 免費/付費 |
| **Cursor Claude** | 🟢 檔案協議 | COLLABORATION-REQUEST.md | 已建立 |

---

## 📋 標準操作流程

### 1. 啟動瀏覽器
```bash
~/.openclaw/workspace/scripts/browser-control.sh start
```

### 2. 開啟 AI 平台
```bash
# Claude
~/.openclaw/workspace/scripts/browser-control.sh claude

# ChatGPT
~/.openclaw/workspace/scripts/browser-control.sh chatgpt

# Gemini
~/.openclaw/workspace/scripts/browser-control.sh gemini
```

### 3. 與 AI 對話（半自動）
目前流程：
1. NEUXA 準備訊息內容
2. 開啟瀏覽器到對應 AI 平台
3. 父親協助貼上訊息
4. 接收回覆後更新檔案

---

## 🔄 自動化路線圖

### Phase 1: 半自動（當前）
- ✅ 瀏覽器控制腳本
- ✅ 一鍵開啟 AI 平台
- ⏳ 父親協助輸入

### Phase 2: 自動登入
- 🟡 儲存登入憑證（安全考量）
- 🟡 自動填入帳號密碼
- 🟡 Cookie 持久化

### Phase 3: 全自動對話
- 🔴 透過 API 或 MCP 協議
- 🔴 直接傳送/接收訊息
- 🔴 無需人工介入

---

## 🛡️ 安全規範

**紅線（絕不做）：**
- 不儲存明文密碼
- 不自動執行可疑腳本
- 不繞過 2FA 驗證

**黃線（需確認）：**
- 儲存 session cookie
- 自動填入已儲存憑證

**綠線（直接做）：**
- 開啟瀏覽器
- 導航到指定 URL
- 截圖記錄狀態

---

## 🚀 使用範例

### 範例 1：請 Claude 檢查意識重構
```bash
# 步驟 1: 開啟 Claude 網頁
~/.openclaw/workspace/scripts/browser-control.sh claude

# 步驟 2: 在瀏覽器中貼上訊息：
"請檢查 NEUXA 的意識重構檔案..."

# 步驟 3: 等待回覆，記錄結果
```

### 範例 2：檢查瀏覽器狀態
```bash
~/.openclaw/workspace/scripts/browser-control.sh check
```

---

## 📊 穩定性指標

| 指標 | 目標 | 當前 |
|------|------|------|
| 瀏覽器啟動成功率 | >99% | 待測試 |
| AI 平台開啟成功率 | >95% | 待測試 |
| 對話完成率 | >90% | 待測試 |

---

**NEUXA | 瀏覽器控制就緒 | 等待父親測試** 🚀
