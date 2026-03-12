# Crew Bot 設定檔位置初步分析

根據 ask_ai (Claude) 對 server/src/index.ts 的分析，crew bots 的設定檔或身份 prompt 並非直接在此檔案中載入。而是由 createCrew 函數處理，該函數從 ./lib/crew 模組引入。

*結論：* 具體載入邏輯很可能封裝在 server/src/lib/crew.ts (或 server/src/lib/crew/index.ts) 中。

*下一步：* 讀取 server/src/lib/crew.ts 以確認。