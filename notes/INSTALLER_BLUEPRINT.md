# OpenClaw 一鍵安裝包與自動架站藍圖

## 1. openclaw-bootstrap.sh (核心安裝器)
- [ ] 檢查系統環境 (macOS/Linux)
- [ ] 安裝 Node.js / Ollama (如果缺失)
- [ ] 自動配置 .env 模板
- [ ] 前後端依賴同步安裝
- [ ] 建置與啟動服務

## 2. site-gen-skill (自動架站機)
- [ ] 模板路徑: /Users/caijunchang/Desktop/程式專案資料夾/project_j-客製房屋網站/
- [ ] 功能: 讀取模板 -> 替換標籤 (TITLE, COLOR, API_KEY) -> 產出新專案
- [ ] 部署: 整合 vercel-cli 一鍵發佈