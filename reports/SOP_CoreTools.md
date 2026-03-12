# SOP: 五大核心工具使用規範 (Standard Operating Procedure)

## 1. 精準修改 (Scalpel)
- **場景**: 需要在不破壞檔案結構的情況下修改特定代碼塊。
- **指令**: \`python3 scripts/scalpel.py <path> <regex_pattern> <replacement> [--apply]\`
- **注意**: 預設為 Dry Run。正式修改必須加上 \`--apply\`。

## 2. 動態瀏覽 (Browser)
- **場景**: 驗證 API 回傳或前端渲染內容。
- **指令**: \`bash scripts/browser_sim.sh <url> <output_prefix>\`

## 3. 代碼地圖 (Code Map)
- **場景**: 快速理解新模組或分析專案結構。
- **指令**: \`python3 scripts/codemap.py <root_directory>\`

## 4. 互動終端 (Interactive Terminal)
- **規範**: 所有自動化流程應封裝於 \`scripts/\` 下，並使用 \`set -e\` 確保錯誤中斷。

## 5. 視覺回饋 (Visual Feedback)
- **規範**: 每個任務執行完畢後，應於 \`reports/\` 生成對應的 Markdown 總結或 JSON 數據。
