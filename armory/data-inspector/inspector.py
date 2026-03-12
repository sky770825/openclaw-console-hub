#!/usr/bin/env python3
# armory/data-inspector/inspector.py
# This script is extracted and adapted from the "Python for Data Analysis" book by Wes McKinney.
# It provides a basic inspection of a CSV file from a URL.

import pandas as pd
import sys
import io

def main():
    if len(sys.argv) < 2:
        print("錯誤：請提供一個 CSV 檔案的 URL。")
        print("用法: python inspector.py <csv_url>")
        sys.exit(1)

    csv_url = sys.argv[1]
    print(f"正在分析 URL: {csv_url}\\n")

    try:
        df = pd.read_csv(csv_url)
        
        print("--- 資料前 5 行 ---")
        print(df.head())
        
        print("\\n" + "="*50 + "\\n")
        
        print("--- 資料基礎資訊 ---")
        # Capture the output of info() to a string
        buffer = io.StringIO()
        df.info(buf=buffer)
        info_str = buffer.getvalue()
        print(info_str)

        print("\\n" + "="*50 + "\\n")

        print("--- 敘述性統計 ---")
        print(df.describe())
        
        print("\\n分析完成。")

    except Exception as e:
        print(f"發生錯誤: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
