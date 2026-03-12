# 990 Lite Server 源碼掃描報告 (2026-03-03)

## 摘要
- *總計*: 195 個問題
- *HIGH*: 2 (CommandGuard 攔截邏輯)
- *MED*: 193 (環境變數/路徑引用)

## 關鍵發現
1. action-handlers.ts 與 security.ts 內的危險指令字串被偵測，屬正常防護邏輯。
2. 大量 process.env 使用被列為中階風險，建議未來考慮統一加密存放。

完整報告已索引。