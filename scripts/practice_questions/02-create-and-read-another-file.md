# 練習題：指定目錄下的文件操作

## 問題描述

你正在開發一個小型數據處理工具，需要將一些臨時數據存儲在一個特定的子目錄中，然後再讀取這些數據進行處理。請你編寫一個 Python 程式，完成以下任務：

1.  在當前工作目錄下創建一個名為 data_storage 的新目錄（如果它不存在）。
2.  在這個 data_storage 目錄中創建一個名為 temp_report.txt 的文件。
3.  向 temp_report.txt 文件寫入以下內容：
    ``
    這是我的臨時報告。
    日期：2023-10-27
    狀態：已完成初步寫入。
    `
4.  關閉文件後，重新打開 temp_report.txt 文件，讀取其所有內容。
5.  將讀取到的內容列印到控制台。

## 學習目標

*   掌握 Python 中 os 模組的基本用法，用於目錄操作。
*   理解如何在指定路徑下創建文件。
*   學習文件的寫入 ('w') 和讀取 ('r') 模式。
*   熟悉 with open(...) 語句來安全地處理文件。

## 任務步驟

請按照以下步驟來完成你的程式碼：

1.  *導入 os 模組*：這是進行目錄操作的關鍵。
2.  *定義路徑*：
    *   定義目標目錄的名稱，例如 data_storage。
    *   定義目標文件的名稱，例如 temp_report.txt。
    *   使用 os.path.join() 來構建完整的目錄路徑和文件路徑，確保跨平台兼容性。
3.  *創建目錄*：
    *   使用 os.makedirs() 函數來創建目標目錄。請務必使用 exist_ok=True 參數，這樣如果目錄已經存在，程式就不會報錯。
4.  *定義寫入內容*：將上述指定的內容存儲在一個多行字符串變數中。
5.  *寫入文件*：
    *   使用 with open(...) 語句以寫入模式 ('w') 打開 temp_report.txt 文件。
    *   將定義好的內容寫入文件。
    *   添加一個列印語句，確認文件已成功寫入。
6.  *讀取文件*：
    *   使用 with open(...) 語句以讀取模式 ('r') 重新打開 temp_report.txt 文件。
    *   使用 read() 方法讀取文件的所有內容。
    *   添加一個列印語句，確認文件已成功讀取。
7.  *列印內容*：將讀取到的內容列印到控制台。

## 提示

*   os.makedirs(path, exist_ok=True) 是一個非常有用的函數。
*   os.path.join(dir_path, file_name) 可以幫助你正確地拼接路徑。
*   with open(file_path, mode, encoding='utf-8') as f: 是處理文件的最佳實踐，它會自動關閉文件。
*   請記得在寫入和讀取文件時指定 encoding='utf-8'，以避免中文亂碼問題。

## 預期輸出

當你的程式成功執行後，你應該會在控制台看到類似以下的輸出：

`
目標目錄 'data_storage' 已確保存在。
內容已成功寫入到 'temp_report.txt'。
內容已成功從 'temp_report.txt' 讀取。

--- 文件內容 ---
這是我的臨時報告。
日期：2023-10-27
狀態：已完成初步寫入。
------------------
`

此外，你應該能在你的程式執行目錄下找到一個名為 data_storage 的文件夾，其中包含 temp_report.txt 文件，並且文件的內容與預期一致。

---

## 參考解答 (請在完成練習後才查看)

<details>
<summary>點擊展開查看參考解答</summary>

``python
import os

# 1. 定義路徑
target_directory_name = "data_storage"
target_file_name = "temp_report.txt"

# 獲取當前腳本的執行目錄，並構建完整路徑
current_script_dir = os.path.dirname(os.path.abspa