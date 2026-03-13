### *智慧表單系統 - 認證 API 規範 (v1)*

#### *通用設計原則*

1.  *API 端點前綴 (Prefix)*: 所有認證相關的 API 都位於 /api/v1/auth 路徑下。
2.  *請求/回應格式*: 所有請求與回應的主體 (Body) 皆為 application/json 格式。
3.  *HTTP 狀態碼*: 嚴格遵守標準 HTTP 狀態碼以表示操作結果。
    *   200 OK: 請求成功 (例如：登入、刷新 Token)。
    *   201 Created: 資源創建成功 (例如：註冊)。
    *   400 Bad Request: 請求格式錯誤或缺少必要參數 (例如：Email 格式不對)。
    *   401 Unauthorized: 認證失敗 (例如：密碼錯誤、Token 無效或過期)。
    *   409 Conflict: 資源衝突 (例如：註冊的 Email 已存在)。
    *   500 Internal Server Error: 伺服器內部錯誤。
4.  *統一回應結構*: 
    *   *成功*: 
        
        {
          "status": "success",
          "data": { ... }
        }
        `
    *   *失敗*: 
        
        {
          "status": "error",
          "message": "具體的錯誤訊息",
          "code": "ERROR_CODE_FOR_FRONTEND" // 可選，方便前端根據錯誤碼做特定處理
        }
        `

---

### *1. 用戶註冊 (Register)*

*   *Endpoint*: POST /api/v1/auth/register
*   *描述*: 創建一個新的用戶帳號。
*   *行為*: 
    1.  驗證請求內容：email 必須是合法的 Email 格式，password 必須符合強度要求 (例如：最少 8 個字元)。
    2.  檢查 email 是否已經存在於資料庫中。如果已存在，回傳 409 Conflict。
    3.  *【安全性】* 使用 bcrypt 或 Argon2 等強雜湊演算法對 password 進行加鹽雜湊 (Salted Hash)。*絕不儲存明文密碼*。
    4.  將 email 和雜湊後的密碼存入資料庫。
    5.  (可選，但建議) 註冊成功後自動為用戶登入，直接回傳 Access Token 和 Refresh Token。

#### *請求 (Request)*


{
  "email": "testuser@example.com",
  "password": "a-very-strong-password-123"
}
`

#### *回應 (Response)*

*   *成功 (201 Created - 自動登入)*:
    
    {
      "status": "success",
      "data": {
        "message": "User registered successfully.",
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "a_long_random_opaque_string_for_refresh...",
        "expiresIn": 3600 // Access Token 的有效期 (秒)，方便前端參考
      }
    }
    `
*   *Email 已存在 (409 Conflict)*:
    
    {
      "status": "error",
      "message": "Email already registered.",
      "code": "EMAIL_ALREADY_EXISTS"
    }
    `
*   *輸入驗證失敗 (400 Bad Request)*:
    
    {
      "status": "error",
      "message": "Invalid input data.",
      "errors": {
        "email": "Invalid email format.",
        "password": "Password must be at least 8 characters long."
      },
      "code": "VALIDATION_FAILED"
    }
    `

---

### *2. 用戶登入 (Login)*

*   *Endpoint*: POST /api/v1/auth/login
*   *描述*: 用戶使用 Email 和密碼登入系統。
*   *行為*: 
    1.  驗證請求內容：email 和 password 必須存在。
    2.  根據 email 從資料庫中查找用戶。如果用戶不存在，回傳 401 Unauthorized。
    3.  *【安全性】* 使用雜湊演算法驗證提供的 password 是否與資料庫中儲存的 password_hash 匹配。*切勿直接比較明文密碼*。
    4.  如果密碼不匹配，回傳 401 Unauthorized。
    5.  如果驗證成功，生成一個 JWT accessToken 和一個 refreshToken。
    6.  將 refreshToken 儲存到資料庫中，與用戶 ID 關聯，並設定其有效期。
    7.  回傳 accessToken 和 refreshToken 給客戶端。

#### *請求 (Request)*


{
  "email": "testuser@example.com",
  "password": "a-very-strong-password-123"
}
`

#### *回應 (Response)*

*   *成功 (200 OK)*:
    
    {
      "status": "success",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "a_long_random_opaque_string_for_refresh...",
        "expiresIn": 3600 // Access Token 的有效期 (秒)
      }
    }
    `
