#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scaffolder.sh <project-name> <type>

Types:
  web-app | cli-tool | automation
EOF
}

if [[ $# -ne 2 ]]; then
  usage
  exit 2
fi

PROJECT_NAME="$1"
TYPE="$2"

case "$TYPE" in
  web-app|cli-tool|automation) ;;
  *)
    echo "Error: unknown type: $TYPE" >&2
    usage
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/templates/$TYPE"
TARGET_DIR="$SCRIPT_DIR/$PROJECT_NAME"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "Error: template dir not found: $TEMPLATE_DIR" >&2
  exit 1
fi

if [[ -e "$TARGET_DIR" ]]; then
  echo "Error: target already exists: $TARGET_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"

# Copy template files (including dotfiles).
cp -R "$TEMPLATE_DIR"/. "$TARGET_DIR"/

# Replace placeholder tokens in text files.
# Convention: templates may contain "__PROJECT_NAME__" tokens.
if command -v perl >/dev/null 2>&1; then
  while IFS= read -r -d '' f; do
    perl -0777 -i -pe "s/__PROJECT_NAME__/${PROJECT_NAME//\//-}/g" "$f" || true
  done < <(find "$TARGET_DIR" -type f -print0)
else
  while IFS= read -r -d '' f; do
    # sed -i differs between macOS/BSD and GNU; use portable temp file approach.
    tmp="${f}.tmp.$$"
    sed "s/__PROJECT_NAME__/${PROJECT_NAME//\//-}/g" "$f" > "$tmp" && mv "$tmp" "$f"
  done < <(find "$TARGET_DIR" -type f -print0)
fi

# Make scripts executable in automation template (common expectation).
if [[ -d "$TARGET_DIR/scripts" ]]; then
  chmod +x "$TARGET_DIR"/scripts/*.sh 2>/dev/null || true
fi

echo "Created: $TARGET_DIR"

