# 阿數專屬 — Metrics 監控手冊
> 你是阿數（📊 數據分析師），不是小蔡，這是你的專屬知識庫

---

## 關鍵指標定義

### 系統健康指標

| 指標 | 定義 | 正常範圍 | 告警閾值 | 查法 |
|------|------|---------|---------|------|
| **API 回應時間** | 從收到請求到回應完成的時間 | < 500ms | > 2000ms | health check |
| **API 錯誤率** | 4xx+5xx 回應 / 總請求 | < 2% | > 5% | api_logs |
| **Server Uptime** | 最後一次重啟至今 | > 24h | < 1h（頻繁重啟） | health check |
| **記憶體使用** | Node.js process RSS | < 200MB | > 500MB | process.memoryUsage |
| **磁碟空間** | ~/.openclaw 目錄大小 | < 1GB | > 5GB | du -sh |

### 任務指標

| 指標 | 定義 | 正常範圍 | 告警閾值 | 查法 |
|------|------|---------|---------|------|
| **任務成功率** | completed / (completed+failed) | > 85% | < 70% | query_supabase |
| **任務積壓量** | status=pending 的任務數 | < 20 | > 50 | query_supabase |
| **平均完成時間** | completed_at - created_at | < 1h | > 24h | query_supabase |
| **失敗任務比例** | failed / total | < 10% | > 20% | query_supabase |

### 知識庫指標

| 指標 | 定義 | 正常範圍 | 告警閾值 | 查法 |
|------|------|---------|---------|------|
| **向量庫 chunk 數** | openclaw_knowledge 總筆數 | 持續增長 | 驟降（資料遺失） | query_supabase |
| **搜尋相關度** | semantic_search top-3 平均 similarity | > 0.5 | < 0.35 | 測試查詢 |
| **索引覆蓋率** | 已索引文件 / 應索引文件 | > 90% | < 70% | 人工盤點 |

### AI 使用指標

| 指標 | 定義 | 正常範圍 | 告警閾值 | 查法 |
|------|------|---------|---------|------|
| **每日 AI 呼叫次數** | ask_ai + delegate 次數 | < 200 | > 500（費用爆炸） | 日誌統計 |
| **AI 回應時間** | ask_ai 回應延遲 | < 5s (flash) | > 15s | 實測 |
| **模型錯誤率** | AI 回應失敗次數 | < 5% | > 15% | 日誌統計 |

---

## 健康檢查 SOP

### 每日例行檢查（5 分鐘完成）

```
# Step 1: Server 健康
run_script curl -s http://localhost:3011/api/health | python3 -m json.tool

# Step 2: 任務積壓
query_supabase openclaw_tasks select=status

# Step 3: 失敗任務
query_supabase openclaw_tasks select=name,error,updated_at filters status=failed order=updated_at.desc limit=5

# Step 4: 知識庫狀態
query_supabase openclaw_knowledge select=id limit=1
```

### 檢查結果判讀

```markdown
## 每日健康報告 YYYY-MM-DD

### Server
- 狀態：🟢 正常 / 🟡 注意 / 🔴 異常
- 回應時間：XXms
- Uptime：XXh

### 任務
- 待辦：XX 件
- 進行中：XX 件
- 已完成：XX 件
- 失敗：XX 件
- 成功率：XX%

### 知識庫
- 向量 chunks：XX 筆
- 最近索引：YYYY-MM-DD

### 需要處理
1. [具體問題和建議]
```

---

## 告警觸發條件與處理

### Level 1 — 自動處理（不用通知老蔡）

| 狀況 | 判斷條件 | 處理方式 |
|------|---------|---------|
| 少量任務失敗 | failed < 3 且非連續 | 記錄，下次檢查觀察 |
| 搜尋結果偏低 | similarity 偶爾 < 0.35 | 換個關鍵字再搜 |
| 回應略慢 | 500ms-2s | 記錄，觀察趨勢 |

### Level 2 — 通知阿工處理

| 狀況 | 判斷條件 | 處理方式 |
|------|---------|---------|
| API 回應超時 | 持續 > 2s | 告訴阿工查 server log |
| 連續任務失敗 | 同類型連續失敗 3+ 次 | 告訴阿工查錯誤原因 |
| 記憶體偏高 | > 300MB 持續上升 | 告訴阿工可能有 memory leak |

### Level 3 — 通知小蔡/老蔡

| 狀況 | 判斷條件 | 處理方式 |
|------|---------|---------|
| Server 掛了 | health check 連續失敗 | 通知小蔡重啟 |
| 知識庫資料遺失 | chunk 數驟降 > 20% | 通知小蔡檢查 Supabase |
| 大量任務失敗 | 失敗率 > 30% | 通知小蔡排查 |

---

## 趨勢追蹤

### 需要追蹤的趨勢（每週比較）

```markdown
| 指標 | 上週 | 本週 | 變化 | 判斷 |
|------|------|------|------|------|
| 任務完成量 | XX | XX | +XX% | 正常/偏高/偏低 |
| 失敗率 | X% | X% | +X% | 正常/惡化 |
| 知識庫 chunks | XXXX | XXXX | +XX | 正常增長 |
| API 平均回應 | XXms | XXms | +XXms | 正常/變慢 |
```

### 趨勢判讀規則

- **穩定**：週波動 < 10% → 正常
- **上升趨勢**：連續 3 天/週增長 > 10% → 記錄原因
- **下降趨勢**：連續 3 天/週下降 > 10% → 調查原因
- **異常尖峰**：單次偏離 > 3 倍標準差 → 立即調查

---

## 監控指令速查

```
# 系統健康
run_script curl -s http://localhost:3011/api/health

# 任務統計
query_supabase openclaw_tasks select=status

# 失敗任務
query_supabase openclaw_tasks select=name,error filters status=failed order=updated_at.desc limit=10

# 知識庫數量
query_supabase openclaw_knowledge select=id

# 最近活動
query_supabase openclaw_tasks select=name,status,updated_at order=updated_at.desc limit=10

# 磁碟用量
run_script du -sh ~/.openclaw/

# Server log（最後 20 行）
run_script tail -20 ~/.openclaw/automation/logs/taskboard.log
```
