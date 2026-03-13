---
tags: [dashboard, chart, KPI, data-visualization, Chart.js, analytics, real-time]
date: 2026-03-07
category: cookbook
---

# 65 — Dashboard 儀表板設計指南

> 設計高效的管理儀表板：KPI 統計卡片、Chart.js 互動圖表、數據表格、時間篩選、即時更新。
> 適用對象：全端工程師 / 接案團隊 / 需要數據後台的專案
> 最後更新：2026-03-07

---

## 目錄

1. [儀表板設計原則](#1-儀表板設計原則)
2. [統計卡片（KPI Cards）](#2-統計卡片kpi-cards)
3. [圖表類型選擇](#3-圖表類型選擇)
4. [Chart.js 實戰](#4-chartjs-實戰)
5. [數據表格](#5-數據表格)
6. [時間篩選器](#6-時間篩選器)
7. [即時更新策略](#7-即時更新策略)
8. [後端 API 設計](#8-後端-api-設計)
9. [代碼範例](#9-代碼範例)
10. [效能優化](#10-效能優化)
11. [Checklist](#11-checklist)

---

## 1. 儀表板設計原則

### 資訊層級金字塔

```
          ┌───────────┐
          │  行動指引  │  ← 最重要：需要立即處理的事
          │  (Alert)   │
          ├───────────┤
          │  KPI 數字  │  ← 關鍵指標，一眼看出好壞
          ├───────────┤
          │  趨勢圖表  │  ← 中層：看趨勢、找規律
          ├───────────┤
          │  明細表格  │  ← 底層：需要時再深入看
          └───────────┘
```

### 設計守則

| 原則 | 說明 | 反例 |
|------|------|------|
| 一目了然 | 進頁面 3 秒內知道狀態好壞 | 要滑很久才看到重點 |
| 可操作 | 看到問題能直接點進去處理 | 純展示，無法跳到細節 |
| 比較基準 | 數字要有對照（同期/目標） | 孤立的數字沒有意義 |
| 資訊密度 | 一個螢幕放關鍵內容，不過載 | 塞 20 張圖表互相干擾 |
| 色彩語義 | 綠=好 / 紅=差 / 黃=注意 | 隨機配色無含義 |

---

## 2. 統計卡片（KPI Cards）

### 卡片結構

```
┌─────────────────────┐
│  營收               │
│  NT$ 1,234,567      │  ← 主數字（大字、粗體）
│  ▲ 12.5% vs 上月    │  ← 趨勢比較（綠色=成長）
│  目標達成 82%        │  ← 達成率
└─────────────────────┘
```

### 卡片 HTML/CSS

```html
<style>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 4px; height: 100%;
  background: var(--accent-color, #6366f1);
}
.kpi-label { font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.kpi-value { font-size: 28px; font-weight: 700; color: #111827; }
.kpi-trend { font-size: 13px; margin-top: 8px; }
.kpi-trend.up { color: #10b981; }
.kpi-trend.down { color: #ef4444; }
.kpi-trend.flat { color: #6b7280; }
.kpi-progress { margin-top: 8px; }
.kpi-progress-bar {
  height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;
}
.kpi-progress-fill {
  height: 100%; border-radius: 3px; transition: width 0.6s ease;
}
</style>

<div class="kpi-grid" id="kpiGrid"></div>

<script>
function renderKPICard({ label, value, trend, trendLabel, target, current, accentColor }) {
  const trendClass = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  const trendArrow = trend > 0 ? '&#9650;' : trend < 0 ? '&#9660;' : '&#8212;';
  const pct = target ? Math.round((current / target) * 100) : null;

  return `
    <div class="kpi-card" style="--accent-color: ${accentColor || '#6366f1'}">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-trend ${trendClass}">
        ${trendArrow} ${Math.abs(trend)}% ${trendLabel || 'vs 上期'}
      </div>
      ${pct !== null ? `
        <div class="kpi-progress">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;">
            <span>目標達成</span><span>${pct}%</span>
          </div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill" style="width:${Math.min(pct, 100)}%;background:${accentColor || '#6366f1'}"></div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadKPIs() {
  const res = await fetch('/api/dashboard/kpis', {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  const kpis = await res.json();
  document.getElementById('kpiGrid').innerHTML = kpis.map(renderKPICard).join('');
}
</script>
```

---

## 3. 圖表類型選擇

| 要回答的問題 | 推薦圖表 | Chart.js type |
|-------------|----------|---------------|
| 隨時間的變化趨勢？ | 折線圖 | `line` |
| 不同項目的比較？ | 長條圖 | `bar` |
| 各部分佔比？ | 圓餅圖 / 甜甜圈 | `pie` / `doughnut` |
| 累計總量的組成？ | 堆疊面積圖 | `line` (fill) |
| 兩個變數的關係？ | 散佈圖 | `scatter` |
| 目標達成度？ | 儀表板 / 進度條 | `doughnut` (半圓) |

### 避免的錯誤

- 圓餅圖超過 6 個分類 → 改用長條圖
- 折線圖超過 5 條線 → 分成多張圖或用篩選
- 3D 圖表 → 永遠不要用，扭曲數據
- 雙 Y 軸 → 除非真的必要，否則分開畫

---

## 4. Chart.js 實戰

### 安裝

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3"></script>
```

### 折線圖 — 營收趨勢

```html
<canvas id="revenueChart" height="300"></canvas>

<script>
async function renderRevenueChart() {
  const res = await fetch('/api/dashboard/revenue-trend?period=monthly&months=12', {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  const data = await res.json();

  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: '營收',
        data: data.map(d => d.revenue),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }, {
        label: '上年同期',
        data: data.map(d => d.revenue_last_year),
        borderColor: '#d1d5db',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: NT$ ${ctx.parsed.y.toLocaleString()}`
          }
        },
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => 'NT$ ' + (v / 1000).toFixed(0) + 'K'
          }
        }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}
</script>
```

### 長條圖 — 來源比較

```javascript
new Chart(document.getElementById('sourceChart'), {
  type: 'bar',
  data: {
    labels: ['網站', '轉介', '陌生開發', '社群', '廣告'],
    datasets: [{
      label: '客戶數',
      data: [45, 32, 18, 27, 15],
      backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
      borderRadius: 6,
    }]
  },
  options: {
    responsive: true,
    indexAxis: 'y',  // 水平長條圖，標籤更好讀
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } }
  }
});
```

### 甜甜圈圖 — 佔比

```javascript
new Chart(document.getElementById('statusChart'), {
  type: 'doughnut',
  data: {
    labels: ['活躍', '非活躍', '流失'],
    datasets: [{
      data: [65, 25, 10],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      cutout: '70%',
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      // 中間顯示總數
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed}%`
        }
      }
    }
  }
});
```

---

## 5. 數據表格

### 功能需求

- 欄位排序（點擊表頭切換升/降序）
- 關鍵字篩選
- 分頁（前端分頁或後端分頁）
- 匯出 CSV

### 表格元件

```html
<div class="data-table-wrapper">
  <div class="table-toolbar">
    <input type="text" id="tableSearch" placeholder="搜尋..." class="table-search" />
    <button onclick="exportTableCSV()" class="btn-sm">匯出 CSV</button>
  </div>

  <table class="data-table" id="dataTable">
    <thead>
      <tr>
        <th data-sort="name" class="sortable">客戶 <span class="sort-icon"></span></th>
        <th data-sort="revenue" class="sortable">營收 <span class="sort-icon"></span></th>
        <th data-sort="deals" class="sortable">交易數 <span class="sort-icon"></span></th>
        <th data-sort="last_activity" class="sortable">最後活動 <span class="sort-icon"></span></th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="tableBody"></tbody>
  </table>

  <div class="table-footer">
    <span id="tableInfo">顯示 1-25 / 共 128 筆</span>
    <div class="table-pagination" id="tablePagination"></div>
  </div>
</div>

<script>
let tableData = [];
let tablePage = 1;
let tableSort = { key: 'revenue', order: 'desc' };
const PAGE_SIZE = 25;

// 排序
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    tableSort = {
      key,
      order: tableSort.key === key && tableSort.order === 'asc' ? 'desc' : 'asc'
    };
    renderTableData();
  });
});

// 搜尋（前端篩選）
document.getElementById('tableSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = tableData.filter(r =>
    r.name.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
  );
  renderTableRows(filtered);
});

// 匯出 CSV
function exportTableCSV() {
  const headers = ['客戶', '營收', '交易數', '最後活動'];
  const rows = tableData.map(r => [r.name, r.revenue, r.deals, r.last_activity]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderTableData() {
  const sorted = [...tableData].sort((a, b) => {
    const va = a[tableSort.key], vb = b[tableSort.key];
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return tableSort.order === 'asc' ? cmp : -cmp;
  });
  const start = (tablePage - 1) * PAGE_SIZE;
  renderTableRows(sorted.slice(start, start + PAGE_SIZE));
}
</script>
```

---

## 6. 時間篩選器

### 常見區間

```typescript
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week'
  | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

function getDateRange(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: now };
    case 'yesterday':
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { from: y, to: today };
    case 'this_week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart, to: now };
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'last_month':
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: lmStart, to: lmEnd };
    case 'this_quarter':
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { from: qStart, to: now };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: today, to: now };
  }
}
```

### 篩選器 UI

```html
<div class="date-filter">
  <div class="preset-buttons">
    <button class="preset active" data-preset="this_month">本月</button>
    <button class="preset" data-preset="last_month">上月</button>
    <button class="preset" data-preset="this_quarter">本季</button>
    <button class="preset" data-preset="this_year">今年</button>
    <button class="preset" data-preset="custom">自訂</button>
  </div>
  <div id="customRange" style="display:none;">
    <input type="date" id="dateFrom" />
    <span>~</span>
    <input type="date" id="dateTo" />
    <button onclick="applyCustomRange()">套用</button>
  </div>
</div>

<script>
document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const preset = btn.dataset.preset;
    if (preset === 'custom') {
      document.getElementById('customRange').style.display = 'flex';
    } else {
      document.getElementById('customRange').style.display = 'none';
      refreshDashboard(preset);
    }
  });
});

