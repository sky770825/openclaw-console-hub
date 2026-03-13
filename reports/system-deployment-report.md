# NEUXA 多代理 Bot 訊息路由系統實作報告

## 1. 系統架構
- **入口點**: `agentRouter.ts` 接收 Telegram Webhook。
- **路由機制**: 
    - 透過 Token 識別 Bot 原始身份。
    - 透過 `@mention` 解析指令對象。
- **角色定義**: 基於 `botProfiles.ts` 動態注入 System Prompt。

## 2. 已建立組件
- `src/agentRouter.ts`: 處理訊息分發。
- `src/botProfiles.ts`: 儲存阿研、阿建的角色設定。
- `src/main.ts`: 指揮官邏輯核心。
- `.env.template`: 提供主人填寫 Token 的範本。

## 3. 下一步行動
- 請主人於 `.env` 填寫實際的 Telegram Token。
- 將 `agentRouter.ts` 整合至 Express Server 中。
