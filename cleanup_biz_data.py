import os
import sys

# Define mapping for sensitive terms to coded labels
MASK_MAP = {
    "楊梅": "[LOC_YM_01]",
    "餐車": "[BIZ_TRUCK_02]",
    "房產": "[BIZ_RE_03]",
    "紗窗": "[BIZ_SCREEN_04]",
    "飲料店": "[BIZ_DRINK_05]"
}

def process_files(workspace_path):
    report = []
    processed_count = 0
    
    for root, dirs, files in os.walk(workspace_path):
        # Restriction: Do NOT modify files in server/ or src/ directories
        # Also skip the sandbox/output directory to avoid recursion or modifying logs
        if any(part in root for part in ['server', 'src', 'sandbox/output', '.git']):
            continue
            
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    modified = False
                    for term, label in MASK_MAP.items():
                        if term in new_content:
                            new_content = new_content.replace(term, label)
                            modified = True
                    
                    if modified:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        report.append(f"SUCCESS: Masked {file_path}")
                        processed_count += 1
                except Exception as e:
                    report.append(f"ERROR: Failed to process {file_path}: {str(e)}")
                    
    return processed_count, report

if __name__ == "__main__":
    workspace = "/Users/caijunchang/.openclaw/workspace"
    count, logs = process_files(workspace)
    print(f"Total files modified: {count}")
    for entry in logs:
        print(entry)
