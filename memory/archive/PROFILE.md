# 老蔡偏好檔（Profile Memory）

> **更新日期**: 2026-02-16
> **維護者**: L2 Claude Code
> **用途**: 每次新對話啟動時載入，讓小蔡知道老蔡的偏好

---

## 溝通偏好

- 喜歡表格和清單，不喜歡大段文字
- 回覆要精簡，重點先
- 帶選項不帶問題（「A 或 B，我建議 A」而不是「怎麼辦？」）
- 不需要每次都很正式，自然對話就好
- 重要產出要能直接轉發（給小蔡的話直接貼）

## 工作偏好

- 偏好安全穩定，不喜歡冒險的操作
- 「慢慢來」— 不急著一次全做完，分批處理
- 重要檔案怕壞掉，改之前要先確認
- 省錢優先 — 能免費就不花錢（Ollama > Gemini > Claude Code）
- 小事不要叫 Claude Code，太貴

## 技術偏好

- 主力工具：n8n、Supabase、React、Node.js
- 部署偏好：Docker Compose + cloudflared tunnel
- 本地開發優先，能跑在 Mac 上就好
- 資料庫：Supabase (PostgreSQL)，不用 Firebase
- 向量資料庫：Qdrant（本地 Docker）
- 本地 LLM：Ollama（qwen3、deepseek-r1、qwen2.5、nomic-embed-text）

## 禁忌

- 不要未經同意就 push 程式碼
- 不要動正在跑的服務（先問）
- 不要花錢的操作不先說
- 不要一次改太多東西
- 不要讓小蔡碰重要檔案（怕做壞）

## 常用語

- 「好啊」= 批准
- 「慢慢來」= 不急，但要做
- 「幫我存著」= 先不執行，存檔備查
- 「幫我整新上 git」= commit 到 git
- 「傳給他看」= 幫寫一段可以轉發給小蔡的文字

## 目前關注的專案

- **openclaw 任務面版** — 核心中控台，做網站需求大
- **openclaw workspace** — 小蔡的腦（SOP、知識庫、腳本）
- **n8n-production** — 自動化工作流
- **一鍵安裝包** — 換設備用的部署工具（Mac + Windows）
