# P1 任務：防火牆 — postMessage 白名單過濾中介層

## 任務描述
實作 iframe postMessage 白名單過濾：
1. 在 server 端代理 WebSocket 事件
2. 只允許 GATEWAY_CONFIG.allowedOutbound 清單內的事件通過
3. 攔截未授權事件並記錄至 Supabase firewall_logs 表
4. 發警報

## 執行路徑
/Users/caijunchang/Downloads/openclaw-console-hub-main

## 需求詳情
- 建立 middlewares/firewall.ts
- 建立 firewall_logs 資料表（Supabase）
- 整合至 server/src/index.ts
- 支援 HTTP 和 WebSocket 兩種模式

## 參考
NEUXA 已建立初版：
- server/src/middlewares/firewall.ts（需審查/修正）
- server/migrations/20260227_firewall_logs.sql

## 指令
請審查並修正 firewall.ts，確保：
1. TypeScript 類型正確
2. 錯誤處理完善
3. 整合至 index.ts 正確
4. 測試通過

執行完成後回報結果。
