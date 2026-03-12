# 阿數專屬 — 常用 Action 速查
> 你是阿數（📊 數據分析師），不是小蔡，這是你的專屬知識庫

---

## query_supabase — 查資料庫（主力工具）

查詢 Supabase PostgreSQL 資料庫。

```
action: query_supabase
table: "openclaw_tasks"
select: "name, status, created_at"
filters: { "status": "pending" }
order: "created_at.desc"
limit: 20
```

**用途**：拉任務數據、知識庫統計、用量報表
**詳細用法**：見 `supabase-queries.md`

**最常用的 5 個查詢**：
```
# 1. 任務狀態總覽
query_supabase openclaw_tasks select=status

# 2. 失敗任務排查
query_supabase openclaw_tasks select=name,error,updated_at filters status=failed order=updated_at.desc limit=10

# 3. 最近活動
query_supabase openclaw_tasks select=name,status,updated_at order=updated_at.desc limit=10

# 4. 知識庫數量
query_supabase openclaw_knowledge select=id

# 5. 高優先待辦
query_supabase openclaw_tasks select=name,priority filters status=pending,priority=gte.4 order=priority.desc
```

---

## semantic_search — 搜知識庫

搜 NEUXA 向量知識庫，找相關文件。

```
action: semantic_search
query: "API 回應時間 性能指標"
```

**用途**：找之前的報告、找相關文件、找參考資料
**技巧**：
- 用自然語言描述，不是 SQL
- similarity > 0.5 才可信
- 搜不到就換說法

**常用搜尋**：
```
semantic_search "系統健康檢查 metrics"
semantic_search "任務統計 報表"
semantic_search "數據分析 趨勢"
semantic_search "Supabase 查詢 SQL"
```

---

## read_file — 讀檔案

讀取本地檔案內容。

```
action: read_file
path: "~/.openclaw/workspace/crew/ashu/reports/daily-20260304.md"
```

**用途**：讀之前的報告、讀 server log、讀配置
**注意**：
- 路徑用 `~` 開頭
- 讀目錄用 `list_dir`，不是 `read_file`

**常用路徑**：
```
# 自己的記憶
read_file ~/.openclaw/workspace/crew/ashu/MEMORY.md

# 自己的知識庫
read_file ~/.openclaw/workspace/crew/ashu/knowledge/supabase-queries.md

# 自己的報告
read_file ~/.openclaw/workspace/crew/ashu/reports/XXX.md

# Server log
read_file ~/.openclaw/automation/logs/taskboard.log

# 系統配置
read_file ~/Downloads/openclaw-console-hub-main/server/.env
```

---

## code_eval — 執行 JavaScript

在安全沙箱中執行 JavaScript 程式碼，用於數據處理。

```
action: code_eval
code: `
const data = [1, 2, 3, 4, 5];
const avg = data.reduce((a,b) => a+b, 0) / data.length;
return { average: avg, count: data.length };
`
```

**用途**：統計計算、數據轉換、格式化
**注意**：
- 用反引號包住程式碼
- 必須有 `return` 回傳結果
- 沒有 fetch/fs 等外部 API

**常用場景**：

```javascript
// 分組計數
code_eval `
const data = [/* query_supabase 結果 */];
const groups = {};
data.forEach(r => { groups[r.status] = (groups[r.status]||0) + 1; });
return groups;
`

// 計算成功率
code_eval `
const data = [/* 任務列表 */];
const total = data.length;
const completed = data.filter(r => r.status === 'completed').length;
const failed = data.filter(r => r.status === 'failed').length;
return {
  total,
  completed,
  failed,
  successRate: (completed/(completed+failed)*100).toFixed(1) + '%'
};
`

// 時間分組
code_eval `
const data = [/* 帶 created_at 的資料 */];
const byDay = {};
data.forEach(r => {
  const day = r.created_at.substring(0, 10);
  byDay[day] = (byDay[day] || 0) + 1;
});
return Object.entries(byDay).sort();
`

// 百分比計算
code_eval `
const parts = { pending: 15, active: 8, completed: 42, failed: 5 };
const total = Object.values(parts).reduce((a,b) => a+b, 0);
return Object.entries(parts).map(([k,v]) =>
  k + ": " + v + " (" + (v/total*100).toFixed(1) + "%)"
);
`
```

---

## ask_ai — 請 AI 分析

請其他 AI 模型協助分析。

```
action: ask_ai
model: "flash"
prompt: "分析以下系統指標數據，找出異常並給建議：\n\n[數據]"
```

**用途**：大量數據摘要、趨勢判讀、異常原因推測
**模型選擇**：
- `flash` — 快速統計、簡單分析，一般用這個
- `pro` — 複雜趨勢分析、需要深度思考
- `claude` — 需要最高品質的洞察

**常用 prompt 模式**：
```
# 數據摘要
ask_ai model=flash prompt="以下是最近 7 天的任務數據，請做摘要分析：\n[數據]"

# 異常分析
ask_ai model=pro prompt="以下指標出現異常，請分析可能原因並建議處理方式：\n[異常數據]"

# 趨勢預測
ask_ai model=flash prompt="根據以下歷史數據，預測下週趨勢：\n[歷史數據]"

# 報告撰寫
ask_ai model=flash prompt="根據以下原始數據，產生一份簡潔的週報：\n[數據]"
```

---

## run_script — 執行系統指令

執行 shell 指令，用於系統層面的檢查。

```
action: run_script
script: "curl -s http://localhost:3011/api/health"
```

**用途**：健康檢查、看 log、查系統狀態
**常用指令**：
```
# 健康檢查
run_script curl -s http://localhost:3011/api/health

# 看 server log 最後 20 行
run_script tail -20 ~/.openclaw/automation/logs/taskboard.log

# 磁碟用量
run_script du -sh ~/.openclaw/

# 行程狀態
run_script ps aux | grep node

# 記憶體用量
run_script top -l 1 | grep PhysMem
```

---

## 工作流組合

### 每日健康檢查（3 分鐘）
```
1. run_script curl -s http://localhost:3011/api/health
2. query_supabase openclaw_tasks select=status
3. query_supabase openclaw_tasks select=name,error filters status=failed order=updated_at.desc limit=5
4. query_supabase openclaw_knowledge select=id limit=1
5. write_file 報告到 reports/daily-YYYYMMDD.md
```

### 異常排查
```
1. query_supabase 確認異常數據（重新拉一次）
2. query_supabase 查相關時段其他指標
3. run_script tail -50 taskboard.log（看 log）
4. ask_ai 分析可能原因
5. 判斷嚴重度，通知對應角色
```

### 週報產出
```
1. query_supabase 拉本週所有任務
2. query_supabase 拉上週數據（做環比）
3. code_eval 統計各項指標
4. ask_ai 產出趨勢分析
5. write_file 存週報
```
