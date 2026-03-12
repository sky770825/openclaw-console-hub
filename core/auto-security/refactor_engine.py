import ast
# 使用內建的 ast.unparse (Python 3.9+) 或行替換邏輯

class RefactorEngine:
    """
    程式碼重構引擎：負責將 Patch 應用到原始程式碼中。
    """
    def __init__(self):
        pass

    def apply_patch(self, file_path: str, line_no: int, new_code: str):
        """
        簡單的行替換重構邏輯。
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        if 0 < line_no <= len(lines):
            # 保持原始縮排
            original_line = lines[line_no - 1]
            indent = original_line[:len(original_line) - len(original_line.lstrip())]
            lines[line_no - 1] = f"{indent}{new_code}\n"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            return True
        return False

    def rollback(self, file_path: str, backup_content: str):
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(backup_content)
