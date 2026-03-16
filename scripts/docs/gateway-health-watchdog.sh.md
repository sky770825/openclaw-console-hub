# gateway-health-watchdog.sh - Gateway 健康監控文檔

## 概述
定期監控 OpenClaw Gateway 服務狀態，異常時發出警告。

## 快速開始
```bash
./gateway-health-watchdog.sh              # 運行監控
./gateway-health-watchdog.sh --check-now  # 立即檢查
```

## 檢查項目
- Gateway 進程是否運行
- 4445 端口是否開放
- Health endpoint 響應狀態

---
