# 🚨 緊急終止與自動除錯機制

> 建立時間：2026-02-11  
> 適用對象：老蔡 / Cursor Agent / CoDEX

---

## 📋 功能總覽

已建立以下機制：

1. **🛑 緊急終止指令** - `/stop` 立即停止卡住或出錯的任務
2. **🔧 自動除錯指派** - 根據錯誤類型自動指派給 Cursor 或 CoDEX
3. **📊 進度追蹤** - Agent 必須在任務板上記錄進度
4. **👀 定期檢查** - 小蔡每 10 分鐘檢查一次除錯進度

---

## 🛑 緊急終止機制

### Telegram 指令

```
/stop           # 終止所有執行中的任務
/stop all       # 同上
/stop <taskId>  # 終止指定任務
```

### 終止後效果

- 任務狀態變為 `cancelled`
- 自動記錄終止原因和時間
- 透過 WebSocket 即時通知前端
- 如果是除錯任務，會保留已完成的部分結果

---

## 🔧 自動除錯指派

### 錯誤分類規則

| 錯誤類型 | 關鍵字 | 指派給 | 優先級 |
|---------|--------|--------|--------|
| **前端/UI** | react, component, css, hook | Cursor | P2 |
| **後端/邏輯** | syntax, function, handler | CoDEX | P2 |
| **系統/環境** | permission, file not found | Cursor | P1 |
| **API/網路** | fetch, timeout, http error | CoDEX | P2 |
| **資料庫** | supabase, query failed | CoDEX | P1 |

### 自動創建的除錯任務格式

```
🔧 [除錯] 原始任務名稱
├── 關聯原始任務
├── 錯誤訊息
├── 堆疊追蹤
├── 指派給：Cursor / CoDEX
└── 完成標準（自動生成）
```

---

## 📝 Agent 使用任務板規範

### 標準流程

```
開始處理 → 記錄進度 → 完成交代
```

### 必須記錄的內容

**開始時：**
- 問題初步分析
- 預計處理方向

**進行中（每 5-10 分鐘）：**
- 發現的線索
- 嘗試的方案
- 遇到的困難

**完成時：**
- 根本原因
- 修復方案
- 驗證結果

### API 快速參考

```bash
# 更新狀態為進行中
curl -X PATCH http://localhost:3011/api/tasks/<id>/status \
  -d '{"status": "running"}'

# 添加進度日誌
curl -X POST http://localhost:3011/api/tasks/<id>/logs \
  -d '{"level": "info", "message": "進度..."}'

# 標記完成
curl -X PATCH http://localhost:3011/api/tasks/<id>/status \
  -d '{"status": "done"}'
```

詳細規範見：`docs/AGENT-GUIDE.md`

---

## 👀 小蔡的定期檢查

### 每 10 分鐘檢查項目

1. **Pending 的除錯任務** - 還沒開始處理的
2. **Running 的除錯任務** - 進行中超過 15 分鐘沒更新的
3. **Done 的除錯任務** - 需要檢視結果的

### 需要通知老蔡的情況

- 除錯任務卡關超過 30 分鐘
- 發現需要老蔡決策的問題
- 緊急終止後有重要後續

---

## 🔌 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/emergency/running` | GET | 列出執行中的任務 |
| `/api/emergency/stop/:taskId` | POST | 終止指定任務 |
| `/api/emergency/stop-all` | POST | 終止所有任務 |
| `/api/emergency/stop-command` | POST | 處理 /stop 指令 |
| `/api/debug/create-task` | POST | 手動創建除錯任務 |

---

## 📁 檔案結構

```
server/src/
├── emergency-stop.ts    # 緊急終止模組
├── error-handler.ts     # 錯誤分類與自動指派
└── index.ts            # 整合 API 路由

scripts/
└── emergency-stop.sh    # CLI 緊急終止腳本

docs/
└── AGENT-GUIDE.md       # Agent 使用指南

workspace/HEARTBEAT.md   # 整合定期檢查
```

---

## ✅ 測試指令

```bash
# 測試緊急終止
curl -X POST http://localhost:3011/api/emergency/stop-all

# 查看執行中任務
curl http://localhost:3011/api/emergency/running

# 使用腳本
./scripts/emergency-stop.sh list
./scripts/emergency-stop.sh all
```

---

## 🔄 工作流程圖

```
我遇到錯誤
    ↓
自動分析錯誤類型
    ↓
創建除錯任務
    ↓
指派給 Cursor / CoDEX
    ↓
他們在任務板記錄進度
    ↓
小蔡每 10 分鐘檢查
    ↓
完成後交代結果 ←──── 老蔡檢視
```

---

## 💡 注意事項

1. **Agent 一定要及時更新日誌**，否則小蔡不知道進度
2. **卡住超過 15 分鐘要標記**，不要默默掙扎
3. **完成後一定要標記 done**，小蔡才會知道結束了
4. **緊急情況用 /stop**，不要怕打斷

這樣整個除錯流程就順暢了！🎯
