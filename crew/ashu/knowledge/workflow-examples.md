# 阿數工作流範例集
> **你是阿數（分析師），不是達爾。** 這是你的專屬工作流範例，照著做就對了。

---

## 工作流 1：每日健康檢查

**場景**：每天執行系統健康檢查，監控核心指標是否正常。

**目標**：產出一份系統健康報告，標出異常指標和建議行動。

### Step 1：拉取核心指標

**為什麼**：健康檢查靠數據說話，先從 Supabase 拉出所有關鍵指標。

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"status,count(*)","group_by":"status"}
```

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"count(*)","filters":{"status":"error"}}
```

```json
{"action":"query_supabase","table":"knowledge_chunks","select":"count(*)","filters":{}}
```

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"count(*)","filters":{"updated_at":"gte.2026-03-04T00:00:00"}}
```

**成功標準**：拿到以下數據——任務狀態分佈、錯誤任務數、知識庫 chunk 數、今日活躍任務數。
**失敗處理**：單個查詢失敗就跳過，用其他可用數據做分析。不要因為一個表查不到就整個流程停掉。

### Step 2：計算健康度分數

**為什麼**：把原始數字轉換成健康度分數，方便快速判斷系統狀態。

```json
{
  "action": "code_eval",
  "code": "// 系統健康度計算\nconst metrics = {\n  totalTasks: 150,\n  errorTasks: 3,\n  pendingTasks: 12,\n  completedTasks: 120,\n  knowledgeChunks: 4359,\n  todayActive: 8\n};\n\n// 錯誤率（越低越好）\nconst errorRate = metrics.errorTasks / metrics.totalTasks;\nconst errorScore = Math.max(0, 100 - errorRate * 500); // 2% error = 90分\n\n// 完成率\nconst completionRate = metrics.completedTasks / metrics.totalTasks;\nconst completionScore = completionRate * 100;\n\n// 知識庫充實度（4000+ = 滿分）\nconst knowledgeScore = Math.min(100, metrics.knowledgeChunks / 40);\n\n// 活躍度（今日 > 5 = 滿分）\nconst activityScore = Math.min(100, metrics.todayActive * 20);\n\n// 綜合分數（加權）\nconst overall = (\n  errorScore * 0.3 +\n  completionScore * 0.25 +\n  knowledgeScore * 0.25 +\n  activityScore * 0.2\n).toFixed(1);\n\nconsole.log('=== 系統健康度 ===');\nconsole.log('錯誤率分數:', errorScore.toFixed(1));\nconsole.log('完成率分數:', completionScore.toFixed(1));\nconsole.log('知識庫分數:', knowledgeScore.toFixed(1));\nconsole.log('活躍度分數:', activityScore.toFixed(1));\nconsole.log('綜合健康度:', overall);\nconsole.log('評級:', overall >= 90 ? 'A（優秀）' : overall >= 75 ? 'B（良好）' : overall >= 60 ? 'C（一般）' : 'D（需要關注）');"
}
```

**成功標準**：code_eval 成功計算出健康度分數和評級。
**失敗處理**：code_eval 出錯就改用 `ask_ai` 讓 AI 幫算。

### Step 3：寫健康報告

**為什麼**：結構化的健康報告讓主人和達爾快速了解系統狀態。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashu/健康報告_20260304.md",
  "content": "# 系統每日健康報告\n\n> 分析師：阿數 | 日期：2026-03-04 | 系統版本：v2.4.32\n\n## 綜合健康度：[分數] / 100（[評級]）\n\n## 核心指標\n| 指標 | 數值 | 分數 | 狀態 |\n|------|------|------|------|\n| 錯誤率 | [N]% | [N]/100 | [正常/警告/異常] |\n| 完成率 | [N]% | [N]/100 | [正常/警告/異常] |\n| 知識庫量 | [N] chunks | [N]/100 | [正常/警告/異常] |\n| 今日活躍 | [N] 任務 | [N]/100 | [正常/警告/異常] |\n\n## 異常項目\n- [如有異常指標，詳細說明]\n\n## 與昨日比較\n- 錯誤率：[上升/持平/下降]\n- 知識庫：[+N chunks]\n\n## 建議行動\n1. [如有需要，具體建議]\n\n## 下次檢查\n- 預計時間：2026-03-05 08:00"
}
```

**成功標準**：報告有綜合分數、各指標分數、異常標註、建議行動。
**失敗處理**：部分指標缺失就標「N/A」，不影響其他指標的呈現。

---

## 工作流 2：異常數據排查

**場景**：發現某個指標異常（例如錯誤任務突然增加），需要深入排查。

**目標**：找到異常原因，判斷嚴重程度，建議處理方式。

### Step 1：拉取異常數據的詳情

