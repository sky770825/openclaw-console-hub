#!/usr/bin/env bash
set -euo pipefail

# Project code backup (git history + working tree snapshot)
# Usage:
#   bash scripts/auto-project-backup.sh
#   BACKUP_RETENTION_DAYS=30 BACKUP_KEEP_COUNT=50 bash scripts/auto-project-backup.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_ROOT="${ROOT_DIR}/backups/auto"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
KEEP_COUNT="${BACKUP_KEEP_COUNT:-20}"

mkdir -p "${TARGET_DIR}"

cd "${ROOT_DIR}"

git rev-parse HEAD > "${TARGET_DIR}/HEAD.txt"
git branch --show-current > "${TARGET_DIR}/branch.txt"
git status --short > "${TARGET_DIR}/status.txt"

git bundle create "${TARGET_DIR}/repo.bundle" --all
git diff > "${TARGET_DIR}/working-tree.diff"
git diff --cached > "${TARGET_DIR}/index.diff"
git ls-files --others --exclude-standard > "${TARGET_DIR}/untracked.txt"

tar -czf "${TARGET_DIR}/working-tree.tar.gz" \
  --exclude='.git' \
  --exclude='backups' \
  --exclude='node_modules' \
  --exclude='server/node_modules' \
  --exclude='openclaw-main/node_modules' \
  --exclude='dist' \
  --exclude='server/dist' \
  .

shasum -a 256 \
  "${TARGET_DIR}/repo.bundle" \
  "${TARGET_DIR}/working-tree.tar.gz" \
  "${TARGET_DIR}/working-tree.diff" \
  "${TARGET_DIR}/index.diff" > "${TARGET_DIR}/SHA256SUMS.txt"

cat > "${TARGET_DIR}/RESTORE.md" <<RESTORE
# Restore Guide

- Validate files:
  shasum -a 256 -c ${TARGET_DIR}/SHA256SUMS.txt

- Restore git history into new repo:
  git clone ${TARGET_DIR}/repo.bundle restore-repo

- Restore current working tree snapshot (optional overlay):
  tar -xzf ${TARGET_DIR}/working-tree.tar.gz -C restore-repo

- Reapply local diffs (optional):
  cd restore-repo
  git apply ${TARGET_DIR}/working-tree.diff
  git apply ${TARGET_DIR}/index.diff
RESTORE

# Time-based cleanup
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf {} + || true

# Count-based cleanup (macOS bash 3.2 compatible)
all_dirs="$(find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d | sort)"
count="$(printf '%s\n' "${all_dirs}" | sed '/^$/d' | wc -l | tr -d ' ')"
if [ "${count}" -gt "${KEEP_COUNT}" ]; then
  delete_count=$((count - KEEP_COUNT))
  i=0
  while IFS= read -r dir; do
    [ -z "${dir}" ] && continue
    if [ "${i}" -lt "${delete_count}" ]; then
      rm -rf "${dir}"
      i=$((i + 1))
    else
      break
    fi
  done <<EOF
${all_dirs}
EOF
fi

echo "Backup completed: ${TARGET_DIR}"
