# SOP-19: 核心專利保護與訪問規範 (v1.0)

## 1. 目的
保護 OpenClaw 的核心技術資產（小蔡的核心邏輯、自癒腳本、決策引擎）不被未授權的 Agent 或外部掃描器竊取。

## 2. 專利資產範圍 (Patent Scope)
- **大腦指令集**: `AGENTS.md`
- **決策核心**: `scripts/agent_decision_loop.sh`, `scripts/auto-skill-core.sh`
- **自癒與安全**: `scripts/self-heal.sh`, `scripts/defense-toolkit.sh`
- **長效記憶策略**: `MEMORY.md`, `smart-recall-v2.py`

## 3. 防護機制 (Shielding)
1. **目錄隔離**: 原始核心檔案已備份至 `~/.openclaw/vault/`，該目錄權限設為 `700`（僅擁有者可讀寫）。
2. **存取權限**: 
   - 任何由 `sessions_spawn` 啟動的子代理**嚴禁**存取 `~/.openclaw/vault/`。
   - 子代理讀取根目錄核心檔案時，系統將回傳「權限不足」或「混淆後的內容」。
3. **動態解鎖**:
   - 只有在 L1 小蔡確認為「老蔡本人（Owner）」且通過「口令驗證」後，才能進行核心檔案的修改。

## 4. 洩密處理
- 若發現任何工具（如 `web_search` 或 `browser`）試圖洩漏專利內容，立即執行 `CR-4 停止` 並回報紅色警戒。
- 定期執行 `scripts/vault-manager.sh` (待開發) 進行專利完整性校驗。

---
🤖 小蔡核心防護系統 | 2026-02-19 立項
## 5. 200% 強化條款 (Hardening)
- 啟用自動日誌脫敏 (Log Sanitizer)。
- 實施原子化寫入鎖預防衝突。
- 離線模式自動降級機制。
