#!/bin/bash
set -e

# Initialize variables
SCAN_PATH=""
REPO_URL=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --scan-path)
      SCAN_PATH="$2"
      shift # past argument
      shift # past value
      ;;
    *)
      # Assume any other argument is the repository URL
      REPO_URL="$1"
      shift # past argument
      ;;
  esac
done

# Perform scan based on provided arguments
if [[ -n "$SCAN_PATH" ]]; then
  echo "Executing local scan on path: $SCAN_PATH"
  # Use 'trivy fs' for local directory scanning
  trivy fs "$SCAN_PATH"
elif [[ -n "$REPO_URL" ]]; then
  echo "Executing remote scan on repository: $REPO_URL"
  # Use 'trivy repo' for remote git repository scanning
  trivy repo "$REPO_URL"
else
  echo "Error: No scan target provided."
  echo "Usage: $0 [--scan-path <local_directory_path>] [<remote_repo_url>]"
  exit 1
fi
