import os
import sys
import psutil
import time

def monitor():
    print("Starting Mac Studio M3 (96GB Optimized) Resource Monitor...")
    try:
        while True:
            mem = psutil.virtual_memory()
            cpu = psutil.cpu_percent(interval=1)
            # 96GB logic: alert if swap is high even with 96GB
            swap = psutil.swap_memory()
            
            os.system('clear')
            print(f"--- Mac Studio M3 Status ---")
            print(f"CPU Usage: {cpu}%")
            print(f"Memory Total: {mem.total / (1024**3):.2f} GB")
            print(f"Memory Used: {mem.used / (1024**3):.2f} GB ({mem.percent}%)")
            print(f"Memory Available: {mem.available / (1024**3):.2f} GB")
            print(f"Swap Used: {swap.used / (1024**3):.2f} GB")
            print("-" * 30)
            print("Press Ctrl+C to stop")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")

if __name__ == "__main__":
    monitor()
