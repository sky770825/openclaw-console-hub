# 美業網站後台管理介面開發報告

## 1. 任務概述
開發一個直觀的後台介面，實現對使用者、店家、服務及預約的 CRUD 操作。

## 2. 實作細節
由於源代碼目錄限制，本開發案採取「獨立式管理後台」策略：
- **技術棧**: Vue.js 3 (CDN), Tailwind CSS (CDN).
- **部署方式**: 生成單一 HTML 檔案，放置於 `sandbox/output` 目錄，不干擾主程式碼。
- **功能模組**:
    - **使用者管理**: 檢視、新增、修改、刪除系統用戶。
    - **店家管理**: 管理平台上架的美容店家資訊。
    - **服務管理**: 定義各店家提供的服務項目與價格。
    - **預約管理**: 追蹤預約狀態（已確認、待處理等）。
- **數據連線策略**:
    - **模擬模式 (Mock Mode)**: 內建數據與 LocalStorage 存儲，方便在開發環境離線測試。
    - **連線模式 (API Mode)**: 可隨時切換至實體 API 端點 (`http://localhost:/api`)。

## 3. 檔案清單
- 介面檔案: `/Users/sky770825/.openclaw/workspace/sandbox/output/admin_dashboard.html`
- 啟動腳本: `/Users/sky770825/.openclaw/workspace/scripts/launch_admin_ui.sh`

## 4. 使用說明
1. 執行 `bash /Users/sky770825/.openclaw/workspace/scripts/launch_admin_ui.sh` 即可開啟管理介面。
2. 介面右上角可切換「模擬數據」或「連線模式」。
