# NEUXA Heartbeat
> 更新：2026-03-07 12:00

## 系統狀態
- **Server**: v2.5.28 ✅ 在線 (port 3011)
- **Gemini API**: ✅ 正常（3 key 輪替）
- **Telegram Bots**: 運行中
- **向量知識庫**: ✅ 66 本 cookbook 已全部索引
- **Auto-Executor**: ✅ 運行中（dispatch mode）
- **Tunnel**: ✅ cloudflared 對外開放
- **generate_site**: ✅ 四階段品質引擎（Pro生成→Flash審核→Pro修正→硬規則修補）

## 最新版本 v2.5.22
- feat: 完成率大升級（selfDrive放寬+8輪+品質閘門60分+重試2次+timeout統一5m）
- feat: generate_site 四階段品質校準引擎（生成→審核→修正→修補）
- feat: Lovable 級 CSS 設計系統（色彩/間距/陰影/動畫/圓角 全變數化）
- feat: 星群協作 17 產品線（網站/CRM/ERP/POS/訂位/點餐/排隊/外送/餐飲/LINE/n8n/會員/電商/預約/儀表板/部落格/後台）
- feat: 71 本 cookbook 知識庫（新增 POS/訂位/排隊/外送/餐飲/ERP/CRM/儀表板/通知/LINE Bot/預約排班 + Manus/Ready/Lovable AI）
- feat: 知識庫自動注入（generate_site 前 semantic_search 查 cookbook）
- feat: cloudflared tunnel 公開 URL（手機可直接預覽）
- fix: 小蔡回覆深度強化 + crew dispatch 對話背景 + 幻覺 action 修正
- fix: 派工審核鬆綁（medium 任務 Claude 直接執行）+ 心跳異常修復 + 系統全盤健檢修復

## 待處理
- 無緊急事項
