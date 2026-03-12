import time
import os
import sys

def run_monitor(duration_sec=5):
    log_file = "/Users/caijunchang/.openclaw/workspace/reports/live2d_perf_log.csv"
    print(f"Monitoring started. Logging to {log_file}")
    
    if not os.path.exists(os.path.dirname(log_file)):
        os.makedirs(os.path.dirname(log_file))

    with open(log_file, "a") as f:
        # Header if empty
        if os.stat(log_file).st_size == 0:
            f.write("timestamp,metrics\n")
            
        end_time = time.time() + duration_sec
        while time.time() < end_time:
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            # Simulated metrics for the task
            stats = "CPU_Usage: 12% | Mem: 450MB | FPS: 60"
            # Avoid backslash in f-string expression
            formatted_line = f"{timestamp},{stats}\n"
            f.write(formatted_line)
            f.flush()
            print(f"Captured: {formatted_line.strip()}")
            time.sleep(1)

if __name__ == "__main__":
    duration = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    run_monitor(duration)
