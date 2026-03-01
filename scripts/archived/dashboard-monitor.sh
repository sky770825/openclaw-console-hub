#!/bin/bash
set -e
# Compatibility wrapper kept for legacy callers.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/unified-monitor.sh" "$@"
