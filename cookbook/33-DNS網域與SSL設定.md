---
tags: [DNS, SSL, domain, HTTPS, 網域, 憑證, Cloudflare, Let's-Encrypt]
date: 2026-03-05
category: cookbook
---

# 33 — DNS 網域與 SSL 設定

> 適用對象：網頁設計接案者 / 工作室，幫客戶設定網域、DNS、SSL、Email
> 最後更新：2026-03-05

---

## 目錄

1. [網域基礎知識](#1-網域基礎知識)
2. [DNS 設定實戰](#2-dns-設定實戰)
3. [各平台 DNS 設定步驟](#3-各平台-dns-設定步驟)
4. [SSL / HTTPS 設定](#4-ssl--https-設定)
5. [常見問題排查](#5-常見問題排查)
6. [Email 設定](#6-email-設定)
7. [網域移轉](#7-網域移轉)
8. [客戶網域管理 SOP](#8-客戶網域管理-sop)

---

## 1. 網域基礎知識

### 1.1 什麼是 DNS

DNS（Domain Name System）是網際網路的「電話簿」。人類記住 `example.com`，DNS 幫你翻譯成 IP 位址 `93.184.216.34`，瀏覽器才知道要連去哪台機器。

```
使用者輸入 example.com
    ↓
瀏覽器問 DNS 解析器：example.com 的 IP 是什麼？
    ↓
DNS 解析器回：93.184.216.34
    ↓
瀏覽器連線到 93.184.216.34
    ↓
網站載入完成
```

### 1.2 DNS 記錄類型

| 記錄類型 | 用途 | 範例值 | 什麼時候用 |
|----------|------|--------|------------|
| **A** | 網域指向 IPv4 位址 | `93.184.216.34` | 主機有固定 IP（VPS、AWS EC2） |
| **AAAA** | 網域指向 IPv6 位址 | `2606:2800:220:1:...` | 主機有 IPv6 |
| **CNAME** | 網域指向另一個網域 | `cname.vercel-dns.com` | 指向 Vercel / Netlify / Cloudflare 等平台 |
| **MX** | 郵件伺服器 | `aspmx.l.google.com` | 設定 Email 收信（Google Workspace / Zoho） |
| **TXT** | 文字記錄（驗證用） | `v=spf1 include:_spf.google.com ~all` | SPF / DKIM / DMARC / 網域驗證 |
| **NS** | 指定 DNS 伺服器 | `ns1.cloudflare.com` | 把 DNS 管理權交給 Cloudflare 等服務 |
| **SRV** | 服務定位 | `_sip._tcp.example.com` | 進階用，一般接案很少碰到 |
| **CAA** | SSL 憑證授權 | `0 issue "letsencrypt.org"` | 限制誰可以幫你發 SSL 憑證 |

#### A Record vs CNAME 的差異（最常搞混）

```
A Record：
  example.com → 93.184.216.34      （直接指向 IP）

CNAME：
  www.example.com → example.com     （指向另一個域名）
  blog.example.com → xxx.netlify.app（指向 Netlify）
```

**重要規則**：
- 根域名（`example.com`，又稱 apex domain）**不能**設 CNAME（RFC 規範）
- 只有子域名（`www.example.com`）才能設 CNAME
- Cloudflare 的 CNAME Flattening 可以突破這個限制（後面會講）

### 1.3 網域購買推薦

| 註冊商 | 優點 | 缺點 | .com 年費(USD) | 推薦度 |
|--------|------|------|----------------|--------|
| **Namecheap** | 價格便宜、介面直覺、免費 WhoisGuard | 中文支援較少 | ~$8.88 | 首選 |
| **Cloudflare Registrar** | 成本價販售（零利潤）、DNS 一站搞定 | 可選 TLD 較少 | ~$8.57 | 首選（搭配 Cloudflare DNS） |
| **Gandi** | 歐洲老牌、GDPR 合規、介面乾淨 | 價格偏高 | ~$15.50 | 注重隱私 |
| **GoDaddy** | 全球最大、中文介面 | 續約價暴漲、一直推銷加購 | ~$11.99（首年促銷 $0.99） | 不推薦 |
| **Squarespace Domains** | 原 Google Domains 轉移過來 | 功能變少、未來不確定 | ~$12.00 | 觀望 |
| **TWNIC 授權商** | 台灣 .tw / .com.tw 必須在這買 | 價格較高 | 不適用 | 買 .tw 用 |

> **接案者建議**：自己的域名用 Cloudflare Registrar（最便宜 + DNS 一站完成），客戶的域名建議客戶自己在 Namecheap 買（容易管理、轉移方便）。

### 1.4 .com / .tw / .com.tw 差異

| 類型 | 範例 | 年費(TWD) | 適合誰 | 申請條件 |
|------|------|-----------|--------|----------|
| **.com** | `mybrand.com` | ~NT$270-400 | 國際品牌、SaaS、個人品牌 | 無限制，任何人可註冊 |
| **.tw** | `mybrand.tw` | ~NT$800 | 台灣在地品牌、強調本土 | 台灣公司 / 個人（需身分驗證） |
| **.com.tw** | `mybrand.com.tw` | ~NT$800 | 台灣公司、電商、企業形象 | 須有公司登記或商業登記 |
| **.org.tw** | `mybrand.org.tw` | ~NT$800 | 非營利組織、協會 | 須有法人登記 |
| **.net.tw** | `mybrand.net.tw` | ~NT$800 | 網路服務提供者 | 電信事業登記 |
| **.idv.tw** | `myname.idv.tw` | ~NT$800 | 個人網站 | 年滿 20 歲台灣居民 |

#### 接案者怎麼建議客戶

```
小型本地商家（餐廳、美髮、診所）→ .com.tw 或 .tw
新創 / SaaS / 想打國際市場        → .com
個人品牌 / 部落格                  → .com（最通用）
非營利 / 協會                      → .org.tw
```

### 1.5 台灣 .tw 網域申請流程（TWNIC）

TWNIC（財團法人台灣網路資訊中心）管理所有 .tw 網域，但不直接販售，需透過授權註冊商。

#### 授權註冊商（常用）

| 註冊商 | 網址 | 特色 |
|--------|------|------|
| **中華電信 HiNet** | `domain.hinet.net` | 最大、最穩、企業客戶首選 |
| **PChome 買網址** | `myname.pchome.com.tw` | 介面簡單、適合個人 |
| **網路中文 TWNIC** | `www.net-chinese.com.tw` | TWNIC 關係企業，功能完整 |
| **GANDI** | `www.gandi.net` | 國際商，也支援 .tw |
| **亞太電信** | `nweb.aptg.com.tw` | 企業客戶 |

#### 申請步驟（以 HiNet 為例）

```
步驟 1：到 domain.hinet.net 搜尋你要的域名
        ↓ 確認可註冊
步驟 2：選擇年限（1-10 年），加入購物車
        ↓
步驟 3：填寫申請人資料
        - 公司名稱 / 個人姓名
        - 統一編號 / 身分證字號
        - 聯絡人 Email（會收驗證信）
        ↓
步驟 4：上傳證明文件
        - .com.tw：公司登記證明 或 商業登記證明
        - .tw：身分證影本 或 公司登記
        - .idv.tw：身分證影本
        ↓
步驟 5：付款（信用卡 / ATM / 超商）
        ↓
步驟 6：等待審核（通常 1-3 個工作天）
        ↓
步驟 7：收到啟用通知信 → 到管理後台設定 DNS
```

> **注意**：.com.tw 需要公司登記，如果客戶是個人工作室還沒有公司，可以先用 .tw 或 .com。

---

## 2. DNS 設定實戰

### 2.1 A Record 指向主機 IP

**場景**：你有一台 VPS（例如 Linode、DigitalOcean），IP 是 `167.172.5.100`

在 DNS 管理介面新增：

```
類型：A
名稱：@              （代表根域名 example.com）
值：167.172.5.100
TTL：3600            （秒，= 1 小時）
```

如果也要讓 `www.example.com` 生效：

```
類型：A
名稱：www
值：167.172.5.100
TTL：3600
```

或者用 CNAME 讓 www 指向根域名：

```
類型：CNAME
名稱：www
值：example.com
TTL：3600
```

#### 用 CLI 驗證

```bash
# 查詢 A Record
dig example.com A +short
# 預期輸出：167.172.5.100

# 查詢 www 的解析
dig www.example.com +short
# 預期輸出：167.172.5.100（A Record）
#        或 example.com → 167.172.5.100（CNAME 串接）

# 完整查詢資訊
dig example.com A

# 用 nslookup 查（Windows / Mac 都有）
nslookup example.com
```

### 2.2 CNAME 指向平台

**場景**：你的網站部署在 Vercel

```
類型：CNAME
名稱：www
值：cname.vercel-dns.com
TTL：3600（或 Auto）
```

**場景**：你的部落格部署在 Netlify

```
類型：CNAME
名稱：blog
值：your-site-name.netlify.app
TTL：3600
```

### 2.3 MX Record 設定

#### Google Workspace MX 記錄

```
優先順序    MX 伺服器
1          aspmx.l.google.com
5          alt1.aspmx.l.google.com
5          alt2.aspmx.l.google.com
10         alt3.aspmx.l.google.com
10         alt4.aspmx.l.google.com
```

在 DNS 管理介面，新增 5 筆 MX 記錄：

```
類型：MX    名稱：@    值：aspmx.l.google.com       優先順序：1    TTL：3600
類型：MX    名稱：@    值：alt1.aspmx.l.google.com   優先順序：5    TTL：3600
類型：MX    名稱：@    值：alt2.aspmx.l.google.com   優先順序：5    TTL：3600
類型：MX    名稱：@    值：alt3.aspmx.l.google.com   優先順序：10   TTL：3600
類型：MX    名稱：@    值：alt4.aspmx.l.google.com   優先順序：10   TTL：3600
```

#### Zoho Mail MX 記錄

```
類型：MX    名稱：@    值：mx.zoho.com       優先順序：10   TTL：3600
類型：MX    名稱：@    值：mx2.zoho.com      優先順序：20   TTL：3600
類型：MX    名稱：@    值：mx3.zoho.com      優先順序：50   TTL：3600
```

#### 驗證 MX 設定

```bash
# 查詢 MX 記錄
dig example.com MX +short
# 預期輸出（Google Workspace）：
# 1 aspmx.l.google.com.
# 5 alt1.aspmx.l.google.com.
# 5 alt2.aspmx.l.google.com.
# 10 alt3.aspmx.l.google.com.
# 10 alt4.aspmx.l.google.com.

# 測試郵件伺服器連線
telnet aspmx.l.google.com 25
# 出現 220 mx.google.com ESMTP 就代表正常
# 輸入 QUIT 離開
```

### 2.4 TXT Record（SPF / DKIM / DMARC）

這三個 TXT 記錄是**防止你寄出的信被當垃圾郵件**的關鍵。客戶如果反映「我寄出去的信都到對方垃圾郵件」，99% 是這三個沒設好。

#### SPF（Sender Policy Framework）— 指定誰可以用你的域名寄信

```
類型：TXT
名稱：@
值：v=spf1 include:_spf.google.com ~all
TTL：3600
```

常見 SPF 組合：

```
# 只用 Google Workspace 寄信
v=spf1 include:_spf.google.com ~all

# Google Workspace + Mailchimp
v=spf1 include:_spf.google.com include:servers.mcsv.net ~all

# Google Workspace + SendGrid
v=spf1 include:_spf.google.com include:sendgrid.net ~all

# Zoho Mail
v=spf1 include:zoho.com ~all

# 多個來源（注意：SPF 最多查詢 10 次，不要加太多）
v=spf1 include:_spf.google.com include:zoho.com include:sendgrid.net ~all
```

> `~all` = soft fail（不符合的標記可疑但不拒收），`-all` = hard fail（直接拒收）。建議用 `~all`。

#### DKIM（DomainKeys Identified Mail）— 信件簽名驗證

DKIM 的值是一長串公鑰，由郵件服務商提供。

**Google Workspace DKIM 設定步驟**：

```
步驟 1：登入 Google Admin Console（admin.google.com）
        ↓
步驟 2：前往 Apps → Google Workspace → Gmail → Authenticate email
        ↓
步驟 3：點擊 Generate new record
        - 選擇 DKIM key bit length：2048
        - Prefix selector：google（預設）
        ↓
步驟 4：Google 會給你一筆 TXT 記錄，類似：
        名稱：google._domainkey
        值：v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQE...（很長一串）
        ↓
步驟 5：到 DNS 新增這筆 TXT 記錄
        ↓
步驟 6：回到 Google Admin，點 Start authentication
        ↓
步驟 7：等待 24-48 小時生效
```

新增 DNS 記錄：

```
類型：TXT
名稱：google._domainkey
值：v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...（從 Google Admin 複製）
TTL：3600
```

#### DMARC（Domain-based Message Authentication）— 告訴收件伺服器怎麼處理未通過 SPF/DKIM 的信

```
類型：TXT
名稱：_dmarc
值：v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100
TTL：3600
```

DMARC 政策解釋：

```
p=none       → 只監控，不做任何動作（適合剛設定時觀察）
p=quarantine → 未通過的丟到垃圾郵件
p=reject     → 未通過的直接拒收
rua=mailto:  → 彙總報告寄到這個信箱
pct=100      → 100% 的郵件都要檢查
```

**建議設定順序**：

```
第一階段（觀察期，1-2 週）：
v=DMARC1; p=none; rua=mailto:admin@example.com; pct=100

第二階段（確認沒問題後）：
v=DMARC1; p=quarantine; rua=mailto:admin@example.com; pct=100

第三階段（完全保護）：
v=DMARC1; p=reject; rua=mailto:admin@example.com; pct=100
```

#### 驗證 TXT 記錄

```bash
# 查詢 SPF
dig example.com TXT +short
# 預期："v=spf1 include:_spf.google.com ~all"

# 查詢 DKIM
dig google._domainkey.example.com TXT +short
# 預期：一長串 DKIM 公鑰

# 查詢 DMARC
dig _dmarc.example.com TXT +short
# 預期："v=DMARC1; p=quarantine; ..."

# 完整郵件設定檢查（推薦線上工具）
# https://mxtoolbox.com/SuperTool.aspx
# https://mail-tester.com  （寄一封測試信，給你 1-10 分評分）
```

### 2.5 子網域設定

子網域就是在主域名前面加前綴，不需要另外購買。

```
blog.example.com    → 部落格（指向 Netlify）
shop.example.com    → 電商（指向 Shopify）
api.example.com     → API 伺服器（指向 VPS）
staging.example.com → 測試環境（指向測試機）
mail.example.com    → Webmail 介面
```

DNS 設定範例：

```
類型：CNAME   名稱：blog     值：xxx.netlify.app        TTL：3600
類型：CNAME   名稱：shop     值：shops.myshopify.com    TTL：3600
類型：A       名稱：api      值：167.172.5.100          TTL：3600
類型：A       名稱：staging  值：167.172.5.200          TTL：3600
類型：CNAME   名稱：mail     值：ghs.googlehosted.com   TTL：3600
```

> 子網域的 SSL 憑證是獨立的。用 Let's Encrypt 時，每個子網域都需要各自申請，或者用 wildcard 憑證（`*.example.com`）一次搞定。

---

## 3. 各平台 DNS 設定步驟

### 3.1 Vercel

Vercel 自動處理 SSL，設定 DNS 後幾分鐘就能用 HTTPS。

#### 步驟

```
步驟 1：登入 Vercel Dashboard → 選你的 Project
        ↓
步驟 2：Settings → Domains → 輸入你的域名（例如 example.com）
        ↓
步驟 3：Vercel 會告訴你需要設定的 DNS 記錄：

        根域名（example.com）：
        類型：A       名稱：@     值：76.76.21.21

        www 子域名：
        類型：CNAME   名稱：www   值：cname.vercel-dns.com
        ↓
步驟 4：到你的 DNS 管理介面（Namecheap / Cloudflare）新增上述記錄
        ↓
步驟 5：回到 Vercel，等待驗證（通常幾分鐘到 1 小時）
        ↓
步驟 6：看到綠色勾勾 ✓ 就完成了，SSL 自動啟用
```

#### 驗證

```bash
# 確認 DNS 指向正確
dig example.com A +short
# 預期：76.76.21.21

dig www.example.com CNAME +short
# 預期：cname.vercel-dns.com.

# 確認 HTTPS 正常
curl -I https://example.com
# 預期：HTTP/2 200
```

#### Vercel 注意事項

- 根域名用 A Record（`76.76.21.21`），不是 CNAME
- 如果用 Cloudflare DNS，Proxy 要**關掉**（DNS only，灰色雲朵），否則 SSL 會衝突
- 或者 Cloudflare Proxy 開啟但 SSL 模式設為 `Full (Strict)`

### 3.2 Netlify

#### 步驟

```
步驟 1：登入 Netlify → 選你的 Site → Site settings
        ↓
步驟 2：Domain management → Add custom domain
        ↓
步驟 3：輸入域名，Netlify 會給你 DNS 設定指引：

        方法 A：用 Netlify DNS（推薦，最簡單）
        - 把 Nameserver 改成 Netlify 的：
          dns1.p01.nsone.net
          dns2.p01.nsone.net
          dns3.p01.nsone.net
          dns4.p01.nsone.net

        方法 B：只改 DNS 記錄（不換 Nameserver）
        - 根域名：A Record → 75.2.60.5
        - www：CNAME → your-site-name.netlify.app
        ↓
步驟 4：設定完成後，到 HTTPS 分頁
        ↓
步驟 5：Netlify 自動用 Let's Encrypt 發 SSL 憑證
        ↓
步驟 6：看到 "Your site has HTTPS enabled" 就完成
```

#### 驗證

```bash
dig example.com A +short
# 預期：75.2.60.5

# 確認 SSL
curl -vI https://example.com 2>&1 | grep "SSL certificate"
# 應該看到 Let's Encrypt 的憑證資訊
```

### 3.3 Cloudflare

Cloudflare 是 DNS + CDN + SSL + WAF + DDoS 防護的一站式方案。免費方案就很夠用。

#### 步驟（把 DNS 搬到 Cloudflare）

```
步驟 1：註冊 Cloudflare（cloudflare.com）
        ↓
步驟 2：Add a Site → 輸入你的域名
        ↓
步驟 3：選方案（Free 就夠了）
        ↓
步驟 4：Cloudflare 自動掃描你現有的 DNS 記錄
        → 檢查掃描結果是否完整，缺的手動補
        ↓
步驟 5：Cloudflare 給你兩組 Nameserver，例如：
        ada.ns.cloudflare.com
        rick.ns.cloudflare.com
        ↓
步驟 6：到你的域名註冊商（Namecheap / GoDaddy）
        → 把 Nameserver 改成 Cloudflare 的
        ↓
步驟 7：等待 Nameserver 切換生效（通常 1-24 小時）
        ↓
步驟 8：Cloudflare Dashboard 顯示 "Active" 就完成了
```

#### Cloudflare Proxy 模式（橘色雲朵 vs 灰色雲朵）

```
橘色雲朵（Proxied）：
  流量經過 Cloudflare → CDN 加速 + DDoS 防護 + SSL
  真實伺服器 IP 被隱藏

灰色雲朵（DNS only）：
  只做 DNS 解析，流量直連你的伺服器
  用在：Vercel / Netlify 已有自己的 CDN 時
```

#### 什麼時候開 Proxy、什麼時候關

```
開（橘色）：自己的 VPS / EC2 / 純粹網站
關（灰色）：Vercel / Netlify / 其他有自己 CDN 的平台
關（灰色）：MX Record（郵件永遠不走 proxy）
關（灰色）：非 HTTP 服務（SSH、FTP、自訂 TCP）
```

#### Cloudflare SSL 設定

```
步驟 1：Cloudflare Dashboard → SSL/TLS
        ↓
步驟 2：Encryption mode 選擇：

        Off             → 不加密（不要選這個）
        Flexible        → 使用者到 Cloudflare 加密，Cloudflare 到你的伺服器不加密
                          （過渡期可用，不推薦長期使用）
        Full            → 兩段都加密，但不驗證你伺服器的憑證
        Full (Strict)   → 兩段都加密 + 驗證伺服器憑證（最安全，推薦）
        ↓
步驟 3：推薦選 Full (Strict)
        → 前提是你的伺服器要有有效的 SSL 憑證（Let's Encrypt 或 Cloudflare Origin Certificate）
```

#### Cloudflare Origin Certificate（給你的伺服器用的免費憑證）

```
步驟 1：SSL/TLS → Origin Server → Create Certificate
        ↓
步驟 2：選擇：
        - RSA (2048)
        - Hostnames：example.com, *.example.com
        - Validity：15 years（最長）
        ↓
步驟 3：下載 Origin Certificate（.pem）和 Private Key（.key）
        ↓
步驟 4：放到你的伺服器上（例如 /etc/ssl/cloudflare/）
        ↓
步驟 5：在 Nginx 設定中使用這組憑證
```

> **注意**：Cloudflare Origin Certificate 只能搭配 Cloudflare Proxy 使用。如果直接用瀏覽器連伺服器 IP，這張憑證會顯示「不受信任」。

### 3.4 AWS Route 53

適合網站部署在 AWS（EC2 / S3 / CloudFront）的情況。

#### 步驟

```
步驟 1：AWS Console → Route 53 → Hosted zones → Create hosted zone
        ↓
步驟 2：輸入域名 example.com → Create
        ↓
步驟 3：記下 AWS 給你的 4 組 NS（Nameserver）
        ↓
步驟 4：到域名註冊商把 NS 改成 AWS 給的
        ↓
步驟 5：新增 DNS 記錄：

        指向 EC2：
        A Record → example.com → 你的 EC2 Elastic IP

        指向 S3 靜態網站：
        A Record（Alias）→ example.com → s3-website-ap-northeast-1.amazonaws.com

        指向 CloudFront：
        A Record（Alias）→ example.com → dxxxxxx.cloudfront.net

        指向 ALB（Load Balancer）：
        A Record（Alias）→ example.com → your-alb-xxxx.ap-northeast-1.elb.amazonaws.com
```

> **Route 53 特色**：支援 Alias Record，可以在根域名設定類似 CNAME 的指向（解決根域名不能設 CNAME 的問題）。

#### CLI 管理

```bash
# 列出所有 hosted zones
aws route53 list-hosted-zones

# 列出某個 zone 的所有記錄
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890

# 新增 / 修改記錄（用 JSON 檔案）
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://dns-change.json
```

`dns-change.json` 範例：

```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "167.172.5.100" }
        ]
      }
    }
  ]
}
```

### 3.5 VPS 自建 Nginx

適合自己管理伺服器的情況（Linode / DigitalOcean / Vultr / AWS EC2）。

#### 前提

- 你有一台 VPS，已安裝 Nginx
- 域名的 A Record 已指向 VPS 的 IP

#### Nginx 基本設定

```bash
# 建立網站設定檔
sudo nano /etc/nginx/sites-available/example.com
```

設定檔內容：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

啟用設定：

```bash
# 建立 symbolic link
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# 測試設定語法
sudo nginx -t

# 重新載入 Nginx
sudo systemctl reload nginx
```

後面 SSL 章節會講怎麼用 Certbot 加上 HTTPS。

---

## 4. SSL / HTTPS 設定

### 4.1 Let's Encrypt + Certbot（免費 SSL，自動續約）

Let's Encrypt 是免費的 SSL 憑證機構，Certbot 是它的自動化工具。

#### 安裝 Certbot

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS / RHEL
sudo dnf install certbot python3-certbot-nginx

# macOS（開發用）
brew install certbot
```

#### 自動設定（Nginx 外掛，最簡單）

```bash
# Certbot 會自動修改 Nginx 設定、取得憑證、設定自動續約
sudo certbot --nginx -d example.com -d www.example.com

# 互動式流程：
# 1. 輸入 Email（到期前會寄通知）
# 2. 同意服務條款
# 3. 選擇是否重導向 HTTP → HTTPS（選 2 = 強制重導向，推薦）
```

Certbot 會自動修改 Nginx 設定，加上 SSL 相關的區塊：

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

#### 手動模式（只取憑證，不動 Nginx 設定）

```bash
sudo certbot certonly --nginx -d example.com -d www.example.com
# 只下載憑證到 /etc/letsencrypt/live/example.com/，不修改 Nginx
```

#### Wildcard 憑證（`*.example.com`）

```bash
# Wildcard 必須用 DNS 驗證（不能用 HTTP 驗證）
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d "*.example.com"

# Certbot 會要求你新增一筆 TXT Record：
# 類型：TXT
# 名稱：_acme-challenge
# 值：（Certbot 給的隨機字串）
#
# 新增後按 Enter 繼續驗證
```

#### 自動續約

Let's Encrypt 憑證只有 90 天效期，Certbot 會自動設定 cron job 續約。

```bash
# 測試自動續約是否正常
sudo certbot renew --dry-run

# 手動續約
sudo certbot renew

# 確認 cron job / systemd timer
sudo systemctl list-timers | grep certbot
# 或
cat /etc/cron.d/certbot

# 如果沒有自動排程，手動加一個
sudo crontab -e
# 加入這行（每天凌晨 2:30 檢查續約）：
# 30 2 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

#### 查看憑證資訊

```bash
# 列出所有 Certbot 管理的憑證
sudo certbot certificates

# 輸出範例：
# Certificate Name: example.com
#   Domains: example.com www.example.com
#   Expiry Date: 2026-06-03 (VALID: 89 days)
#   Certificate Path: /etc/letsencrypt/live/example.com/fullchain.pem
#   Private Key Path: /etc/letsencrypt/live/example.com/privkey.pem
```

### 4.2 Cloudflare SSL（最簡單，一鍵開啟）

如果你的 DNS 已經搬到 Cloudflare，SSL 幾乎不用設定。

```
步驟 1：確認 DNS 記錄的 Proxy 是開啟的（橘色雲朵）
        ↓
步驟 2：SSL/TLS → Overview → 選 Full (Strict)
        ↓
步驟 3：Edge Certificates → Always Use HTTPS → 開啟
        ↓
步驟 4：Edge Certificates → Automatic HTTPS Rewrites → 開啟
        ↓
完成。所有流量自動 HTTPS。
```

#### 如果搭配 VPS 使用

```
方法 A：Cloudflare Origin Certificate + Full (Strict)
        → 最佳組合，伺服器裝 Origin Certificate，Cloudflare 設 Full (Strict)

方法 B：Let's Encrypt + Full (Strict)
        → 也行，伺服器用 Certbot 裝 Let's Encrypt 憑證

方法 C：Flexible（不推薦長期使用）
        → 你的伺服器不需要裝憑證，但 Cloudflare 到你的伺服器是明文
```

### 4.3 Vercel / Netlify（自動 SSL）

這兩個平台完全自動處理 SSL，你只需要設好 DNS。

```
Vercel：
  DNS 設定好 → 自動發 SSL 憑證（Let's Encrypt）→ 自動續約
  不需要做任何額外設定

Netlify：
  DNS 設定好 → 到 Site settings → HTTPS
  → 點 "Verify DNS configuration"
  → 自動發 SSL 憑證 → 自動續約
  → 如果卡住，點 "Provision certificate" 手動觸發
```

### 4.4 自簽憑證（僅開發環境使用）

本地開發時，如果需要 HTTPS 來測試某些功能（如 Service Worker、Secure Cookie）。

```bash
# 產生自簽憑證（有效期 365 天）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost.key \
  -out localhost.crt \
  -subj "/CN=localhost"

# 用 mkcert（更方便，瀏覽器不會警告）
# 安裝 mkcert
brew install mkcert      # macOS
# 或
choco install mkcert     # Windows

# 安裝本地 CA
mkcert -install

# 產生本地開發用憑證
mkcert localhost 127.0.0.1 ::1
# 產出：localhost+2.pem 和 localhost+2-key.pem
```

在 Vite 開發伺服器使用：

```javascript
// vite.config.ts
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
  },
});
```

在 Nginx 本地使用：

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /path/to/localhost+2.pem;
    ssl_certificate_key /path/to/localhost+2-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 4.5 強制 HTTPS 重導向

#### Nginx

```nginx
# 方法 1：獨立 server block（推薦）
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

# 方法 2：在 server block 內判斷
server {
    listen 80;
    listen 443 ssl;
    server_name example.com;

    # SSL 設定...

    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
}
```

#### Apache（.htaccess）

```apache
# 放在網站根目錄的 .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

#### Cloudflare

```
SSL/TLS → Edge Certificates → Always Use HTTPS → 開啟
```

一行搞定，不需要改伺服器設定。

#### Vercel（vercel.json）

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "header", "key": "x-forwarded-proto", "value": "http" }],
      "destination": "https://example.com/:path*",
      "permanent": true
    }
  ]
}
```

> Vercel 預設就會自動重導向，通常不需要手動設定。

---

## 5. 常見問題排查

### 5.1 DNS 傳播時間

DNS 改完不會馬上全世界生效，需要等「傳播」。

```
TTL 設定     實際傳播時間     說明
300 (5min)   5-30 分鐘       快速生效，適合測試
3600 (1hr)   1-4 小時        一般設定
86400 (24hr) 24-48 小時      很舊的預設值，不建議
```

**加速傳播技巧**：
1. 修改 DNS 前，先把 TTL 降到 300（等舊 TTL 過期後生效）
2. 修改 DNS 記錄
3. 確認生效後，把 TTL 改回 3600

#### 搬家前的 TTL 調整範例

```
Day 0：把 TTL 從 3600 改成 300（等 1 小時讓舊快取過期）
Day 0 + 1hr：改 A Record 指向新 IP
Day 0 + 1.5hr：全世界 DNS 幾乎都更新了
Day 1：確認沒問題，TTL 改回 3600
```

### 5.2 DNS 查詢工具

#### 命令列工具

```bash
# dig（最推薦，資訊最完整）
dig example.com A              # 查 A Record
dig example.com MX             # 查 MX Record
dig example.com TXT            # 查 TXT Record
dig example.com NS             # 查 Nameserver
dig example.com ANY            # 查所有記錄
dig example.com +short         # 只顯示結果
dig example.com +trace         # 追蹤完整解析路徑（debug 用）
dig @8.8.8.8 example.com A    # 指定用 Google DNS 查

# nslookup（Windows / Mac 都有）
nslookup example.com
nslookup -type=MX example.com
nslookup example.com 8.8.8.8

# host（簡潔版）
host example.com
host -t MX example.com

# whois（查域名註冊資訊）
whois example.com
```

#### 線上工具

| 工具 | 網址 | 用途 |
|------|------|------|
| **whatsmydns.net** | `whatsmydns.net` | 全球各地 DNS 傳播狀態（最常用） |
| **MXToolbox** | `mxtoolbox.com` | MX / SPF / DKIM / DMARC 完整檢查 |
| **DNS Checker** | `dnschecker.org` | 多地點 DNS 查詢 |
| **mail-tester.com** | `mail-tester.com` | 寄信測試，給 1-10 分評分 |
| **SSL Labs** | `ssllabs.com/ssltest` | SSL 憑證完整測試，給 A-F 等級 |
| **Hardenize** | `hardenize.com` | DNS + SSL + Email 安全綜合檢查 |
| **SecurityTrails** | `securitytrails.com` | DNS 歷史記錄查詢 |

### 5.3 SSL 憑證到期查詢

```bash
# 用 openssl 查遠端伺服器憑證
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
# 輸出：
# notBefore=Mar  1 00:00:00 2026 GMT
# notAfter=May 30 23:59:59 2026 GMT

# 查看完整憑證資訊
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -text

# 查看發行者（誰發的）
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -issuer
# 輸出範例：issuer=C = US, O = Let's Encrypt, CN = R3

# 用 curl 查
curl -vI https://example.com 2>&1 | grep -E "expire|issuer|subject"

# 本地 Certbot 管理的憑證
sudo certbot certificates
```

#### 憑證到期監控腳本

```bash
#!/bin/bash
# check-ssl-expiry.sh — 檢查 SSL 憑證到期日
# 用法：./check-ssl-expiry.sh example.com

DOMAIN=$1
WARN_DAYS=30

if [ -z "$DOMAIN" ]; then
    echo "用法: $0 <domain>"
    exit 1
fi

EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" "+%s" 2>/dev/null || date -d "$EXPIRY" "+%s" 2>/dev/null)
NOW_EPOCH=$(date "+%s")
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "域名: $DOMAIN"
echo "到期日: $EXPIRY"
echo "剩餘天數: $DAYS_LEFT 天"

if [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
    echo "警告：憑證將在 $DAYS_LEFT 天後到期！"
    exit 2
fi
```

### 5.4 Mixed Content 錯誤

**症狀**：網頁載入後，瀏覽器 Console 出現 "Mixed Content" 警告，部分資源（圖片、CSS、JS）沒載入。

**原因**：頁面是 HTTPS，但引用了 HTTP 的資源。

```
錯誤訊息範例：
Mixed Content: The page at 'https://example.com/' was loaded over HTTPS,
but requested an insecure resource 'http://example.com/image.jpg'.
```

**解法**：

```
1. 搜尋程式碼中所有 http:// 引用，改成 https:// 或 //（protocol-relative）

   錯誤：<img src="http://example.com/photo.jpg">
   正確：<img src="https://example.com/photo.jpg">
   或：  <img src="//example.com/photo.jpg">

2. 如果是 WordPress：
   - 安裝 Really Simple SSL 外掛（自動修正）
   - 或在 wp-config.php 加：
     define('FORCE_SSL_ADMIN', true);

3. 如果是 Cloudflare：
   - 開啟 Automatic HTTPS Rewrites（自動改寫 HTTP → HTTPS）

4. CSP Header（Content Security Policy）：
   - 加上 upgrade-insecure-requests
   - Nginx：add_header Content-Security-Policy "upgrade-insecure-requests";
```

```bash
# 找出頁面中的 Mixed Content
curl -s https://example.com | grep -i "http://" | head -20
```

### 5.5 ERR_SSL_PROTOCOL_ERROR

**症狀**：瀏覽器顯示 "ERR_SSL_PROTOCOL_ERROR" 或 "This site can't provide a secure connection"。

**常見原因與解法**：

```
原因 1：伺服器沒有監聽 443 port
解法：確認 Nginx/Apache 有 listen 443 ssl;

原因 2：SSL 憑證路徑錯誤
解法：檢查 Nginx 設定的 ssl_certificate / ssl_certificate_key 路徑

原因 3：憑證與域名不符
解法：用 openssl 檢查憑證的 CN / SAN 是否包含你的域名
  echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName

原因 4：SSL 協定版本太舊
解法：Nginx 設定只允許 TLS 1.2+
  ssl_protocols TLSv1.2 TLSv1.3;

原因 5：Cloudflare SSL 模式設錯
解法：改成 Full 或 Full (Strict)

原因 6：防火牆擋了 443 port
解法：
  sudo ufw allow 443
  # 或
  sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

```bash
# 測試 SSL 連線
openssl s_client -connect example.com:443 -servername example.com

# 測試特定 TLS 版本
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -tls1_3

# 檢查 443 port 是否開放
nc -zv example.com 443
# 或
nmap -p 443 example.com
```

### 5.6 「不安全」警告怎麼解

瀏覽器網址列出現「不安全」或鎖頭打叉，常見原因：

```
情況 1：完全沒有 SSL 憑證
        → 安裝 Let's Encrypt（參考 4.1 節）

情況 2：憑證已過期
        → sudo certbot renew
        → 確認 cron job 有設定自動續約

情況 3：憑證不受信任（自簽或 CA 有問題）
        → 用 Let's Encrypt 或其他受信任的 CA
        → 確認憑證鏈完整（fullchain.pem 而非 cert.pem）

情況 4：Mixed Content（混合內容）
        → 參考 5.4 節

情況 5：憑證的域名不對
        → 確認憑證包含你實際使用的域名（含 www 和 non-www）
        → 重新申請：sudo certbot --nginx -d example.com -d www.example.com

情況 6：HSTS 問題（之前設了 HSTS，現在 SSL 有問題就回不去 HTTP）
        → 修好 SSL 是唯一解法
        → 清瀏覽器的 HSTS cache：
          Chrome：chrome://net-internals/#hsts → Delete domain
```

---

## 6. Email 設定

### 6.1 Google Workspace 設定步驟

Google Workspace（原 G Suite）是最常見的企業信箱方案，`你的名字@你的域名.com`。

#### 費用

```
Business Starter：$7.20 USD/月/人（30GB 空間）
Business Standard：$14.40 USD/月/人（2TB 空間）
Business Plus：$21.60 USD/月/人（5TB 空間）
```

#### 完整設定流程

```
步驟 1：前往 workspace.google.com → 開始免費試用
        ↓
步驟 2：輸入公司名稱、人數、國家
        ↓
步驟 3：輸入你的域名（example.com）
        ↓
步驟 4：Google 要求驗證域名所有權
        → 方法 A（推薦）：新增 TXT Record
          類型：TXT
          名稱：@
          值：google-site-verification=xxxxxxxxxxxxxx（Google 給的）
        → 方法 B：新增 CNAME
        → 方法 C：上傳 HTML 檔到網站根目錄
        ↓
步驟 5：驗證通過後，設定 MX Record（參考 2.3 節）
        ↓
步驟 6：設定 SPF TXT Record（參考 2.4 節）
        v=spf1 include:_spf.google.com ~all
        ↓
步驟 7：在 Google Admin Console 設定 DKIM（參考 2.4 節）
        ↓
步驟 8：設定 DMARC TXT Record（參考 2.4 節）
        ↓
步驟 9：建立使用者帳號
        admin.google.com → Users → Add new user
        ↓
步驟 10：測試收發信
         - 用新信箱寄信到 Gmail，確認能收到
         - 用 Gmail 寄信到新信箱，確認能收到
         - 到 mail-tester.com 寄一封測試信，確認 SPF/DKIM/DMARC 都通過
```

### 6.2 免費方案

#### Zoho Mail 免費方案

Zoho Mail 提供免費方案（最多 5 個使用者，5GB/人），適合小型客戶。

```
步驟 1：zoho.com/mail → 選 Forever Free Plan
        ↓
步驟 2：輸入域名、管理員信箱
        ↓
步驟 3：驗證域名（TXT Record 或 CNAME）
        類型：TXT
        名稱：zb + 一串代碼
        值：zmverify.zoho.com
        ↓
步驟 4：設定 MX Record（參考 2.3 節 Zoho 部分）
        ↓
步驟 5：設定 SPF
        v=spf1 include:zoho.com ~all
        ↓
步驟 6：設定 DKIM（Zoho 後台提供公鑰）
        ↓
步驟 7：建立使用者 → 測試收發信
```

#### Cloudflare Email Routing（純轉寄，完全免費）

如果客戶只需要「用自訂域名收信，轉到 Gmail」，Cloudflare Email Routing 最簡單。

```
步驟 1：Cloudflare Dashboard → Email → Email Routing
        ↓
步驟 2：Destination addresses → 加入你的 Gmail
        → 會寄驗證信到 Gmail，點確認
        ↓
步驟 3：Routing rules → Create address
        → Custom address：info@example.com
        → Forward to：your-personal@gmail.com
        ↓
步驟 4：Cloudflare 自動設定需要的 MX 和 TXT Record
        ↓
完成。寄到 info@example.com 的信會轉到你的 Gmail。
```

**限制**：
- 只能**收信轉寄**，不能用 `info@example.com` **寄信**
- 如果要寄信，需搭配 Gmail 的「以其他地址寄件」功能（Send mail as）

#### 用 Gmail 以自訂域名寄信（搭配 Cloudflare Email Routing）

```
步驟 1：Gmail → 設定 → 帳戶 → 以這個地址寄送郵件 → 新增
        ↓
步驟 2：名稱：你的名字
        信箱：info@example.com
        ↓
步驟 3：SMTP 設定：
        伺服器：smtp.gmail.com
        Port：587
        使用者名稱：你的 Gmail
        密碼：應用程式密碼（不是 Gmail 密碼）
        TLS：是
        ↓
步驟 4：Gmail 寄驗證碼到 info@example.com
        → 因為有 Email Routing，會轉到你的 Gmail
        → 輸入驗證碼
        ↓
完成。現在可以在 Gmail 選擇用 info@example.com 寄信。
```

> **注意**：寄出去的信，對方看 header 可能會看到 `via gmail.com`。要完全隱藏需要用 Google Workspace 或 Zoho。

### 6.3 客戶信箱設定 SOP

```
階段 1：確認需求
        □ 客戶需要幾個信箱帳號？（1 個 / 5 個 / 全公司）
        □ 需要寄信還是只收信？
        □ 預算？（免費 / 付費都可以）
        □ 現有信箱要保留嗎？（需要搬遷舊信件嗎）

階段 2：選方案
        1 人 + 只收信轉寄          → Cloudflare Email Routing（免費）
        1-5 人 + 需要寄信           → Zoho Mail Free（免費）
        全公司 + 需要完整功能       → Google Workspace（$7.20/月/人起）
        全公司 + 預算有限           → Zoho Mail 付費版（$1/月/人起）

階段 3：設定（以 Google Workspace 為例）
        □ 驗證域名所有權
        □ 設定 MX Record
        □ 設定 SPF TXT Record
        □ 設定 DKIM
        □ 設定 DMARC（先 p=none 觀察）
        □ 建立使用者帳號
        □ 測試收信（外部寄進來）
        □ 測試寄信（寄到外部）
        □ mail-tester.com 測試評分（目標 9/10 以上）

階段 4：交付
        □ 提供帳號密碼給客戶
        □ 教客戶改密碼
        □ 教客戶設定手機 Gmail / Outlook App
        □ 記錄設定文件（DNS 截圖 + 帳號清單）
```

---

## 7. 網域移轉

### 7.1 從 A 註冊商轉到 B（Authorization Code）

**為什麼要轉**：換到更便宜的、整合 DNS 管理、客戶要收回自己管。

#### 前提條件

```
- 域名註冊滿 60 天（ICANN 規定，60 天內不能轉）
- 域名不在 "locked" 狀態（需先解鎖）
- 域名沒有過期（過期了要先續約再轉）
- 有域名管理員的 email access（會收驗證信）
```

#### 完整移轉流程

```
步驟 1：在舊註冊商解鎖域名
        → 找 "Domain Lock" 或 "Transfer Lock" → 關閉
        ↓
步驟 2：取得 Authorization Code（EPP Code / Transfer Code）
        → 在舊註冊商的管理介面找
        → 有些會直接顯示，有些會 email 給你
        ↓
步驟 3：在新註冊商發起轉入
        → Transfer a domain → 輸入域名 + Authorization Code
        → 付款（轉入通常包含 1 年續約費）
        ↓
步驟 4：確認 email
        → 舊註冊商會寄確認信：「有人要轉出你的域名，確定嗎？」
        → 點確認（或不理它，5 天後自動通過）
        ↓
步驟 5：等待移轉完成（通常 1-7 天）
        ↓
步驟 6：在新註冊商設定 DNS（或保持原設定）
        ↓
完成
```

#### 注意事項

```
- 移轉過程中 DNS 不會斷線（因為 DNS 記錄是跟著 Nameserver，不是註冊商）
- 只要你在新註冊商設定了相同的 DNS 記錄，或 Nameserver 沒換，就不會斷線
- .tw 域名的移轉流程不同（在 TWNIC 體系內，需聯繫新/舊註冊商）
```

### 7.2 DNS 搬家不斷線 SOP

從舊 DNS 服務搬到新 DNS 服務（例如從 Namecheap DNS 搬到 Cloudflare），**不讓網站中斷**。

```
Day -1：準備
        □ 在新 DNS 服務建立 zone（例如 Cloudflare Add Site）
        □ 把舊 DNS 的所有記錄完整抄到新 DNS
          - A / AAAA / CNAME / MX / TXT / SRV 全部
          - 用 dig 逐一確認兩邊一致
        □ 把舊 DNS 所有記錄的 TTL 降到 300（5 分鐘）
        □ 等至少 1 小時（讓舊 TTL 過期）
        ↓
Day 0：切換 Nameserver
        □ 到域名註冊商，把 NS 改成新 DNS 服務的
          （例如改成 ada.ns.cloudflare.com / rick.ns.cloudflare.com）
        □ 切完後兩邊 DNS 同時運作（有些查詢走舊、有些走新）
        ↓
Day 0 ~ Day 2：觀察期
        □ 用 whatsmydns.net 檢查全球 NS 傳播狀態
        □ 用 dig @新NS example.com 確認新 DNS 回應正確
        □ 用 dig @舊NS example.com 確認舊 DNS 還在（備援）
        □ 監控網站 uptime（用 UptimeRobot 之類的服務）
        ↓
Day 3+：確認完成
        □ 全球 NS 都已指向新 DNS 服務
        □ 新 DNS 上的 TTL 可以改回 3600
        □ 舊 DNS 的記錄可以保留幾天再刪（以防萬一）
```

#### 驗證命令

```bash
# 確認 Nameserver 已更新
dig example.com NS +short
# 預期：新 DNS 服務的 NS

# 用舊 NS 查詢（確認還有回應）
dig @old-ns1.namecheap.com example.com A +short

# 用新 NS 查詢（確認設定正確）
dig @ada.ns.cloudflare.com example.com A +short

# 全部記錄比對
dig example.com ANY @ada.ns.cloudflare.com
dig example.com ANY @old-ns1.namecheap.com
```

---

## 8. 客戶網域管理 SOP

### 8.1 網域由誰持有

**強烈建議：網域由客戶自己持有。**

```
好的做法：
  客戶自己在 Namecheap / Cloudflare 註冊帳號
  → 用客戶自己的 Email 和信用卡
  → 域名所有權 100% 在客戶名下
  → 你（設計師/工程師）只需要 DNS 管理權限

壞的做法：
  用你自己的帳號幫客戶買域名
  → 合作結束後域名歸屬有爭議
  → 客戶換廠商要跟你要 Authorization Code
  → 你忘記續約 → 客戶網站掛了 → 糾紛
```

#### 跟客戶說明的話術

```
「網域就像門牌號碼，建議由您自己持有比較安全。
我們幫您設定好所有技術細節，但帳號和付款用您自己的。
這樣不管以後跟誰合作，網域都在您手上。」
```

### 8.2 DNS 存取權限怎麼給

#### Cloudflare（推薦）

```
步驟 1：客戶的 Cloudflare 帳號 → Manage Account → Members
        ↓
步驟 2：Invite Member → 輸入你的 Email
        ↓
步驟 3：選擇權限：
        - Administrator → 全部權限（不推薦，太大）
        - Administrator Read Only → 只能看不能改
        - Domain specific：
          → 選特定域名 → DNS 的 Edit 權限
          → 這是最佳實務：只給你需要的那個域名的 DNS 編輯權
        ↓
步驟 4：你收到邀請信 → 接受 → 可以管理客戶的 DNS
```

#### Namecheap

```
Namecheap 沒有細粒度的權限分享。選項：
1. 客戶給你帳號密碼（不推薦，不安全）
2. 客戶自己改，你給他截圖 SOP
3. 用 TeamViewer / AnyDesk 遠端協助客戶操作
4. 把 DNS 搬到 Cloudflare（推薦），在 Cloudflare 給權限
```

#### 各平台權限分享能力比較

```
Cloudflare    ★★★★★  細粒度成員權限，可限定到特定域名
Route 53      ★★★★☆  用 IAM Policy 控制，但設定複雜
Namecheap     ★☆☆☆☆  只能給整個帳號的存取（不推薦）
GoDaddy       ★★☆☆☆  有 Delegate Access，但不太好用
```

### 8.3 到期提醒機制

域名到期沒續約 → 網站下線 → 客戶打來罵你。這是接案者最常踩的坑。

#### 預防措施

```
1. 自動續約（Auto-renew）
   → 確認每個域名都開啟了 Auto-renew
   → 確認信用卡沒過期

2. 行事曆提醒
   → 域名到期前 90 天、30 天、7 天各設一個提醒
   → 用 Google Calendar / Notion / 任何你用的工具

3. 域名清單管理
   → 維護一份所有客戶域名的清單
   → 包含：域名、註冊商、到期日、持有人、續約狀態
```

#### 域名追蹤表模板

```
| 客戶       | 域名              | 註冊商     | 到期日     | 持有人   | Auto-renew | DNS 在哪    | 備註       |
|------------|-------------------|------------|------------|----------|------------|-------------|------------|
| 王先生餐廳 | wangfood.com.tw   | HiNet      | 2027-01-15 | 客戶     | 是         | Cloudflare  | MX=Google  |
| 李小姐美甲 | nailbylee.com     | Namecheap  | 2026-12-03 | 你（代管）| 是        | Namecheap   | 需轉給客戶 |
| ABC 公司   | abccompany.tw     | 網路中文   | 2026-08-20 | 客戶     | 否（注意！）| Cloudflare | 提醒續約   |
```

#### 到期檢查腳本

```bash
#!/bin/bash
# check-domain-expiry.sh — 批次檢查域名到期日
# 用法：./check-domain-expiry.sh

DOMAINS=(
    "example.com"
    "mybrand.tw"
    "client-site.com"
)

WARN_DAYS=60

echo "=== 域名到期檢查 ==="
echo ""

for DOMAIN in "${DOMAINS[@]}"; do
    EXPIRY=$(whois "$DOMAIN" 2>/dev/null | grep -i "expir" | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)

    if [ -z "$EXPIRY" ]; then
        echo "[$DOMAIN] 無法取得到期日（whois 查詢失敗或格式不同）"
        continue
    fi

    EXPIRY_EPOCH=$(date -j -f "%Y-%m-%d" "$EXPIRY" "+%s" 2>/dev/null || date -d "$EXPIRY" "+%s" 2>/dev/null)
    NOW_EPOCH=$(date "+%s")
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt 0 ]; then
        echo "[$DOMAIN] 已過期！到期日：$EXPIRY"
    elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
        echo "[$DOMAIN] 即將到期！剩 $DAYS_LEFT 天（到期日：$EXPIRY）"
    else
        echo "[$DOMAIN] 正常，剩 $DAYS_LEFT 天（到期日：$EXPIRY）"
    fi
done
```

---

## 附錄 A：完整 DNS 設定範例（一個典型客戶）

假設客戶域名是 `wangfood.com.tw`，需求：
- 網站在 Vercel
- Email 用 Google Workspace
- 有一個 `blog.wangfood.com.tw` 在 Netlify

```
# 網站（Vercel）
類型：A       名稱：@       值：76.76.21.21              TTL：3600
類型：CNAME   名稱：www     值：cname.vercel-dns.com      TTL：3600

# 部落格（Netlify）
類型：CNAME   名稱：blog    值：wang-blog.netlify.app      TTL：3600

# Email（Google Workspace）
類型：MX      名稱：@       值：aspmx.l.google.com        優先：1    TTL：3600
類型：MX      名稱：@       值：alt1.aspmx.l.google.com   優先：5    TTL：3600
類型：MX      名稱：@       值：alt2.aspmx.l.google.com   優先：5    TTL：3600
類型：MX      名稱：@       值：alt3.aspmx.l.google.com   優先：10   TTL：3600
類型：MX      名稱：@       值：alt4.aspmx.l.google.com   優先：10   TTL：3600

# SPF
類型：TXT     名稱：@       值：v=spf1 include:_spf.google.com ~all                  TTL：3600

# DKIM
類型：TXT     名稱：google._domainkey   值：v=DKIM1; k=rsa; p=MIIBIjAN...（從 Google Admin 複製）   TTL：3600

# DMARC
類型：TXT     名稱：_dmarc  值：v=DMARC1; p=quarantine; rua=mailto:admin@wangfood.com.tw; pct=100   TTL：3600

# 域名驗證（Google Workspace）
類型：TXT     名稱：@       值：google-site-verification=xxxxxxxxxxxxx                TTL：3600
```

## 附錄 B：DNS + SSL 設定 Checklist

每次幫客戶設定完，用這個清單確認：

```
DNS 基本
  □ A Record 指向正確 IP / 平台
  □ CNAME（www）設定正確
  □ 子域名全部設定完成
  □ dig 驗證全部通過

SSL
  □ HTTPS 正常載入（curl -I https://domain.com）
  □ HTTP 自動重導向到 HTTPS
  □ SSL Labs 測試評級 A 或 A+（ssllabs.com/ssltest）
  □ Mixed Content 檢查通過（Console 無警告）
  □ 自動續約已設定（Certbot timer 或平台自動）

Email
  □ MX Record 正確（dig domain.com MX）
  □ SPF TXT Record 已設定
  □ DKIM 已設定並啟用
  □ DMARC 已設定（至少 p=none）
  □ mail-tester.com 測試 >= 9/10
  □ 收信測試通過
  □ 寄信測試通過（不進垃圾郵件）

管理
  □ 域名持有者是客戶本人
  □ Auto-renew 已開啟
  □ 到期日已記錄在追蹤表
  □ DNS 設定已截圖存檔
  □ 客戶已收到帳號資訊和操作文件
```

## 附錄 C：常用 dig 命令速查

```bash
# 基本查詢
dig example.com                    # 預設查 A Record
dig example.com A +short           # 只顯示 IP
dig example.com AAAA +short        # IPv6
dig example.com MX +short          # 郵件伺服器
dig example.com TXT +short         # TXT 記錄
dig example.com NS +short          # Nameserver
dig example.com SOA +short         # SOA 記錄
dig example.com CAA +short         # CA 授權

# 指定 DNS 伺服器查詢
dig @8.8.8.8 example.com          # 用 Google DNS
dig @1.1.1.1 example.com          # 用 Cloudflare DNS
dig @208.67.222.222 example.com   # 用 OpenDNS

# 進階
dig example.com +trace             # 追蹤完整解析路徑
dig example.com +noall +answer     # 只顯示 answer section
dig -x 93.184.216.34               # 反查 IP → 域名（PTR）

# 批次查詢
dig example.com A example.com MX example.com TXT

# 子域名
dig www.example.com A +short
dig blog.example.com CNAME +short
dig _dmarc.example.com TXT +short
dig google._domainkey.example.com TXT +short
```

---

> **最後提醒**：DNS 和 SSL 是網站上線的最後一哩路，設定錯誤會導致網站打不開或信件寄不到。每次設定完務必用上面的 Checklist 逐項確認。遇到問題，先用 `dig` 和 `openssl` 命令檢查，再到 whatsmydns.net 確認全球傳播狀態。
