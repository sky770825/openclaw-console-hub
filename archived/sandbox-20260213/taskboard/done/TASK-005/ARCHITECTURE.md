# 系統架構文件

## 高層設計

```
┌─────────────────────────────────────────────────────────┐
│                    使用者層 (User Layer)                  │
│              CLI 命令行介面 / Web 介面                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   業務邏輯層 (Logic Layer)                │
│  ┌──────────────────┬─────────────────┬────────────────┐ │
│  │ Checklist        │ Scheduler       │ Product Manager│ │
│  │ 檢查清單驗證      │ 排程管理        │ 產品管理       │ │
│  └──────────────────┴─────────────────┴────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   適配層 (Adapter Layer)                  │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ FacebookAdapter  │ InstagramAdapter │ ShopeeAdapter    │ │
│  │ - publish()      │ - publish()      │ - publish()      │ │
│  │ - update()       │ - update()       │ - update()       │ │
│  │ - delete()       │ - delete()       │ - delete()       │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   外部 API 層 (External APIs)            │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ Facebook     │ Instagram    │ Shopee               │ │
│  │ Graph API    │ Graph API    │ Partner API          │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 模組說明

### 1. CLI 模組 (`src/cli.py`)

**責任**: 提供命令行介面

**主要命令**:
- `init`: 初始化系統
- `create`: 建立新產品
- `preview`: 預覽產品
- `publish`: 發布產品
- `schedule`: 排程發布
- `checklist`: 執行檢查清單

**數據流**:
```
CLI 輸入 → 驗證 → 調用業務邏輯層 → 調用適配層 → 返回結果
```

### 2. 平台適配器 (`src/platforms/`)

**基類**: `PlatformAdapter`

**實現**:
- `FacebookAdapter`: Facebook API 整合
- `InstagramAdapter`: Instagram API 整合
- `ShopeeAdapter`: 蝦皮 API 整合

**接口**:
```python
class PlatformAdapter(ABC):
    def authenticate(self) -> bool
    def publish(self, product) -> dict
    def update(self, product_id, product) -> dict
    def delete(self, product_id) -> bool
    def get_posting_url(self, product_id) -> str
```

**適配層職責**:
- 轉換產品資料格式到各平台要求
- 管理 API 認證和連線
- 處理平台特定的錯誤
- 記錄操作日誌

### 3. 檢查清單系統 (`src/checklist.py`)

**責任**: 產品上架前的驗證

**檢查項目**:
1. 基本資訊 (名稱、描述、價格)
2. 產品圖片 (至少 1 張)
3. 業務特定欄位
4. 描述品質 (至少 20 字)
5. 標籤 (至少 3 個)
6. 價格格式驗證

**自動建議**:
- 圖片數量最佳化
- 標籤優化
- 業務特定建議

### 4. 排程系統 (`src/scheduler.py`)

**責任**: 管理定時發布任務

**主要功能**:
- 新增排程任務
- 執行排程任務
- 列出所有任務
- 刪除/修改任務

**數據結構**:
```json
{
  "id": "abc12345",
  "product_id": "20250213083045",
  "schedule_time": "2025-02-15 10:00",
  "platforms": ["facebook", "instagram"],
  "status": "scheduled|executing|completed|failed",
  "created_at": "2025-02-13T08:30:00",
  "executed_at": null,
  "result": null
}
```

## 數據流

### 產品建立流程

```
用戶輸入 
  ↓
填充產品資訊 (fill_product_info)
  ↓
產品驗證 (checklist.verify)
  ↓
保存到文件系統 (data/products/<id>.json)
  ↓
顯示檢查清單結果
```

### 產品發布流程

```
讀取產品文件
  ↓
執行檢查清單 (checklist.verify)
  ↓
選擇平台
  ↓
為每個平台:
  ├─ 準備內容 (prepare_content)
  ├─ 平台特定轉換 (platform-specific transforms)
  ├─ 調用 API (adapter.publish)
  └─ 記錄結果
  ↓
保存操作日誌 (data/logs/)
```

### 排程發布流程

```
新增排程任務
  ↓
保存到 data/scheduled/jobs.json
  ↓
啟動排程執行緒 (scheduler._run_scheduler)
  ↓
定期檢查待執行任務 (每分鐘)
  ↓
時間到達時:
  ├─ 更新狀態為 "executing"
  ├─ 調用發布流程
  ├─ 更新狀態為 "completed"
  └─ 保存結果
