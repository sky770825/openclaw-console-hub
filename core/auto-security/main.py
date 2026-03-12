import sys
import os
import shutil

# 修正匯入路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from code_analyzer import CodeAnalyzer
from patch_generator import PatchGenerator
from refactor_engine import RefactorEngine
from verification_framework import VerificationFramework

def auto_fix_pipeline(file_path: str, cve_id: str = None):
    print(f"=== Starting Auto-Fix Engine for {file_path} ===")
    
    # 1. 初始化組件
    analyzer = CodeAnalyzer()
    generator = PatchGenerator()
    refactor = RefactorEngine()
    verifier = VerificationFramework()
    
    # 備份原始檔案以便回溯
    backup_path = file_path + ".bak"
    shutil.copy2(file_path, backup_path)
    with open(file_path, 'r') as f:
        original_content = f.read()

    # 2. 漏洞分析
    findings = analyzer.analyze_file(file_path)
    if not findings:
        print("[+] No vulnerabilities detected.")
        os.remove(backup_path)
        return

    success_count = 0
    for vuln in findings:
        v_type = vuln['type']
        line = vuln['line']
        print(f"[*] Found {v_type} at line {line}. Recalling fix patterns...")
        
        # 3. 召回歷史案例 & 生成補丁
        suggestion = analyzer.recall_history(v_type)
        print(f"    - Suggestion: {suggestion}")
        patch = generator.generate_patch(vuln, original_content)
        
        # 4. 執行重構
        print(f"[*] Applying patch...")
        if refactor.apply_patch(file_path, line, patch):
            # 5. 驗證
            if verifier.verify_fix(file_path, v_type):
                print(f"[V] Fix verified for {v_type}.")
                success_count += 1
            else:
                print(f"[X] Fix failed for {v_type}. Rolling back...")
                refactor.rollback(file_path, original_content)
                break
    
    if success_count == len(findings):
        print(f"=== Auto-Fix Completed Successfully ({success_count}/{len(findings)}) ===")
        # 生成 Commit Message
        commit_msg = generator.generate_commit_message("Multiple Vulnerabilities", file_path)
        print(f"\nRecommended Commit Message:\n{commit_msg}")
        os.remove(backup_path)
    else:
        print("=== Auto-Fix Partially Failed or Rolled Back ===")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <file_path> [CVE_ID]")
    else:
        target_file = sys.argv[1]
        cve = sys.argv[2] if len(sys.argv) > 2 else "GENERIC"
        auto_fix_pipeline(target_file, cve)
