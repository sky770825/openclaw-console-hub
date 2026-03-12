import psutil
import os

def find_procs_by_port(port):
    for conn in psutil.net_connections(kind='inet'):
        if conn.laddr.port == port:
            return conn.pid
    return None

try:
    pid = find_procs_by_port(3011)
    if pid:
        print(f"FOUND PID: {pid}")
    else:
        print("NOT FOUND")
except Exception as e:
    print(f"ERROR: {e}")
