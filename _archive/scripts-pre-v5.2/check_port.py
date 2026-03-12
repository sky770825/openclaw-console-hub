#!/usr/bin/env python3
import socket
import sys
import argparse

def check_port(host, port, timeout=2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check port connectivity.")
    parser.add_argument("host", help="Target host")
    parser.add_argument("port", type=int, help="Target port")
    parser.add_argument("--timeout", type=float, default=2.0, help="Connection timeout in seconds")
    
    args = parser.parse_args()
    
    if check_port(args.host, args.port, args.timeout):
        print(f"CONNECTED: {args.host}:{args.port}")
        sys.exit(0)
    else:
        print(f"FAILED: {args.host}:{args.port}")
        sys.exit(1)
