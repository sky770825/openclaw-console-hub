# 🚨 OpenClaw 卡住自救機制

當 OpenClaw 被瀏覽器/工具卡住時的快速恢復方案

---

## 快速使用

### 方法 1：基礎自救（推薦先用這個）
```bash
~/.openclaw/workspace/scripts/openclaw-recovery.sh
```
清理所有卡住的后台程序，重啟必要服務。

### 方法 2：Cursor Agent 深度救援
```bash
~/.openclaw/workspace/scripts/openclaw-cursor-rescue.sh [工作目錄] [問題描述]
```
當基礎自救無效時，呼叫 Cursor Agent 介入修復。

---

## 機制說明

### 什麼情況會觸發「卡住」

1. **瀏覽器自動化卡住**
   - agent-browser 無法啟動
   - Playwright 程序殘留
   - Chrome 遠程調試端口被占用

2. **服務未響應**
   - OpenClaw Gateway 當掉
   - 任務板伺服器 (port 3011) 無響應

3. **部署相關問題**
   - Railway/Vercel 部署卡住
   - Git 推送失敗

### 自救流程

```
┌─────────────────┐
│  OpenClaw 卡住  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  執行基礎自救   │ ← openclaw-recovery.sh
│  - 清理程序     │
│  - 重啟服務     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  成功      失敗
    │         │
    ▼         ▼
  完成    呼叫 Cursor Agent
          ← openclaw-cursor-rescue.sh
               │
               ▼
          深度修復問題
               │
               ▼
             完成
```

---

## 腳本詳情

### openclaw-recovery.sh
- **位置**: `~/.openclaw/workspace/scripts/openclaw-recovery.sh`
- **功能**:
  1. 殺掉所有 playwright / Chrome for Testing / agent-browser 程序
  2. 檢查並重啟 OpenClaw Gateway
  3. 檢查並重啟任務板伺服器

### openclaw-cursor-rescue.sh
- **位置**: `~/.openclaw/workspace/scripts/openclaw-cursor-rescue.sh`
- **功能**:
  1. 先執行基礎自救
  2. 呼叫 Cursor Agent 分析問題
  3. 自動修復 Railway/Git 等部署問題

---

## 整合到 OpenClaw

當小蔡檢測到被卡住時，會自動執行：

```
⚠️ 偵測到卡住情況（瀏覽器/工具無響應超過 30 秒）

選項：
1. 執行基礎自救 (~5 秒)
2. 呼叫 Cursor Agent 深度修復 (~1-2 分鐘)
3. 手動處理

老蔡，我遇到點問題，要我自動修復嗎？
```

---

## 預防措施

1. **定期檢查**: 每次新 session 先執行 `openclaw-recovery.sh`
2. **超時保護**: 所有瀏覽器操作設定 30 秒超時
3. **日誌記錄**: 所有卡住情況記錄到 `~/openclaw-issue-log.txt`

---

## 2026-02-10 建立
