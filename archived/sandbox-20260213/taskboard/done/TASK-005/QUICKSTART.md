# 快速開始指南 - 5 分鐘上手

## 1️⃣ 安裝 (1 分鐘)

```bash
# 克隆專案
git clone <repository-url>
cd marketing-automation

# 建立虛擬環境並安裝依賴
python3 -m venv venv
source venv/bin/activate  # 或 Windows: venv\Scripts\activate
pip install -r requirements.txt

# 初始化系統
python src/cli.py init
```

## 2️⃣ 設定平台認證 (2 分鐘)

編輯 `config/platforms.json`，填入你的 API 金鑰：

```json
{
  "facebook": {
    "enabled": true,
    "page_id": "YOUR_PAGE_ID",
    "access_token": "YOUR_FB_TOKEN"
  },
  "instagram": {
    "enabled": true,
    "account_id": "YOUR_ACCOUNT_ID",
    "access_token": "YOUR_IG_TOKEN"
  },
  "shopee": {
    "enabled": true,
    "shop_id": "YOUR_SHOP_ID",
    "partner_id": "YOUR_PARTNER_ID",
    "partner_key": "YOUR_PARTNER_KEY"
  }
}
```

## 3️⃣ 建立你的第一個產品 (1 分鐘)

### 選項 A: 互動式建立

```bash
python src/cli.py create --business 飲料店
```

按照提示輸入產品資訊。

### 選項 B: 批量導入

```bash
# 準備 CSV 檔案（參考 examples/sample_beverage.csv）
python scripts/batch_upload.py examples/sample_beverage.csv --business 飲料店
```

## 4️⃣ 檢查並發布 (1 分鐘)

```bash
# 檢查產品資訊是否完整
python src/cli.py checklist --product-id 20250213083045

# 預覽上架內容
python src/cli.py preview --product-id 20250213083045

# 發布到所有平台
python src/cli.py publish --product-id 20250213083045

# 或指定特定平台
python src/cli.py publish --product-id 20250213083045 --platforms facebook,instagram
```

## 常用命令速查表

| 任務 | 命令 |
|------|------|
| 初始化 | `python src/cli.py init` |
| 新增產品 | `python src/cli.py create --business 飲料店` |
| 檢查清單 | `python src/cli.py checklist --product-id <ID>` |
| 預覽 | `python src/cli.py preview --product-id <ID>` |
| 發布 | `python src/cli.py publish --product-id <ID>` |
| 排程 | `python src/cli.py schedule --product-id <ID> --datetime "2025-02-15 10:00"` |
| 檢視排程 | `python src/cli.py list_scheduled` |

## 範例工作流程

### 場景 1: 發布房屋

```bash
# 1. 建立產品
python src/cli.py create --business 住商不動產

# 輸入: 名稱、價格、地址、坪數、房數、樓層、描述、圖片、標籤

# 2. 檢查清單
python src/cli.py checklist --product-id 20250213083045

# 3. 預覽
python src/cli.py preview --product-id 20250213083045

# 4. 發布
python src/cli.py publish --product-id 20250213083045
```

### 場景 2: 排程發布飲料

```bash
# 1. 建立產品
python src/cli.py create --business 飲料店

# 2. 排程在明天上午 10 點發布
python src/cli.py schedule --product-id 20250213083045 \
  --datetime "2025-02-14 10:00" \
  --platforms facebook,instagram

# 3. 檢視排程任務
python src/cli.py list_scheduled
```

### 場景 3: 批量上傳防霾紗窗

```bash
# 準備 CSV 檔案並執行批量導入
python scripts/batch_upload.py my_products.csv --business 普特斯防霾紗窗

# 檢查導入結果
python src/cli.py list_scheduled
```

## 測試模式

發布前測試而不實際上架：

```bash
python src/cli.py publish --product-id 20250213083045 --dry-run
```

## 下一步

- 📖 [完整使用指南](docs/USER_GUIDE.md)
- 🔧 [平台設定詳細指南](docs/PLATFORM_SETUP.md)
- 📥 [安裝指南](docs/INSTALLATION.md)

## 常見問題

**Q: API 金鑰去哪裡取得?**
A: 參考 [平台設定指南](docs/PLATFORM_SETUP.md) 的各平台部分

**Q: 支援多少個產品?**
A: 無限制，受平台 API 限制

**Q: 如何修改已發布的產品?**
A: 刪除後重新發布，或在各平台後台直接編輯

**Q: 可以排程多久以後?**
A: 任意時間，只要系統持續運行

---

🎉 祝你使用愉快！有問題請查詢文件或聯絡支援團隊。
