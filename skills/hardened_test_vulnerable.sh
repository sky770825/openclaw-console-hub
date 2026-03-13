#!/bin/bash
source /Users/sky770825/.openclaw/workspace/armory/claw_security_lib.sh
secure_env
echo "Doing something with $1"
cat "$1"
