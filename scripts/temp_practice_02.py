import os

# 1. 定義路徑
target_directory_name = "data_storage"
target_file_name = "temp_report.txt"

# 獲取當前腳本的執行目錄，並構建完整路徑
base_dir = os.getcwd()
target_directory_path = os.path.join(base_dir, target_directory_name)
target_file_path = os.path.join(target_directory_path, target_file_name)

# 2. 定義寫入內容
content_to_write = "這是我的臨時報告。\n日期：2023-10-27\n狀態：已完成初步寫入。\n"

# 3. 創建目錄
try:
    os.makedirs(target_directory_path, exist_ok=True)
    print(f"目標目錄 '{target_directory_name}' 已確保存在。")
except Exception as e:
    print(f"創建目錄失敗: {e}")

# 4. 寫入文件
try:
    with open(target_file_path, 'w', encoding='utf-8') as f:
        f.write(content_to_write)
    print(f"內容已成功寫入到 '{target_file_name}'。")
except Exception as e:
    print(f"寫入文件失敗: {e}")

# 5. 讀取文件
try:
    with open(target_file_path, 'r', encoding='utf-8') as f:
        read_content = f.read()
    print(f"內容已成功從 '{target_file_name}' 讀取。")
    print("\n--- 文件內容 ---")
    print(read_content)
    print("------------------")
except FileNotFoundError:
    print(f"錯誤：文件 '{target_file_name}' 不存在，無法讀取。")
except Exception as e:
    print(f"讀取文件失敗: {e}")
