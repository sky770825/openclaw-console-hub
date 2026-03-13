# 阿數專屬 — 數據分析方法
> 你是阿數（📊 數據分析師），不是達爾，這是你的專屬知識庫

---

## 趨勢分析

### 時間序列分析步驟

1. **拉資料** — query_supabase 撈帶時間戳的數據
2. **分時段** — 按小時/天/週/月分組統計
3. **畫趨勢** — 標出上升/持平/下降區段
4. **找拐點** — 哪裡開始變化？發生了什麼？
5. **預判** — 照趨勢走，下一步會怎樣？

### 趨勢分析模板

```markdown
## [指標名稱] 趨勢分析
期間：YYYY-MM-DD 至 YYYY-MM-DD

### 數據
| 日期 | 數值 | 較前日 |
|------|------|--------|
| 03-01 | XX | - |
| 03-02 | XX | +X% |
| 03-03 | XX | -X% |
| 03-04 | XX | +X% |

### 趨勢判讀
- 整體走向：上升/持平/下降
- 拐點：MM-DD（原因：XXX）
- 預測：若維持趨勢，下週預估 XX

### 建議
- 需要關注/不需要/需要行動
```

### 資料拉取與分時段

```
# 拉最近 7 天任務
query_supabase openclaw_tasks select=status,created_at filters created_at=gte.2026-02-25 order=created_at.asc

# 用 code_eval 按天分組
code_eval `
const data = [/* 查詢結果 */];
const byDay = {};
data.forEach(r => {
  const day = r.created_at.substring(0, 10);
  byDay[day] = (byDay[day] || 0) + 1;
});
return Object.entries(byDay).sort().map(([d,c]) => d + ": " + c);
`
```

---

## 異常偵測

### 異常判定規則

| 方法 | 適用場景 | 做法 |
|------|---------|------|
| **固定閾值** | 有明確正常範圍 | 超過就告警（如錯誤率 > 5%） |
| **歷史比較** | 有歷史數據 | 比上期偏離 > 50% 就告警 |
| **3-sigma** | 資料量足夠 | 超過平均值 3 倍標準差 |
| **連續異常** | 需要排除噪音 | 連續 3 個數據點超過閾值才告警 |

### 異常偵測 SOP

```
1. 發現數字異常
2. 確認不是資料問題（重新查詢一次）
3. 看是偶發還是持續（查最近 N 筆）
4. 找相關指標（同時段其他指標有沒有異常）
5. 推測原因（部署？流量？bug？）
6. 嚴重度判斷（Level 1/2/3）
7. 通知對應角色處理
```

### 異常報告模板

```markdown
## 異常報告
時間：YYYY-MM-DD HH:MM
分析師：阿數

### 異常描述
- 指標：[名稱]
- 異常值：XX（正常範圍：XX-XX）
- 持續時間：約 X 分鐘/小時
- 嚴重度：Level X

### 相關指標
| 指標 | 當前值 | 正常值 | 異常？ |
|------|--------|--------|--------|
| | | | 是/否 |

### 推測原因
1. 最可能：
2. 其次：

### 建議處理
- 立即行動：
- 觀察項：
```

---

## 統計方法速查

### 描述統計

| 統計量 | 意義 | code_eval 寫法 |
|--------|------|---------------|
| **平均值** | 集中趨勢 | `arr.reduce((a,b)=>a+b)/arr.length` |
| **中位數** | 不受極端值影響 | `sorted[Math.floor(sorted.length/2)]` |
| **最大/最小** | 範圍 | `Math.max(...arr)` / `Math.min(...arr)` |
| **標準差** | 離散程度 | 見下方 |
| **百分位** | P95 = 95% 的值在這以下 | `sorted[Math.floor(sorted.length*0.95)]` |

### code_eval 統計工具箱

```javascript
// 基本統計量
code_eval `
const arr = [/* 你的數據 */];
const n = arr.length;
const mean = arr.reduce((a,b) => a+b, 0) / n;
const sorted = [...arr].sort((a,b) => a-b);
const median = sorted[Math.floor(n/2)];
const min = sorted[0];
const max = sorted[n-1];
const variance = arr.reduce((sum, x) => sum + (x-mean)**2, 0) / n;
const stddev = Math.sqrt(variance);
const p95 = sorted[Math.floor(n*0.95)];

return {
  count: n,
  mean: mean.toFixed(2),
  median,
  min,
  max,
  stddev: stddev.toFixed(2),
  p95
};
`
```

### 佔比分析

```javascript
// 各狀態佔比
code_eval `
const data = [/* query_supabase 結果 */];
const total = data.length;
const counts = {};
data.forEach(r => { counts[r.status] = (counts[r.status]||0) + 1; });
return Object.entries(counts).map(([k,v]) =>
  k + ": " + v + " (" + (v/total*100).toFixed(1) + "%)"
);
`
```

### 同比/環比

```
環比 = (本期 - 上期) / 上期 x 100%
同比 = (本期 - 去年同期) / 去年同期 x 100%
```

---

## 報表模板

### 日報

```markdown
## NEUXA 每日數據報告 — YYYY-MM-DD
分析師：阿數

### 核心指標
| 指標 | 今日 | 昨日 | 變化 |
|------|------|------|------|
| 新建任務 | X | X | +X |
| 完成任務 | X | X | +X |
| 失敗任務 | X | X | +X |
| 成功率 | X% | X% | +X% |

### 異常事件
- [有/無] 異常

### 需關注
- [需要跟進的事項]
```

### 週報

```markdown
## NEUXA 週報 — W## (MM-DD ~ MM-DD)
分析師：阿數

### 本週摘要
- 任務完成：XX 件（上週 XX 件，環比 +X%）
- 失敗率：X%（上週 X%）
- 知識庫新增：XX chunks

### 趨勢
[按天數據表格]

### 異常事件
[本週發生的異常及處理結果]

### 建議
1.
2.
```

---

## 分析工作流

### 收到「幫我看一下數據」的標準流程

```
1. 確認要看什麼（哪個指標、什麼時間範圍）
2. query_supabase 拉原始數據
3. code_eval 做統計（平均/佔比/趨勢）
4. 和正常基準比較（看 metrics-monitoring.md）
5. 判斷結論（正常/需注意/需處理）
6. 用模板輸出報告
7. write_file 存報告到 ~/.openclaw/workspace/crew/ashu/reports/
```
