#!/bin/bash
FILE_PATH="$1"

# 1. 檢查參數是否存在
if [ -z "$FILE_PATH" ]; then
  echo '{"status": "error", "message": "Error: File path parameter is missing."}'
  exit 1
fi

# 2. 檢查檔案是否存在
if [ ! -e "$FILE_PATH" ]; then
  echo '{"status": "error", "message": "Error: File does not exist."}'
  exit 1
fi

# 3. 檢查是否為普通檔案
if [ ! -f "$FILE_PATH" ]; then
  echo '{"status": "error", "message": "Error: Path is not a regular file."}'
  exit 1
fi

# 4. 檢查是否可讀
if [ ! -r "$FILE_PATH" ]; then
  echo '{"status": "error", "message": "Error: File is not readable."}'
  exit 1
fi

# 5. 檢查是否為空
if [ ! -s "$FILE_PATH" ]; then
  echo '{"status": "error", "message": "Error: File is empty."}'
  exit 1
fi

echo '{"status": "success", "message": "File verified successfully."}'
exit 0