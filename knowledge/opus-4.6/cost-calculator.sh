#!/bin/bash
# Opus 4.6 成本計算 ($5/M in, $25/M out)

read -p "輸入 Token (in): " in_tok
read -p "輸出 Token (out): " out_tok

in_cost=$(echo "scale=4; $in_tok / 1000000 * 5" | bc)
out_cost=$(echo "scale=4; $out_tok / 1000000 * 25" | bc)
total=\$(echo "scale=4; $in_cost + $out_cost" | bc)

echo "輸入成本: \$$in_cost"
echo "輸出成本: \$$out_cost"
echo "總計: \$$total"
