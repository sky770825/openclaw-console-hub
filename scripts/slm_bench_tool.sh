#!/bin/bash
# SLM Performance Benchmarking Utility
# Usage: ./slm_bench_tool.sh [endpoint_url]

URL=${1:-"http://localhost:8000/v1/completions"}
PAYLOAD='{"model": "aegis-slm", "prompt": "Identify vulnerabilities in: function test() { eval(user_input); }", "stream": false}'

echo "Starting Benchmark for Aegis SLM..."
START_TIME=$(date +%s%N)

RESPONSE=$(curl -s -w "\nTIME_TOTAL:%{time_total}\n" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

END_TIME=$(date +%s%N)
DURATION=$((($END_TIME - $START_TIME) / 1000000))

echo "Response received in ${DURATION}ms"
echo "$RESPONSE" | grep "TIME_TOTAL"
