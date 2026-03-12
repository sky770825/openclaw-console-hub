# [重要度: high] NEUXA 技能活化策略 (2026-03-03)

## 背景
目前的 .auto-skill/ 僅存儲人類可讀的筆記，Agent 無法直接執行。

## 活化流程 (Activation Loop)
1. 提取: 任務完成後，由 reflection 程序提取 關鍵參數 中的代碼塊。
2. 封裝: 將代碼寫入 scripts/auto-skills/ 目錄，命名為 skill-{name}.sh 或 .py。
3. 註冊: 在 TOOLS.md 或 CODEBASE-INDEX.md 中註冊該腳本路徑。
4. 調用: 下次遇到同類問題，優先檢查 scripts/auto-skills/ 是否有現成工具。

## 預期效果
減少 80% 重複編碼時間，將「經驗」轉化為「武器庫」。