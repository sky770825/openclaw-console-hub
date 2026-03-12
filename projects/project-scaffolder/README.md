# Project Scaffolder

這是一個專案範本產生器，用一個 shell 腳本快速建立標準化專案結構。

## 使用方式

```bash
cd projects/project-scaffolder/
bash scaffolder.sh <project-name> <type>
```

`type` 支援三種：
- `web-app`
- `cli-tool`
- `automation` (適合 OpenClaw 自動化腳本)

範例：

```bash
bash scaffolder.sh demo-project automation
```

## 產物內容

每個模板都會建立：
- `README.md`
- `.env.example`
- `.gitignore`
- `src/` 或 `scripts/`（依模板而定）

模板來源在 `templates/`。

