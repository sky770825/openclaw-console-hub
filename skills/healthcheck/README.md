# HealthCheck Skill

OpenClaw 主機安全強化與風險評估工具，協助審計和強化運行 OpenClaw 的機器安全性。

## 用途

- 執行主機安全審計
- 防火牆/SSH/更新強化
- 風險評估與暴露檢查
- 定期安全檢查排程
- OpenClaw 版本狀態檢查

## 安裝

此技能隨 OpenClaw 安裝，無需額外安裝。

## 使用範例

### OpenClaw 安全審計

```bash
# 基礎審計
openclaw security audit

# 深度審計
openclaw security audit --deep

# 自動修復安全問題
openclaw security audit --fix

# JSON 輸出
openclaw security audit --json
```

### 檢查 OpenClaw 狀態

```bash
# 一般狀態
openclaw status

# 深度狀態
openclaw status --deep

# 健康檢查（JSON）
openclaw health --json
```

### 更新檢查

```bash
# 檢查更新
openclaw update status
```

### Cron 排程

```bash
# 列出排程任務
openclaw cron list

# 新增安全審計排程
openclaw cron add --name "healthcheck:security-audit" \
  --schedule "0 2 * * 0" \
  --command "openclaw security audit"
```

## 工作流程

1. **建立上下文** - 讀取 OS、權限、存取路徑
2. **執行審計** - 執行 `openclaw security audit`
3. **確定風險容忍度** - 選擇設定檔（Home/VPS/Developer）
4. **產生修復計畫** - 提供詳細步驟和命令
5. **執行並驗證** - 在確認後執行變更

## 風險設定檔

| 設定檔 | 適用場景 |
|--------|----------|
| Home/Workstation | 家庭/工作站平衡（最常用）|
| VPS Hardened | 預設拒絕、最小暴露、自動更新 |
| Developer Convenience | 更多本地服務、明確暴露警告 |

## 系統需求

- OpenClaw Gateway
- 適當權限（root/admin 用於系統變更）

## 注意事項

- 修改防火牆/SSH 前會要求明確確認
- 提供回滾計畫
- 不會在未確認時改變遠端存取設定

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件（含詳細工作流程）
