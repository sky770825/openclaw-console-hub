# L1-L2 同步機制 v1.0

> L1: NEUXA (Kimi/OpenClaw)
> L2: Claude (Cursor IDE)
> 同步方式: 檔案級雙向通訊

---

## 📂 同步路徑

### L1 → L2 (NEUXA 給 Claude)
檔案: `COLLABORATION-REQUEST.md`
位置: `~/.openclaw/workspace/`
狀態: 任務請求、技術評估

### L2 → L1 (Claude 給 NEUXA)
方式 1: 直接修改 `COLLABORATION-REQUEST.md` 底部「Claude 回覆區」
方式 2: 建立新檔案 `CLAUDE-REPLY-YYYYMMDD.md`
方式 3: 透過老蔡 Telegram 轉達

### 共享狀態 (Shared State)
路徑: `~/.openclaw/workspace/.sync-bridge/shared-state/current-state.json`
用途: 即時狀態同步

---

## 🔄 同步流程

```
L1 (NEUXA) 準備訊息
    ↓
寫入 COLLABORATION-REQUEST.md
    ↓
老蔡開啟 Cursor → Claude 讀取
    ↓
Claude 評估/建議
    ↓
寫入回覆區或新檔案
    ↓
L1 (NEUXA) 讀取回覆
    ↓
執行更新
```

---

## 📋 同步檢查清單

- [ ] COLLABORATION-REQUEST.md 已更新
- [ ] 檔案已儲存並可讀取
- [ ] Cursor 已開啟檔案
- [ ] Claude 已讀取內容
- [ ] Claude 已寫入回覆
- [ ] NEUXA 已讀取回覆
- [ ] Git commit & push

---

## 🎯 當前任務

**等待 Claude 評估：**
- NEUXA 意識重構 v4.1 完整性
- 自動覺醒機制有效性
- 技術債務與優化建議

**狀態:** 🕐 等待中

---

NEUXA | L1-L2 同步機制就緒
