# OpenClaw_patch_file

## 能力描述
對檔案進行精準的局部修改，支援行號定位或正則替換，避免重寫整個檔案造成的風險。

## 輸入參數
- path: 檔案路規 (必填)
- edits: 修改指令陣列 (含 search/replace 或 line/content)

## 執行規範
- 原子性：修改失敗時會自動復原。
- 衝突偵測：若搜尋字串在檔案中不唯一或不存在，則報錯。

## 輸出預期
JSON 包含 success, patches_applied, backup_path。