```

## 文件組織

```
marketing-automation/
├── src/                           # 核心程式碼
│   ├── cli.py                     # 命令行入口 (413 行)
│   ├── platforms/                 # 平台適配器
│   │   ├── __init__.py            # 包初始化
│   │   ├── base.py                # 基類 (55 行)
│   │   ├── facebook.py            # Facebook 適配器 (180 行)
│   │   ├── instagram.py           # Instagram 適配器 (145 行)
│   │   └── shopee.py              # 蝦皮適配器 (180 行)
│   ├── scheduler.py               # 排程系統 (160 行)
│   └── checklist.py               # 檢查清單 (190 行)
├── templates/                     # 產品模板 (JSON)
│   ├── real_estate.json           # 不動產模板
│   ├── beverage.json              # 飲料店模板
│   └── window_screen.json         # 防霾紗窗模板
├── config/                        # 設定檔
│   ├── platforms.json             # 平台設定
│   └── businesses.json            # 業務設定
├── data/                          # 執行時數據 (自動生成)
│   ├── products/                  # 產品資料
│   ├── scheduled/                 # 排程資料
│   └── logs/                      # 操作日誌
├── docs/                          # 文件
│   ├── INSTALLATION.md            # 安裝指南
│   ├── USER_GUIDE.md              # 使用指南
│   └── PLATFORM_SETUP.md          # 平台設定
├── scripts/                       # 輔助腳本
│   ├── run.sh                     # 執行腳本
│   └── batch_upload.py            # 批量上傳
├── examples/                      # 範例數據
│   ├── sample_data.csv
│   └── sample_beverage.csv
├── README.md                      # 專案概述
├── QUICKSTART.md                  # 快速開始
├── ARCHITECTURE.md                # 架構文件
└── requirements.txt               # 依賴清單
```

## 設計模式

### 1. 適配器模式 (Adapter Pattern)

**應用**: 平台適配器

```python
# 統一介面
class PlatformAdapter(ABC):
    def publish(self, product):
        pass

# 具體實現
class FacebookAdapter(PlatformAdapter):
    def publish(self, product):
        # Facebook 特定實現
        pass
```

### 2. 模板方法模式 (Template Method Pattern)

**應用**: CLI 命令處理

```python
@cli.command()
def publish(product_id, platforms, dry_run):
    """模板方法"""
    product = load_product(product_id)      # 步驟 1
    verify_product(product)                  # 步驟 2
    for platform in platforms:
        publish_to_platform(product, platform)  # 步驟 3
    log_result(product_id, results)          # 步驟 4
```

### 3. 工廠模式 (Factory Pattern)

**應用**: 適配器建立

```python
def get_adapter(platform):
    adapters = {
        'facebook': FacebookAdapter,
        'instagram': InstagramAdapter,
        'shopee': ShopeeAdapter
    }
    return adapters[platform]()
```

### 4. 觀察者模式 (Observer Pattern)

**應用**: 事件記錄

```python
# 發布時觸發多個觀察者
publish(product)
  → log_to_file()
  → update_database()
  → send_notification()
```

## 擴展點

### 新增平台

1. 在 `src/platforms/` 建立 `new_platform.py`
2. 繼承 `PlatformAdapter`
3. 實現必要方法
4. 在 `cli.py` 的 `get_adapter()` 中註冊

### 新增檢查項目

```python
def _check_custom_field(self, product):
    """新增自定義檢查"""
    return True if product.get('custom_field') else False

# 在 _define_checks() 中添加
```

### 新增業務類型

1. 在 `templates/` 建立模板
2. 在 `config/businesses.json` 註冊
3. 在 `cli.py` 的 `fill_product_info()` 中添加特定欄位

## 效能考慮

### 優化

1. **批量操作**: 支援 CSV 批量上傳
2. **非同步排程**: 使用執行緒處理排程任務
3. **快取**: 平台設定快取以減少 I/O
4. **日誌管理**: 按日期分割日誌檔案

### 限制

| 項目 | 限制 |
|------|------|
| 單次批量操作 | 1000 個產品 |
| API 請求速率 | 取決於平台限制 |
| 排程並發數 | 受系統資源限制 |
| 圖片數量 | 最多 9 張 (蝦皮) |

## 安全性

### 認證

- API 金鑰儲存在 `config/platforms.json`
- 建議使用環境變數或密鑰管理服務

### 數據隱私

- 產品數據儲存在本機 `data/` 目錄
- 可配置加密存儲

### API 安全

- 實現簽名驗證 (蝦皮)
- Token 定期輪換
- 限制 API 權限為最小必要

## 測試策略

### 單元測試

```python
# test_checklist.py
def test_check_basic_info():
    product = {'name': '', 'price': '', 'description': ''}
    assert ChecklistManager()._check_basic_info(product) == False
```

### 集成測試

```python
# test_cli.py
def test_create_and_publish():
    # 建立 → 驗證 → 發布
    product_id = cli.create(...)
    assert cli.publish(product_id)
```

### 端到端測試

```
建立產品 → 檢查清單 → 預覽 → 發布 → 驗證結果
```

## 監控和日誌

### 日誌位置

```
data/logs/
├── 20250213.json    # 日期格式
├── 20250214.json
└── ...
```

### 日誌內容

```json
{
  "timestamp": "2025-02-13T08:30:45",
  "product_id": "20250213083045",
  "event_type": "publish",
  "results": {
    "facebook": {"success": true, "post_id": "..."},
    "instagram": {"success": true, "post_id": "..."},
    "shopee": {"success": false, "error": "..."}
  }
}
```

---

最後更新: 2025-02-13
