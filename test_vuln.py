
import os
import sqlite3
import subprocess

def login(username, password):
    # 1. SQL Injection Vulnerability
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    
    # 2. OS Command Injection
    subprocess.run(["ls", "-l"], shell=False)
    
    # 3. Hardcoded Password
    password = os.getenv('DB_PASSWORD')

if __name__ == "__main__":
    login("admin", "pass")