function refreshDashboard(preset) {
  const { from, to } = getDateRange(preset);
  const params = `from=${from.toISOString()}&to=${to.toISOString()}`;
  // 重新載入所有圖表和 KPI
  loadKPIs(params);
  loadCharts(params);
  loadTable(params);
}
</script>
```

---

## 7. 即時更新策略

### 策略比較

| 方式 | 延遲 | 複雜度 | 適用場景 |
|------|------|--------|----------|
| Polling | 5-30 秒 | 低 | 小流量、MVP |
| SSE | 即時 | 中 | 單向推送（通知、數據更新） |
| WebSocket | 即時 | 高 | 雙向互動（聊天、即時協作） |

### Polling（最簡單）

```javascript
// 每 30 秒刷新 KPI
setInterval(() => loadKPIs(), 30000);

// 頁面可見才刷新（省資源）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadKPIs();
});
```

### SSE（Server-Sent Events）

```typescript
// 後端 — Express
app.get('/api/dashboard/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(async () => {
    const kpis = await getKPIs();
    res.write(`data: ${JSON.stringify(kpis)}\n\n`);
  }, 10000);

  req.on('close', () => clearInterval(interval));
});
```

```javascript
// 前端 — 接收 SSE
const source = new EventSource('/api/dashboard/stream');
source.onmessage = (event) => {
  const kpis = JSON.parse(event.data);
  renderKPIs(kpis);
};
source.onerror = () => {
  // 自動重連（瀏覽器內建），也可手動
  console.log('SSE 連線中斷，瀏覽器會自動重連');
};
```

---

## 8. 後端 API 設計

### 端點清單

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/dashboard/kpis?from=&to= | KPI 統計數字 |
| GET | /api/dashboard/revenue-trend?period=monthly | 營收趨勢 |
| GET | /api/dashboard/source-breakdown | 來源佔比 |
| GET | /api/dashboard/pipeline-summary | 銷售管線統計 |
| GET | /api/dashboard/top-customers?limit=10 | Top N 客戶 |
| GET | /api/dashboard/recent-activities?limit=20 | 最新動態 |
| GET | /api/dashboard/stream | SSE 即時推送 |

### KPI API 範例

```typescript
app.get('/api/dashboard/kpis', async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to
    ? `AND created_at BETWEEN '${from}' AND '${to}'`
    : '';

  // 當期
  const [revenue, customers, deals, winRate] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(value), 0) AS total FROM deals WHERE stage = 'won' ${dateFilter}`),
    db.query(`SELECT COUNT(*) AS total FROM customers WHERE 1=1 ${dateFilter}`),
    db.query(`SELECT COUNT(*) AS total FROM deals WHERE 1=1 ${dateFilter}`),
    db.query(`SELECT
      COUNT(*) FILTER (WHERE stage = 'won')::float /
      NULLIF(COUNT(*) FILTER (WHERE stage IN ('won','lost')), 0) * 100 AS rate
      FROM deals WHERE 1=1 ${dateFilter}`),
  ]);

  // 上期（計算趨勢）
  // ...同樣查詢但時間往前推一個週期

  res.json([
    {
      label: '營收',
      value: `NT$ ${Number(revenue.rows[0].total).toLocaleString()}`,
      trend: 12.5,  // 計算 vs 上期
      accentColor: '#10b981',
    },
    {
      label: '新客戶',
      value: customers.rows[0].total,
      trend: 8.2,
      accentColor: '#6366f1',
    },
    {
      label: '成交率',
      value: `${(winRate.rows[0].rate || 0).toFixed(1)}%`,
      trend: -2.1,
      accentColor: '#f59e0b',
    },
    {
      label: '進行中交易',
      value: deals.rows[0].total,
      trend: 5.0,
      accentColor: '#8b5cf6',
    },
  ]);
});
```

