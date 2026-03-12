# 安裝指南 - 行銷自動化產品上架系統

## 系統需求

- Python 3.8+
- pip (Python 包管理器)
- 作業系統：Windows, macOS, Linux

## 安裝步驟

### 1. 克隆或下載專案

```bash
git clone <repository-url>
cd marketing-automation
```

### 2. 建立虛擬環境

```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. 安裝依賴套件

```bash
pip install -r requirements.txt
```

### 4. 初始化系統

```bash
python src/cli.py init
```

這會建立必要的目錄結構和設定檔。

## 平台設定

### Facebook

1. 編輯 `config/platforms.json`
2. 填入以下資訊：
   - `page_id`: Facebook 粉絲專頁 ID
   - `access_token`: Facebook 應用程式 token

### Instagram

1. 編輯 `config/platforms.json`
2. 填入以下資訊：
   - `account_id`: Instagram 商業帳號 ID
   - `access_token`: Instagram API token

### 蝦皮購物

1. 編輯 `config/platforms.json`
2. 填入以下資訊：
   - `shop_id`: 蝦皮店鋪 ID
   - `partner_id`: 蝦皮合作夥伴 ID
   - `partner_key`: 蝦皮合作夥伴金鑰

## 快速測試

```bash
# 查看幫助
python src/cli.py --help

# 初始化
python src/cli.py init

# 建立測試產品
python src/cli.py create
```

## 常見問題

### Q: 如何取得 Facebook token?
A: 訪問 Facebook Developers，建立應用程式並產生長期存取權杖

### Q: 蝦皮的 API 金鑰在哪裡取得?
A: 在蝦皮商家中心 → 設定 → API 金鑰中設定

### Q: 可以同時在多個平台上架嗎?
A: 可以，使用 `--platforms facebook,instagram,shopee` 指定

## 故障排除

### 認證失敗
- 檢查 API 金鑰是否正確
- 確認 token 未過期
- 檢查 IP 是否被白名單限制

### 圖片上傳失敗
- 確認圖片格式 (JPG, PNG)
- 檢查圖片大小 (建議 < 5MB)
- 確認圖片路徑是否正確

### 排程不執行
- 確保排程服務正在執行
- 檢查系統時間是否正確
- 查看日誌檔案獲取詳細信息
