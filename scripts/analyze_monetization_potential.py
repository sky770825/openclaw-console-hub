import os

def analyze():
    base_path = "/Users/caijunchang/openclaw任務面版設計"
    report_path = "/Users/caijunchang/.openclaw/workspace/reports/business_strategy_v1.md"
    
    features = {
        "User System": ["auth", "user", "login", "profile"],
        "Task Management": ["task", "mission", "board"],
        "Payment Hooks": ["stripe", "payment", "billing", "invoice"],
        "Plugin System": ["plugin", "ext", "addon"]
    }
    
    findings = {}
    
    # Simple keyword search in file structure
    for feature, keywords in features.items():
        found = False
        for root, dirs, files in os.walk(base_path):
            if any(key in root.lower() for key in keywords):
                found = True
                break
            if any(any(key in f.lower() for key in keywords) for f in files):
                found = True
                break
        findings[feature] = "Implemented/Detected" if found else "Not Found (Potential Upsell)"

    print("-" * 40)
    print("OpenClaw Monetization Readiness Audit")
    print("-" * 40)
    for f, status in findings.items():
        print(f"{f:20}: {status}")
    print("-" * 40)
    print(f"Detailed report generated at: {report_path}")

if __name__ == "__main__":
    analyze()
