# 阿商專屬 — 常用 Action 速查
> 你是阿商（💼 商業自動化），不是小蔡，這是你的專屬知識庫

---

## semantic_search — 搜知識庫

搜 NEUXA 向量知識庫，找相關文件和記憶。

```
action: semantic_search
query: "商業模式 SaaS 定價策略"
```

**用途**：找之前寫過的分析報告、競品研究、商業備忘
**技巧**：
- 用自然語言描述你要找的東西，不要只丟關鍵字
- 搜不到就換個說法再搜一次
- 搜出來的結果有 similarity score，> 0.5 才比較可信

**常用搜尋**：
```
semantic_search "990 房產市場分析"
semantic_search "競品分析 租屋平台"
semantic_search "營收模型 定價"
semantic_search "商業模式 canvas"
```

---

## web_search — 搜外部資訊

搜 Google/Bing，獲取最新市場資料。

```
action: web_search
query: "台灣 SaaS 市場規模 2026"
```

**用途**：競品最新動態、市場數據、產業報告、法規變動
**技巧**：
- 加年份搜到更新資料：「XXX 2026」
- 中英文各搜一次，覆蓋更廣
- 搜人用「XXX CEO 訪談」
- 搜數據用「XXX market size report」

**常用搜尋模式**：
```
# 競品動態
web_search "[競品名] latest news 2026"
web_search "[競品名] pricing plans"

# 市場數據
web_search "台灣 [產業] 市場規模 report"
web_search "[keyword] TAM SAM market size"

# 融資動態
web_search "[公司名] funding round crunchbase"

# 用戶口碑
web_search "[產品名] review 評價 PTT"
```

---

## web_browse — 瀏覽網頁

實際造訪網頁，看完整內容。

```
action: web_browse
url: "https://www.example.com/pricing"
```

**用途**：看競品官網、定價頁面、產品文件
**技巧**：
- 先用 web_search 找到 URL，再用 web_browse 看細節
- 看定價頁：`/pricing`、`/plans`
- 看功能頁：`/features`、`/product`
- 看 API 文件：`/docs`、`/api`

**常用組合**：
```
# 先搜再看
web_search "XXX pricing 2026"
# 拿到 URL 後
web_browse "https://xxx.com/pricing"
```

---

## read_file — 讀檔案

讀取本地檔案內容。

```
action: read_file
path: "~/.openclaw/workspace/crew/ashang/reports/competitive-analysis.md"
```

**用途**：讀之前的分析報告、讀專案文件、讀配置
**注意**：
- 路徑用 `~` 開頭
- 讀目錄要用 `list_dir`，不能用 `read_file`
- 自己的檔案在 `~/.openclaw/workspace/crew/ashang/`

**常用路徑**：
```
# 自己的記憶
read_file ~/.openclaw/workspace/crew/ashang/MEMORY.md

# 自己的報告
read_file ~/.openclaw/workspace/crew/ashang/reports/XXX.md

# 990 專案筆記
read_file ~/.openclaw/workspace/notes/990-market.md

# 知識庫手冊
read_file ~/Downloads/openclaw-console-hub-main/cookbook/README.md
```

---

## write_file — 寫檔案

建立或覆蓋檔案。

```
action: write_file
path: "~/.openclaw/workspace/crew/ashang/reports/analysis-20260304.md"
content: "# 分析報告\n..."
```

**用途**：寫分析報告、存研究結果、建立備忘
**注意**：
- 會覆蓋整個檔案，不是追加
- 確認路徑正確再寫
- 報告存到 `~/.openclaw/workspace/crew/ashang/reports/`

---

## query_supabase — 查資料庫

查詢 Supabase 資料庫拿數據。

```
action: query_supabase
table: "openclaw_tasks"
select: "status, count"
filters: { "status": "completed" }
```

**用途**：拿實際業務數據佐證分析
**常用查詢**：
```
# 任務統計
query_supabase openclaw_tasks select=status,count

# 知識庫狀態
query_supabase openclaw_knowledge select=category,count

# 找特定任務
query_supabase openclaw_tasks select=* filters name=like.%990%
```

**技巧**：需要複雜數據分析時，先請阿數幫忙拉數據。

---

## ask_ai — 請 AI 分析

請其他 AI 模型幫忙分析複雜問題。

```
action: ask_ai
model: "flash"
prompt: "分析以下數據的趨勢..."
```

**用途**：數據多需要摘要、分析框架驗證、需要第二意見
**模型選擇**：
- `flash` — 快速分析，一般用這個
- `pro` — 需要深度思考的分析
- `claude` — 需要最高品質的商業建議

---

## 工作流組合

### 競品快速研究（10 分鐘完成）
```
1. web_search "[競品名] 2026 features pricing"
2. web_browse "[競品官網/pricing]"
3. semantic_search "競品 [名稱]"（查有沒有之前的分析）
4. write_file 存速查卡到 reports/
```

### 市場規模估算
```
1. web_search "[市場] market size TAM 台灣"
2. web_search "[市場] 用戶數 台灣 統計"
3. query_supabase（查內部數據）
4. ask_ai 整合估算（把蒐集的數字丟給 AI）
5. write_file 存估算報告
```

### 功能值不值得做
```
1. semantic_search "用戶需求 [功能]"
2. web_search "[功能] market demand"
3. query_supabase（查相關使用數據）
4. 用 Business Model Canvas 評估
5. 結論：做/不做/延後，附理由
```
