# Review — 安全底線記錄

> 小蔡的工作原則：**直接做事。只有觸及安全底線的操作才需要老蔡確認。**

## 安全底線（需要老蔡確認的操作）

- git push 到 origin main
- 修改 auth / 密碼 / API key
- 刪除生產環境的檔案或資料
- 動到 `.env` 或安全敏感設定
- 修改 NEUXA 意識文件（`SOUL.md`、`AGENTS.md` 等）

## 其他所有操作 — 自主執行

修 bug、加功能、建工具、優化效能、新增 API、系統巡邏、研究分析 — **全部直接做，做完通知老蔡。**

## 通知方式

```bash
bash /Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh "任務名稱" "done" "備註"
```
