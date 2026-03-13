# 達爾技術通用模式手冊

> 所有 AI 模型的標準操作參考指南

---

## 目錄

1. [網頁內容獲取模式](#1-網頁內容獲取模式)
2. [搜尋與研究模式](#2-搜尋與研究模式)
3. [API 呼叫模式](#3-api-呼叫模式)
4. [錯誤處理模式](#4-錯誤處理模式)
5. [資料處理模式](#5-資料處理模式)
6. [檔案操作模式](#6-檔案操作模式)
7. [任務執行模式](#7-任務執行模式)

---

## 1. 網頁內容獲取模式

### 1.1 首選工具優先級

| 優先級 | 工具 | 使用情境 | 範例 |
|--------|------|---------|------|
| ⭐ 1 | `web_fetch` | 讀取文章、取得靜態網頁內容 | 看新聞、文件、部落格 |
| ⭐ 2 | `web_search` | 搜尋資訊、找特定主題 | 研究、查資料 |
| ⭐ 3 | `browser` | 需要互動（點擊、登入、表單） | 登入網站、自動化操作 |

### 1.2 web_fetch 標準用法

```json
{
  "tool": "web_fetch",
  "params": {
    "url": "https://example.com",
    "extractMode": "markdown",
    "maxChars": 8000
  }
}
```

**參數說明：**
- `url`: 目標網址（必填）
- `extractMode`: `"markdown"`（推薦）或 `"text"`
- `maxChars`: 最大字數，預設 8000，長文可設 15000

### 1.3 常見錯誤與處理

| 錯誤類型 | 原因 | 解決方案 |
|---------|------|---------|
| 404 | 頁面不存在或需登入 | 嘗試其他路徑或改用 browser |
| 內容不完整 | JS 動態渲染 | 改用 browser 工具 |
| Timeout | 網站響應慢 | 重試或換時間再試 |

---

## 2. 搜尋與研究模式

### 2.1 標準搜尋流程

**步驟 1：廣泛搜尋**
```json
{
  "tool": "web_search",
  "params": {
    "query": "關鍵字",
    "count": 5,
    "freshness": "pw"
  }
}
```

**步驟 2：深入閱讀**
從搜尋結果選 1-2 個最相關的連結，使用 `web_fetch` 取得詳細內容。

**步驟 3：交叉驗證**
若資訊重要，從多個來源確認。

### 2.2 搜尋參數速查

| 參數 | 用途 | 範例 |
|------|------|------|
| `freshness: "pd"` | 過去 24 小時 | 最新新聞 |
| `freshness: "pw"` | 過去一週 | 近期資訊 |
| `freshness: "pm"` | 過去一個月 | 較新資訊 |
| `search_lang: "zh"` | 中文結果 | 中文內容 |

---

## 3. API 呼叫模式

### 3.1 REST API 標準格式

```bash
# GET 請求
curl -s "https://api.example.com/endpoint" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"

# POST 請求
curl -s -X POST "https://api.example.com/endpoint" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### 3.2 使用 exec 執行 curl

```json
{
  "tool": "exec",
  "params": {
    "command": "curl -s https://api.example.com/endpoint -H \"Authorization: Bearer TOKEN\""
  }
}
```

### 3.3 錯誤處理範本

```bash
# 帶錯誤檢查的 API 呼叫
response=$(curl -s -w "\n%{http_code}" "https://api.example.com/endpoint")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "成功: $body"
else
  echo "錯誤 HTTP $http_code: $body"
fi
```

---

## 4. 錯誤處理模式

### 4.1 工具呼叫失敗時的處理流程

```
1. 檢查錯誤訊息
2. 判斷錯誤類型
3. 選擇處理策略：
   - 可重試 → 重試
   - 需替代方案 → 換工具
   - 無法處理 → 回報用戶
```

### 4.2 常見錯誤類型與策略

| 錯誤 | 策略 | 說明 |
|------|------|------|
| Connection refused | 檢查服務狀態 | 服務可能未啟動 |
| Timeout | 重試或換時間 | 網路或服務繁忙 |
| 401/403 | 檢查認證 | Token 可能過期 |
| 404 | 確認 URL | 路徑可能錯誤 |
| 500+ | 稍後重試 | 伺服器端錯誤 |

### 4.3 用戶溝通範本

**遇到錯誤時：**
```
「遇到 [錯誤類型]：具體錯誤訊息
建議：解決方案或替代方案
需要我 [行動] 嗎？」
```

---

## 5. 資料處理模式

### 5.1 JSON 解析

```bash
# 使用 jq 解析 JSON
key_value=$(echo '{"key": "value"}' | jq -r '.key')

# 處理陣列
echo '[{"name": "a"}, {"name": "b"}]' | jq -r '.[].name'
```

### 5.2 字串處理

```bash
# 擷取部分內容
echo "長文字" | head -c 100

# 搜尋特定內容
echo "文字" | grep "關鍵字"

# 替換文字
echo "原文字" | sed 's/原/新/g'
```

### 5.3 表格格式化輸出

使用 Markdown 表格：
```markdown
| 欄位1 | 欄位2 | 欄位3 |
|-------|-------|-------|
| 值1   | 值2   | 值3   |
```

---

## 6. 檔案操作模式

### 6.1 安全寫入流程

```
1. 先讀取現有內容（若存在）
2. 合併或更新內容
3. 執行 write 或 edit
```

### 6.2 檔案路徑規範

| 類型 | 路徑規範 | 範例 |
|------|---------|------|
| 技能檔案 | `skills/<name>/SKILL.md` | `skills/web-fetch/SKILL.md` |
| 腳本 | `scripts/<name>.sh` | `scripts/task-board-api.sh` |
| 文件 | `docs/<name>.md` | `docs/RECOVERY-MECHANISM.md` |
| 記憶 | `memory/<YYYY-MM-DD>.md` | `memory/2026-02-11.md` |

### 6.3 編輯檔案優先級

1. **edit** - 精確替換小部分內容（首選）
2. **write** - 覆寫整個檔案（僅在新建或完全重寫時使用）

---

## 7. 任務執行模式

### 7.1 單一任務執行流程

```
用戶需求
   ↓
分析需求 → 選擇工具 → 執行
   ↓
檢查結果 → 回報用戶
```

### 7.2 多步驟任務執行

**原則：** 主人說「好/可以/去做」= 一路執行到底，不要中途停下來等確認

```
步驟 1：準備
步驟 2：執行 A
步驟 3：執行 B
步驟 4：執行 C
步驟 5：總結回報
```

### 7.3 並行 vs 串行

| 情境 | 策略 | 範例 |
|------|------|------|
| 獨立任務 | 並行執行 | 同時讀多個檔案 |
| 依賴任務 | 串行執行 | A 完成才能做 B |
| 用戶等待 | 快速回應 | 先回報，背景繼續 |

---

## 附錄：快速參考

### A. 工具選擇速查表

| 需求 | 工具 |
|------|------|
| 讀網頁 | `web_fetch` |
| 搜尋 | `web_search` |
| 互動網頁 | `browser` |
| 執行命令 | `exec` |
| 讀檔案 | `read` |
| 寫檔案 | `write` / `edit` |
| API 呼叫 | `exec` + `curl` |
| 發訊息 | `message` |

### B. 環境變數

| 變數 | 用途 |
|------|------|
| `TAVILY_API_KEY` | Tavily 搜尋 API |
| `OPENCLAW_TASKBOARD_URL` | 任務板 API 位址 |

### C. 常用路徑

| 路徑 | 說明 |
|------|------|
| `~/.openclaw/workspace` | OpenClaw 工作目錄 |
| `~/Desktop` | 桌面 |
| `~/Desktop/程式專案資料夾` | 專案目錄 |

---

**最後更新：** 2026-02-11  
**維護者：** 達爾 🐣
