# 使用指南 - 行銷自動化產品上架系統

## 目錄
1. [基本概念](#基本概念)
2. [快速開始](#快速開始)
3. [完整工作流程](#完整工作流程)
4. [命令參考](#命令參考)
5. [最佳實踐](#最佳實踐)

## 基本概念

### 系統架構
系統分為三個主要層級：

```
┌─────────────────────────────────────┐
│        CLI 命令層 (cli.py)           │
│  create | preview | publish |        │
│  schedule | checklist | list_*       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│       業務邏輯層                      │
│ Checklist | Scheduler                │
│ 驗證 | 排程 | 檢查                    │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│       平台適配層                      │
│ Facebook | Instagram | Shopee        │
│ 各平台 API 調用                      │
└─────────────────────────────────────┘
```

### 資料流程
```
產品模板 → 填寫資訊 → 驗證檢查 → 預覽 → 發布 → 排程
  ↓         ↓        ↓         ↓     ↓      ↓
template  input   checklist  preview publish schedule
```

## 快速開始

### 1. 初始化系統
```bash
python src/cli.py init
```

### 2. 建立產品
```bash
python src/cli.py create --business 飲料店
```

按照提示輸入產品資訊：
- 產品名稱
- 價格
- 業務特定欄位（根據類型）
- 描述
- 圖片路徑
- 標籤

### 3. 預覽產品
```bash
python src/cli.py preview --product-id 20250213083045
```

### 4. 發布產品
```bash
python src/cli.py publish --product-id 20250213083045 --platforms facebook,instagram,shopee
```

## 完整工作流程

### 工作流程 A: 立即發布

```
1. 建立產品
   python src/cli.py create --business 住商不動產
   
2. 執行檢查清單
   python src/cli.py checklist --product-id 20250213083045
   
3. 預覽內容
   python src/cli.py preview --product-id 20250213083045
   
4. 發布到選定平台
   python src/cli.py publish --product-id 20250213083045 \
     --platforms facebook,instagram,shopee
```

### 工作流程 B: 排程發布

```
1. 建立產品
   python src/cli.py create --business 飲料店
   
2. 檢查並修正
   python src/cli.py checklist --product-id <ID>
   
3. 排程發布時間
   python src/cli.py schedule --product-id <ID> \
     --datetime "2025-02-15 10:00" \
     --platforms facebook,instagram
   
4. 查看排程任務
   python src/cli.py list_scheduled
```

### 工作流程 C: 測試模式

```bash
# 測試發布流程，不實際上架
python src/cli.py publish --product-id <ID> \
  --platforms facebook \
  --dry-run
```

## 命令參考

### init - 初始化系統
```bash
python src/cli.py init
```
**功能**: 建立目錄結構和範本檔案

---

### create - 建立新產品
```bash
python src/cli.py create [OPTIONS]

選項:
  --business [住商不動產|飲料店|普特斯防霾紗窗]  業務類型（必填）
```

**範例**:
```bash
python src/cli.py create --business 普特斯防霾紗窗
```

**輸入欄位**:
- 基本欄位: 名稱、價格、描述、圖片、標籤
- 特定欄位: 根據業務類型

---

### preview - 預覽產品
```bash
python src/cli.py preview [OPTIONS]

選項:
  --product-id TEXT  產品 ID（必填）
```

**範例**:
```bash
python src/cli.py preview --product-id 20250213083045
```

---

### publish - 發布產品
```bash
python src/cli.py publish [OPTIONS]

選項:
  --product-id TEXT   產品 ID（必填）
  --platforms TEXT    平台列表，逗號分隔（預設: facebook,instagram,shopee）
  --dry-run           測試模式
```

**範例**:
```bash
# 發布到所有平台
python src/cli.py publish --product-id 20250213083045

# 只發布到 Facebook 和 Instagram
python src/cli.py publish --product-id 20250213083045 --platforms facebook,instagram

# 測試模式
python src/cli.py publish --product-id 20250213083045 --dry-run
```

---

### schedule - 排程發布
```bash
python src/cli.py schedule [OPTIONS]

選項:
  --product-id TEXT      產品 ID（必填）
  --datetime TEXT        排程時間 YYYY-MM-DD HH:MM（必填）
  --platforms TEXT       平台列表，逗號分隔（預設: facebook,instagram,shopee）
```

**範例**:
```bash
python src/cli.py schedule \
  --product-id 20250213083045 \
  --datetime "2025-02-15 10:00" \
  --platforms facebook,instagram
```

---

### list_scheduled - 列出排程任務
```bash
python src/cli.py list_scheduled
```

---

### checklist - 執行檢查清單
```bash
python src/cli.py checklist [OPTIONS]

選項:
  --product-id TEXT  產品 ID（必填）
```

**範例**:
```bash
python src/cli.py checklist --product-id 20250213083045
```

**檢查項目**:
- ✅ 基本資訊 (名稱、描述、價格)
- ✅ 產品圖片 (至少 1 張)
- ✅ 業務特定欄位
- ✅ 描述品質 (至少 20 字)
- ✅ 標籤 (至少 3 個)
- ✅ 價格格式

## 最佳實踐

### 產品資訊

#### 標題 (Title)
- ✅ 清楚明確，包含主要特徵
- ✅ 長度 30-60 字元
- ✅ 避免大寫或特殊符號濫用

範例:
```
❌ 超級棒的房子!!!
✅ 台北市信義區兩房一廳，近捷運站
```

#### 描述 (Description)
- ✅ 至少 100 字元
- ✅ 包含主要優點和特徵
- ✅ 使用換行符改善可讀性
- ✅ 提供聯絡資訊

範例:
```
✅ 
本房屋位於信義區黃金地段，距離捷運站僅 2 分鐘路程。
- 全新裝修，屋況優美
- 採光充足，通風良好
- 近便利店、超市、餐廳
- 安全管理，設有監視系統

聯絡方式: 02-XXXX-XXXX
```

#### 圖片 (Images)
- ✅ 至少 5 張高品質圖片
- ✅ 包含產品/房屋全景、細節
- ✅ 圖片大小 1-5 MB
- ✅ 格式: JPG 或 PNG
- ✅ 解析度: 至少 1024x768

#### 標籤 (Tags)
- ✅ 至少 5 個相關標籤
- ✅ 使用常見搜尋詞
- ✅ 混合通用和特定標籤

範例:
```
住商不動產:
#台北房屋 #不動產 #房屋出售 #信義區 #近捷運

飲料店:
#飲料 #咖啡 #手搖飲 #台灣飲品 #新店

防霾紗窗:
#防霾紗窗 #家居 #健康 #普特斯 #環保
```

### 平台特定建議

#### Facebook
- 使用吸引人的圖片作為封面
- 在動態中加入表情符號增加視覺效果
- 定期回覆評論和訊息
- 利用 Facebook Live 展示產品

#### Instagram
- 高品質的視覺內容很重要
- 使用故事功能推廣新商品
- 參與相關主題標籤的社群
- 定期互動和回覆評論

#### 蝦皮購物
- 優化搜尋關鍵字
- 設定合理的運費
- 提供優惠券吸引買家
- 保持高品質的店鋪評分

### 排程最佳實踐

- 📍 避免在凌晨排程
- 📍 在用戶活躍時發布 (通常是中午或晚上)
- 📍 不要頻繁發布相同內容
- 📍 定期監控發布效果
- 📍 根據數據調整排程時間

## 檔案結構

```
marketing-automation/
├── src/
│   ├── cli.py                 # 主要 CLI 入口
│   ├── platforms/             # 平台適配器
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── facebook.py
│   │   ├── instagram.py
│   │   └── shopee.py
│   ├── scheduler.py           # 排程系統
│   └── checklist.py           # 檢查清單
├── templates/                 # 產品模板
│   ├── real_estate.json
│   ├── beverage.json
│   └── window_screen.json
├── config/                    # 設定檔
│   ├── platforms.json
│   └── businesses.json
├── data/                      # 執行時數據
│   ├── products/
│   ├── scheduled/
│   └── logs/
├── docs/                      # 文件
├── README.md
└── requirements.txt
```

## 常見問題

**Q: 發布失敗怎麼辦?**
A: 查看錯誤訊息，檢查 API 金鑰是否正確，確認網路連線。

**Q: 可以修改已發布的產品嗎?**
A: 目前系統中修改需要先刪除再重新發布。平台上的修改需在各平台上進行。

**Q: 圖片格式有限制嗎?**
A: 支援 JPG 和 PNG，建議大小 1-5 MB。

**Q: 如何刪除已發布的產品?**
A: 各平台有不同的刪除流程，請在各平台後台手動刪除。

**Q: 支援多語言嗎?**
A: 目前支援中文（繁體）和英文，可在程式碼中擴展。
