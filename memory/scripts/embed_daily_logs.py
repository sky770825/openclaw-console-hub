import os
import glob
import subprocess
import json

def embed_daily_logs():
    # 獲取 memory/ 資料夾下所有的 .md 檔案
    memory_files = glob.glob(os.path.join("memory", "*.md"))
    print(f"找到 {len(memory_files)} 個每日日誌檔案準備索引。")

    for file_path in memory_files:
        # 跳過 MEMORY.md 和 USER.md，因為它們已經被處理或有特別的處理方式
        if "MEMORY.md" in file_path or "USER.md" in file_path:
            print(f"跳過檔案 {file_path}，已處理或單獨處理。")
            continue

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # 使用 memory_interface.py 來添加記憶
            metadata = {"source": "daily-logs", "file": os.path.basename(file_path)}
            command = [
                "python3",
                os.path.join("memory", "memory_interface.py"),
                "add",
                content,
                json.dumps(metadata) # 將 metadata 字典轉換為 JSON 字串傳遞
            ]
            print(f"正在索引檔案 {file_path}...")
            
            # 執行子程序
            result = subprocess.run(command, capture_output=True, text=True, check=False) # check=False 以便捕獲錯誤輸出
            print(result.stdout)
            if result.stderr:
                print(f"索引檔案 {file_path} 時發生錯誤:\n{result.stderr}")
            
            if result.returncode != 0:
                print(f"索引檔案 {file_path} 失敗，錯誤碼: {result.returncode}")

        except FileNotFoundError:
            print(f"錯誤: 找不到檔案 {file_path}")
        except Exception as e:
            print(f"處理檔案 {file_path} 時發生未知錯誤: {e}")

if __name__ == "__main__":
    embed_daily_logs()
