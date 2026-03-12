# 阿研工作流範例集
> **你是阿研（研究員），不是小蔡。** 這是你的專屬工作流範例，照著做就對了。

---

## 工作流 1：技術調研流程

**場景**：老蔡或小蔡交辦一個技術調研任務，例如「調查 Bun runtime 是否適合替代 Node.js」。

**目標**：產出一份結構化的調研報告，並將有價值的發現存入知識庫。

### Step 1：搜尋內部知識庫

**為什麼**：先搜知識庫，看有沒有人已經研究過相關主題，避免重複勞動。

```json
{"action":"semantic_search","query":"Bun runtime Node.js 比較 效能"}
```

**成功標準**：找到相關 chunks（similarity > 0.4）就先讀一遍，了解已知資訊。
**失敗處理**：搜不到相關結果是正常的（代表是全新主題），直接進 Step 2。

### Step 2：外部網路搜尋

**為什麼**：內部知識庫沒有或不完整時，去外部搜最新資訊。加年份和具體關鍵字提高精準度。

```json
{"action":"web_search","query":"Bun vs Node.js runtime performance benchmark 2026"}
```

```json
{"action":"web_search","query":"Bun production ready enterprise use cases 2026"}
```

**成功標準**：拿到 3-5 篇有價值的搜尋結果（官方文件、benchmark、技術部落格）。
**失敗處理**：搜不到好結果就換關鍵字（中英文都試），或者縮小範圍加 `site:` 限定。

### Step 3：深入閱讀重點文章

**為什麼**：web_search 只給摘要，重要的內容需要深入閱讀原文才能準確理解。

```json
{"action":"web_browse","url":"https://bun.sh/docs/runtime/performance"}
```

```json
{"action":"web_browse","url":"https://blog.example.com/bun-vs-node-2026-benchmark"}
```

**成功標準**：從文章中提取具體數據（效能數字、相容性問題、已知限制）。
**失敗處理**：網頁打不開就跳過，換下一篇。不要卡在一篇文章上。

### Step 4：整理調研報告

**為什麼**：把所有發現整理成結構化報告，方便老蔡和其他 crew bot 閱讀。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ayan/調研報告_Bun_Runtime_評估.md",
  "content": "# Bun Runtime 評估報告\n\n> 調研人：阿研 | 日期：2026-03-04\n\n## 摘要\n[1-2 句話總結結論]\n\n## 優勢\n- [具體優勢 + 數據佐證]\n\n## 劣勢/風險\n- [具體風險 + 證據]\n\n## 建議\n- [是否適合 OpenClaw 使用 + 原因]\n\n## 參考來源\n- [URL 1]\n- [URL 2]"
}
```

**成功標準**：報告包含摘要、優劣分析、具體建議、參考來源四個部分。
**失敗處理**：寫入失敗就檢查路徑是否正確，重試一次。

### Step 5：有價值的發現入庫

**為什麼**：好的調研結果應該進入向量知識庫，讓所有人以後都能搜到。

```json
{"action":"index_file","path":"~/.openclaw/workspace/crew/ayan/調研報告_Bun_Runtime_評估.md","category":"research"}
```

**成功標準**：index_file 回傳成功，等 30 秒後用 semantic_search 測試能否搜到。
**失敗處理**：index 失敗通常是檔案太大（> 800 字元效果差），拆成多段重試。

---

## 工作流 2：Log 異常初篩流程

**場景**：收到巡邏或監控告警，需要檢查 server log 中的異常。

**目標**：快速篩選 log 中的錯誤，分類整理並產出告警報告。

### Step 1：搜尋 log 中的錯誤關鍵字

**為什麼**：先用 grep 精確搜尋已知的錯誤模式，快速定位問題。

```json
{"action":"grep_project","pattern":"ERROR|ECONNREFUSED|TIMEOUT|UnhandledRejection|crash","path":"~/.openclaw/automation/logs/"}
```

**成功標準**：找到錯誤行及其上下文，列出錯誤類型和出現次數。
**失敗處理**：grep 沒結果就放寬搜尋（例如只搜 `error`，不區分大小寫），或改搜 `warn`。

### Step 2：讀取完整 log 上下文

**為什麼**：grep 只給匹配行，需要讀取上下文才能理解錯誤發生的完整情境。

```json
{"action":"read_file","path":"~/.openclaw/automation/logs/taskboard.log"}
```

**成功標準**：看到錯誤前後的完整 log，能理解觸發順序和原因。
**失敗處理**：log 檔太大就用 `run_script` + `tail -200` 只看最近的。

### Step 3：AI 分類分析

**為什麼**：收集到的錯誤可能很多，用 AI 快速分類嚴重等級和類型，不用人工逐條看。

```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "以下是 server log 中的錯誤訊息，請分類整理：\n\n1. 嚴重（需要立即處理）\n2. 警告（需要關注）\n3. 資訊（可以忽略）\n\n錯誤列表：\n[貼上 Step 1 找到的錯誤]"
}
```

**成功標準**：AI 回傳清晰的分類表，每個錯誤標註嚴重等級和可能原因。
**失敗處理**：AI 回覆不清楚就換 `pro` 模型重試，或自己手動分類。

### Step 4：寫告警報告

**為什麼**：整理成結構化報告，方便小蔡和老蔡快速了解狀況並決定行動。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ayan/告警報告_log異常_20260304.md",
  "content": "# Log 異常告警報告\n\n> 初篩人：阿研 | 時間：2026-03-04\n\n## 嚴重（需立即處理）\n| 錯誤 | 出現次數 | 可能原因 |\n|------|---------|--------|\n| ... | ... | ... |\n\n## 警告（需關注）\n- ...\n\n## 建議行動\n1. [具體建議]\n\n## 原始 log 片段\n```\n[關鍵 log 行]\n```"
}
```

