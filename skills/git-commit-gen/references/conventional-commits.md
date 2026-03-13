# Conventional Commits 規範參考

> 完整規範：https://www.conventionalcommits.org/

## 提交格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## 類型 (Type)

| 類型 | 說明 | 使用時機 |
|------|------|---------|
| **feat** | 新功能 | 新增功能、新特性 |
| **fix** | 修復 | 修復 bug |
| **docs** | 文檔 | 僅文檔變更 |
| **style** | 格式 | 不影響程式碼含義的變更（空白、格式、分號等）|
| **refactor** | 重構 | 既不修復 bug 也不新增功能的程式碼變更 |
| **perf** | 性能 | 提升性能的程式碼變更 |
| **test** | 測試 | 新增或修正測試 |
| **chore** | 雜務 | 構建流程、輔助工具、依賴更新等 |
| **ci** | CI/CD | 持續整合/部署相關變更 |
| **build** | 構建 | 影響構建系統或外部依賴的變更 |

## 範圍 (Scope)

可選，用於說明變更的範圍：

```
feat(auth): add login button
fix(api): handle null response
docs(readme): update installation guide
```

常見範圍：
- `api` - API 相關
- `ui` - 使用者介面
- `auth` - 認證相關
- `db` - 資料庫相關
- `config` - 配置相關
- `deps` - 依賴相關

## 描述 (Description)

- 使用祈使句，現在時（"change" 而非 "changed" 或 "changes"）
- 首字母小寫
- 結尾不加句號

✅ 正確：
- `feat: add user authentication`
- `fix: resolve memory leak in data processing`

❌ 錯誤：
- `feat: Added user authentication` （過去式）
- `fix: Resolve memory leak.` （句號結尾）

## 主體 (Body)

- 使用祈使句
- 說明 "what" 和 "why"，而非 "how"
- 可包含多行

```
feat: add user authentication

Implement OAuth2 flow for Google and GitHub providers.
This allows users to sign in without creating new passwords.
```

## 頁腳 (Footer)

用於引用 issues 或說明破壞性變更：

```
feat: change authentication API

BREAKING CHANGE: authentication endpoint now requires API key

Closes #123
```

## 完整範例

```
feat(auth): add OAuth2 authentication

Implement Google and GitHub OAuth2 login flow.
Add user profile page with connected accounts.
Update navigation to show login state.

Closes #456
```

```
fix(api): handle timeout errors gracefully

Add retry logic with exponential backoff for API calls.
Show user-friendly error message when request fails.

Fixes #789
```

```
docs: update README with setup instructions

Add detailed installation steps for macOS and Linux.
Include troubleshooting section for common issues.
```

## 判斷規則

### 如何選擇 type

1. **有新增功能？** → `feat`
2. **有修復問題？** → `fix`
3. **只有文檔變更？** → `docs`
4. **只有格式調整（縮排、空格）？** → `style`
5. **重組程式碼但功能不變？** → `refactor`
6. **優化性能？** → `perf`
7. **新增/修改測試？** → `test`
8. **更新依賴/構建配置？** → `chore` 或 `build`
9. **CI/CD 配置變更？** → `ci`

### 如何確定 scope

1. 查看變更的檔案路徑
2. 識別主要模組/組件
3. 如果影響多個模組，可省略 scope

### 常見檔案對應

```
src/components/ → scope: components 或 ui
src/api/ → scope: api
src/utils/ → scope: utils
tests/ → scope: tests 或 test
docs/ → docs（通常直接用 type: docs）
.github/workflows/ → type: ci
package.json, Cargo.toml → type: chore 或 build
```
