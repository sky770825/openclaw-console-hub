# Prospect 追蹤管理

## 追蹤欄位

每位 prospect 記錄以下資訊：

| 欄位 | 說明 | 範例 |
|------|------|------|
| `id` | 唯一識別碼 | `OUT-2026-001` |
| `name` | 姓名或帳號名稱 | `美甲師小花` |
| `platform` | 主要平台 | `Instagram` |
| `handle` | 帳號連結 | `@nailartflower` |
| `audience_size` | 追蹤者數量 | `12,500` |
| `score` | 評估總分（/25） | `18` |
| `contact_method` | 聯繫方式 | `Email` |
| `contact_info` | 聯繫資訊 | `flower@example.com` |
| `pitch_type` | Pitch 類型 | `KOL合作` |
| `pitch_date` | 首次 pitch 日期 | `2026-03-15` |
| `followup_dates` | Follow-up 日期紀錄 | `["2026-03-22"]` |
| `status` | 當前狀態 | `pitched` |
| `notes` | 備註 | `對 AI 工具很有興趣` |
| `assigned_to` | 負責人 | `outreach` |

---

## 狀態流程

```
Research → Pitch Draft → Review Approval → Dar Approval → Sent → Follow-up → Response → Negotiation → Confirmed → Execution → Report
```

### 狀態定義

| 狀態 | 說明 | 下一步 |
|------|------|--------|
| `researched` | 完成調查，等待撰寫 pitch | 撰寫 pitch 草稿 |
| `pitch_drafted` | Pitch 草稿完成 | 送 review agent 審查 |
| `review_approved` | Review agent 通過 | 送達爾最終審批 |
| `dar_approved` | 達爾審批通過 | 發送 pitch |
| `sent` | Pitch 已發送 | 等待回覆，排程 follow-up |
| `followed_up` | 已發送 follow-up | 等待回覆 |
| `responded` | 對方已回覆 | 進入協商或結案 |
| `negotiating` | 協商合作細節中 | 確認合作條件 |
| `confirmed` | 合作確認 | 進入執行階段 |
| `executing` | 合作執行中 | 完成後撰寫報告 |
| `completed` | 合作完成並已報告 | 歸檔 |
| `declined` | 對方婉拒 | 歸檔，6 個月後可重新評估 |
| `no_response` | 無回覆（超過 follow-up 期限） | 歸檔，3 個月後可重新評估 |

---

## Follow-up 規則

| 時間點 | 動作 |
|--------|------|
| 發送後 7 天 | 第一次 follow-up（使用 follow-up 模板） |
| 發送後 14 天 | 第二次 follow-up（最後一次，語氣更輕鬆） |
| 發送後 21 天 | 標記為 `no_response`，停止聯繫 |

### Follow-up 注意事項
- 每次 follow-up 必須提供新資訊或新角度，不要單純「再問一次」
- 如果對方已讀不回（有 read receipt），第二次 follow-up 後即停止
- 節假日期間自動延長 follow-up 間隔
- 所有 follow-up 同樣需要經過 review agent 審查

---

## 月度指標

每月底統計以下數據：

| 指標 | 計算方式 | 目標 |
|------|----------|------|
| **Pitches 發送數** | 當月發送的 pitch 總數 | ≥ 10 |
| **回覆率** | (responded + negotiating + confirmed) / sent | ≥ 20% |
| **轉換率** | confirmed / sent | ≥ 5% |
| **活躍合作數** | 當前 `confirmed` + `executing` 的數量 | ≥ 2 |
| **平均回覆時間** | 從 sent 到 responded 的平均天數 | 追蹤即可 |

---

## 檔案格式與儲存

追蹤資料存放於：`/Users/sky770825/.openclaw/workspace/crew/outreach/notes/tracking.json`

### JSON 結構範例

```json
{
  "last_updated": "2026-03-14",
  "prospects": [
    {
      "id": "OUT-2026-001",
      "name": "美甲師小花",
      "platform": "Instagram",
      "handle": "@nailartflower",
      "audience_size": 12500,
      "score": 18,
      "score_breakdown": {
        "audience_size": 3,
        "audience_relevance": 5,
        "engagement_rate": 4,
        "content_quality": 3,
        "brand_alignment": 3
      },
      "contact_method": "email",
      "contact_info": "flower@example.com",
      "pitch_type": "kol",
      "pitch_date": "2026-03-15",
      "followup_dates": [],
      "status": "researched",
      "notes": "",
      "assigned_to": "outreach"
    }
  ],
  "monthly_metrics": {
    "2026-03": {
      "pitches_sent": 0,
      "responses": 0,
      "conversions": 0,
      "active_partnerships": 0
    }
  }
}
```

### 維護規則
- 每次狀態變更時更新 `last_updated`
- 每月 1 日計算上月指標
- 完成或歸檔的 prospect 保留紀錄（不刪除），供未來參考
