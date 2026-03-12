#!/bin/bash
#
# n8n 自動化一鍵部署腳本
# 支援：Docker Compose / Zeabur CLI
# 作者：小蔡
# 日期：2026-02-15

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 變數設定
PROJECT_NAME="n8n-production"
DEPLOY_MODE="${1:-docker}"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() { command -v "$1" &> /dev/null; }

pre_check() {
    log_info "執行前置檢查..."
    if [[ "$OSTYPE" == "darwin"* ]]; then OS="macos";
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then OS="linux";
    else log_error "不支援的作業系統: $OSTYPE"; exit 1; fi
    log_success "作業系統: $OS"
}

deploy_docker() {
    log_info "開始 Docker Compose 部署..."
    
    if ! check_command docker; then
        log_error "Docker 未安裝"
        echo "安裝: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    PROJECT_PATH="$HOME/$PROJECT_NAME"
    if [ -d "$PROJECT_PATH" ]; then
        log_warn "目錄已存在: $PROJECT_PATH"
        read -p "是否刪除並重新部署? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_PATH"
        else
            log_info "取消部署"
            exit 0
        fi
    fi
    
    mkdir -p "$PROJECT_PATH" && cd "$PROJECT_PATH"
    mkdir -p {init-scripts,local-files,backups}
    
    # 產生 docker-compose.yml
    cat > docker-compose.yml << 'DOCKEREOF'
version: "3.8"
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST:-localhost}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - GENERIC_TIMEZONE=Asia/Taipei
      - TZ=Asia/Taipei
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-n8n_password}
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-changeme}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY:-min16charskey!}
      - N8N_RUNNERS_ENABLED=true
      - EXECUTIONS_MODE=regular
      - EXECUTIONS_TIMEOUT=300
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
      - ./local-files:/files
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      qdrant:
        condition: service_healthy
    networks:
      - n8n-network

  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-n8n_password}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U n8n -d n8n']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - n8n-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - n8n-network

  qdrant:
    image: qdrant/qdrant:latest
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    healthcheck:
      test: ['CMD-SHELL', 'bash -c ":> /dev/tcp/127.0.0.1/6333" || exit 1']
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - n8n-network

volumes:
  n8n_data:
  postgres_data:
  redis_data:
  qdrant_data:

networks:
  n8n-network:
    driver: bridge
DOCKEREOF

    # 產生 .env
    cat > .env << ENVEOF
N8N_HOST=localhost
N8N_USER=admin
N8N_PASSWORD=$(openssl rand -base64 12 2>/dev/null | tr -d "=+/" | cut -c1-16 || echo "changeme123")
N8N_ENCRYPTION_KEY=$(openssl rand -base64 24 2>/dev/null | tr -d "=+/" | cut -c1-20 || echo "your-encryption-key!")
POSTGRES_PASSWORD=$(openssl rand -base64 12 2>/dev/null | tr -d "=+/" | cut -c1-16 || echo "postgres123")
OPENAI_API_KEY=
TELEGRAM_BOT_TOKEN=
ENVEOF

    # 產生資料庫初始化腳本
    cat > init-scripts/01-init.sql << 'SQLEOF'
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_response_cache (
    id SERIAL PRIMARY KEY,
    request_hash VARCHAR(32) UNIQUE NOT NULL,
    request_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    embedding VECTOR(1024),
    session_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON ai_response_cache(request_hash);
CREATE INDEX IF NOT EXISTS idx_cache_embedding ON ai_response_cache USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS conversation_memory (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    embedding VECTOR(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conv_session ON conversation_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_embedding ON conversation_memory USING ivfflat (embedding vector_cosine_ops);
SQLEOF

    # 產生備份腳本
    cat > backup.sh << 'BACKUPEOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"
echo "開始備份..."
docker compose exec -T postgres pg_dump -U n8n n8n > "$BACKUP_DIR/postgres.sql" 2>/dev/null || echo "PostgreSQL 備份失敗或服務未運行"
docker compose exec -T n8n n8n export:workflow --all --output=/tmp/workflows.json 2>/dev/null && docker cp n8n:/tmp/workflows.json "$BACKUP_DIR/" 2>/dev/null || echo "n8n 工作流備份失敗"
echo "備份完成: $BACKUP_DIR"
BACKUPEOF
    chmod +x backup.sh

    # 產生狀態檢查腳本
    cat > status.sh << 'STATUSEOF'
#!/bin/bash
echo "=== n8n 服務狀態 ==="
docker compose ps
echo ""
echo "=== 存取網址 ==="
echo "n8n: http://localhost:5678"
echo "Qdrant: http://localhost:6333"
STATUSEOF
    chmod +x status.sh

    # 啟動服務
    log_info "啟動服務..."
    docker compose up -d
    
    log_info "等待服務初始化..."
    sleep 20
    
    # 初始化 Qdrant
    log_info "建立 Qdrant Collection..."
    curl -s -X PUT 'http://localhost:6333/collections/ltm' \
      -H 'Content-Type: application/json' \
      -d '{"vectors": {"size": 1024, "distance": "Cosine"}}' 2>/dev/null || log_warn "Qdrant 初始化可能需要稍後手動執行"
    
    log_success "部署完成！"
    echo ""
    echo "====================================="
    echo "n8n:     http://localhost:5678"
    echo "Qdrant:  http://localhost:6333"
    echo ""
    echo "帳號: admin"
    echo "密碼: $(grep N8N_PASSWORD .env | cut -d= -f2)"
    echo "====================================="
}

deploy_zeabur() {
    log_info "Zeabur 部署模式"
    
    if ! check_command zeabur; then
        log_info "安裝 Zeabur CLI..."
        curl -sSL https://dub.sh/zb | bash
        export PATH="$HOME/.zeabur/bin:$PATH"
    fi
    
    if ! zeabur auth status &> /dev/null; then
        log_info "請登入 Zeabur"
        zeabur auth login
    fi
    
    log_info "請在 Zeabur Dashboard 完成部署:"
    echo "1. 前往 https://dash.zeabur.com"
    echo "2. Create Project → Deploy from Template"
    echo "3. 搜尋 n8n → 一鍵部署"
    
    # 嘗試自動部署
    PROJECT_OUTPUT=$(zeabur project create "$PROJECT_NAME" 2>/dev/null || echo "")
    if [ -n "$PROJECT_OUTPUT" ]; then
        log_success "專案建立成功"
    fi
}

show_usage() {
    echo "n8n 一鍵部署腳本"
    echo ""
    echo "使用方式: $0 [模式]"
    echo ""
    echo "模式:"
    echo "  docker   本地 Docker 部署 (預設)"
    echo "  zeabur   Zeabur 雲端部署"
    echo ""
    echo "範例:"
    echo "  $0 docker"
    echo "  $0 zeabur"
}

# 主程式
case "${1:-docker}" in
    docker)
        pre_check
        deploy_docker
        ;;
    zeabur)
        deploy_zeabur
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        log_error "未知模式: $1"
        show_usage
        exit 1
        ;;
esac
