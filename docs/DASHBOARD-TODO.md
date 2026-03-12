# 中控板功能補齊清單

## 🔴 P0 - 必須修復

### 1. Autopilot 前端修復
- 後端已回傳 `isRunning` + `intervalMinutes` 兼容欄位
- 確認前端輪詢正確映射
- 確認開關按鈕切換後狀態不會跳回

### 2. 任務板 Agent 標籤顯示
- 任務名稱格式：`[Agent] 任務名`
- 前端解析 `[Agent]` 前綴，顯示為彩色標籤
- Agent 顏色：Cursor=藍, CoDEX=紫, Kimi=綠, OR-Free=灰, Ollama=橙

### 3. 任務預估時間欄位
- Supabase tasks 表新增 `estimated_minutes` 欄位
- 前端任務卡片顯示預估時間
- 排程時參考此欄位

## 🟡 P1 - 重要功能

### 4. 每日預算卡片
- Dashboard 新增「今日花費」卡片
- 讀取 `memory/daily-budget.json`
- 顯示：已花費 / $5.00 + 進度條
- 接近上限時變紅

### 5. 緊急停止按鈕
- Dashboard 加一個紅色「緊急停止」按鈕
- 調用 POST /api/emergency/stop-all
- 確認對話框

### 6. Autopilot 日誌面板完善
- 顯示最近 10 條循環日誌
- 即時更新（WebSocket 或輪詢）
- 日誌格式：時間 + 動作 + 結果

## 🟢 P2 - 優化

### 7. 任務篩選器
- 按 Agent 篩選（Cursor/CoDEX/Kimi/OR-Free/Ollama）
- 按優先級篩選（P0/P1/P2/P3）
- 按狀態篩選

### 8. 任務統計圖表
- 按 Agent 的任務完成率
- 每日任務完成趨勢
- 預估時間 vs 實際時間對比
