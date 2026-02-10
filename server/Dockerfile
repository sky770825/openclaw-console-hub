FROM node:20-slim

WORKDIR /app

# 複製 package.json
COPY package*.json ./

# 安裝所有依賴（包含 devDependencies 才能編譯）
RUN npm ci

# 複製原始碼
COPY . .

# 編譯 TypeScript
RUN npm run build

# 暴露 port
EXPOSE 3011

# 啟動
CMD ["npm", "start"]
