#!/bin/bash
# Auto-update sitemap based on current project routes
PROJECT_SRC="/Users/caijunchang/openclaw任務面版設計/src"
OUTPUT="/Users/caijunchang/.openclaw/workspace/sandbox/output/sitemap.xml"
BASE_URL="https://beauty-salon.example.com"

echo "Scanning routes..."
ROUTES=$(grep -rE "path[:=]\s*['\"][^'\"]+['\"]" "$PROJECT_SRC" 2>/dev/null | sed -E "s/.*path[:=]\s*['\"]([^'\"]+)['\"].*/\1/" | grep -v ":" | sort -u)

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" > "$OUTPUT"
for r in $ROUTES; do
    [[ "$r" != /* ]] && r="/$r"
    echo "<url><loc>$BASE_URL$r</loc><lastmod>$(date +%Y-%m-%d)</lastmod></url>" >> "$OUTPUT"
done
echo "</urlset>" >> "$OUTPUT"
echo "Sitemap updated."
