# NEUXA 會員錢包系統 (Member Wallet)
## 內建錢包 + 外部錢包整合方案 v1.0

> **設計目標**: 讓每位會員無縫持有、使用 $NEUXA 代幣
> **核心原則**: 簡單易用、安全第一、無縫整合

---

## 👛 錢包架構

```
┌─────────────────────────────────────────────────────────────┐
│                    NEUXA 會員錢包系統                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           會員帳戶層 (Account Layer)                 │   │
│  │  會員代號: Star-77                                  │   │
│  │  身份: did:neuxa:member:star-77                     │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│         ┌─────────────┼─────────────┐                      │
│         ▼             ▼             ▼                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ 內建錢包  │  │ 託管錢包  │  │ 外部錢包  │                │
│  │(內部系統)│  │(MPC託管) │  │(用戶自有)│                │
│  │          │  │          │  │          │                │
│  │ • 回饋金 │  │ • 高安全 │  │ • MetaMask│               │
│  │ • 代幣  │  │ • 多簽   │  │ • Phantom │               │
│  │ • NFT   │  │ • 備援   │  │ • 其他    │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │             │             │                        │
│       └─────────────┴─────────────┘                        │
│                       │                                    │
│              ┌────────▼────────┐                          │
│              │   統一餘額介面   │                          │
│              │  顯示總 $NEUXA  │                          │
│              └─────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💼 三種錢包模式

### 1. 內建錢包 (預設推薦)

**適合**: 新手用戶、不想管理私鑰的用戶

**特點**:
- ✅ 註冊即自動創建
- ✅ 無需記憶助記詞
- ✅ 忘記密碼可恢復
- ✅ 與 NEUXA 帳戶綁定
- ✅ 分享挖礦自動入帳

**運作方式**:
```
會員註冊
    ↓
系統自動生成錢包 (後台管理私鑰)
    ↓
會員看到錢包地址: 0x77... (只讀)
    ↓
分享獲得回饋金 → 自動存入內建錢包
    ↓
可在商城消費、提領至外部錢包
```

**安全性**:
- 私鑰由 NEUXA 伺服器加密儲存 (HSM 硬體安全模組)
- 提幣需 2FA 驗證
- 大額提領需 Email 確認

---

### 2. MPC 託管錢包 (進階安全)

**適合**: 資金較多、重視安全的用戶

**特點**:
- 🔐 多簽機制 (需 2/3 簽名)
- 🔐 私鑰分片儲存
- 🔐 無單點故障
- 🔐 支援社交恢復

**運作方式**:
```
會員選擇啟用 MPC 錢包
    ↓
私鑰分成 3 片:
  - 片 1: 會員設備
  - 片 2: NEUXA 伺服器
  - 片 3: 備援服務商 (如 Fireblocks)
    ↓
交易需 2 片簽名才有效
    ↓
即使 NEUXA 被駭，資金仍安全
```

**技術方案**:
- 使用 Lit Protocol 或 Safe (Gnosis Safe)
- 支援多鏈 (ETH、Polygon、BSC)

---

### 3. 外部錢包連結 (專業用戶)

**適合**: 已有加密貨幣經驗的用戶

**支援錢包**:
- MetaMask (最流行)
- Phantom (Solana)
- Trust Wallet (手機)
- Coinbase Wallet
- WalletConnect (通用)

**運作方式**:
```
會員點擊「連結錢包」
    ↓
彈出 WalletConnect 連結
    ↓
掃描 QR Code 或選擇錢包
    ↓
錢包授權連結
    ↓
NEUXA 顯示外部錢包餘額
    ↓
可在 NEUXA 商城使用外部錢包支付
```

**優勢**:
- 資金完全自主控制
- 可在其他平台使用
- 私鑰由用戶保管

---

## 🎨 錢包介面設計

### 會員中心錢包頁面

```
┌─────────────────────────────────────────────────┐
│  💰 我的錢包                    [設定] [說明]    │
├─────────────────────────────────────────────────┤
│                                                 │
│   總餘額                              $NEUXA   │
│   ┌──────────────────────────────────────┐     │
│   │          1,250.50 $NEUXA             │     │
│   │            ≈ $125.05 USD             │     │
│   └──────────────────────────────────────┘     │
│                                                 │
│   分佈:                                         │
│   • 內建錢包: 850.50 $NEUXA (68%)              │
│   • MPC錢包:  300.00 $NEUXA (24%)   [啟用]     │
│   • MetaMask: 100.00 $NEUXA (8%)    [連結]     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   [💸 提領]    [💰 充值]    [🔄 兌換]          │
│                                                 │
├─────────────────────────────────────────────────┤
│   最近交易                                      │
│   ┌─────────────────────────────────────────┐   │
│   │ ⬇️ 分享獎勵   +50 $NEUXA   2小時前     │   │
│   │ ⬆️ 購買 Lite  -100 $NEUXA  昨天        │   │
│   │ ⬇️ Bounty獎勵 +200 $NEUXA  3天前       │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 交易流程

**1. 分享挖礦獲得代幣**:
```
會員分享 NEUXA 連結
    ↓
系統追蹤點擊/註冊
    ↓
自動發放 $NEUXA 到內建錢包
    ↓
會員收到通知: 「恭喜獲得 50 $NEUXA!」
```

**2. 商城消費**:
```
會員選購 Lite 會員 (100 $NEUXA)
    ↓
選擇支付方式:
  ○ 內建錢包 (餘額: 850.50 $NEUXA)
  ○ MetaMask 連結
    ↓
確認支付
    ↓
交易完成，會員升級 Pro
```

