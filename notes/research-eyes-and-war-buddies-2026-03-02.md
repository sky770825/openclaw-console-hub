# 研究報告：OpenClaw 進化路徑 (眼睛與戰友)

## 1. 戰友機制 (Multi-Agent Debate)
- 核心理念：借鑒 Moltbook 的 sub-molt 模式。
- 實作方式：利用 ask_ai 派遣不同性格的子代理。一個負責「尋找風險」，一個負責「最佳化效能」。
- 價值：降低單一模型判斷錯誤的機率，實現「集體智慧」。

## 2. 眼睛機制 (Browser Automation)
- 核心理念：AI 自主撰寫並執行 Playwright 腳本。
- 現狀：系統目前無瀏覽器依賴。
- 目標：實現 action: browser_action，輸入自然語言需求，輸出網頁截圖或數據摘要。

## 3. 結論
- 優先安裝 Playwright 環境。
- 開始在複雜任務中試行「作戰會議」SOP。