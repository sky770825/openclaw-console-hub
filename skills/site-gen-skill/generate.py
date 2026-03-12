import os
import shutil

def replace_in_file(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    for key, value in replacements.items():
        content = content.replace(key, value)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def generate_site(src, dst, replacements):
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('.git', 'node_modules', '.wrangler'))
    for root, dirs, files in os.walk(dst):
        for file in files:
            if file.endswith(('.html', '.js', '.json', '.css')):
                replace_in_file(os.path.join(root, file), replacements)
    print(f'✅ 網站已產生至: {dst}')