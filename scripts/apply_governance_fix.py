import os
import re
import sys

def patch_governance_engine(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return False

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Avoid duplicate patching
    if "forceFailed" in content:
        print("File already contains forceFailed logic. Skipping.")
        return True

    # 1. Inject forceFailed flag at the beginning of the evaluate method
    # Looking for: async evaluate(...) {
    content = re.sub(
        r'(async\s+evaluate\s*\([^)]*\)\s*\{)',
        r"\1\n    let forceFailed = FalseLandingFlag; // Initialized below\n    let landingFailureReason = '';",
        content
    )
    # Fix the initialization (using false)
    content = content.replace("FalseLandingFlag", "false")

    # 2. Locate the artifacts_real_landing check and set the flag
    # We look for the block where artifacts_real_landing is checked for falsiness
    # Typically: if (!results.artifacts_real_landing) or if (results.artifacts_real_landing === false)
    landing_pattern = re.compile(r'(if\s*\([^)]*artifacts_real_landing[^)]*\)\s*\{)')
    if landing_pattern.search(content):
        content = landing_pattern.sub(
            r"\1\n      forceFailed = true;\n      landingFailureReason = '品質門失敗：產出物未實際落地 (artifacts_real_landing is false)';" , 
            content
        )
        print("Found artifacts_real_landing check and injected failure flag.")
    else:
        # Fallback if no explicit check is found, look for where it might be assigned
        print("Warning: Could not find explicit artifacts_real_landing if-block. Attempting secondary match.")
        content = content.replace(
            "artifacts_real_landing", 
            "artifacts_real_landing; if(results.artifacts_real_landing === false) { forceFailed = true; landingFailureReason = '品質門失敗：產出物未實際落地'; }"
        )

    # 3. Modify the return object to override status and reason
    # Look for status calculation: status: score >= threshold ? 'success' : 'failed'
    # We replace it with: status: forceFailed ? 'failed' : (original logic)
    status_pattern = re.compile(r'(status:\s*)([^,}\n]+)')
    content = status_pattern.sub(r"\1forceFailed ? 'failed' : \2", content)

    # Handle reason property
    if 'reason:' in content:
        reason_pattern = re.compile(r'(reason:\s*)([^,}\n]+)')
        content = reason_pattern.sub(r"\1forceFailed ? landingFailureReason : \2", content)
    else:
        # If reason doesn't exist, inject it after status
        content = re.sub(
            r"(status:\s*forceFailed\s*\?\s*'failed'\s*:\s*[^,}\n]+)",
            r"\1,\n      reason: forceFailed ? landingFailureReason : ''",
            content
        )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

if __name__ == "__main__":
    target = "/Users/sky770825/openclaw任務面版設計/server/src/governanceEngine.ts"
    success = patch_governance_engine(target)
    if not success:
        sys.exit(1)
