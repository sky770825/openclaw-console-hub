# 問題排除：路徑解析與檔案副檔名

## 問題描述

當從 TypeScript 專案的 import 語句判斷檔案路徑時，容易混淆編譯前的 .ts 檔案與編譯後的 .js 檔案。直接嘗試讀取 .js 可能會失敗，因為源碼檔案實際為 .ts。

## 解決方案

1.  *優先使用 grep_project 進行搜索*：當不確定檔案的確切路徑或副檔名時，grep_project 能夠在整個專案中搜索指定模式，找出所有相關檔案，比逐級 ls 或猜測路徑更有效率和準確。
    *   範例：{"action":"grep_project","pattern":"crew-config","filePattern":"*.ts"} 
2.  *確認專案類型*：如果是 TypeScript 專案，在尋找源碼時，優先考慮 .ts 副檔名。編譯後的 .js 檔案通常在運行時使用，而非直接閱讀。
3.  *建立專案地圖*：對於核心模組和常用路徑，應主動建立知識檔案進行記錄，形成「地圖感」，避免重複的路徑探索。

## 案例

*   *場景*：尋找 Crew Bots 的配置檔案。
*   *錯誤嘗試*：根據 executor-agents.ts 中的 import { CREW_BOTS, type CrewBotConfig } from './telegram/crew-bots/crew-config.js';，直接嘗試讀取 /Users/sky770825/openclaw任務面版設計/server/src/telegram/crew-bots/crew-config.js，結果檔案不存在。
*   *正確解決*：使用 grep_project 搜索 crew-config，發現實際檔案為 /Users/sky770825/openclaw任務面版設計/server/src/telegram/crew-bots/crew-config.ts。
