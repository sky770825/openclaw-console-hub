# OpenClaw 設備遷移指南 (Migration Guide)

主人您好，這是為您準備的無痛接軌遷移包。

## 包含內容 (Workspace Assets):
- **sandbox/**: 所有的沙盒測試檔案
- **scripts/**: 您撰寫的所有自動化腳本
- **proposals/**: 所有的提案文件
- **reports/**: 任務執行報告 (包含此指南)
- **knowledge/**: 累積的知識庫
- **armory/**: 裝備庫與工具
- **skills/**: 技能定義檔案

## 如何在環境新設備恢復：
1. 在新設備上安裝好 Claude Code / OpenClaw 環境。
2. 將 `openclaw_migration_20260312_192528.tar.gz` 檔案放置於新設備的 `~/.openclaw/workspace/` 目錄。
3. 執行解壓縮指令：
   ```bash
   tar -xzf openclaw_migration_20260312_192528.tar.gz
   ```
4. **重要提醒**：基於安全限制，此備份**不包含** API Keys (.env)、設定檔 (config.json) 與靈魂文件 (SOUL.md)。請手動從舊設備安全地複製這些敏感檔案。

祝您在新設備上開發順利！
