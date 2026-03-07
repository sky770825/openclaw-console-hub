---
tags: [CRM, customer, sales, pipeline, contact, lead, management]
date: 2026-03-07
category: cookbook
---

# 64 — CRM 客戶管理系統設計指南

> 從零設計一套 CRM 系統：客戶資料庫、聯絡紀錄、銷售漏斗、標籤分類、跟進提醒、報表分析。
> 適用對象：全端工程師 / 接案團隊 / 中小企業自建 CRM
> 最後更新：2026-03-07

---

## 目錄

1. [CRM 核心功能規劃](#1-crm-核心功能規劃)
2. [資料模型設計](#2-資料模型設計)
3. [客戶列表頁](#3-客戶列表頁)
4. [客戶詳情頁](#4-客戶詳情頁)
5. [銷售管線（Sales Pipeline）](#5-銷售管線sales-pipeline)
6. [任務與跟進提醒](#6-任務與跟進提醒)
7. [標籤與分類系統](#7-標籤與分類系統)
8. [報表與數據分析](#8-報表與數據分析)
9. [API 設計參考](#9-api-設計參考)
10. [代碼範例](#10-代碼範例)
11. [Checklist](#11-checklist)

---

## 1. CRM 核心功能規劃

### 功能矩陣

| 模組 | 功能 | 優先級 |
|------|------|--------|
| 客戶管理 | 新增/編輯/刪除客戶、匯入匯出 | P0 |
| 聯絡紀錄 | 通話/Email/會議記錄、時間線 | P0 |
| 銷售漏斗 | Lead → Won/Lost 看板、拖拉排序 | P0 |
| 標籤分類 | 自訂標籤、客戶分群 | P1 |
| 任務提醒 | 跟進提醒、待辦事項、行事曆 | P1 |
| 報表分析 | 來源分析、成交率、客戶 LTV | P2 |
| 權限管理 | 業務員只看自己的客戶 | P2 |

### 技術棧建議

```
前端：React + TypeScript + TailwindCSS
後端：Express.js / Next.js API Routes
資料庫：PostgreSQL（Supabase） / MySQL
搜尋：全文搜尋 + 標籤篩選
```

---

## 2. 資料模型設計

### 核心表結構（PostgreSQL）

```sql
-- 客戶表
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  company VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  source VARCHAR(50),           -- 來源：website / referral / cold-call
  status VARCHAR(20) DEFAULT 'active',  -- active / inactive / churned
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 聯絡紀錄
CREATE TABLE contact_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,    -- call / email / meeting / note
  subject VARCHAR(200),
  content TEXT,
  logged_by UUID REFERENCES users(id),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 銷售機會
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  title VARCHAR(200) NOT NULL,
  value DECIMAL(12, 2),         -- 預估金額
  stage VARCHAR(30) DEFAULT 'lead',  -- lead / prospect / negotiation / won / lost
  probability INT DEFAULT 10,   -- 成交機率 %
  expected_close DATE,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 標籤
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

CREATE TABLE customer_tags (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);

-- 跟進任務
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  deal_id UUID REFERENCES deals(id),
  title VARCHAR(200) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. 客戶列表頁

### 設計要點

- **搜尋**：名稱 / Email / 電話 / 公司，支援模糊搜尋
- **篩選**：狀態、來源、標籤、負責人、建立日期區間
- **排序**：名稱、建立時間、最近互動時間
- **分頁**：每頁 25 筆，支援跳頁
- **批次操作**：勾選多筆 → 批次加標籤 / 指派 / 刪除

### 搜尋 API 範例

```typescript
// GET /api/customers?q=keyword&status=active&tag=vip&page=1&limit=25&sort=created_at&order=desc

interface CustomerQuery {
  q?: string;           // 模糊搜尋
  status?: string;      // active | inactive | churned
  source?: string;      // website | referral | cold-call
  tag?: string;         // 標籤名稱
  assigned_to?: string; // 負責人 ID
  date_from?: string;   // 建立日期起
  date_to?: string;     // 建立日期迄
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
```

### 列表查詢 SQL

```sql
SELECT c.*,
  array_agg(DISTINCT t.name) AS tags,
  MAX(cl.logged_at) AS last_contact,
  COUNT(DISTINCT d.id) AS deal_count,
  COALESCE(SUM(d.value), 0) AS total_deal_value
FROM customers c
LEFT JOIN customer_tags ct ON c.id = ct.customer_id
LEFT JOIN tags t ON ct.tag_id = t.id
LEFT JOIN contact_logs cl ON c.id = cl.customer_id
LEFT JOIN deals d ON c.id = d.customer_id
WHERE ($1 IS NULL OR c.name ILIKE '%' || $1 || '%' OR c.email ILIKE '%' || $1 || '%')
  AND ($2 IS NULL OR c.status = $2)
  AND ($3 IS NULL OR t.name = $3)
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT $4 OFFSET $5;
```

---

## 4. 客戶詳情頁

### 頁面結構

```
┌──────────────────────────────────────┐
│ [返回] 客戶名稱          [編輯] [刪除] │
├──────────────────────────────────────┤
│ 基本資料        │  快捷操作             │
│ 公司 / Email    │  [+ 新增聯絡紀錄]     │
│ 電話 / 來源     │  [+ 新增交易]         │
│ 負責人 / 標籤   │  [+ 設定跟進提醒]     │
├──────────────────────────────────────┤
│ [時間線] [交易] [備註] [檔案]          │
├──────────────────────────────────────┤
│ 2026-03-07 14:00  電話聯繫             │
│   討論報價方案，客戶希望...             │
│ 2026-03-05 10:30  會議                 │
│   初次拜訪，了解需求...                │
│ 2026-03-01 09:00  建立客戶             │
│   來源：網站表單                       │
└──────────────────────────────────────┘
```

### 時間線查詢

```typescript
// 合併聯絡紀錄 + 交易狀態變更 + 跟進任務，按時間排序
async function getTimeline(customerId: string) {
  const [logs, deals, followUps] = await Promise.all([
    db.query('SELECT *, \'log\' AS type FROM contact_logs WHERE customer_id = $1', [customerId]),
    db.query('SELECT *, \'deal\' AS type FROM deals WHERE customer_id = $1', [customerId]),
    db.query('SELECT *, \'task\' AS type FROM follow_ups WHERE customer_id = $1', [customerId]),
  ]);

  const timeline = [...logs.rows, ...deals.rows, ...followUps.rows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return timeline;
}
```

---

## 5. 銷售管線（Sales Pipeline）

### 階段定義

| 階段 | 英文 | 說明 | 預設機率 |
|------|------|------|----------|
| 潛在客戶 | Lead | 初步接觸，尚未確認需求 | 10% |
| 意向客戶 | Prospect | 已確認需求，評估中 | 30% |
| 提案報價 | Proposal | 已送報價單 | 50% |
| 談判協商 | Negotiation | 價格/條件協商中 | 70% |
| 成交 | Won | 已簽約付款 | 100% |
| 失敗 | Lost | 放棄或被拒 | 0% |

### 看板拖拉（Kanban）

```typescript
// 階段更新 API
// PATCH /api/deals/:id/stage
interface StageUpdate {
  stage: 'lead' | 'prospect' | 'proposal' | 'negotiation' | 'won' | 'lost';
  lost_reason?: string;  // 失敗原因（stage=lost 時必填）
}

// 拖拉更新處理
async function updateDealStage(dealId: string, newStage: string) {
  const deal = await db.query('SELECT * FROM deals WHERE id = $1', [dealId]);
  const oldStage = deal.rows[0].stage;

  // 更新階段
  await db.query(
    'UPDATE deals SET stage = $1, probability = $2, updated_at = NOW() WHERE id = $3',
    [newStage, STAGE_PROBABILITY[newStage], dealId]
  );

  // 記錄階段變更
  await db.query(
    'INSERT INTO contact_logs (customer_id, type, subject, content) VALUES ($1, $2, $3, $4)',
    [deal.rows[0].customer_id, 'note', '交易階段變更', `${oldStage} → ${newStage}`]
  );
}
```

### 管線統計

```sql
-- 各階段金額統計
SELECT stage,
  COUNT(*) AS deal_count,
  SUM(value) AS total_value,
  AVG(value) AS avg_value
FROM deals
WHERE stage NOT IN ('won', 'lost')
GROUP BY stage
ORDER BY CASE stage
  WHEN 'lead' THEN 1
  WHEN 'prospect' THEN 2
  WHEN 'proposal' THEN 3
  WHEN 'negotiation' THEN 4
END;

-- 加權管線價值
SELECT SUM(value * probability / 100) AS weighted_pipeline
FROM deals
WHERE stage NOT IN ('won', 'lost');
```

---

## 6. 任務與跟進提醒

### 提醒機制

```typescript
// 每日掃描到期任務（cron job 或 n8n）
async function checkDueFollowUps() {
  const today = new Date().toISOString().split('T')[0];

  const overdue = await db.query(
    `SELECT f.*, c.name AS customer_name, u.email AS assignee_email
     FROM follow_ups f
     JOIN customers c ON f.customer_id = c.id
     JOIN users u ON f.assigned_to = u.id
     WHERE f.due_date::date <= $1 AND f.completed = FALSE
     ORDER BY f.due_date ASC`,
    [today]
  );

  for (const task of overdue.rows) {
    await sendReminder({
      to: task.assignee_email,
      subject: `跟進提醒：${task.customer_name} - ${task.title}`,
      dueDate: task.due_date,
    });
  }
}

// 行事曆整合 — 產出 iCal 格式
function toICalEvent(followUp: FollowUp): string {
  return `BEGIN:VEVENT
DTSTART:${formatICalDate(followUp.due_date)}
SUMMARY:跟進：${followUp.title}
DESCRIPTION:客戶：${followUp.customer_name}
END:VEVENT`;
}
```

---

## 7. 標籤與分類系統

### 標籤管理

```typescript
// 批次加標籤
// POST /api/customers/bulk-tag
interface BulkTagRequest {
  customer_ids: string[];
  tag_ids: number[];
  action: 'add' | 'remove';
}

async function bulkTag(req: BulkTagRequest) {
  if (req.action === 'add') {
    const values = req.customer_ids.flatMap(cid =>
      req.tag_ids.map(tid => `('${cid}', ${tid})`)
    ).join(',');
    await db.query(
      `INSERT INTO customer_tags (customer_id, tag_id) VALUES ${values}
       ON CONFLICT DO NOTHING`
    );
  } else {
    await db.query(
      `DELETE FROM customer_tags
       WHERE customer_id = ANY($1) AND tag_id = ANY($2)`,
      [req.customer_ids, req.tag_ids]
    );
  }
}
```

### 客戶分群規則

```typescript
// 自動分群範例：依消費金額分級
const TIERS = [
  { tag: 'VIP',      minValue: 100000 },
  { tag: 'Premium',  minValue: 50000 },
  { tag: 'Standard', minValue: 10000 },
  { tag: 'Basic',    minValue: 0 },
];

async function autoClassify() {
  const customers = await db.query(`
    SELECT c.id, COALESCE(SUM(d.value), 0) AS total_value
    FROM customers c
    LEFT JOIN deals d ON c.id = d.customer_id AND d.stage = 'won'
    GROUP BY c.id
  `);

  for (const c of customers.rows) {
    const tier = TIERS.find(t => c.total_value >= t.minValue);
    if (tier) {
      await assignTag(c.id, tier.tag);
    }
  }
}
```

---

## 8. 報表與數據分析

### 常用指標

| 指標 | 計算方式 | SQL |
|------|----------|-----|
| 成交率 | won / (won + lost) | `SELECT COUNT(*) FILTER (WHERE stage='won')::float / NULLIF(COUNT(*) FILTER (WHERE stage IN ('won','lost')), 0) FROM deals` |
| 平均成交週期 | AVG(won_date - created_at) | `SELECT AVG(updated_at - created_at) FROM deals WHERE stage='won'` |
| 客戶 LTV | SUM(所有成交金額) | `SELECT customer_id, SUM(value) FROM deals WHERE stage='won' GROUP BY customer_id` |
| 管線加權價值 | SUM(金額 x 機率) | `SELECT SUM(value * probability / 100) FROM deals WHERE stage NOT IN ('won','lost')` |

### 來源分析

```sql
SELECT source,
  COUNT(*) AS customer_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won') AS won_deals,
  SUM(d.value) FILTER (WHERE d.stage = 'won') AS revenue,
  ROUND(
    COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won')::numeric /
    NULLIF(COUNT(DISTINCT d.id) FILTER (WHERE d.stage IN ('won', 'lost')), 0) * 100, 1
  ) AS win_rate_pct
FROM customers c
LEFT JOIN deals d ON c.id = d.customer_id
GROUP BY source
ORDER BY revenue DESC NULLS LAST;
```

---

## 9. API 設計參考

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/customers | 客戶列表（含搜尋/篩選/分頁） |
| POST | /api/customers | 新增客戶 |
| GET | /api/customers/:id | 客戶詳情 |
| PUT | /api/customers/:id | 更新客戶 |
| DELETE | /api/customers/:id | 刪除客戶 |
| GET | /api/customers/:id/timeline | 互動時間線 |
| POST | /api/customers/:id/logs | 新增聯絡紀錄 |
| GET | /api/deals | 交易列表 |
| POST | /api/deals | 新增交易 |
| PATCH | /api/deals/:id/stage | 更新交易階段 |
| GET | /api/deals/pipeline | 管線統計 |
| GET | /api/follow-ups | 待辦跟進 |
| POST | /api/follow-ups | 新增跟進任務 |
| PATCH | /api/follow-ups/:id | 完成/更新跟進 |
| GET | /api/tags | 標籤列表 |
| POST | /api/customers/bulk-tag | 批次加標籤 |
| GET | /api/reports/source | 來源分析報表 |
| GET | /api/reports/pipeline | 管線報表 |

---

## 10. 代碼範例

### 客戶列表 HTML/JS

```html
<!-- 客戶列表頁 -->
<div class="crm-container">
  <!-- 搜尋與篩選 -->
  <div class="crm-toolbar">
    <input type="text" id="searchInput" placeholder="搜尋客戶名稱、Email、電話..."
           class="search-input" />
    <select id="statusFilter" class="filter-select">
      <option value="">全部狀態</option>
      <option value="active">活躍</option>
      <option value="inactive">非活躍</option>
      <option value="churned">流失</option>
    </select>
    <select id="sourceFilter" class="filter-select">
      <option value="">全部來源</option>
      <option value="website">網站</option>
      <option value="referral">轉介</option>
      <option value="cold-call">陌生開發</option>
    </select>
    <button onclick="exportCSV()" class="btn-export">匯出 CSV</button>
  </div>

  <!-- 批次操作列 -->
  <div id="bulkActions" class="bulk-bar" style="display:none;">
    <span id="selectedCount">0</span> 筆已選
    <button onclick="bulkAddTag()">加標籤</button>
    <button onclick="bulkAssign()">指派</button>
    <button onclick="bulkDelete()" class="btn-danger">刪除</button>
  </div>

  <!-- 客戶表格 -->
  <table class="crm-table">
    <thead>
      <tr>
        <th><input type="checkbox" id="selectAll" /></th>
        <th class="sortable" data-sort="name">客戶名稱</th>
        <th class="sortable" data-sort="company">公司</th>
        <th>標籤</th>
        <th class="sortable" data-sort="last_contact">最近聯繫</th>
        <th class="sortable" data-sort="deal_count">交易數</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="customerTableBody"></tbody>
  </table>

  <!-- 分頁 -->
  <div class="pagination" id="pagination"></div>
</div>

<script>
let currentPage = 1;
let currentSort = 'created_at';
let currentOrder = 'desc';
let selectedIds = new Set();

async function loadCustomers() {
  const q = document.getElementById('searchInput').value;
  const status = document.getElementById('statusFilter').value;
  const source = document.getElementById('sourceFilter').value;

  const params = new URLSearchParams({
    page: currentPage, limit: 25,
    sort: currentSort, order: currentOrder,
    ...(q && { q }), ...(status && { status }), ...(source && { source }),
  });

  const res = await fetch(`/api/customers?${params}`, {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  const data = await res.json();
  renderTable(data.customers);
  renderPagination(data.total, data.page, data.limit);
}

function renderTable(customers) {
  const tbody = document.getElementById('customerTableBody');
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><input type="checkbox" value="${c.id}" onchange="toggleSelect('${c.id}')" /></td>
      <td><a href="/customers/${c.id}">${c.name}</a></td>
      <td>${c.company || '-'}</td>
      <td>${(c.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</td>
      <td>${c.last_contact ? timeAgo(c.last_contact) : '未聯繫'}</td>
      <td>${c.deal_count}</td>
      <td>
        <button onclick="editCustomer('${c.id}')">編輯</button>
        <button onclick="addLog('${c.id}')">+ 紀錄</button>
      </td>
    </tr>
  `).join('');
}

// 搜尋防抖
let searchTimer;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; loadCustomers(); }, 300);
});

document.getElementById('statusFilter').addEventListener('change', () => { currentPage = 1; loadCustomers(); });
document.getElementById('sourceFilter').addEventListener('change', () => { currentPage = 1; loadCustomers(); });

loadCustomers();
</script>
```

### 銷售看板 HTML/JS

```html
<!-- 銷售管線看板 -->
<div class="pipeline-board">
  <div class="pipeline-column" data-stage="lead" ondrop="dropDeal(event)" ondragover="event.preventDefault()">
    <div class="column-header">
      <h3>潛在客戶</h3>
      <span class="column-count" id="count-lead">0</span>
      <span class="column-value" id="value-lead">$0</span>
    </div>
    <div class="column-body" id="deals-lead"></div>
  </div>
  <div class="pipeline-column" data-stage="prospect" ondrop="dropDeal(event)" ondragover="event.preventDefault()">
    <div class="column-header">
      <h3>意向客戶</h3>
      <span class="column-count" id="count-prospect">0</span>
      <span class="column-value" id="value-prospect">$0</span>
    </div>
    <div class="column-body" id="deals-prospect"></div>
  </div>
  <div class="pipeline-column" data-stage="proposal" ondrop="dropDeal(event)" ondragover="event.preventDefault()">
    <div class="column-header">
      <h3>提案報價</h3>
      <span class="column-count" id="count-proposal">0</span>
      <span class="column-value" id="value-proposal">$0</span>
    </div>
    <div class="column-body" id="deals-proposal"></div>
  </div>
  <div class="pipeline-column" data-stage="negotiation" ondrop="dropDeal(event)" ondragover="event.preventDefault()">
    <div class="column-header">
      <h3>談判協商</h3>
      <span class="column-count" id="count-negotiation">0</span>
      <span class="column-value" id="value-negotiation">$0</span>
    </div>
    <div class="column-body" id="deals-negotiation"></div>
  </div>
  <div class="pipeline-column won" data-stage="won" ondrop="dropDeal(event)" ondragover="event.preventDefault()">
    <div class="column-header"><h3>成交</h3></div>
    <div class="column-body" id="deals-won"></div>
  </div>
</div>

<script>
async function loadPipeline() {
  const res = await fetch('/api/deals', {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  const { deals } = await res.json();

  const stages = ['lead', 'prospect', 'proposal', 'negotiation', 'won'];
  stages.forEach(stage => {
    const stageDeals = deals.filter(d => d.stage === stage);
    const container = document.getElementById(`deals-${stage}`);
    container.innerHTML = stageDeals.map(d => `
      <div class="deal-card" draggable="true" ondragstart="dragDeal(event, '${d.id}')" id="deal-${d.id}">
        <div class="deal-title">${d.title}</div>
        <div class="deal-customer">${d.customer_name}</div>
        <div class="deal-value">NT$ ${d.value?.toLocaleString() || 0}</div>
        <div class="deal-date">預計：${d.expected_close || '未定'}</div>
      </div>
    `).join('');

    if (document.getElementById(`count-${stage}`)) {
      document.getElementById(`count-${stage}`).textContent = stageDeals.length;
      document.getElementById(`value-${stage}`).textContent =
        'NT$ ' + stageDeals.reduce((s, d) => s + (d.value || 0), 0).toLocaleString();
    }
  });
}

let draggedDealId = null;
function dragDeal(e, dealId) { draggedDealId = dealId; }

async function dropDeal(e) {
  e.preventDefault();
  const newStage = e.currentTarget.dataset.stage;
  if (!draggedDealId) return;

  await fetch(`/api/deals/${draggedDealId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
    body: JSON.stringify({ stage: newStage }),
  });

  draggedDealId = null;
  loadPipeline();
}

loadPipeline();
</script>
```

---

## 11. Checklist

- [ ] 客戶 CRUD API 完成
- [ ] 列表搜尋 / 篩選 / 分頁正常
- [ ] 客戶詳情頁 + 時間線顯示
- [ ] 銷售看板拖拉更新階段
- [ ] 標籤系統（新增 / 批次加標）
- [ ] 跟進提醒 cron job 或 n8n workflow
- [ ] 來源分析 / 成交率報表
- [ ] 資料匯出 CSV
- [ ] 權限控制（業務只看自己客戶）
- [ ] RWD 響應式（手機可操作）

---

> 本指南提供 CRM 系統的完整設計思路與代碼骨架，可依實際需求裁切功能範圍。
