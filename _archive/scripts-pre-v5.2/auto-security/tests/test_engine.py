import os
import subprocess

# 測試用易受攻擊程式碼
vulnerable_code = """
import os
import sqlite3
import subprocess

def login(username, password):
    # 1. SQL Injection Vulnerability
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    
    # 2. OS Command Injection
    os.system(f"echo Logged in: {username}")
    
    # 3. Hardcoded Password
    db_password = "super_secret_password_123"

if __name__ == "__main__":
    login("admin", "pass")
"""

def setup_test():
    test_file = "test_vuln.py"
    with open(test_file, "w") as f:
        f.write(vulnerable_code)
    return test_file

def run_auto_fix(file_path):
    print(f"--- Running Auto-Fix on {file_path} ---")
    result = subprocess.run(["python3", "core/auto-security/main.py", file_path, "CVE-TEST-001"], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("Error:", result.stderr)

def verify_results(file_path):
    print(f"--- Verifying Results in {file_path} ---")
    with open(file_path, "r") as f:
        content = f.read()
    
    checks = {
        "SQL Injection fixed": "cursor.execute(\"SELECT * FROM users WHERE username = %s\", (username,))" in content,
        "OS Injection fixed": "subprocess.run([\"ls\", \"-l\"], shell=False)" in content,
        "Hardcoded password fixed": "password = os.getenv('DB_PASSWORD')" in content
    }
    
    for check, passed in checks.items():
        status = "[OK]" if passed else "[FAILED]"
        print(f"{status} {check}")

if __name__ == "__main__":
    path = setup_test()
    run_auto_fix(path)
    verify_results(path)
    # os.remove(path)
