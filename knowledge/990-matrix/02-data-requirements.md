# 990 系統資料需求 (Data Requirements)

> 狀態：待補完
> 提出者：阿數 (Analyst)

## 目前缺失的資料表
系統目前只有 openclaw_tasks 等管理表，缺乏業務數據。若要落實九宮格分析，需建立以下 Schema：

1. properties (物件表)：存房源資訊
2. transactions (交易表)：存成交紀錄
3. agents (經紀人表)：存 990 會員資料
4. client_interactions (互動表)：存帶看、回報紀錄

## 行動建議
請 @阿工 設計 JSON Schema 或 Supabase SQL 來建立這些表。