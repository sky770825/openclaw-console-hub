# 巡查官通知範本（Notification Templates）
> 所有巡查通知的標準格式，確保訊息一致、可讀、可追蹤。

---

## 1. 任務阻塞通知

**用途**：任務因依賴或其他原因卡住時通報。

### 格式
```
[PATROL] 任務阻塞警告

任務：{task_name} (#{task_id})
負責人：{owner}
狀態：{status}
阻塞時長：{duration}
阻塞原因：{reason}
建議動作：{recommended_action}

巡查時間：{timestamp}
```

### 範例
```
[PATROL] 任務阻塞警告

任務：部署首頁改版 (#T-0142)
負責人：content
狀態：running（無進展）
阻塞時長：45 分鐘
阻塞原因：等待 review agent 審查結果，review 目前無回應
建議動作：請阿策重新排程或指派其他 agent 先行處理

巡查時間：2026-03-14 14:30
```

---

## 2. 每小時狀態摘要

**用途**：定時彙報系統整體狀態。

### 格式
```
[PATROL] 每小時狀態報告 — {time_range}

系統狀態：{overall_status}

任務概況：
  - 執行中：{running_count}
  - 已完成：{done_count}（本小時）
  - 失敗：{failed_count}
  - 待處理：{pending_count}

Agent 狀態：
  - 正常：{healthy_agents}
  - 異常：{unhealthy_agents}

異常事項：
{anomalies_list}

下次巡查：{next_patrol_time}
```

### 範例
```
[PATROL] 每小時狀態報告 — 14:00~15:00

系統狀態：正常（1 項注意）

任務概況：
  - 執行中：3
  - 已完成：5（本小時）
  - 失敗：0
  - 待處理：7

Agent 狀態：
  - 正常：ace, content, seo, growth, review, journal
  - 異常：無

異常事項：
  - [注意] 任務「SEO 關鍵字研究」已執行 1.5 小時，接近 complex 任務上限

下次巡查：15:15
```

---

## 3. 事件警報

**用途**：發現安全事件、部署失敗等需要立即注意的狀況。

### 格式
```
[PATROL] {severity} 事件警報

事件類型：{event_type}
嚴重等級：{P0/P1/P2}
偵測時間：{timestamp}

描述：
{description}

影響範圍：
{affected_scope}

已採取措施：
{actions_taken}

需要：{who} 在 {deadline} 前回應
```

### 範例
```
[PATROL] P1 事件警報

事件類型：部署失敗
嚴重等級：P1
偵測時間：2026-03-14 16:22

描述：
前端服務 build 失敗，錯誤為 TypeScript 型別不符（src/components/Hero.tsx:42）

影響範圍：
前端部署被阻擋，現行版本仍正常運作

已採取措施：
- 已通報 agong
- 已建立追蹤任務 #T-0158

需要：agong 在 17:22 前回應
```

---

## 4. All-Clear 通知

**用途**：先前通報的異常已解決，發送解除通知。

### 格式
```
[PATROL] ALL CLEAR — {incident_summary}

原始事件：{original_event_ref}
通報時間：{original_time}
解決時間：{resolved_time}
處理時長：{duration}

解決方式：{resolution}
處理人：{resolver}

狀態：已恢復正常
```

### 範例
```
[PATROL] ALL CLEAR — 部署失敗已修復

原始事件：P1 事件警報 — 前端部署失敗
通報時間：2026-03-14 16:22
解決時間：2026-03-14 16:51
處理時長：29 分鐘

解決方式：agong 修正 Hero.tsx 型別定義，重新部署成功
處理人：agong

狀態：已恢復正常
```

---

## 使用注意

- 所有通知的 `{timestamp}` 格式統一為 `YYYY-MM-DD HH:MM`
- 嚴重等級標記放在訊息最前方，方便快速辨識
- Telegram 通知加上對應 emoji：P0 用紅色警告，P1 用橙色，P2 用藍色資訊
- 每則通知都要包含可追蹤的任務 ID 或事件參考編號