*   *認證失敗 (401 Unauthorized)*: (Email 或密碼錯誤)
    
    {
      "status": "error",
      "message": "Invalid email or password.",
      "code": "INVALID_CREDENTIALS"
    }
    `

---

### *3. Token 刷新 (Refresh Token)*

*   *Endpoint*: POST /api/v1/auth/refresh
*   *描述*: 使用 Refresh Token 獲取新的 Access Token。
*   *行為*: 
    1.  驗證請求內容：refreshToken 必須存在。
    2.  從資料庫中查找該 refreshToken。如果不存在或已過期，回傳 401 Unauthorized。
    3.  如果 Refresh Token 有效，則生成一個新的 accessToken。
    4.  (可選) 為了增強安全性，可以同時撤銷舊的 refreshToken 並發放一個新的 refreshToken (Rotation)。
    5.  回傳新的 accessToken (和新的 refreshToken，如果實施了 Rotation)。

#### *請求 (Request)*


{ 
  "refreshToken": "a_long_random_opaque_string_for_refresh..."
}
`

#### *回應 (Response)*

*   *成功 (200 OK)*:
    
    {
      "status": "success",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "new_long_random_opaque_string_for_refresh...", // 如果實施了 Rotation
        "expiresIn": 3600
      }
    }
    `
*   *無效或過期 Refresh Token (401 Unauthorized)*:
    
    {
      "status": "error",
      "message": "Invalid or expired refresh token.",
      "code": "INVALID_REFRESH_TOKEN"
    }
    `

---

### *4. 用戶登出 (Logout)*

*   *Endpoint*: POST /api/v1/auth/logout
*   *描述*: 用戶登出系統，使 JWT Token 失效。
*   *行為*: 
    1.  請求通常需要 Authorization: Bearer <accessToken> 頭部。
    2.  *【安全性】* 在後端將該用戶的 refreshToken 標記為失效或從資料庫中刪除。由於 JWT accessToken 是無狀態的，一旦發出就無法直接「撤銷」，所以登出主要是針對 refreshToken 的管理。
    3.  客戶端也應刪除本地儲存的所有 Token。
    4.  回傳成功訊息。

#### *請求 (Request)*


// 通常只需要 Access Token 在 Header 中
// Authorization: Bearer <accessToken>
{}
`

#### *回應 (Response)*

*   *成功 (200 OK)*:
    
    {
      "status": "success",
      "data": {
        "message": "Logged out successfully."
      }
    }
    `
*   *未授權 (401 Unauthorized)*:
    
    {
      "status": "error",
      "message": "Unauthorized.",
      "code": "UNAUTHORIZED"
    }
    `

---

### *安全性考量與建議*

1.  *密碼雜湊 (Password Hashing)*:
    *   *務必使用* bcrypt 或 Argon2 等現代的密碼雜湊演算法。它們設計用於抵抗彩虹表攻擊，並具有可配置的工作因子 (Cost Factor) 來抵禦暴力破解。
    *   *切勿使用* MD5、SHA1、SHA256 等快速雜湊演算法來儲存密碼。
    *   每個密碼都應該有獨立的鹽值 (Salt)，並隨雜湊值一起儲存。

2.  *Token 儲存 (Token Storage)*:
    *   *Access Token*: 應儲存在客戶端的記憶體中 (例如 JavaScript 變數)，並在每次請求時透過 Authorization: Bearer <accessToken> 頭部發送。避免儲存在 localStorage，因為容易受到 XSS 攻擊。
    *   *Refresh Token*: 由於 Refresh Token 通常有效期較長且用於獲取新的 Access Token，因此更敏感。
        *   *建議*: 儲存在安全的 HTTP-only cookie 中，並設定 Secure 和 SameSite=Strict 屬性。這樣可以防止 JavaScript 訪問，降低 XSS 風險。
        *   後端應記錄所有發出的 Refresh Token，並在登出或檢測到異常時使其失效。

3.  *CORS (跨域資源共享)*:
    *   確保後端正確配置 CORS 策略，只允許信任的客戶端域名訪問 API。
    *   避免使用 Allow-Origin: *` 在生產環境中。

4.  *Token 有效期 (Token Expiration)*:
    *   *Access Token*: 應設定較短的有效期 (例如 15 分鐘到 1 小時)。即使被竊取，攻擊者能利用的時間也有限。
    *   *Refresh Token*: 應設定較長的有效期 (例如 7 天到 30 天)，用於在 Access Token 過期後安全地獲取新的 Access Token。

5.  *日誌記錄 (Logging)*:
    *   對所有認證相關的成功和失敗事件進行詳細的日誌記錄，以便監控異常活動和潛在的攻擊嘗試。

6.  *速率限制 (Rate Limiting)*:
    *   對註冊、登入和 Token 刷新等端點實施速率限制，以抵禦暴力破解和拒絕服務 (DoS) 攻擊。

7.  *HTTPS*: 
    *   所有 API 通訊都必須通過 HTTPS 進行，以加密傳輸中的敏感數據，防止中間人攻擊。

8.  *錯誤處理 (Error Handling)*:
    *   錯誤回應應提供足夠的資訊以供客戶端調試，但不要洩露敏感的伺服器內部細節 (例如資料庫錯誤訊息)。
    *   使用統一的錯誤回應結構，方便客戶端解析。