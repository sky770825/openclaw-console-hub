# 美業網站使用者認證與權限管理設計文件

## 1. 功能概述
本系統實作了完整的使用者認證 (Authentication) 與基於角色的存取控制 (RBAC)。

## 2. 角色權限定義 (Roles)
| 角色名稱 | 權限描述 |
| :--- | :--- |
| **USER (一般使用者)** | 瀏覽店家、預約服務、管理個人資料。 |
| **SHOP_MANAGER (店家管理員)** | 管理店家資訊、服務項目、查看預約、管理店內員工。 |
| **ADMIN (平台管理員)** | 系統監控、管理所有使用者與店家、核准店家申請。 |

## 3. 技術實作細節
- **密碼安全**: 使用 SHA256 (Hmac) 進行密碼加鹽雜湊存儲。
- **認證機制**: 基於 JWT (JSON Web Token) 的 Stateless 認證。
- **權限控制**: 在各 API 路由入口檢查 Token 內的 `role` 欄位。
- **持久化**: 使用 JSON 檔案模擬資料庫存儲。

## 4. API 端點說明
- `POST /register`: 使用者註冊。
- `POST /login`: 取得認證 Token。
- `POST /forgot-password`: 發送重設密碼請求。
- `GET /profile`: 獲取當前登入者資訊。
- `GET /shop/manage`: 店家管理後台 (限 SHOP_MANAGER, ADMIN)。
- `GET /admin/dashboard`: 平台管理後台 (限 ADMIN)。

## 5. 安全性考量
- 敏感資料 (如密碼) 永不回傳給前端。
- Token 設有過期機制 (本實作設為 1 小時)。
- 權限驗證在後端強制執行，前端僅用於顯示/隱藏 UI 元件。
