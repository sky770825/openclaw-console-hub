# Self-Hosted n8n 完整設定指南

> Docker 部署、環境配置與生產環境優化  
> 收集日期：2026-02-15

---

## 1. 部署方式比較

| 方式 | 難度 | 適用場景 | 成本 |
|------|------|----------|------|
| **n8n Cloud** | ⭐ 簡單 | 快速開始、不想管理基礎設施 | $20-50/月 |
| **Docker** | ⭐⭐ 中等 | 開發測試、小型生產環境 | 免費（自有伺服器） |
| **Docker Compose** | ⭐⭐⭐ 進階 | 生產環境、需要資料庫 | 免費（自有伺服器） |
| **Kubernetes** | ⭐⭐⭐⭐ 專家 | 大規模部署、高可用 | 基礎設施成本 |

---

## 2. Docker 快速啟動

### 2.1 基礎啟動（開發測試）

```bash
# 創建資料卷
docker volume create n8n_data

# 啟動 n8n
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="Asia/Taipei" \
  -e TZ="Asia/Taipei" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

**存取：** http://localhost:5678

### 2.2 帶基本認證

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="Asia/Taipei" \
  -e TZ="Asia/Taipei" \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-secure-password \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

### 2.3 使用 PostgreSQL（推薦生產環境）

```bash
# 創建資料卷
docker volume create n8n_data

# 啟動（帶 PostgreSQL 配置）
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="Asia/Taipei" \
  -e TZ="Asia/Taipei" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_HOST=your-postgres-host \
  -e DB_POSTGRESDB_PORT=5432 \
  -e DB_POSTGRESDB_DATABASE=n8n \
  -e DB_POSTGRESDB_USER=n8n \
  -e DB_POSTGRESDB_PASSWORD=your-db-password \
  -e DB_POSTGRESDB_SCHEMA=public \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

---

## 3. Docker Compose 完整配置

### 3.1 生產級配置（PostgreSQL + Redis）

```yaml
version: "3.8"

services:
  # PostgreSQL 資料庫
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=your-db-password
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U n8n -d n8n']
      interval: 5s
      timeout: 5s
      retries: 10

  # Redis（可選，用於進階功能）
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10

  # n8n 主服務
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      # 基礎配置
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - N8N_EDITOR_BASE_URL=https://n8n.yourdomain.com
      
      # 時區
      - GENERIC_TIMEZONE=Asia/Taipei
      - TZ=Asia/Taipei
      
      # 資料庫
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=your-db-password
      - DB_POSTGRESDB_SCHEMA=public
      
      # 安全性
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-secure-password
      - N8N_ENCRYPTION_KEY=your-encryption-key-min-16-chars
      - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
      
      # 執行設定
      - N8N_RUNNERS_ENABLED=true
      - EXECUTIONS_MODE=regular
      - EXECUTIONS_TIMEOUT=300
      - EXECUTIONS_TIMEOUT_MAX=3600
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      
      # Webhook
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      
    volumes:
      - n8n_data:/home/node/.n8n
      - /local-files:/files
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  n8n_data:
  postgres_data:
  redis_data:
```

---

## 4. 環境變數完整參考

### 4.1 基礎配置

| 變數 | 說明 | 範例 |
|------|------|------|
| `N8N_HOST` | 主機名稱 | `n8n.example.com` |
| `N8N_PORT` | 服務埠號 | `5678` |
| `N8N_PROTOCOL` | 通訊協議 | `https` |
| `N8N_EDITOR_BASE_URL` | 編輯器基礎 URL | `https://n8n.example.com` |
| `GENERIC_TIMEZONE` | 排程時區 | `Asia/Taipei` |
| `TZ` | 系統時區 | `Asia/Taipei` |

### 4.2 資料庫配置

| 變數 | 說明 | 範例 |
|------|------|------|
| `DB_TYPE` | 資料庫類型 | `postgresdb` 或 `sqlite` |
| `DB_POSTGRESDB_HOST` | PostgreSQL 主機 | `postgres` |
| `DB_POSTGRESDB_PORT` | PostgreSQL 埠號 | `5432` |
| `DB_POSTGRESDB_DATABASE` | 資料庫名稱 | `n8n` |
| `DB_POSTGRESDB_USER` | 資料庫使用者 | `n8n` |
| `DB_POSTGRESDB_PASSWORD` | 資料庫密碼 | `password` |

### 4.3 安全性配置

| 變數 | 說明 | 範例 |
|------|------|------|
| `N8N_BASIC_AUTH_ACTIVE` | 啟用基礎認證 | `true` |
| `N8N_BASIC_AUTH_USER` | 基礎認證使用者 | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | 基礎認證密碼 | `password` |
| `N8N_ENCRYPTION_KEY` | 加密金鑰（≥16 字元） | `your-secret-key-16` |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | 強制檔案權限 | `true` |

### 4.4 執行配置

| 變數 | 說明 | 範例 |
|------|------|------|
| `N8N_RUNNERS_ENABLED` | 啟用 Task Runners | `true` |
| `EXECUTIONS_MODE` | 執行模式 | `regular` |
| `EXECUTIONS_TIMEOUT` | 執行超時（秒） | `300` |
| `EXECUTIONS_DATA_PRUNE` | 啟用資料清理 | `true` |
| `EXECUTIONS_DATA_MAX_AGE` | 資料保留天數 | `30` |

### 4.5 Webhook 配置

| 變數 | 說明 | 範例 |
|------|------|------|
| `WEBHOOK_URL` | Webhook 基礎 URL | `https://n8n.example.com/` |

---

## 5. 版本管理與更新

### 5.1 更新 n8n

```bash
# 使用 Docker Compose
docker compose pull
docker compose down
docker compose up -d
```

### 5.2 指定版本

```bash
# 使用特定版本
docker pull docker.n8n.io/n8nio/n8n:1.81.0
```

---

## 6. 備份與還原

### 6.1 備份工作流

```bash
# 匯出所有工作流
docker exec n8n n8n export:workflow --all --output=/backup/workflows.json

# 複製到本地
docker cp n8n:/backup/workflows.json ./backups/
```

### 6.2 還原

```bash
# 還原工作流
docker exec n8n n8n import:workflow --input=/backup/workflows.json
```

---

## 7. 生產環境檢查清單

- [ ] 使用 PostgreSQL 而非 SQLite
- [ ] 設置強密碼和加密金鑰
- [ ] 啟用 HTTPS（使用反向代理）
- [ ] 配置自動備份
- [ ] 設置資源限制（CPU/記憶體）
- [ ] 啟用執行資料清理
- [ ] 配置監控告警
- [ ] 設置防火牆規則

---

*最後更新：2026-02-15*
