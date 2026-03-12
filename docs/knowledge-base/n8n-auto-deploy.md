# n8n 自動化一鍵部署

> 3 分鐘完成完整 n8n 環境部署  
> 腳本位置：`scripts/deploy-n8n.sh`

---

## 🚀 快速使用

### 方式一：本地 Docker 部署（推薦）

```bash
# 下載腳本
curl -fsSL https://raw.githubusercontent.com/your-repo/deploy-n8n.sh | bash

# 或本地執行
./scripts/deploy-n8n.sh docker
```

### 方式二：Zeabur 雲端部署

```bash
./scripts/deploy-n8n.sh zeabur
```

---

## 📦 自動化內容

執行腳本後會自動完成：

| 步驟 | 說明 |
|------|------|
| **環境檢查** | 檢查 Docker、作業系統 |
| **目錄建立** | 建立 `~/n8n-production` 專案結構 |
| **配置產生** | 自動生成 `docker-compose.yml` |
| **密碼生成** | 自動生成安全的隨機密碼 |
| **資料庫初始化** | 建立 PostgreSQL + pgvector |
| **向量資料庫** | 建立 Qdrant Collection |
| **服務啟動** | 啟動所有容器 |
| **資訊顯示** | 顯示存取網址和帳密 |

---

## 🗂️ 產生的檔案結構

```
~/n8n-production/
├── docker-compose.yml      # 完整服務配置
├── .env                    # 環境變數（自動生成密碼）
├── backup.sh               # 備份腳本
├── status.sh               # 狀態檢查腳本
├── init-scripts/
│   └── 01-init.sql         # 資料庫初始化
└── local-files/            # n8n 檔案掛載
```

---

## 🔧 手動執行步驟

如果不想使用腳本，可以手動複製以下內容：

### 1. 建立專案目錄

```bash
mkdir ~/n8n-production && cd ~/n8n-production
mkdir -p {init-scripts,local-files,backups}
```

### 2. 複製 docker-compose.yml

（見 `docs/knowledge-base/n8n-integration-guide.md`）

### 3. 設定環境變數

```bash
# 產生隨機密碼
export N8N_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
export POSTGRES_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
export N8N_ENCRYPTION_KEY=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

# 建立 .env 檔案
cat > .env << EOF
N8N_HOST=localhost
N8N_USER=admin
N8N_PASSWORD=$N8N_PASSWORD
N8N_ENCRYPTION_KEY=$N8N_ENCRYPTION_KEY
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
EOF
```

### 4. 啟動服務

```bash
docker compose up -d
```

### 5. 初始化 Qdrant

```bash
sleep 10
curl -X PUT 'http://localhost:6333/collections/ltm' \
  -H 'Content-Type: application/json' \
  -d '{"vectors": {"size": 1024, "distance": "Cosine"}}'
```

---

## 🔄 部署後操作

### 檢查服務狀態

```bash
cd ~/n8n-production
./status.sh
```

### 備份資料

```bash
cd ~/n8n-production
./backup.sh
```

### 更新服務

```bash
cd ~/n8n-production
docker compose pull
docker compose up -d
```

### 查看日誌

```bash
# n8n 日誌
docker compose logs -f n8n

# 所有服務日誌
docker compose logs -f
```

---

## 📋 系統需求

| 項目 | 最低需求 | 建議配置 |
|------|----------|----------|
| **CPU** | 2 核心 | 4 核心 |
| **記憶體** | 4 GB | 8 GB |
| **磁碟** | 10 GB | 50 GB |
| **網路** | 穩定連線 | 寬頻 |

### 支援的作業系統

- ✅ macOS (Intel/Apple Silicon)
- ✅ Linux (Ubuntu, Debian, CentOS)
- ❌ Windows (請使用 WSL2)

---

## 🐛 常見問題

### Q1: Docker 未安裝

```bash
# macOS
brew install docker docker-compose

# Ubuntu
curl -fsSL https://get.docker.com | sh
```

### Q2: 端口被佔用

```bash
# 檢查端口使用
lsof -i :5678
lsof -i :6333

# 修改 docker-compose.yml 中的端口映射
ports:
  - "5679:5678"  # 改為 5679
```

### Q3: 服務啟動失敗

```bash
# 重置所有服務
docker compose down -v
docker compose up -d

# 檢查日誌
docker compose logs --tail=100
```

---

## 🔐 安全性提醒

1. **立即更改密碼**：首次登入後修改預設密碼
2. **設定防火牆**：生產環境限制 5678/6333 端口存取
3. **啟用 HTTPS**：使用反向代理（Nginx/Traefik）
4. **定期備份**：執行 `./backup.sh`

---

## 📚 相關文件

- [完整整合指南](../docs/knowledge-base/n8n-integration-guide.md)
- [Zeabur 部署指南](../docs/knowledge-base/n8n-zeabur-deploy.md)
- [永久記憶體規劃](../docs/knowledge-base/n8n-memory-cache.md)

---

*最後更新：2026-02-15*
