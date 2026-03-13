# 🎯 Agent 任務板使用指南

> 這份文件教導 Cursor Agent 和 CoDEX 如何使用 OpenClaw 任務板進行除錯工作。

---

## 📋 任務板基本操作

### 1. 查看分配給你的任務

**方法一：透過 API**
```bash
curl http://localhost:3011/api/tasks?owner=cursor&status=pending
```

**方法二：網頁介面**
- 打開 http://localhost:3011
- 篩選 Owner: Cursor Agent / CoDEX
- 篩選 Status: pending / running

---

## 🔧 處理除錯任務的標準流程

### Step 1: 開始處理（標記為進行中）

```bash
# 更新任務狀態為 running
curl -X PATCH http://localhost:3011/api/tasks/<task-id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "running"}'
```

### Step 2: 記錄進度（重要！）

**每次有進展都要寫日誌：**

```bash
# 添加進度日誌
curl -X POST http://localhost:3011/api/tasks/<task-id>/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "已定位問題：缺少權限檢查",
    "metadata": {"file": "auth.ts", "line": 42}
  }'
```

**日誌層級：**
- `info` - 一般進度更新
- `debug` - 詳細調試資訊
- `warn` - 警告資訊
- `error` - 錯誤資訊

### Step 3: 完成除錯並交代結果

**標記完成並寫入詳細結果：**

```bash
# 1. 添加完成日誌（詳細記錄）
curl -X POST http://localhost:3011/api/tasks/<task-id>/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "✅ 除錯完成",
    "metadata": {
      "rootCause": "API 回應格式變更導致解析失敗",
      "solution": "更新解析邏輯，增加 fallback 處理",
      "filesModified": ["src/api/parser.ts"],
      "verification": "已測試通過"
    }
  }'

# 2. 更新任務狀態為 done
curl -X PATCH http://localhost:3011/api/tasks/<task-id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

---

## 📝 日誌填寫規範

### 好的日誌範例 ✅

```json
{
  "level": "info",
  "message": "🔍 開始分析錯誤",
  "metadata": {
    "step": "analyze",
    "errorLocation": "src/components/Button.tsx:45"
  }
}
```

```json
{
  "level": "info", 
  "message": "💡 發現根本原因",
  "metadata": {
    "step": "root-cause",
    "cause": "props 傳遞錯誤，onClick 為 undefined",
    "evidence": "console.log 顯示 props.onClick 是 null"
  }
}
```

```json
{
  "level": "info",
  "message": "✅ 修復完成",
  "metadata": {
    "step": "complete",
    "changes": ["新增預設值處理", "新增 props 驗證"],
    "testResult": "手動測試通過"
  }
}
```

### 不好的日誌範例 ❌

```json
{
  "level": "info",
  "message": "done"  // 太簡略，沒有交代細節
}
```

---

## 🔄 當需要協助時

如果卡關超過 15 分鐘：

```bash
# 標記需要協助
curl -X POST http://localhost:3011/api/tasks/<task-id>/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "warn",
    "message": "🆘 需要協助",
    "metadata": {
      "stuckAt": "無法重現錯誤",
      "tried": ["檢查 A", "測試 B", "查看 C"],
      "needHelp": "需要更多錯誤上下文"
    }
  }'
```

---

## 🎨 前端除錯檢查清單 (Cursor Agent)

```markdown
- [ ] 確認錯誤發生的元件
- [ ] 檢查 props 傳遞是否正確
- [ ] 檢查 state 更新邏輯
- [ ] 確認 CSS 樣式衝突
- [ ] 測試互動流程
- [ ] 檢查 console 警告
```

## ⚙️ 後端除錯檢查清單 (CoDEX)

```markdown
- [ ] 確認 API 請求/回應
- [ ] 檢查資料庫查詢
- [ ] 檢查權限邏輯
- [ ] 驗證輸入資料格式
- [ ] 檢查錯誤處理邏輯
- [ ] 測試邊界條件
```

---

## 📊 小蔡會定期檢查的項目

小蔡每 10-15 分鐘會查看：

1. **哪些除錯任務還在 pending**
2. **哪些正在 running 但很久沒更新**
3. **哪些已經 done 需要檢視結果**

**所以請務必及時更新日誌！** 這樣小蔡才能掌握進度。

---

## 🔥 緊急情況處理

如果發現問題很嚴重，需要老蔡立即介入：

```bash
# 標記為 urgent
curl -X PATCH http://localhost:3011/api/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -d '{"priority": 1, "tags": ["debug", "urgent"]}'

# 在日誌中標記
curl -X POST http://localhost:3011/api/tasks/<task-id>/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "🚨 緊急：發現核心問題，需要老蔡決策",
    "metadata": {"requiresDecision": true}
  }'
```

---

## 💡 快速指令參考

```bash
# 查看我的任務
curl http://localhost:3011/api/tasks?owner=cursor

# 更新狀態
curl -X PATCH http://localhost:3011/api/tasks/<id>/status -d '{"status":"running"}'

# 添加日誌
curl -X POST http://localhost:3011/api/tasks/<id>/logs -d '{"level":"info","message":"進度..."}'

# 標記完成
curl -X PATCH http://localhost:3011/api/tasks/<id>/status -d '{"status":"done"}'
```

---

## 📞 溝通規範

1. **及時更新** - 有進展就寫日誌，不要等到最後
2. **詳細記錄** - 寫清楚問題原因和解決方案
3. **標記完成** - 做完一定要標記 done
4. **卡住要說** - 15 分鐘沒進展就標記需要協助

這樣小蔡才能有效地追蹤和管理所有除錯任務！ 🎯
