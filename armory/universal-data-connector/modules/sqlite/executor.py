import sqlite3
import sys
import json

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "無效的參數。用法: python executor.py <db_path> <command> [args]"}))
        sys.exit(1)

    db_path = sys.argv[1]
    command = sys.argv[2]
    args = sys.argv[3:]

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        if command == "query":
            cursor.execute(args[0])
            rows = cursor.fetchall()
            # 獲取欄位名稱
            col_names = [description[0] for description in cursor.description]
            # 將結果轉為 dict 列表
            result = [dict(zip(col_names, row)) for row in rows]
            print(json.dumps(result, indent=2))

        elif command == "list-tables":
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            print(json.dumps(tables))

        else:
            print(json.dumps({"error": f"未知的命令: {command}"}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
