import os
import json

def generate_map(root_dir, depth=3):
    result = {"name": os.path.basename(root_dir), "type": "directory", "children": []}
    if depth < 0: return result
    
    try:
        for entry in os.scandir(root_dir):
            if entry.name.startswith('.') or 'node_modules' in entry.path:
                continue
            if entry.is_dir():
                result["children"].append(generate_map(entry.path, depth - 1))
            else:
                result["children"].append({"name": entry.name, "type": "file", "size": entry.stat().st_size})
    except PermissionError:
        pass
    return result

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "."
    print(json.dumps(generate_map(path), indent=2))