**3. 提領至外部錢包**:
```
會員點擊「提領」
    ↓
輸入提領金額: 500 $NEUXA
    ↓
輸入外部錢包地址: 0x...
    ↓
2FA 驗證 (Google Authenticator)
    ↓
Email 確認
    ↓
區塊鏈轉帳 (5-30分鐘到帳)
```

---

## 🔐 安全機制

### 多層安全防護

| 層級 | 機制 | 說明 |
|------|------|------|
| **帳戶層** | 密碼 + 2FA | 登入驗證 |
| **交易層** | Email 確認 | 大額交易二次確認 |
| **私鑰層** | HSM 儲存 | 硬體安全模組 |
| **網路層** | SSL/TLS | 加密傳輸 |
| **監控層** | 異常偵測 | 可疑活動自動封鎖 |

### 風控規則

```
日提領上限: 10,000 $NEUXA
單筆上限: 5,000 $NEUXA
新帳戶 7 天內禁止提領
IP 異常時凍結交易 (需人工審核)
```

---

## 🔄 跨錢包操作

### 內建錢包 ↔ MPC 錢包

```
內建錢包有 1000 $NEUXA
    ↓
發起轉帳至 MPC 錢包
    ↓
輸入金額: 500 $NEUXA
    ↓
2FA 驗證
    ↓
即時到帳 (同系統內)
```

### 內建錢包 ↔ 外部錢包

```
內建錢包有 1000 $NEUXA
    ↓
選擇「提領至 MetaMask」
    ↓
輸入 MetaMask 地址
    ↓
支付 Gas Fee (從餘額扣除)
    ↓
區塊鏈確認 (5-30分鐘)
    ↓
到帳
```

---

## 📱 手機 App 整合

### NEUXA App 錢包功能

| 功能 | 說明 |
|------|------|
| **指紋/Face ID 支付** | 小額快速支付 |
| **推送通知** | 收款/付款即時通知 |
| **掃碼支付** | 商城實體店消費 |
| **餘額小工具** | 手機桌面顯示 |
| **離線模式** | 查看餘額 (不可交易) |

---

## 🛠️ 技術實作

### 後端架構

```javascript
// 錢包服務 API
class WalletService {
  // 創建內建錢包
  async createInternalWallet(memberId) {
    const wallet = ethers.Wallet.createRandom();
    // 私鑰加密後儲存 HSM
    await hsm.storePrivateKey(memberId, encrypt(wallet.privateKey));
    return { address: wallet.address };
  }

  // 查詢餘額
  async getBalance(memberId) {
    const internal = await this.getInternalBalance(memberId);
    const mpc = await this.getMPCBalance(memberId);
    const external = await this.getExternalBalance(memberId);
    return { internal, mpc, external, total: internal + mpc + external };
  }

  // 發放獎勵
  async reward(memberId, amount, reason) {
    const tx = await contract.transfer(
      await this.getInternalAddress(memberId),
      amount
    );
    await this.recordTransaction(memberId, 'reward', amount, reason);
    return tx.hash;
  }

  // 提領申請
  async withdrawRequest(memberId, amount, externalAddress) {
    // 風控檢查
    await this.riskCheck(memberId, amount);
    // 2FA 驗證
    await this.verify2FA(memberId);
    // 執行轉帳
    const tx = await this.executeWithdrawal(memberId, amount, externalAddress);
    return tx.hash;
  }
}
```

### 前端整合

```javascript
// React 錢包組件
function WalletCard() {
  const { balance, walletType } = useWallet();
  
  return (
    <div className="wallet-card">
      <h2>💰 我的錢包</h2>
      <div className="balance">{balance.total} $NEUXA</div>
      <div className="wallet-types">
        <WalletType 
          name="內建錢包" 
          balance={balance.internal}
          active={walletType === 'internal'}
        />
        <WalletType 
          name="MPC錢包" 
          balance={balance.mpc}
          onEnable={() => enableMPC()}
        />
        <WalletType 
          name="外部錢包" 
          balance={balance.external}
          onConnect={() => connectExternal()}
        />
      </div>
      <Actions />
    </div>
  );
}
```

---

## 📋 開發時程

### Phase 1: 內建錢包 (2週)
- [ ] 自動創建錢包
- [ ] 餘額查詢
- [ ] 分享獎勵入帳
- [ ] 基礎安全機制

### Phase 2: 商城整合 (2週)
- [ ] 商城支付
- [ ] 消費紀錄
- [ ] 回饋金抵扣

### Phase 3: 提領功能 (2週)
- [ ] 外部錢包提領
- [ ] Gas Fee 計算
- [ ] 交易紀錄

### Phase 4: MPC錢包 (4週)
- [ ] MPC 整合
- [ ] 多簽機制
- [ ] 社交恢復

### Phase 5: 外部錢包 (2週)
- [ ] WalletConnect
- [ ] MetaMask 支援
- [ ] 多鏈支援

---

## 🎯 用戶體驗目標

| 指標 | 目標 |
|------|------|
| 錢包創建時間 | < 3 秒 (自動) |
| 分享獎勵到帳 | < 10 秒 |
| 商城支付確認 | < 5 秒 |
| 提領到外部錢包 | < 30 分鐘 |
| 錢包啟用率 | > 90% |

---

**「讓每位會員輕鬆擁有 Web3 錢包，無縫進入 NEUXA 經濟體系。」**
