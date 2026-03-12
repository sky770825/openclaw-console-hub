import os
import re
import sys

def apply_modification():
    file_path = "/Users/caijunchang/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts"
    
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The rules to be added
    new_rule = "- 對話時優先自己做（read_file/run_script/write_file），create_task 是派工不是做事，一次對話最多建 1 個任務，禁止建寫計畫寫提案類任務。"
    
    if new_rule in content:
        print("Modification already applied.")
        return True

    # Identify the '行動本能' section in the system prompt
    # Try multiple patterns to match the header and its newline
    patterns = [
        r"(行動本能[：:]?\s*\n)",
        r"(行動本能\s*\n)",
        r"(#+ 行動本能\s*\n)",
        r"(行動本能)"
    ]

    success = False
    for pattern in patterns:
        if re.search(pattern, content):
            # Insert the new rule right after the section header
            if "\n" in pattern or pattern == r"(行動本能)":
                replacement = r"\1" + new_rule + "\n"
            else:
                replacement = r"\1\n" + new_rule + "\n"
            
            updated_content = re.sub(pattern, replacement, content, count=1)
            
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Successfully modified system prompt in {file_path}")
                success = True
                break
            except PermissionError:
                print("Permission denied: Attempting to write to sandbox output instead.")
                output_path = "/Users/caijunchang/.openclaw/workspace/sandbox/output/xiaocai-think.ts"
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(output_path, 'w', encoding='utf-8') as f_out:
                    f_out.write(updated_content)
                print(f"Content saved to {output_path}")
                success = True
                break
            except Exception as e:
                print(f"Unexpected error: {e}")
                return False

    if not success:
        print("Could not find '行動本能' section in the source file.")
        return False
    
    return True

if __name__ == "__main__":
    if apply_modification():
        sys.exit(0)
    else:
        sys.exit(1)
