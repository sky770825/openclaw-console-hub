import os
import sys
import re

def update_file(source_path, dest_path):
    with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The mapping description correction
    # Old: Supabase 層是 running，API 層是 in_progress
    # New: Supabase 資料庫 status 欄位儲存的是 'in_progress'，而 API 或 WAKE_STATUS.md 為了可讀性會顯示為 'running'
    
    # We use a regex to find the problematic section even if the wording varies slightly
    pattern = r"Supabase.*running.*API.*in_progress"
    replacement = "Supabase 資料庫 status 欄位儲存的是 'in_progress'，而 API 或 WAKE_STATUS.md 為了可讀性會顯示為 'running'"
    
    if re.search(pattern, content):
        new_content = re.sub(pattern, replacement, content)
        print(f"Successfully matched and replaced the status mapping description.")
    else:
        # If specific pattern not found, look for more general terms to identify the section
        if "Supabase" in content and "in_progress" in content and "running" in content:
            # Try a slightly different pattern
            pattern2 = r"Supabase 層是 'running'.*API 層是 'in_progress'"
            new_content = re.sub(pattern2, replacement, content)
            print(f"Matched alternative pattern.")
        else:
            print("Warning: Could not find the exact phrase to replace. File might already be updated or structured differently.")
            new_content = content

    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == "__main__":
    update_file(sys.argv[1], sys.argv[2])
