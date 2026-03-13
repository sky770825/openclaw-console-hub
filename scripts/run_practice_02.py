import os

target_directory_name = "data_storage"
target_file_name = "temp_report.txt"

# 確保在練習題的目錄下操作
base_path = "/Users/sky770825/.openclaw/workspace/scripts/practice_questions"
full_directory_path = os.path.join(base_path, target_directory_name)
full_file_path = os.path.join(full_directory_path, target_file_name)

content_to_write = """這是我的臨時報告。
日期：2023-10-27
狀態：已完成初步寫入。"""

print(f"嘗試在 {full_directory_path} 創建目錄...")
os.makedirs(full_directory_path, exist_ok=True)
print(f"目標目錄 '{target_directory_name}' 已確保存在。")

print(f"嘗試寫入文件到 {full_file_path}...")
with open(full_file_path, 'w', encoding='utf-8') as f:
    f.write(content_to_write)
print(f"內容已成功寫入到 '{target_file_name}'。")

print(f"嘗試讀取文件從 {full_file_path}...")
with open(full_file_path, 'r', encoding='utf-8') as f:
    read_content = f.read()
print(f"內容已成功從 '{target_file_name}' 讀取。")

print("\n--- 文件內容 ---")
print(read_content)
print("------------------")
