import sys
import os

def patch_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    task_router_lines = []
    filtered_lines = []
    
    # 1. Extract the task router lines
    # Usually looks like: app.use('/api/openclaw/tasks', taskRouter);
    for line in lines:
        if "/api/openclaw/tasks" in line and "app.use" in line:
            task_router_lines.append(line)
        else:
            filtered_lines.append(line)

    # 2. Find the insertion point: app.use('/api', authMiddleware)
    new_lines = []
    inserted = False
    
    for line in filtered_lines:
        new_lines.append(line)
        if "app.use('/api', authMiddleware)" in line and not inserted:
            # Insert the tasks route immediately after auth middleware
            new_lines.extend(task_router_lines)
            inserted = True

    # 3. Ensure static catch-all '*' is at the very end (it should already be there)
    # But this logic ensures our API route moved UP to avoid being caught by it.

    output_path = file_path + ".fixed"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Fixed file created at: {output_path}")

if __name__ == "__main__":
    # In a real scenario, we'd pass server/src/index.ts
    # For this task execution, we're providing the script.
    if len(sys.argv) > 1:
        patch_file(sys.argv[1])
    else:
        print("Usage: python3 patch_index.py <path_to_index.ts>")
