# Runbook: Project Scaffolder

## 目的
用 `scaffolder.sh` 依模板建立新專案目錄，統一基本檔案與結構。

## 支援模板
- `web-app`
- `cli-tool`
- `automation`

模板都在 `templates/<type>/`。

## 使用

```bash
cd projects/project-scaffolder/
bash scaffolder.sh <project-name> <type>
```

輸出會在 `projects/project-scaffolder/<project-name>/`。

## 變更模板
1. 在 `templates/<type>/` 內新增/修改檔案。
2. 若需要在產生後自動替換專案名，使用 token `__PROJECT_NAME__`。
3. 若模板新增了可執行腳本，建議使用 `.sh` 並在模板內加上 shebang。

## 常見問題

### 目標目錄已存在
`scaffolder.sh` 會直接中止，避免覆蓋既有資料。請改用新名稱或手動處理舊目錄。

### 產生後 token 沒被替換
腳本會嘗試用 `perl` 進行取代；若系統沒有 `perl`，會 fallback 到 `sed`。

### 權限問題
`automation` 會嘗試 `chmod +x scripts/*.sh`；若你在受限檔案系統或沒有權限，請手動 `chmod`。

## 釋出檢查清單
- `bash scaffolder.sh demo-project automation` 可成功建立目錄
- `demo-project/README.md` 內的 `__PROJECT_NAME__` 已被替換
- `demo-project/scripts/run.sh` 可執行

