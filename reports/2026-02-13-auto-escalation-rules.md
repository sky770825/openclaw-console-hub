# 2026-02-13 自動升級規則

## 新增：Auto-Escalation Rules（給 Codex 的升級條件）

### 觸發條件（任一成立就升級給 Codex）

| # | 類型 | 條件 |
|---|------|------|
| 1 | 服務不可用 | API 健康檢查連續 2 次失敗（間隔 10~15 秒） |
| 2 | 任務超時 | 單任務執行 > 90 秒；或 running > 120 秒無進度更新 |
| 3 | 失敗過多 | 同類任務連續失敗 ≥3 次；或 10 分鐘內 failed > 30% |
| 4 | 任務池異常 | ready=0 持續 ≥3 輪；且 created=0 持續 ≥3 輪 |
| 5 | 重複執行 | 同 taskId 短時間重複執行（duplicate > 0） |
| 6 | 系統錯誤 | DB constraint / migration / schema / TS build error |
| 7 | 成本異常 | 單小時成本 > 預算 120% |

### 升級後立即動作

1. **暫停高風險排程**（保留 health check 與核心監控）
2. **保留現場**（不要清空 log / 不要覆蓋錯誤）
3. **送出完整升級訊息給 Codex**

### 升級訊息格式（必填 10 項）

```
[ESCALATE_Codex]
1. 問題摘要
2. 預期結果
3. 實際結果
4. 執行指令（完整）
5. 工作目錄（cwd）
6. 錯誤原文（完整）
7. 最近 80 行 log
8. 影響範圍（taskId/scheduleId/API）
9. 已嘗試處理
10. 可否回滾（方式）
```

### 解除升級條件（恢復正常）

- [ ] API 健康檢查連續 3 次成功
- [ ] running 卡住數 = 0
- [ ] failed rate 回到 < 10%
- [ ] ready 任務池恢復到 ≥ 3
- [ ] 再恢復分批上線（P0→P1→P2）

---

## 今日其他更新

### auto-task-generator 保護機制驗證
- ✅ zeroReadyStreak: 運作正常
- ✅ lastEffectiveMaxTasksPerCycle: 運作正常
- ✅ starvationProtection: 邏輯正確（ready>0 時不觸發）
- ✅ cat_check 正規化：已修復（feature/bugfix/learn/improve）

### 後端狀態
- 服務：運行中 (port 3011)
- 任務池：ready=3, running=1, done=234
- 最後驗證：2026-02-13 22:58

---

### biz_realestate鑽石春酒專案修復（P1 完成）

**修復項目**：
1. ✅ `tailwind.config.ts` - require 改 ES Module import
2. ✅ `src/pages/admin/Login.tsx` - error: any 改 unknown + 類型守衛
3. ✅ `src/lib/googleSheets.ts` - 9個 console.log 改為開發環境條件輸出
4. ✅ `src/lib/googleSheets.ts` - dynamic import 改靜態 import

**驗證結果**：
- Build：✅ 成功（Dynamic import 警告消失）
- ESLint：⚠️ 剩 2 個 P2 錯誤（空 interface）

**檔案位置**：`~/Desktop/程式專案資料夾/biz_realestate鑽石春酒/`

---

**位置**：`~/openclaw任務面版設計/server/`
**狀態**：✅ 正常運作
