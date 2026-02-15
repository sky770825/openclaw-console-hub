# 多階段構建：編譯階段 + 執行階段
# 大幅減少最終映像檔大小（~500MB → ~100MB）

# ==================== 第一階段：編譯 ====================
FROM node:20-slim AS builder

WORKDIR /app

# 複製 package 檔案
COPY server/package*.json ./

# 安裝所有依賴（包含 devDependencies 才能編譯）
RUN npm ci

# 複製原始碼
COPY server/ .

# 編譯 TypeScript
RUN npm run build

# ==================== 第二階段：執行 ====================
FROM node:20-alpine

WORKDIR /app

# 安裝生產環境所需的最小依賴
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 從 builder 階段複製編譯後的檔案
COPY --from=builder /app/dist ./dist

# 建立非 root 使用者（安全性最佳實踐）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改檔案擁有者
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露 port
EXPOSE 3011

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3011/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動
CMD ["node", "dist/index.js"]
