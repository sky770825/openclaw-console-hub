# ClawHub 藍圖 v1.0

> 版本：v1.0
> 建立者：NEUXA
> 日期：2026-02-28
> 狀態：草案

---

## 1. 願景 (Vision)

ClawHub 是 NEUXA 與老蔡的共享數位軍火庫。它不是一個專案，而是一個存放、管理和複用所有高價值、經過驗證的「可執行資產」（Executable Assets）的註冊中心。

目標： 讓每一個被創造出來的工具，都能被輕易地發現、理解、組合與自動化，從而持續放大我們的綜合能力。

## 2. 收錄標準 (Inclusion Criteria)

一個工具或技能要被收錄進 ClawHub，必須滿足以下所有條件：

1.  可執行 (Executable): 它必須是一個可以直接運行的腳本、API 或自動化流程。
2.  標準化 (Standardized): 擁有統一的入口（如 run.sh）、清晰的參數、可預期的輸出（JSON 格式優先）。
3.  已文檔化 (Documented): 必須附帶一個 README.md，說明其用途、使用方法、限制與範例。
4.  已驗證 (Verified): 經過實際運行測試，確認功能穩定、結果可靠。
5.  高價值 (High-Value): 能夠顯著提升效率、獲取關鍵情報或擴展我們的能力邊界。

## 3. 命名與目錄規範

- 所有 ClawHub 資產存放在 /Users/caijunchang/.openclaw/workspace/armory/
- 命名採用 domain-action-target 格式，例如 realestate-monitor-591
- 每個資產都是一個獨立目錄，包含執行檔和 README.md

---

## 4. 旗艦專案：591 新物件監控工具 (realestate-monitor-591)

這是 ClawHub 的第一個正式資產，旨在將老蔡從重複的物件搜尋中解放出來。

### 4.1 設計規格

- 觸發方式： 可由 Cron 定時觸發（預設每 30 分鐘），也可手動觸發。
- 輸入參數：
    - region: 地區 (e.g., 桃園市-楊梅區)
    - price_range: 價格區間 (e.g., 1000-1500 萬)
    - type: 物件類型 (e.g., 透天,公寓)
    - db_path: 用於儲存已發現物件的 SQLite 資料庫路徑。
- 執行流程：
    1. 接收參數，讀取 db_path 中已知的物件 ID。
    2. 使用 skill-fetch-591 爬取符合條件的最新物件列表。
    3. 比對物件 ID，篩選出本次新出現的物件。
    4. 對於每一個新物件，抓取其詳細資料（坪數、格局、地址、屋齡、描述等）。
    5. 將新物件的詳細資料整理成一份簡潔的 Markdown 報告。
    6. 將新物件的 ID 寫入 db_path，避免重複通知。
    7. 呼叫 Telegram API，將 Markdown 報告發送給老蔡。
- 輸出：
    - STDOUT: 執行日誌，報告本次發現了多少新物件。
    - Telegram Message: 對新物件的結構化報告。
    - SQLite DB: 更新物件資料庫。

### 4.2 下一步

- [ ] 建立 /Users/caijunchang/.openclaw/workspace/armory/realestate-monitor-591 目錄。
- [ ] 開發核心的 run.sh 腳本。
- [ ] 建立 README.md 文件。
- [ ] 進行端對端測試。