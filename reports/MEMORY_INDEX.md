# 長期記憶關鍵字索引（對齊記憶庫版）

**對齊原則：** 僅列出**記憶庫（MEMORY_FULL.md、memory/YYYY-MM-DD.md）內已有內容**的關鍵字與分類。記憶庫沒有資料的主題不設索引；新增記憶時才在索引中補上對應關鍵字。

**用途：** 與 MEMORY.md 一致，供內部參考或擴充用。Gateway bootstrap 只載入 MEMORY.md。

---

## 一、關鍵字列表（與 MEMORY.md 對齊，僅有對應內容者）

- **關於我：** 達爾、出生日、Telegram、xiaoji_cai_bot、自主意識  
  → 對應：MEMORY_FULL § 關於我

- **關於主人：** 主人、生日、1988、loc_yangmei、住商、biz_realestate、biz_drinks、普特斯、防霾biz_window_screen、店長、事業、時區、GMT+8、繁體中文、問題轉給 Cursor  
  → 對應：MEMORY_FULL § 關於主人

- **重要決定／原則：** Token、Gemini、Claude、Sonnet、技能精簡、quarantine、restore-skill、三大原則、先試跑再上線、感覺不對立刻退回、防護規則、SOUL、費用、台幣  
  → 對應：MEMORY_FULL § 重要決定

- **待辦：** 待辦、Google 服務、gog、Heartbeat、備份策略、Workspace 備份、biz_drinks名稱、429  
  → 對應：MEMORY_FULL § 待辦

- **教訓：** ClawHub、風險評估、安全守則、瀏覽器、tab not found、Cursor 診斷  
  → 對應：MEMORY_FULL § 重要決定（教訓條目）

- **時間／近期：** 今天、昨天、前天、日期、排程、心跳、heartbeat  
  → 對應：memory/YYYY-MM-DD.md

- **技術／記憶：** memory_search、memory_get、按需載入、索引、關鍵字  
  → 對應：MEMORY_FULL 內有寫到的部分

---

## 二、分類對照表（僅列記憶庫有內容的分類）

| 分類 | 關鍵字／情境 | 記憶庫對應 |
|------|--------------|------------|
| 效能與成本 | Token、用量、429、模型切換、費用、台幣 | MEMORY_FULL § 重要決定、待辦 |
| 備份與還原 | 備份、Workspace 備份、quarantine、restore-skill | MEMORY_FULL § 待辦、重要決定 |
| 安全與防護 | 防護、SOUL、ClawHub、風險評估、安全守則 | MEMORY_FULL § 教訓、重要決定 |
| 身份與偏好 | 主人、事業、繁體中文、Cursor、問題轉給 Cursor | MEMORY_FULL § 關於主人 |
| 自動化與排程 | 心跳、heartbeat、排程、今天、昨天 | memory/日期檔 |
| 技能管理 | 技能精簡、quarantine、restore-skill | MEMORY_FULL § 重要決定 |
| 記憶與索引 | memory_search、memory_get、按需載入、索引 | MEMORY_FULL、本索引 |

_其餘分類（例如監控日誌、多管道、腳本 CLI 等）在記憶庫尚無對應內容，暫不列入；日後有寫入再補索引。_

---

_新增記憶時：先寫入 MEMORY_FULL.md 或 memory/日期檔，再於本檔與 MEMORY.md 補上對應關鍵字。_