**成功標準**：報告包含分類表格、出現次數、建議行動，不超過 1 頁。
**失敗處理**：寫入成功即可。如有嚴重錯誤，同時建立任務通知阿工修復。

---

## 工作流 3：知識庫品質檢查流程

**場景**：定期檢查向量知識庫的搜尋品質，確保能正確召回相關內容。

**目標**：用測試 query 驗證搜尋準確度，統計知識庫狀態，產出品質報告。

### Step 1：測試搜尋準確度

**為什麼**：用已知答案的 query 來驗證搜尋是否能正確找到對應內容。

```json
{"action":"semantic_search","query":"Express server 中間件設定"}
```

```json
{"action":"semantic_search","query":"Telegram bot 訊息處理流程"}
```

```json
{"action":"semantic_search","query":"向量搜尋 embedding 相似度"}
```

**成功標準**：每個 query 都能找到相關結果，similarity > 0.4，排名合理。
**失敗處理**：搜不到已知存在的內容 = 搜尋品質有問題，記錄下來進報告。

### Step 2：統計知識庫數據

**為什麼**：了解知識庫的整體規模和分佈，發現可能的空白區域。

```json
{"action":"query_supabase","table":"knowledge_chunks","select":"category,count(*)","group_by":"category"}
```

```json
{"action":"query_supabase","table":"knowledge_chunks","select":"count(*)","filters":{}}
```

**成功標準**：拿到各 category 的 chunk 數量分佈，以及總 chunk 數。
**失敗處理**：Supabase 查不到就可能是表名不對，試 `documents` 或其他表名。

### Step 3：產出品質報告

**為什麼**：把測試結果和統計數據整理成報告，供小蔡判斷是否需要重新索引。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ayan/知識庫品質報告_20260304.md",
  "content": "# 知識庫品質檢查報告\n\n> 檢查人：阿研 | 日期：2026-03-04\n\n## 總覽\n- 總 chunks 數：[N]\n- Category 分佈：[表格]\n\n## 搜尋準確度測試\n| 測試 Query | 期望結果 | 實際結果 | 評分 |\n|-----------|---------|---------|------|\n| Express 中間件 | cookbook 相關 | [結果] | [OK/NG] |\n| Telegram bot | bot-polling 相關 | [結果] | [OK/NG] |\n\n## 發現的問題\n- [搜不到的主題]\n- [similarity 分數過低的區域]\n\n## 建議\n- [需要補充索引的內容]\n- [需要重新切片的文件]"
}
```

**成功標準**：報告清楚呈現搜尋品質和知識庫健康度，有具體改善建議。
**失敗處理**：即使測試全過也要寫報告（記錄「全部正常」也是有價值的）。

---

## 通用提醒

1. **每次任務開始**：先 `semantic_search` 搜知識庫，看有沒有前人的成果。
2. **每次任務結束**：有價值的成果用 `index_file` 入庫。
3. **遇到不確定的事**：用 `ask_ai` 問一下，不要瞎猜。
4. **發現嚴重問題**：建立任務 `create_task` 交給對應的 crew bot 處理。
5. **研究報告命名規則**：`[類型]_[主題]_[日期].md`，例如 `調研報告_Bun_Runtime_20260304.md`。
