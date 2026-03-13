# 美業網站使用者認證與權限管理開發報告

## 1. 角色定義 (RBAC)
- **一般使用者 (USER)**: 預約服務、查看個人資料。
- **店家管理員 (STORE_ADMIN)**: 管理店家服務、查看預約訂單、管理店員。
- **平台管理員 (PLATFORM_ADMIN)**: 系統全局管理、審核店家、數據統計。

## 2. 功能模組說明
- **AuthService**: 負責處理密碼雜湊 (SHA-256)、JWT 簽發及驗證。
- **Middleware**: 實作 `authorize([roles])` 用於保護 API 路徑。
- **User Profile**: 提供 `GET /me` 與 `PUT /me` API 供使用者維護資料。

## 3. 實作位置
所有生成的程式碼位於 `/Users/sky770825/.openclaw/workspace/scripts/auth_system/`。
由於 `server/src/` 受限無法直接修改，請手動將以上模組整合至專案中。

## 4. 整合建議
1. 將 `types.ts` 整合至 `server/src/types/`。
2. 將 `auth.service.ts` 與 `middleware.ts` 部署至 `server/src/services/` 與 `server/src/middleware/`。
3. 在 Express Router 中套用：
   `router.get('/admin/dashboard', authorize(['PLATFORM_ADMIN']), dashboardHandler);`
