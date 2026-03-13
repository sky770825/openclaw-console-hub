#!/usr/bin/env python3
import json
import sys
import os

def generate_feature(title, desc):
    return {
        "id": title.lower().replace(" ", "-"),
        "title": title,
        "description": desc,
        "metadata": {
            "created_at": "2023-10-27",
            "category": "Automation"
        }
    }

if __name__ == "__main__":
    features = [
        generate_feature("AI 任務自主編排", "自動分解複雜任務並分配執行路徑。"),
        generate_feature("多代理協作架構", "支持多個 Agent 同時工作，共享上下文。"),
        generate_feature("安全沙箱環境", "所有腳本在隔離環境中執行，確保主機安全。")
    ]
    
    output_path = "/Users/sky770825/.openclaw/workspace/sandbox/output/features_data.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(features, f, ensure_ascii=False, indent=2)
    print(f"Feature data generated at {output_path}")
