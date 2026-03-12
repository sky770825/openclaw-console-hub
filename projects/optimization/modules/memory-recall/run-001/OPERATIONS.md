# Memory Recall 優化版 - 操作手冊

**版本**: 2.0.0  
**更新日期**: 2024-02-14  
**任務 ID**: optimize-memory-recall-v1

---

## 快速開始

### 基本搜尋

```bash
node memory_recall_optimized.js "搜尋關鍵字"
```

### 進階用法

```bash
# 限制結果數量
node memory_recall_optimized.js --limit 5 "專案進度"

# 指定 collections
node memory_recall_optimized.js -c memory "重要事項"
node memory_recall_optimized.js -c memory,docs,notes "查詢"

# 停用快取
node memory_recall_optimized.js --no-cache "測試查詢"

# 顯示效能指標
node memory_recall_optimized.js --metrics "測試"

# 清除快取
node memory_recall_optimized.js --clear-cache
```

---

## 參數說明

| 參數 | 縮寫 | 說明 | 預設值 |
|------|------|------|--------|
| `--limit` | `-l` | 結果數量限制 | 10 |
| `--collections` | `-c` | 搜尋的 collections | memory,docs |
| `--no-cache` | - | 停用快取 | false |
| `--metrics` | - | 顯示效能指標 | false |
| `--clear-cache` | - | 清除快取 | - |
| `--help` | `-h` | 顯示說明 | - |

---

## 程式化使用

```javascript
import { memoryRecall, globalCache, metrics, CONFIG } from './memory_recall_optimized.js';

// 基本搜尋
const result = await memoryRecall('搜尋關鍵字');
console.log(result.results);

// 進階選項
const result = await memoryRecall('搜尋關鍵字', {
  collections: ['memory', 'docs'],
  limit: 20,
  useCache: true,
  includeMetrics: true
});

// 檢視快取統計
console.log(globalCache.stats);

// 檢視效能指標
console.log(metrics.stats);

// 清除快取
globalCache.clear();
```

---

## 配置調整

編輯 `CONFIG` 物件以調整預設行為:

```javascript
const CONFIG = {
  cache: {
    enabled: true,        // 啟用快取
    maxSize: 50,          // 最大快取項目數
    ttlMs: 5 * 60 * 1000, // 快取存活時間 (毫秒)
  },
  search: {
    limit: 10,            // 預設結果數量
    threshold: 0.5,       // 相似度門檻
    collections: ['memory', 'docs'],
  },
  performance: {
    timeoutMs: 10000,     // 搜尋超時時間
    enableMetrics: true,  // 啟用效能監測
  }
};
```

---

## 效能測試

執行效能測試腳本:

```bash
cd projects/optimization/modules/memory-recall/run-001
node benchmark.js
```

測試項目:
- 原始版本 (同步執行)
- 優化版本 (並行執行，無快取)
- 優化版本 (並行執行 + 快取)

---

## 故障排除

### 問題: 搜尋結果為空

**解決方案**:
```bash
# 確認 qmd 已安裝
which qmd

# 列出 collections
qmd collection list

# 更新索引
qmd update
```

### 問題: 快取未命中

**解決方案**:
- 確認查詢字串完全一致
- 檢查快取 TTL 設定
- 手動清除並重建快取

### 問題: 記憶體使用過高

**解決方案**:
- 降低 `CONFIG.cache.maxSize`
- 縮短 `CONFIG.cache.ttlMs`
- 定期呼叫 `globalCache.clear()`

---

## 與原始版本比較

| 功能 | 原始版本 | 優化版本 |
|------|----------|----------|
| 執行模式 | 同步 | 非同步 |
| 並行搜尋 | ❌ | ✅ |
| LRU 快取 | ❌ | ✅ |
| 效能監測 | ❌ | ✅ |
| 結果去重 | ❌ | ✅ |
| CLI 參數 | 基本 | 完整 |
| 模組匯出 | ❌ | ✅ |

---

## 部署建議

1. **開發環境**: 使用 `--metrics` 監測效能
2. **測試環境**: 驗證快取命中率
3. **生產環境**: 啟用快取，調整 TTL 以符合使用模式

---

## 聯絡資訊

如有問題，請聯繫:
- Telegram: @gousmaaa
- 任務 ID: optimize-memory-recall-v1
