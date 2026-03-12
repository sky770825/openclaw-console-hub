import os

def generate_map(path, indent=0):
    lines = []
    for item in os.listdir(path):
        p = os.path.join(path, item)
        if os.path.isdir(p):
            lines.append("  " * indent + f"├── {item}/")
            lines.extend(generate_map(p, indent + 1))
        else:
            lines.append("  " * indent + f"└── {item}")
    return lines