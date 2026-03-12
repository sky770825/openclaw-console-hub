# 心跳機制 (Heartbeat) 驗證計畫

目標： 驗證心跳機制已成功整合並按預期運行。

驗證步驟：

1.  部署： 將 heartbeat.ts 整合進 index.ts 並重啟伺服器。
2.  等待： 等待至少 3 分鐘，讓心跳有機會觸發至少 2-3 次（假設頻率為 60 秒）。
3.  查詢資料庫： 執行 query_supabase action，查詢 openclaw_audit_logs 表。
    ``json
    {"action":"query_supabase","table":"openclaw_audit_logs","select":"action,created_at","filters":[{"column":"action","op":"eq","value":"system_heartbeat"}],"order":{"column":"created_at","ascending":false},"limit":5}
    `
4.  分析結果：
    - 存在性： 確認能查到 action 為 system_heartbeat 的紀錄。
    - 時效性： 確認 created_at` 的時間戳是最近的幾分鐘內。
    - 頻率： 確認最新兩筆紀錄的時間戳間隔約為 60 秒（或設定的頻率）。

成功標準： 以上三點均符合，才算驗收通過。