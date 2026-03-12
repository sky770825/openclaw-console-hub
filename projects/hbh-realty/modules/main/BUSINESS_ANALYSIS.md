# 業務流程分析：住商biz_realestate (HBH Realty)

## 1. 關鍵業務流程現狀與痛點

### A. 客戶需求獲取 (Customer Lead Acquisition)
*   **管道**：官網預約、APP 留言、LINE 官方帳號、門市開發、電話諮詢。
*   **痛點**：需求描述往往碎片化且不標準化（例如：「想看大安區 3 房」vs「預算 3000 萬，近捷運，學區要求」）。業務員需手動登錄 CRM，容易遺漏細節。
*   **機會**：導入 AI 解析對話紀錄與留言，自動標籤化需求。

### B. 房源匹配與推薦 (Object Matching & Recommendation)
*   **現狀**：依賴業務員經驗或 CRM 系統的簡單條件篩選（總價、區域、坪數）。
*   **痛點**：難以捕捉「隱性需求」（例如：採光好、安靜、生活機能強）。推薦理由往往缺乏說服力，只是單純列出房源。
*   **機會**：利用向量資料庫 (Vector DB) 進行語意搜尋，匹配隱性特徵並生成 AI 推薦語。

### C. 市場動態監測 (Market Monitoring)
*   **數據源**：內政部實價登錄、樂屋網、信義房屋行情、內部成交數據。
*   **痛點**：數據量大且更新快，業務員難以即時消化並轉化為專業建議。
*   **機會**：自動抓取並整合多方數據，生成區域市場週報/月報，辅助業務定價。

### D. 合約草擬輔助 (Contract Drafting)
*   **現狀**：使用內政部標準範本，人工填入買賣雙方資訊、標示、價金分期等。
*   **痛點**：手動輸入易出錯，特別是持分、車位、附加條款等細節。
*   **機會**：根據成交確認書 (Confirmation of Sale) 自動填入對應欄位，並檢索法律資料庫提供特約條款建議。

## 2. 數據源識別

| 類別 | 數據源 | 內容 | 獲取方式 |
| :--- | :--- | :--- | :--- |
| **內部數據** | CRM 系統 | 客戶名單、互動紀錄、成交歷史 | API / Database |
| | 物件系統 | 房源照片、格局圖、屋況說明 | API / Database |
| **外部數據** | 政府公開數據 | 內政部實價登錄、都市計畫、地籍資料 | Open Data API / Web Scraping |
| | 競爭對手/入口網站 | 樂屋網、platform_platform_platform_591、信義/中信行情 | Web Scraping / RSS |
| | 地圖與機能 | Google Maps API、捷運/學區資訊 | API |

---

## 3. 核心智能模組設計

### 模組 A：客戶需求解析 (NLP Parser)
*   **功能**：輸入一段非格式化文本（如 LINE 對話），輸出 JSON 格式需求。
*   **技術**：LLM (GPT/Claude) + Entity Extraction。

### 模組 B：房源智能匹配 (Smart Matcher)
*   **功能**：計算房源與需求的語意相似度。
*   **技術**：Embedding (nomic-embed-text) + Vector Store。

### 模組 C：市場趨勢預測 (Trend Analyzer)
*   **功能**：分析實價登錄變化，預測未來 3 個月區域漲跌幅。
*   **技術**：Time-series Analysis + LLM Report Generation。

### 模組 D：合約自動生成 (Auto Drafter)
*   **功能**：將交易詳情填入標準買賣契約書 PDF/Docx。
*   **技術**：Template Engine (Jinja2) + PDF Lib。
