import sys
import os
import re

def generate_fix(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Search for the scoring logic. 
    # Usually it involves checking a score and then logging an error without updating status.
    # Pattern: Look for score comparison followed by an error log and a return/break, 
    # but missing upsertOpenClawTask.
    
    # This is a heuristic pattern based on common AutoExecutor implementations
    # We look for a block that checks score and returns without calling upsertOpenClawTask
    
    pattern = r'(if\s*\([^)]*score\s*<\s*[^)]*\)\s*\{[^{}]*console\.error[^{}]*)(return|break|continue)'
    
    # We want to insert: 
    # await upsertOpenClawTask(taskId, { status: "failed", error: "Score too low" });
    # Before the return/break.
    
    def replacement(match):
        prefix = match.group(1)
        suffix = match.group(2)
        # Try to extract taskId variable name from context if possible, default to 'task.id' or 'id'
        task_id_match = re.search(r'task\s*:\s*([^,}\s]+)', content)
        task_id = "task.id"
        if "taskId" in content:
            task_id = "taskId"
            
        insertion = f'\n      await upsertOpenClawTask({task_id}, {{ status: "failed" }});\n      '
        if "upsertOpenClawTask" in prefix:
            return match.group(0) # Already fixed or different logic
            
        return prefix + insertion + suffix

    new_content = re.sub(pattern, replacement, content)
    
    return new_content

if __name__ == "__main__":
    target = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        fixed_code = generate_fix(target)
        with open(output_path, 'w') as f:
            f.write(fixed_code)
        print("Successfully generated fixed code.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
