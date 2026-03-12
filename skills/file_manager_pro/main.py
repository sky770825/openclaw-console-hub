import sys
import os

def safe_write(filename, content):
    # Fix for VULN-002: Check path
    base_path = os.environ.get('CLAW_SANDBOX', '/tmp')
    target_path = os.path.abspath(os.path.join(base_path, filename))
    
    if not target_path.startswith(base_path):
        print("Security Error: Access denied to path outside sandbox.")
        sys.exit(1)
        
    with open(target_path, 'w') as f:
        f.write(content)
    print(f"Successfully wrote to {target_path}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        safe_write(sys.argv[1], sys.argv[2])
