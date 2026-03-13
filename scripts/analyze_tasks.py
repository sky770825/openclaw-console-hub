import json
import os

file_path = os.path.expanduser('/Users/sky770825/.openclaw/workspace/reports/temp_tasks_data.json')

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # 移除任何可能導致 JSON 解析問題的額外文字，確保只有純 JSON 陣列
        # 這裡假設 JSON 陣列是檔案的唯一內容
        # 如果內容前後有非 JSON 文字，需要更精確的解析，例如找尋 '[' 和 ']' 的位置
        # print(f"DEBUG: First 500 chars of file content: {content[:500]}\n") # 暫時移除此行以避免可能的輸出干擾
        tasks = json.loads(content)
    
    total_tasks = len(tasks)
    done_tasks = sum(1 for task in tasks if task['status'] == 'done')

    report_content = f'# 任務板分析報告\n\n- *總任務數*: {total_tasks}\n- *已完成任務數*: {done_tasks}\n- *完成率*: {done_tasks/total_tasks:.2%}\n\n## 任務詳情\n\n' 

    for task in tasks:
        report_content += f'- *{task["name"]}* ({task["id"]})\n  - 狀態: {task["status"]}\n  - 分類: {task["cat"]}\n  - 進度: {task["progress"]}%\n  - 創建時間: {task["createdAt"]}\n  - 更新時間: {task["updatedAt"]}\n\n'

    report_output_path = os.path.expanduser('/Users/sky770825/.openclaw/workspace/reports/task-analysis-report.md')
    with open(report_output_path, 'w', encoding='utf-8') as f:
        f.write(report_content)

    print(f'任務分析報告已生成：{report_output_path}')

except json.JSONDecodeError as e:
    print(f"ERROR: JSONDecodeError occurred: {e}")
    print(f"ERROR: Problematic file path: {file_path}")
    # 打印部分內容以協助偵錯
    with open(file_path, 'r', encoding='utf-8') as f_debug:
        debug_content = f_debug.read()
        print(f"DEBUG: Content causing error (first 500 chars): {debug_content[:500]}")
except FileNotFoundError:
    print(f"ERROR: File not found: {file_path}")
except Exception as e:
    print(f"ERROR: An unexpected error occurred: {e}")