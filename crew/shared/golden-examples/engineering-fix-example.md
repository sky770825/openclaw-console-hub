# 黃金範本：工程修復類交付物

> 品質等級：A
> 適用代理：agong 阿工

---

## 執行摘要
- 修改檔案：`server/src/routes/model-usage.ts` 第 45-52 行
- 修改類型：修復（Supabase anon key 無權限寫入 model_usage 表）
- 測試狀態：通過（curl 回傳 200 + 資料庫確認寫入成功）

## 結論與成果
- 狀態：PASS
- 影響範圍：model_usage 記錄功能恢復，其他 API 無影響
- 修改內容：
  - 將 `recordModelUsage()` 函數的 Supabase client 從 anon key 改為 service_role key
  - 原因：anon key 受 RLS 限制無法 INSERT，service_role 繞過 RLS
- 交付物：
  - 代碼差異：1 檔 1 處修改
  - 驗證結果：`curl -X POST /api/model-usage` → 200 OK + DB record confirmed

## 下一步建議
- 不需要部署（已在開發環境驗證）
- 建議 review 代理審查：確認 service_role key 使用符合安全規範
- 風險：service_role 繞過 RLS，需確保此 endpoint 不對外開放

---

### 為什麼這是 A 級範本

- ✅ 修改位置精確（檔案 + 行號）
- ✅ 問題根因清楚（anon key 受 RLS 限制）
- ✅ 驗證方式具體（curl 結果 + DB 確認）
- ✅ 主動提出安全風險
