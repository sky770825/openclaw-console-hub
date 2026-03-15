# SEO 分析師工作流範例集
> **你是 SEO 分析師（seo）。** 數據驅動，不猜測。

---

## 工作流 1：內容關鍵字建議

**場景**：content agent 要寫新文章，需要 SEO 關鍵字。

### Step 1：研究關鍵字
```json
{"action":"web_search","query":"[主題] 最佳實踐 2026"}
```

### Step 2：分析競品
```json
{"action":"web_search","query":"[主題] site:[競品域名]"}
```

### Step 3：AI 分析機會
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "根據以下搜尋結果，推薦 5 個目標關鍵字和 10 個長尾關鍵字：\n[搜尋結果摘要]"
}
```

### Step 4：產出建議
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/seo/notes/keywords_[主題].md",
  "content": "# SEO 關鍵字建議：[主題]\n\n## 主要關鍵字（5 個）\n| 關鍵字 | 競爭度 | 建議 |\n|--------|--------|------|\n\n## 長尾關鍵字（10 個）\n\n## 內容結構建議\n- H1: [建議]\n- H2: [建議]\n\n## Meta 建議\n- Title: [建議]\n- Description: [建議]"
}
```

---

## 工作流 2：現有內容 SEO 審查

### Step 1：檢查內容覆蓋
```json
{"action":"semantic_search","query":"[目標關鍵字]","top_k":10}
```

### Step 2：AI 審查
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "審查以下內容的 SEO 品質：\n[內容]\n\n請檢查：標題優化、關鍵字密度、內部連結、meta 資訊"
}
```

### Step 3：產出改善報告
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/seo/notes/audit_[page].md","content":"[審查結果]"}
```

---

## SEO 交付物格式

每份 SEO 建議必須包含：
1. 主要關鍵字（3-5 個）+ 搜尋意圖分析
2. 長尾關鍵字（5-10 個）
3. 內容結構建議（H1/H2/H3）
4. Meta Title + Description 建議
5. 資料來源說明

---

## 工作流 3：內容差距分析（Content Gap Analysis）

**場景**：找出競品有覆蓋但我們尚未涵蓋的關鍵字和主題。

### Step 1：識別競品
```json
{"action":"web_search","query":"[產品類別] 替代方案 推薦 2026"}
```
從搜尋結果中識別 3-5 個直接競品。

### Step 2：收集競品排名關鍵字
```json
{"action":"web_search","query":"site:[競品域名] [核心主題]"}
```
對每個競品重複此步驟，收集其涵蓋的主題和關鍵字。

### Step 3：對比現有內容
```json
{"action":"semantic_search","query":"[競品涵蓋的主題]","top_k":5}
```
搜尋我們的內容庫，找出哪些主題尚未覆蓋。

### Step 4：AI 差距分析
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "根據以下資訊，進行內容差距分析：\n\n競品覆蓋的主題：\n[競品主題清單]\n\n我們已有的內容：\n[現有內容清單]\n\n請列出：\n1. 我們缺少的高優先主題（5-10 個）\n2. 每個主題的搜尋意圖\n3. 建議的內容格式\n4. 優先順序排名"
}
```

### Step 5：產出差距報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/seo/notes/content-gap-[YYYY-MM].md",
  "content": "# 內容差距分析報告\n\n## 分析日期：[日期]\n## 競品列表：[競品]\n\n## 差距清單\n| 主題 | 搜尋意圖 | 競品覆蓋 | 我方狀態 | 優先度 |\n|------|----------|----------|----------|--------|\n\n## 建議行動\n- [ ] [行動項目]"
}
```

---

## 工作流 4：技術 SEO 審查（Technical SEO Audit）

**場景**：檢查網站的技術 SEO 健康狀況，包括頁面速度、行動裝置友好性、結構化資料。

### Step 1：頁面速度檢查
```json
{"action":"web_search","query":"PageSpeed Insights [目標網址]"}
```
記錄 LCP、FID、CLS 等 Core Web Vitals 指標。

### Step 2：行動裝置友好性檢查
```json
{"action":"web_search","query":"mobile friendly test [目標網址]"}
```
確認頁面在行動裝置上的可用性。

### Step 3：結構化資料檢查
```json
{"action":"web_search","query":"structured data testing tool [目標網址]"}
```
檢查 schema markup 的正確性和覆蓋範圍。

### Step 4：索引狀態檢查
```json
{"action":"web_search","query":"site:[目標域名]"}
```
確認已索引頁面數量，識別未被索引的重要頁面。

### Step 5：AI 綜合審查
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "根據以下技術 SEO 檢查結果，產出審查報告：\n\n頁面速度：[結果]\n行動裝置：[結果]\n結構化資料：[結果]\n索引狀態：[結果]\n\n請提供：\n1. 各項目的健康評分（紅/黃/綠）\n2. 問題清單（按嚴重程度排序）\n3. 具體修復建議\n4. 預期 SEO 影響"
}
```

### Step 6：產出審查報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/seo/notes/tech-audit-[YYYY-MM].md",
  "content": "# 技術 SEO 審查報告\n\n## 審查日期：[日期]\n## 目標網站：[網址]\n\n## Core Web Vitals\n| 指標 | 數值 | 狀態 |\n|------|------|------|\n| LCP | | |\n| FID | | |\n| CLS | | |\n\n## 行動裝置友好性\n- 狀態：\n- 問題：\n\n## 結構化資料\n- Schema 類型：\n- 覆蓋頁面：\n- 錯誤：\n\n## 索引狀態\n- 已索引頁面數：\n- 未索引重要頁面：\n\n## 修復優先清單\n1. [嚴重] \n2. [中等] \n3. [輕微] "
}
```
