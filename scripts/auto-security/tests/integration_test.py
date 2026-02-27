import os
import sys
import subprocess

def run_integration_test():
    print("=== OpenClaw Security Integration Test ===")
    
    # 1. 建立包含漏洞的檔案
    target_file = "vulnerable_app.py"
    with open(target_file, "w") as f:
        f.write('import os\n\ndef run_cmd(cmd):\n    # VULNERABILITY: Command Injection\n    os.system(cmd)\n')
    print(f"Created {target_file} with known vulnerability.")

    # 2. 建立模擬訊號觸發監考官
    simulation_file = ".simulation_security_vuln"
    import json
    with json.open(simulation_file, "w") if hasattr(json, 'open') else open(simulation_file, "w") as f:
        json.dump({"cve_id": "CVE-TEST-001", "file_path": target_file}, f)
    
    print("Triggering Supervisor with simulated security vulnerability...")

    # 3. 執行監考官單次迭代 (開啟 auto-fix)
    # 我們需要設定 PYTHONPATH 以確保能找到 core 模組
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    
    cmd = ["python3", "core/supervisor/main.py", "--iterations", "1", "--auto-fix"]
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    
    print("\n--- Supervisor Output ---")
    print(result.stdout)
    print("--------------------------")

    # 4. 驗證結果
    if "Fix applied successfully" in result.stdout:
        print("\n✅ Integration Test PASSED: Auto-fix was triggered and reported success.")
    else:
        print("\n❌ Integration Test FAILED: Auto-fix not triggered or failed.")
        print(f"Error output: {result.stderr}")

    # 5. 清理
    if os.path.exists(target_file): os.remove(target_file)
    if os.path.exists(simulation_file): os.remove(simulation_file)

if __name__ == "__main__":
    run_integration_test()
