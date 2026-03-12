import socket
import os
import subprocess

def find_port_owner(port):
    try:
        # Try to use lsof through python if possible, or other means
        # But since lsof is missing, let's try to just check if it's open
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = s.connect_ex(('127.0.0.1', port))
        if result == 0:
            print(f"Port {port} is OPEN")
            # Try to find the process using ps
            # This is hard on macOS without lsof
        else:
            print(f"Port {port} is CLOSED")
        s.close()
    except Exception as e:
        print(f"Error: {e}")

find_port_owner(3011)
