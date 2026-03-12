# 美業網站前端介面基礎開發報告

## 1. 開發概述
本階段完成了基礎 UI 元件庫、頁面佈局架構以及後端 API 串接邏輯。

## 2. 完成項目
- **通用元件庫 (Atomic Components)**:
  - `Button.jsx`: 支援 primary/secondary/outline 三種變體。
  - `Card.jsx`: 用於展示服務項目。
- **頁面佈局 (Layout)**:
  - `Navbar.jsx`: 包含導航連結與 Logo 區域。
  - `MainLayout.jsx`: 封裝全局導航與頁尾。
- **後端串接 (API Layer)**:
  - `api.js`: 封裝 Fetch API，實現服務列表獲取與預約提交。
- **範例頁面**:
  - `HomePage.jsx`: 展示如何整合 Layout、元件與 API。

## 3. 技術規格
- 框架: React (相容 Next.js 結構)
- 樣式: Tailwind CSS (預計)
- 接口: RESTful API

## 4. 檔案位置
- 元件: `output/frontend/components/`
- 佈局: `output/frontend/layout/`
- 服務層: `output/frontend/services/`