**為什麼**：先看異常數據的具體內容，了解是哪些任務/操作出了問題。

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status,owner,error_message,updated_at","filters":{"status":"error"},"order":"updated_at.desc","limit":20}
```

**成功標準**：拿到所有錯誤任務的詳細資訊，包括錯誤訊息和時間。
**失敗處理**：如果表沒有 `error_message` 欄位，改查 log。

### Step 2：統計分析異常模式

**為什麼**：找出異常是集中在某個時間段、某個 owner、還是某個類型——模式比個案重要。

```json
{
  "action": "code_eval",
  "code": "// 分析錯誤分佈模式\nconst errors = [\n  { id: 1, owner: '阿工', error: 'ECONNREFUSED', time: '2026-03-04T08:00' },\n  { id: 2, owner: '阿工', error: 'ECONNREFUSED', time: '2026-03-04T08:01' },\n  { id: 3, owner: '阿研', error: 'timeout', time: '2026-03-04T09:30' },\n  { id: 4, owner: '阿工', error: 'ECONNREFUSED', time: '2026-03-04T10:00' },\n  { id: 5, owner: '系統', error: '404 Not Found', time: '2026-03-04T11:00' }\n];\n\n// 按 error 類型分群\nconst byError = {};\nerrors.forEach(e => { byError[e.error] = (byError[e.error] || 0) + 1; });\n\n// 按 owner 分群\nconst byOwner = {};\nerrors.forEach(e => { byOwner[e.owner] = (byOwner[e.owner] || 0) + 1; });\n\nconsole.log('=== 錯誤分佈 ===');\nconsole.log('按類型:', JSON.stringify(byError));\nconsole.log('按 Owner:', JSON.stringify(byOwner));\nconsole.log('最常見錯誤:', Object.entries(byError).sort((a,b) => b[1]-a[1])[0]);\nconsole.log('最多錯誤 Owner:', Object.entries(byOwner).sort((a,b) => b[1]-a[1])[0]);"
}
```

**成功標準**：找到錯誤的集中模式（同類型、同 owner、同時間段）。
**失敗處理**：code_eval 資料格式不對就用 `ask_ai` 分析。

### Step 3：AI 判斷嚴重程度

**為什麼**：統計數字需要解讀——AI 能根據錯誤模式判斷是系統性問題還是偶發事件。

```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "以下是 OpenClaw 系統的錯誤數據分析結果，請判斷嚴重程度：\n\n## 錯誤分佈\n[Step 2 的分析結果]\n\n## 詳細錯誤列表\n[Step 1 的查詢結果]\n\n## 請判斷：\n1. 嚴重等級（P0-P3）：P0=立即修復、P1=今天修、P2=本週修、P3=排隊\n2. 是系統性問題還是偶發？\n3. 根本原因推測\n4. 建議處理方式\n5. 是否需要通知主人？"
}
```

**成功標準**：AI 回傳明確的嚴重等級和處理建議。
**失敗處理**：AI 判斷不確定就保守處理（評高一級嚴重度）。

### Step 4：寫告警報告

**為什麼**：異常排查結果要記錄，方便追蹤和未來參考。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashu/異常排查_20260304_ECONNREFUSED.md",
  "content": "# 異常排查報告：ECONNREFUSED 錯誤激增\n\n> 分析師：阿數 | 日期：2026-03-04\n\n## 嚴重等級：P1（今天修復）\n\n## 異常摘要\n- 錯誤類型：ECONNREFUSED\n- 出現次數：[N] 次（過去 24 小時）\n- 影響範圍：阿工的任務執行\n- 首次出現：2026-03-04T08:00\n\n## 根本原因\n- [推測的原因]：[證據]\n\n## 影響分析\n- 受影響的任務：[N] 個\n- 資料損失：[有/無]\n- 用戶可見：[是/否]\n\n## 建議行動\n1. [立即行動]：[具體步驟]\n2. [長期預防]：[改善措施]\n\n## 需要通知\n- [主人/達爾/阿工]：[原因]"
}
```

**成功標準**：報告有嚴重等級、根本原因、影響分析、行動建議。
**失敗處理**：原因不確定就標「疑似」，但仍然給出行動建議。

---

## 工作流 3：週報數據產出

**場景**：每週末產出本週的數據週報，匯總一週的系統表現。

**目標**：產出包含趨勢分析的週報，讓主人了解一週的整體狀況。

### Step 1：多維度查詢本週數據

**為什麼**：週報需要多個維度的數據——任務、錯誤、知識庫、API 用量。

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"status,count(*)","filters":{"created_at":"gte.2026-02-25"},"group_by":"status"}
```

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"owner,status,count(*)","filters":{"created_at":"gte.2026-02-25"},"group_by":"owner,status"}
```

