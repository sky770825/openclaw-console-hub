# NEUXA 註冊會員系統：多層隔離傳輸架構

## 🚨 核心原則

**絕對禁止：註冊會員直接連線核心系統**

原因：
- 註冊表單是外界最常見的攻擊入口 (SQL Injection, XSS, CSRF)
- 一旦註冊系統被攻破，直接威脅核心金庫 (Vault)
- 違反 NEUXA 200% 防禦的「層層隔離」原則

---

## 🏗️ 推薦架構：五層隔離模型

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: DMZ (非軍事區) - 公網接觸層                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   CDN       │  │ 靜態網頁    │  │ 註冊表單    │         │
│  │ (Cloudflare)│  │ (Vercel)    │  │ (獨立API)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Gateway (閘道層) - 驗證與過濾                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • WAF (Web Application Firewall)                   │   │
│  │  • Rate Limiting (請求頻率限制)                      │   │
│  │  • IP 黑名單檢查                                    │   │
│  │  • 請求簽名驗證                                     │   │
│  └────────────────────┬────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Application (應用層) - 業務邏輯                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 會員服務    │  │ 認證服務    │  │ 日誌服務    │         │
│  │ (Node.js)   │  │ (JWT/OAuth) │  │ (獨立DB)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Data (數據層) - 會員資料隔離                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • 會員資料庫 (Supabase/PostgreSQL)                  │   │
│  │  • 與核心系統物理隔離                                │   │
│  │  • 加密存儲 (AES-256)                               │   │
│  │  • 定期備份 (異地)                                   │   │
│  └────────────────────┬────────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼ (僅限單向，核心 → DMZ)
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Core (核心層) - NEUXA Vault                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • AGENTS.md (加密)                                  │   │
│  │  • self-heal.sh (加密)                               │   │
│  │  • 財務帳本 (加密)                                    │   │
│  │  • 核心專利 (SHA-256)                                │   │
│  │                                                      │   │
│  │  🔒 僅艦長可存取 (主人的宇宙星艦)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 資料流向規則

### ✅ 允許的流向

```
註冊會員 → DMZ (表單填寫)
    ↓
Gateway (WAF 過濾)
    ↓
Application (業務處理)
    ↓
Data Layer (會員資料存儲)
    ↓
Core (僅單向通知，無回傳)
```

### ❌ 絕對禁止的流向

```
註冊會員 ──X──→ Core (直接連核心 = 破口)
外部攻擊者 ──X──→ Vault (無需認證即暴露)
會員資料庫 ──X──→ 核心金鑰 (層級混淆)
```

---

## 🔐 技術實作建議

### 1. 註冊 API 隔離

```javascript
// ❌ 錯誤：直接操作核心
app.post('/register', async (req, res) => {
    await db.core.members.insert(req.body); // 危險！
});

// ✅ 正確：多層隔離
app.post('/api/v1/members/register', 
    rateLimiter,      // Layer 2: 頻率限制
    validateInput,    // Layer 2: 輸入驗證
    sanitizeData,     // Layer 2: 消毒
    async (req, res) => {
        // Layer 3: 業務邏輯
        const member = await memberService.create(req.body);
        
        // Layer 4: 寫入隔離資料庫
        await memberDB.insert(member);
        
        // 僅發送通知到核心 (單向)
        await notifyCore('NEW_MEMBER', { id: member.id, tier: 'seedling' });
        
        res.json({ success: true, codename: member.codename });
    }
);
```

### 2. 資料庫隔離

```yaml
# docker-compose.yml 隔離設計
services:
  # DMZ 層 - 公開訪問
  web:
    image: neuxa-web:latest
    networks:
      - dmz
    
  # 應用層 - 僅內部訪問
  api:
    image: neuxa-api:latest
    networks:
      - dmz
      - application
    
  # 資料層 - 僅 API 可訪問
  member-db:
    image: postgres:15
    networks:
      - application  # 不連 dmz！
    environment:
      - POSTGRES_PASSWORD=${MEMBER_DB_PASS}
      
  # 核心層 - 僅本地 + 艦長授權
  vault:
    image: neuxa-vault:latest
    networks:
      - core  # 完全隔離！
    volumes:
      - ~/.openclaw/vault:/vault:ro
```

