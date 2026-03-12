# ClawHub Skill

OpenClaw 技能管理中心，用於搜尋、安裝、更新和發佈技能到 clawhub.com。

## 用途

- 從 ClawHub 搜尋並安裝新技能
- 更新已安裝技能到最新版本
- 發佈自製技能到 ClawHub
- 管理技能版本

## 安裝

```bash
npm i -g clawhub
```

## 使用範例

### 搜尋技能

```bash
clawhub search "postgres backups"
clawhub search "pdf"
```

### 安裝技能

```bash
# 安裝最新版本
clawhub install my-skill

# 安裝特定版本
clawhub install my-skill --version 1.2.3
```

### 更新技能

```bash
# 更新單個技能
clawhub update my-skill

# 更新全部技能
clawhub update --all

# 強制更新（忽略哈希檢查）
clawhub update my-skill --force
```

### 列出已安裝技能

```bash
clawhub list
```

### 發佈技能

```bash
# 先登入
clawhub login
clawhub whoami

# 發佈技能
clawhub publish ./my-skill \
  --slug my-skill \
  --name "My Skill" \
  --version 1.2.0 \
  --changelog "Fixes + docs"
```

## 環境變數

```bash
# 自訂 registry
export CLAWHUB_REGISTRY=https://custom.registry.com

# 自訂工作目錄
export CLAWHUB_WORKDIR=/path/to/workspace
```

## 常用選項

```bash
# 指定工作目錄
clawhub install my-skill --workdir /path/to/workspace

# 指定安裝目錄
clawhub install my-skill --dir ./custom-skills
```

## 系統需求

- Node.js 16+
- npm 或 yarn

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [ClawHub 網站](https://clawhub.com)
