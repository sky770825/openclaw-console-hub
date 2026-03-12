import os
import sys

def replace_in_file(file_path, replacements):
    if not os.path.exists(file_path): return
    with open(file_path, 'r') as f: content = f.read()
    for k, v in replacements.items(): content = content.replace(k, v)
    with open(file_path, 'w') as f: f.write(content)

def generate_site(template_path, output_path, config):
    os.makedirs(output_path, exist_ok=True)
    # 1. 複製模板 (這部分交給 bash 執行較快，py 負責精確替換)
    # 2. 替換 HTML
    replace_in_file(os.path.join(output_path, 'index.html'), {
        '住商不動產濬瑒、子菲': config['title'],
        '楊梅地區精選優質物件': config['description']
    })
    # 3. 替換 JS Config
    replace_in_file(os.path.join(output_path, 'js/config.js'), {
        'YOUR_SUPABASE_URL': config['supabase_url'],
        'YOUR_SUPABASE_KEY': config['supabase_key']
    })
    print(f'✅ Site generated: {config["title"]}')

if __name__ == '__main__':
    print('Generator V2 ready for JS injection.')