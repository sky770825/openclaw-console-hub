import time
import statistics

def simulate_unoptimized(n_tasks):
    start = time.time()
    # Simulate sequential processing
    for i in range(n_tasks):
        time.sleep(0.1) # 100ms per task
    return time.time() - start

def simulate_optimized(n_tasks, batch_size=5):
    start = time.time()
    # Simulate batched processing
    batches = (n_tasks + batch_size - 1) // batch_size
    for i in range(batches):
        time.sleep(0.15) # Slightly longer for batch but covers 5 tasks
    return time.time() - start

if __name__ == "__main__":
    tasks = 20
    legacy_time = simulate_unoptimized(tasks)
    new_time = simulate_optimized(tasks)
    
    improvement = ((legacy_time - new_time) / legacy_time) * 100
    
    print(f"Legacy Logic Time: {legacy_time:.4f}s")
    print(f"Optimized Logic Time: {new_time:.4f}s")
    print(f"Improvement: {improvement:.2f}%")
