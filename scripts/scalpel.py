import sys
import re
import os

def scalpel(file_path, search_pattern, replacement, dry_run=True):
    if not os.path.exists(file_path):
        return f"Error: File {file_path} not found."
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(search_pattern, replacement, content)
    
    if content == new_content:
        return "No changes detected."
    
    if dry_run:
        return f"Dry run: Would modify {file_path}. Matches found."
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return f"Successfully modified {file_path}."

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 scalpel.py <file> <pattern> <replacement> [--apply]")
    else:
        apply = "--apply" in sys.argv
        print(scalpel(sys.argv[1], sys.argv[2], sys.argv[3], not apply))