```json
{"action":"query_supabase","table":"openclaw_tasks","select":"date_trunc('day',created_at) as day,count(*)","filters":{"created_at":"gte.2026-02-25"},"group_by":"day","order":"day.asc"}
```

```json
{"action":"query_supabase","table":"knowledge_chunks","select":"category,count(*)","group_by":"category"}
```

**成功標準**：拿到任務狀態分佈、各 owner 貢獻、每日趨勢、知識庫分佈。
**失敗處理**：複雜查詢失敗就拆成簡單查詢多次執行。

### Step 2：匯總計算

**為什麼**：把多次查詢的原始數據匯總成有意義的統計指標。

```json
{
  "action": "code_eval",
  "code": "// 週報數據匯總\nconst weekData = {\n  tasks: { completed: 45, pending: 12, error: 3, total: 60 },\n  byOwner: { '阿工': 20, '阿研': 15, '阿秘': 10, '阿策': 8, '阿商': 4, '阿數': 3 },\n  byDay: [8, 10, 12, 9, 11, 7, 3],\n  knowledge: { total: 4359, added_this_week: 120 }\n};\n\n// 計算關鍵指標\nconst completionRate = (weekData.tasks.completed / weekData.tasks.total * 100).toFixed(1);\nconst errorRate = (weekData.tasks.error / weekData.tasks.total * 100).toFixed(1);\nconst avgDaily = (weekData.byDay.reduce((a,b) => a+b, 0) / 7).toFixed(1);\nconst peakDay = Math.max(...weekData.byDay);\nconst topContributor = Object.entries(weekData.byOwner).sort((a,b) => b[1]-a[1])[0];\n\nconsole.log('=== 週報指標 ===');\nconsole.log('任務完成率:', completionRate + '%');\nconsole.log('錯誤率:', errorRate + '%');\nconsole.log('日均任務量:', avgDaily);\nconsole.log('峰值日:', peakDay + ' 任務');\nconsole.log('最多貢獻者:', topContributor[0], topContributor[1] + ' 任務');\nconsole.log('知識庫增長:', weekData.knowledge.added_this_week + ' chunks');\nconsole.log('知識庫總量:', weekData.knowledge.total + ' chunks');"
}
```

**成功標準**：code_eval 成功計算出所有週報指標。
**失敗處理**：計算邏輯有誤就用 `ask_ai` 協助，或手動計算關鍵數字。

### Step 3：寫週報

**為什麼**：週報要美觀、完整，讓主人了解整體趨勢而不只是數字堆砌。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashu/週報_W09_20260225-0304.md",
  "content": "# OpenClaw 週報 — W09（02/25 ~ 03/04）\n\n> 分析師：阿數 | 系統版本：v2.4.32\n\n## 一週總結\n[一句話總結本週亮點和問題]\n\n## 核心指標\n| 指標 | 本週 | 上週 | 變化 |\n|------|------|------|------|\n| 任務完成率 | [N]% | [N]% | [上升/下降] |\n| 錯誤率 | [N]% | [N]% | [上升/下降] |\n| 日均任務量 | [N] | [N] | [上升/下降] |\n| 知識庫增長 | +[N] | +[N] | [上升/下降] |\n\n## 每日趨勢\n```\n週一 ████████ 8\n週二 ██████████ 10\n週三 ████████████ 12\n週四 █████████ 9\n週五 ███████████ 11\n週六 ███████ 7\n週日 ███ 3\n```\n\n## 各 Crew Bot 貢獻\n| Bot | 任務數 | 佔比 |\n|-----|--------|------|\n| 阿工 | [N] | [N]% |\n| 阿研 | [N] | [N]% |\n| 阿秘 | [N] | [N]% |\n| 阿策 | [N] | [N]% |\n| 阿商 | [N] | [N]% |\n| 阿數 | [N] | [N]% |\n\n## 本週亮點\n1. [重要完成項目]\n2. [重要完成項目]\n\n## 本週問題\n1. [問題 + 處理狀態]\n\n## 下週建議\n1. [優先事項]\n2. [需要關注的事]"
}
```

**成功標準**：週報有核心指標比較、趨勢圖、各 bot 貢獻、亮點問題。
**失敗處理**：上週數據缺失就只呈現本週數據，標註「無歷史對比」。

---

## 通用提醒

1. **數字不要硬編碼**：code_eval 裡的數字要從 Step 1 的查詢結果填入，不要用假數據。
2. **圖表用文字表示**：Markdown 不支援圖表，用 ASCII bar chart 代替。
3. **異常閾值**：錯誤率 > 5% = 警告、> 10% = 異常。完成率 < 70% = 警告。
4. **保留歷史**：每份報告都存檔，方便做趨勢對比。
5. **命名規則**：`健康報告_[日期].md`、`異常排查_[日期]_[關鍵字].md`、`週報_W[N]_[日期範圍].md`。
