#!/bin/bash
# Terminal: Executes commands in the sandbox environment
CMD=$@
echo "Terminal: Executing -> $CMD"
eval "$CMD"
