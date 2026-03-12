import sqlite3
import os

# 1. SQL Injection Vulnerability
def get_user(user_id):
    conn = sqlite3.connect('test.db')
    cursor = conn.cursor()
    # 危險：直接拼接字串
    query = "SELECT * FROM users WHERE id = " + user_id
    cursor.execute(query)
    return cursor.fetchone()

# 2. Hardcoded Secret
API_KEY = "sk-test-1234567890abcdef1234567890"

# 3. Command Injection
def run_command(cmd):
    # 危險：未經過濾的系統呼叫
    os.system(f"echo {cmd}")

# 4. Insecure Randomness
import random
def generate_token():
    return random.random()

if __name__ == "__main__":
    print(get_user("1 OR 1=1"))
    run_command("; rm -rf /")
