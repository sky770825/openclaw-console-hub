#!/bin/bash
# 檢查 Landing Page 部署前的商業要素準備狀態

PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "--- SaaS Landing Page Business Readiness Check ---"

# 1. 檢查是否有基本的 SEO 標籤 (在 HTML 中)
if find "$PROJECT_ROOT" -name "*.html" | xargs grep -q "meta name=\"description\""; then
    echo -e "${GREEN}[OK]${NC} SEO Meta tags found."
else
    echo -e "${RED}[WARN]${NC} Missing SEO Meta tags in HTML files."
fi

# 2. 檢查是否有 Analytics (GA 或其他追蹤代碼)
if find "$PROJECT_ROOT" -name "*.html" -o -name "*.tsx" -o -name "*.js" | xargs grep -qE "gtag|analytics|mixpanel"; then
    echo -e "${GREEN}[OK]${NC} Tracking codes (Analytics) detected."
else
    echo -e "${RED}[WARN]${NC} No tracking code found. Business metrics will be unmeasurable!"
fi

# 3. 檢查是否有定價區塊 (Pricing)
if find "$PROJECT_ROOT" -name "*.html" -o -name "*.tsx" | xargs grep -qiE "Price|Pricing|Plan|Subscription"; then
    echo -e "${GREEN}[OK]${NC} Pricing section/component found."
else
    echo -e "${RED}[WARN]${NC} No pricing information found. Revenue path is unclear."
fi

echo "--- Check Complete ---"
