#!/bin/bash
# This script lists the project structure excluding node_modules and hidden files
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
echo "Project structure for $SOURCE_DIR:"
find "$SOURCE_DIR" -maxdepth 2 -not -path '*/.*' -not -path '*node_modules*'
