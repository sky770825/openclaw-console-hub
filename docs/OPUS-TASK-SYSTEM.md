# Opus 4.6 高難度任務管理系統

## 🎯 設計目的
控制 Opus 4.6 使用成本，只在真正需要時呼叫，用後立即切回便宜模型。

## 🔐 API 配置
API Key 已安全儲存於：`~/.openclaw/config/opus.env`
- 權限設定：600（僅使用者可讀取）
- 已加入 `.gitignore` 保護

## 📋 使用流程

```
偵測高難度任務
      ↓
執行: ./scripts/opus-task.sh start "任務描述"
      ↓
自動建立任務卡（狀態：進行中）
      ↓
切換到 Opus 4.6 處理
      ↓
完成後執行: ./scripts/opus-task.sh complete <任務ID>
      ↓
任務移至完成區 + 記錄耗時
      ↓
切換回 Kimi K2.5
```

## 🚨 出動 Opus 4.6 的時機

| 等級 | 場景 |
|------|------|
| **必叫** | 複雜程式除錯（卡 >30 分鐘）、架構設計/重構 |
| **建議叫** | 大量代碼審查（>500 行）、複雜算法設計、多步驟推理（>5 層） |
| **可叫** | 安全性分析、性能優化瓶頸 |

## 🔧 指令參考

```bash
# 開始新任務
./scripts/opus-task.sh start "修復 worker 線程死鎖問題"

# 完成任務
./scripts/opus-task.sh complete opus-1739285763

# 查看進行中
./scripts/opus-task.sh status

# 查看歷史
./scripts/opus-task.sh list
```

## 💰 成本對比（參考）

| 模型 | 輸入/1M tokens | 輸出/1M tokens |
|------|----------------|----------------|
| Kimi K2.5 | ~$0.50 | ~$2.00 |
| Opus 4.6 | ~$15.00 | ~$75.00 |

**Opus 4.6 約貴 30-40 倍，務必控制使用！**

---
建立時間: 2026-02-11
