# Dashboard 修復任務卡

## 任務目標
修復 OpenClaw Dashboard Web UI，讓所有按鈕和功能正常運作

## 專案位置
`/Users/caijunchang/.openclaw/workspace/projects/dashboard/modules/web-ui/`

## 已知問題
1. **「Spawn Agent」按鈕** - 點了沒反應，需要接入實際功能
2. **統計卡片顏色** - Tailwind 動態 class 失效
3. **左側導航** - 需要確認路由正常
4. **快速操作按鈕** - 「執行系統巡檢」「查看成本報告」等無功能

## 修復要求

### 1. 按鈕功能化
- 「Spawn Agent」按鈕：顯示一個彈窗/下拉選單選擇 Agent 類型
- 「執行系統巡檢」：觸發一個模擬的系統檢查流程，顯示結果
- 「查看成本報告」：導航到成本頁面或顯示模擬數據

### 2. 視覺修復
- 修復統計卡片顏色（blue/amber/emerald/slate）
- 確保 RWD 在各螢幕尺寸正常

### 3. 數據真實化
- 目前任務數據是寫死的，改為讀取實際檔案或至少模擬動態更新

## 驗收標準
- [ ] 所有按鈕點了都有反應
- [ ] 沒有 console error
- [ ] 手機版正常運作

## 回報方式
完成後發送到 n8n webhook：
```bash
curl -X POST http://host.docker.internal:5679/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{"task_id":"dashboard-fix","source":"SubAgent","status":"success","result":"修復內容摘要"}'
```
