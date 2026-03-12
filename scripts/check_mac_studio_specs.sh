#!/bin/bash
echo "--- Mac Studio M3 High-Performance Check ---"
echo "Model Identifier: $(sysctl -n hw.model)"
echo "CPU: $(sysctl -n machdep.cpu.brand_string)"
echo "Cores: $(sysctl -n hw.ncpu)"
MEM_BYTES=$(sysctl -n hw.memsize)
MEM_GB=$(expr $MEM_BYTES / 1024 / 1024 / 1024)
echo "Memory: ${MEM_GB} GB"

if [ "$MEM_GB" -ge 90 ]; then
    echo "Status: 96GB Memory confirmed. Ready for heavy LLM / Video workloads."
else
    echo "Status: Memory check does not match 96GB target. Current: ${MEM_GB}GB"
fi

echo "--- System Load ---"
uptime
echo "--- Top Memory Consumers ---"
ps -Ao pid,ppid,%mem,command -m | head -n 10
