# 小蔡的發想 #001 - Token 消耗優化策略

> 發想日期：2026-02-11
> 狀態：待審核
> 審核日期：
> 審核備註：

---

## 🎯 問題觀察

### 高 Token 消耗情境

| 情境 | 原因 | 影響 |
|------|------|------|
| **連續錯誤重試** | API 失敗後不斷重試，每次都要傳完整 context | Token 倍增 |
| **重複搜尋相同問題** | 沒有記錄已查過的解決方案 | 浪費搜尋額度 |
| **大段代碼複製貼上** | 直接把完整實作貼到對話 | 上下文爆炸 |
| **長篇回覆整理** | 搜尋結果全部整理後輸出 | 輸出 Token 多 |
| **檔案反覆讀取** | 沒有快取機制，每次重新讀檔 | 重複消耗 |

---

## 💡 解決方案

### 1. 錯誤重試機制（指數退避）

```typescript
// 限制重試次數 + 漸增延遲
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // 指數退避：1s, 2s, 4s
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
}
```

### 2. 搜尋結果快取

```typescript
// 快取搜尋結果，避免重複查詢
const searchCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小時

async function cachedSearch(query: string) {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result; // 命中快取
  }
  const result = await webSearch(query);
  searchCache.set(query, { result, timestamp: Date.now() });
  return result;
}
```

### 3. 文件化長篇內容

- ✅ **現在的做法**：詳細內容 → 存檔案 → 任務板只放路徑
- ❌ **避免的做法**：直接把幾千字貼到對話

### 4. Context 壓縮檢查點

```
當對話 Token > 70% 時：
1. 執行 checkpoint.sh
2. 摘要關鍵結論到 NOW.md
3. 清理歷史對話細節
```

### 5. 批次處理工具呼叫

```typescript
// ❌ 低效：多次獨立呼叫
for (const task of tasks) {
  await updateTask(task); // 每次都要傳 context
}

// ✅ 高效：批次處理
await batchUpdateTasks(tasks); // 一次處理
```

---

## 🛠️ 實作建議

### 優先級排序

1. **P0** - 建立「小蔡的發想」任務板流程（本發想）
2. **P1** - 實作搜尋結果快取機制
3. **P1** - 強化錯誤重試的指數退避
4. **P2** - 開發 Context 監控儀表板

### 需要的工具

- 本地 JSON/Redis 快取
- Token 使用量監控
- 自動 checkpoint 觸發器

---

## 🤔 給老蔡的問題

1. 是否需要我定期產出「發想」並自動加到任務板？
2. 審核機制要用 Telegram 按鈕還是任務板上的按鈕？
3. 發想文件的保存期限要多久？

---

**參考資料：**
- 目前 Memory.md 記載的 Token 優化策略
- OpenClaw 文件快取機制
