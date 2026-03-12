# 五大核心工具整合標準作業程序 (SOP)

## 1. 簡介
本文檔定義了 Scalpel, Browser, CodeMap, Terminal, 及 Visual Feedback 五大工具的操作規範。

## 2. 工具清單與用途
- **Scalpel (`scalpel.sh`)**: 用於沙盒文件夾內的精準文本替換。嚴禁修改 `/server` 或 `/src` 下的原始碼。
- **Browser (`browser.sh`)**: 模擬瀏覽行為，查看 README 或遠端 API 響應。
- **CodeMap (`codemap.sh`)**: 快速掃描專案目錄結構，建立全局視野。
- **Terminal (`terminal.sh`)**: 安全執行指令，主要用於編譯、測試或文件操作。
- **Visual Feedback (`visualizer.sh`)**: 將任務執行結果轉換為可讀的 Markdown 報告。

## 3. 操作流程
1. **探索**: 使用 `codemap.sh` 確定目標文件位置。
2. **分析**: 使用 `browser.sh` 讀取文件內容。
3. **執行**: 如需修改，先拷貝至 `sandbox`，使用 `scalpel.sh` 修改。
4. **驗證**: 使用 `terminal.sh` 運行腳本或驗證修改。
5. **回報**: 使用 `visualizer.sh` 生成最終任務報告。

## 4. 安全限制
- 禁止對 `openclaw任務面版設計` 目錄進行寫入操作。
- 禁止訪問 `.env` 或 `SOUL.md` 等敏感靈魂文件。
