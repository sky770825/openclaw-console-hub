# OpenClaw Studio 整合計畫

1. 目標: 將 Studio Bridge 整合至 OpenClaw Server (3011)。
2. 步驟:
   - 在 server/src/routes/ 建立 studio.ts。
   - 引用 projects/openclaw-studio/cells/core/engine.mjs。
   - 在 index.ts 掛載 /api/studio。
3. 驗收: 透過 curl 測試 /api/studio/compile 是否能生成檔案。