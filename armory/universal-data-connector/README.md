# 技能：萬能數據連接器 (Universal Data Connector)

- **版本 (Version):** 1.0 (藍圖階段)
- **功能簡介 (Functionality Overview):**
  提供一個統一的、模組化的介面，用於與多種資料庫（SQLite, PostgreSQL, MySQL 等）進行互動。本體只是一個調度器，真正的功能由安裝在 `modules/` 子目錄下的具體連接器模組提供。
- **使用方法 (Usage):**
  `db <module> <command> [args...]`
- **安全等級 (Security Level):** 內部開發 - 最高
- **來源 (Source):** 自研 (NEUXA 數位鐵匠鋪 - 阿里阿德涅協議)
- **已安裝模組:** (待第二階段完成後填寫)