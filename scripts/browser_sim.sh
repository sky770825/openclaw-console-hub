#!/bin/bash
# Simulates browser fetching and headers inspection
URL=$1
OUTPUT=$2
echo "Browsing to $URL..."
curl -s -L -D "$OUTPUT.headers" "$URL" > "$OUTPUT.html"
echo "Page saved to $OUTPUT.html"
echo "Headers saved to $OUTPUT.headers"
grep "HTTP/" "$OUTPUT.headers"
