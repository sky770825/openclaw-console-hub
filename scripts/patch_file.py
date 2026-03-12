#!/usr/bin/env python3
import sys
import os
import argparse

def main():
    parser = argparse.ArgumentParser(description="Precision Patcher v1: Safely replace strings in files.")
    parser.add_argument("file_path", help="Path to the file to be edited")
    parser.add_argument("search_string", help="The exact string to search for")
    parser.add_argument("replacement_string", help="The string to replace with")
    parser.add_argument("--check-only", action="store_true", help="Only check if the search string exists")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be changed without writing")

    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(f"ERROR: File not found: {args.file_path}")
        sys.exit(1)

    try:
        with open(args.file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"ERROR: Could not read file: {e}")
        sys.exit(1)

    if args.search_string not in content:
        print(f"ERROR: Search string not found in {args.file_path}")
        # Print a small snippet for debugging context if possible
        sys.exit(1)

    count = content.count(args.search_string)
    
    if args.check_only:
        print(f"INFO: Found {count} occurrence(s).")
        sys.exit(0)

    new_content = content.replace(args.search_string, args.replacement_string)

    if args.dry_run:
        print(f"DRY-RUN: Would replace {count} occurrence(s) in {args.file_path}")
        sys.exit(0)

    # Atomic-like write: write to temp then rename
    temp_file = args.file_path + ".tmp"
    try:
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        os.replace(temp_file, args.file_path)
        print(f"SUCCESS: Successfully replaced {count} occurrence(s) in {args.file_path}")
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        print(f"ERROR: Failed to write to file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
