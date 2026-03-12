# 行銷自動化產品上架系統

## 系統架構

```
marketing-automation/
├── src/                    # 核心程式碼
│   ├── cli.py             # CLI 工具
│   ├── platforms/         # 平台適配器
│   │   ├── base.py
│   │   ├── facebook.py
│   │   ├── instagram.py
│   │   └── shopee.py
│   ├── scheduler.py       # 排程系統
│   └── checklist.py       # 檢查清單
├── templates/             # 產品模板
│   ├── real_estate.json   # 住商不動產
│   ├── beverage.json      # 飲料店
│   └── window_screen.json # 普特斯防霾紗窗
├── config/                # 設定檔
│   ├── businesses.json    # 業務設定
│   └── platforms.json     # 平台設定
├── docs/                  # 文件
└── scripts/               # 輔助腳本
```

## 支援平台
- Facebook Marketplace / 粉絲專頁
- Instagram Shopping / 貼文
- 蝦皮購物 (Shopee)

## 快速開始

```bash
# 安裝依賴
pip install -r requirements.txt

# 初始化設定
python src/cli.py init

# 建立新產品
python src/cli.py product create --business 住商不動產

# 預覽上架內容
python src/cli.py preview --product-id <ID>

# 執行上架（手動）
python src/cli.py publish --product-id <ID> --platforms facebook,instagram

# 排程上架
python src/cli.py schedule --product-id <ID> --datetime "2025-02-15 10:00"
```
