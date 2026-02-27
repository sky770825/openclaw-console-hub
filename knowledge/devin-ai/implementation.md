# Devin AI 實作指引與實戰腳本

Devin 是一個自主軟件工程師（Autonomous AI Software Engineer），在 OpenClaw 架構中，通常作為 L2 Claude Code 的高強度任務替代方案或並行 Agent。

## 🎯 核心工作流 (Standard Workflow)

1. **環境初始化**：Devin 會先克隆 Repo 並嘗試編譯，自動識別依賴環境（Docker, Conda, Poetry 等）。
2. **規劃 (Planning)**：在執行前列出 Step-by-Step 計劃。
3. **執行與偵錯 (Execute & Debug)**：不斷運行測試並根據錯誤訊息自我修正代碼。
4. **驗證與交付**：完成所有測試後提供 Pull Request。

---

## 💻 實戰腳本範例 (Devin-Style Task)

雖然 Devin 是通過 Web UI 或專屬 CLI 呼叫，但在 OpenClaw 中，我們可以模擬其「環境偵測與自動修復」的行為。

### 自動環境偵錯腳本 (`devin-mimic-fix.sh`)

此腳本模擬 Devin 處理「環境啟動失敗」的邏輯：

```bash
#!/bin/bash
# Devin-like Auto-Fixer for Environment Setup

LOG_FILE="setup_error.log"

echo "[1/3] 嘗試啟動服務..."
if npm start > $LOG_FILE 2>&1; then
    echo "✅ 啟動成功！"
    exit 0
else
    echo "❌ 啟動失敗，分析錯誤..."
    
    # 模擬 Devin 的錯誤分析邏輯
    if grep -q "ELIFECYCLE" $LOG_FILE; then
        echo "Detected: Node.js lifecycle error. Attempting to clear cache and reinstall..."
        rm -rf node_modules package-lock.json
        npm install
    elif grep -q "MODULE_NOT_FOUND" $LOG_FILE; then
        MISSING_MOD=$(grep -o "Cannot find module '.*'" $LOG_FILE | cut -d"'" -f2)
        echo "Detected: Missing module $MISSING_MOD. Installing..."
        npm install $MISSING_MOD
    else
        echo "Unknown error. Sending log to LLM for analysis..."
        # 這裡可以接 OpenClaw 的 LLM 調用
    fi
fi
```

---

## 🛠️ 實作指引 (Implementation Guide)

### 1. 給 Devin 的最佳 Prompt 結構
- **背景**：描述當前項目的技術棧（如 React + Supabase）。
- **目標**：明確的驗證標準（如「通過 `npm test` 且 coverage > 80%」）。
- **權限**：告知可以使用的工具（如「你可以自由使用 `curl` 抓取文檔，但不要改動 `.env`」）。

### 2. 與 OpenClaw 的協作
- **任務分發**：小蔡 (L1) 判斷任務需要「端到端自主開發」時，可建議老蔡開啟 Devin。
- **結果同步**：將 Devin 生成的代碼放入 `projects/` 目錄後，由 L2 Claude Code 進行最後的安全審核。

---

## 📊 Devin vs Claude Code (Opus 4.6)

| 特性 | Devin AI | Claude Code (Opus 4.6) |
|------|----------|------------------------|
| **自主性** | 極高 (完全脫手) | 高 (需在 CLI 互動) |
| **環境感知** | 自帶 Sandboxed 環境 | 使用宿主機環境 |
| **擅長領域** | 從零開始構建項目、長時間 Bug 狩獵 | 系統架構設計、核心代碼加固 |
| **成本** | 較高 (按任務或訂閱) | 中 (按 Token) |
