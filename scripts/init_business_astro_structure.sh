#!/bin/bash
# 阿工執行腳本：建立商業價值導向的 Astro POC 結構
set -e
TARGET_DIR="/Users/sky770825/.openclaw/workspace/sandbox/astro-poc"
mkdir -p "${TARGET_DIR}/src/pages"
mkdir -p "${TARGET_DIR}/src/components/business"

# Create a business-focused index page
cat <<EOT > "${TARGET_DIR}/src/pages/index.astro"
---
const title = "高效能 SaaS 登陸頁面";
---
<html lang="zh-TW">
  <head>
    <title>{title}</title>
    <meta name="description" content="專為商業價值設計的 SaaS 模板">
  </head>
  <body>
    <h1>商業價值優先：SaaS 解決方案</h1>
    <p>這不是操作手冊，這是你的業績增長引擎。</p>
  </body>
</html>
EOT

echo "Astro POC structure initialized with business focus."
