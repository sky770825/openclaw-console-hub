import json
import os
import sys
import re

def validate_skill(skill_path):
    manifest_path = os.path.join(skill_path, "manifest.json")
    if not os.path.exists(manifest_path):
        return False, "Missing manifest.json"
    
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    required_fields = ["name", "version", "permissions"]
    for field in required_fields:
        if field not in manifest:
            return False, f"Missing required field: {field}"
            
    # Check for dangerous patterns in code files
    for root, dirs, files in os.walk(skill_path):
        for file in files:
            if file.endswith(('.py', '.js', '.sh')):
                with open(os.path.join(root, file), 'r') as f:
                    content = f.read()
                    if "eval(" in content:
                        return False, f"Security Violation: 'eval' found in {file}"
                    if "os.system(" in content:
                        return False, f"Security Violation: 'os.system' found in {file}. Use subprocess with list arguments."
    
    return True, "Validated"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 skill_validator.py <skill_directory>")
        sys.exit(1)
    
    success, msg = validate_skill(sys.argv[1])
    print(f"Result: {success} - {msg}")
    sys.exit(0 if success else 1)