---

## 9. 代碼範例

### 完整 Dashboard 頁面骨架

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f3f4f6; }
    .dashboard { max-width: 1280px; margin: 0 auto; padding: 24px; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .dashboard-header h1 { font-size: 24px; color: #111827; }
    .chart-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
    .chart-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .chart-card h3 { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="dashboard">
    <!-- Header + 時間篩選 -->
    <div class="dashboard-header">
      <h1>營運儀表板</h1>
      <div class="date-filter">
        <button class="preset active" data-preset="this_month">本月</button>
        <button class="preset" data-preset="last_month">上月</button>
        <button class="preset" data-preset="this_quarter">本季</button>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid" id="kpiGrid"></div>

    <!-- 圖表區 -->
    <div class="chart-grid">
      <div class="chart-card">
        <h3>營收趨勢</h3>
        <canvas id="revenueChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>客戶來源</h3>
        <canvas id="sourceChart"></canvas>
      </div>
    </div>

    <!-- 數據表格 -->
    <div class="chart-card">
      <h3>Top 客戶</h3>
      <table class="data-table" id="topCustomers">
        <thead>
          <tr>
            <th>客戶</th><th>營收</th><th>交易數</th><th>最後活動</th>
          </tr>
        </thead>
        <tbody id="topCustomersBody"></tbody>
      </table>
    </div>
  </div>

  <script>
    const API_KEY = 'your-api-key';

    async function initDashboard() {
      await Promise.all([
        loadKPIs(),
        renderRevenueChart(),
        renderSourceChart(),
        loadTopCustomers(),
      ]);
    }

    // 每 30 秒自動刷新 KPI
    setInterval(loadKPIs, 30000);

    initDashboard();
  </script>
</body>
</html>
```

---

## 10. 效能優化

| 策略 | 做法 |
|------|------|
| 快取 | KPI 結果 Redis 快取 60 秒，避免每次都查 DB |
| 預計算 | 每小時 cron 算好統計結果存 `dashboard_cache` 表 |
| 懶載入 | 圖表滾動到可視區域才初始化 |
| 資料聚合 | 不傳原始資料，後端先算好 aggregation |
| 分頁 | 表格走後端分頁，不要一次載入上千筆 |
| 取消請求 | 切換篩選時用 AbortController 取消前一次 fetch |

```typescript
// AbortController 範例
let controller = null;
async function loadWithCancel(url) {
  if (controller) controller.abort();
  controller = new AbortController();
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') return null; // 被取消，忽略
    throw e;
  }
}
```

---

## 11. Checklist

- [ ] KPI 卡片顯示正確數字 + 趨勢
- [ ] 折線圖（趨勢）、長條圖（比較）、甜甜圈（佔比）至少各一
- [ ] Chart.js 響應式 + tooltip 格式化
- [ ] 數據表格排序 / 搜尋 / 分頁 / 匯出 CSV
- [ ] 時間篩選器（預設區間 + 自訂日期）
- [ ] 即時更新策略（Polling / SSE 擇一）
- [ ] 後端 API 有日期篩選參數
- [ ] RWD 響應式（手機 1 欄，桌面 2-4 欄）
- [ ] 載入狀態（skeleton / spinner）
- [ ] 錯誤處理（API 失敗顯示提示，不要白屏）

---

> 好的儀表板不是塞滿圖表，而是讓使用者 3 秒內知道「現在狀況好不好」、「該去處理什麼」。
