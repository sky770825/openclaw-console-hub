#!/bin/bash
source /Users/caijunchang/.openclaw/workspace/armory/claw_security_lib.sh
secure_env
echo "Doing something with $1"
cat "$1"
