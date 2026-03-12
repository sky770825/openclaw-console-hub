#!/bin/bash
# 自動生成專案 Dockerfile 範本
TARGET_DIR=$1
if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="./output"
fi
mkdir -p "$TARGET_DIR"

cat << 'DOCKERFILE' > "$TARGET_DIR/Dockerfile.example"
# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Build project
RUN npm run build || echo "No build script"

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
DOCKERFILE

echo "Dockerfile.example generated in $TARGET_DIR"
