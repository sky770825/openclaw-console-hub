# context-auto-compact.sh - Context 自動壓縮文檔

## 概述
自動監控 Context 使用率，超過閾值時執行壓縮操作。

## 快速開始
```bash
./context-auto-compact.sh --dry-run  # 模擬檢查
./context-auto-compact.sh             # 執行檢查和壓縮
```

## 閾值設置
- >70%: 執行檢查點
- >85%: 發出警告

---
