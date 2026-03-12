#!/bin/bash
echo "--- 可視化庫版本資訊 (Latest) ---"
echo "Recharts: $(node -e "child_process.execSync('npm info recharts version').toString().trim()" 2>/dev/null || echo '2.12.7 (Manual check required)')"
echo "D3.js: $(node -e "child_process.execSync('npm info d3 version').toString().trim()" 2>/dev/null || echo '7.9.0 (Manual check required)')"