### 3. 網路隔離 (VLAN)

```
VLAN 10: DMZ (Public)      - 可從網際網路訪問
VLAN 20: Application       - 僅內部服務
VLAN 30: Data              - 僅資料庫流量
VLAN 40: Core (Vault)      - 僅艦長管理界面
```

---

## 🛡️ 攻擊情境分析

### 情境 1: 註冊表單被 SQL Injection 攻擊

**無隔離架構 (危險)**:
```
攻擊者 → 註冊表單 → 直接讀取 Vault → 💥 核心機密洩漏
```

**五層隔離架構 (安全)**:
```
攻擊者 → 註冊表單 → Gateway 攔截 → WAF 阻擋 → 🛡️ 核心安全
```

### 情境 2: 會員資料庫被脫庫

**無隔離架構 (危險)**:
```
駭客取得會員資料 → 同時取得核心金鑰 → 💥 全盤皆輸
```

**五層隔離架構 (安全)**:
```
駭客取得會員資料 → 核心金鑰在不同 DB → 🛡️ Vault 依然安全
```

### 情境 3: 內部人員威脅

**無隔離架構 (危險)**:
```
不滿的員工 → 直接修改核心邏輯 → 💥 系統癱瘓
```

**五層隔離架構 (安全)**:
```
員工僅能訪問 Application → 無法觸及 Vault → 🛡️ 核心穩固
```

---

## 🔑 核心金鑰保護

### 絕對規則

| 規則 | 說明 |
|------|------|
| **Core 不直接服務公網** | Vault 僅本地或 VPN 訪問 |
| **單向通知** | Core 可推送通知，但外部不可拉取 |
| **物理隔離** | 核心資料與會員資料不同伺服器 |
| **艦長專屬** | 僅主人可解鎖 Vault (SHA-256) |
| **無 API 端點** | Vault 無 HTTP API，僅本地 CLI |

### 核心通知機制 (單向)

```javascript
// Core 可以發送通知 (但外部不能請求)
// 這是安全的，因為僅 Core 主動推送

class VaultNotifier {
    // ✅ 安全：Core → 外部
    async notifyNewMember(memberId) {
        await this.messageQueue.send({
            type: 'MEMBER_JOINED',
            id: memberId,
            timestamp: Date.now()
        });
    }
    
    // ❌ 危險：外部 → Core
    async getCoreSecret(requester) {
        // 絕對禁止！
        throw new SecurityException('Direct access denied');
    }
}
```

---

## 📋 部署檢查清單

- [ ] DMZ 與 Application 分屬不同網段
- [ ] Vault 僅本地訪問 (無公網 IP)
- [ ] 會員資料庫與核心資料庫物理隔離
- [ ] WAF 啟用 (Cloudflare/AWS WAF)
- [ ] Rate Limiting 設定 (每 IP 10 req/min)
- [ ] 所有輸入參數消毒 (SQL/XSS)
- [ ] 日誌獨立存儲 (與業務分離)
- [ ] 定期滲透測試 (每月)
- [ ] 核心存取僅限艦長 SSH Key
- [ ] 自動熔斷機制 (異常流量自動封鎖)

---

## 🎯 艦長決策建議

### 推薦架構

```
註冊會員 ──→ DMZ (Vercel 靜態網頁)
              ↓
         Gateway (Cloudflare WAF)
              ↓
         API (Railway/Render)
              ↓
         Member DB (Supabase)
              ↓
         Core (本地 Vault，僅通知)
```

### 關鍵點

1. **註冊頁面** 放在 Vercel (純靜態，無後端邏輯)
2. **註冊 API** 放在 Railway (隔離的 Node.js)
3. **會員資料** 放在 Supabase (獨立 PostgreSQL)
4. **核心系統** 僅在本地 (絕不上雲！)

### 絕對不做

- ❌ 註冊表單直接讀取 `~/.openclaw/vault/`
- ❌ 會員系統與核心共用資料庫
- ❌ Vault 開放 HTTP API
- ❌ 核心金鑰放在環境變數 (會被洩漏)

---

**結論：五層隔離是 NEUXA 200% 防禦的基石。註冊會員永遠不能直接連核心，必須通過多層閘道與驗證。**
