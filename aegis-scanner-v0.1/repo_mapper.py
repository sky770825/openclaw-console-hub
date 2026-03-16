
import os

def generate_repo_map(path, indent=0):
    repo_map = []
    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        if os.path.isdir(item_path):
            repo_map.append("  " * indent + f"├── {item}/")
            repo_map.extend(generate_repo_map(item_path, indent + 1))
        else:
            repo_map.append("  " * indent + f"└── {item}")
    return repo_map

def main():
    target_path = os.getenv('TARGET_REPO_PATH', '.')
    print(f"Generating Repo Map for: {target_path}")
    repo_map_lines = generate_repo_map(target_path)
    for line in repo_map_lines:
        print(line)

if __name__ == "__main__":
    main()
