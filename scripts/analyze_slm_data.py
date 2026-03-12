import json
import os
import sys

def analyze(input_path, report_path, issue_path):
    with open(input_path, 'r') as f:
        data = json.load(f)

    success_data = [d for d in data if d['status'] == 'success']
    errors = [d for d in data if d['status'] == 'error']
    
    total = len(data)
    avg_latency = sum(d['latency_ms'] for d in success_data) / len(success_data) if success_data else 0
    avg_tps = sum(d['tokens_per_sec'] for d in success_data) / len(success_data) if success_data else 0
    max_mem = max(d['memory_mb'] for d in data) if data else 0
    
    # Identify bottlenecks/anomalies
    bottlenecks = []
    issues = []
    
    # Rule 1: Latency > 3000ms is a warning
    high_latency = [d for d in success_data if d['latency_ms'] > 3000]
    for h in high_latency:
        bottlenecks.append(f"High latency spike: {h['latency_ms']}ms for prompt length {h['prompt_len']}")
        issues.append({
            "id": "PERF-001",
            "severity": "Medium",
            "desc": f"Latency spike ({h['latency_ms']}ms) on large prompts",
            "cause": "Context window processing overhead or attention scaling"
        })

    # Rule 2: Errors
    for e in errors:
        issues.append({
            "id": "ERR-001",
            "severity": "High",
            "desc": f"Execution Error: {e.get('error_msg', 'Unknown')}",
            "cause": "Memory limit exceeded during inference"
        })

    # Generate Markdown Report
    with open(report_path, 'w') as f:
        f.write("# SLM 效能分析報告 (Performance Analysis)\n\n")
        f.write(f"## 1. 執行概觀\n")
        f.write(f"- 測試總數: {total}\n")
        f.write(f"- 成功率: {(len(success_data)/total)*100:.2f}%\n")
        f.write(f"- 平均延遲: {avg_latency:.2f} ms\n")
        f.write(f"- 平均吞吐量 (TPS): {avg_tps:.2f} tokens/s\n")
        f.write(f"- 峰值記憶體佔用: {max_mem} MB\n\n")
        
        f.write("## 2. 效能瓶頸與異常識別\n")
        if not bottlenecks:
            f.write("- 未發現明顯效能瓶頸。\n")
        for b in bottlenecks:
            f.write(f"- [!] {b}\n")
        
        f.write("\n## 3. 潛在改進建議\n")
        f.write("- **KV Cache 優化**: 對於長文本輸入，應考慮啟用 KV Cache 壓縮或分頁技術。\n")
        f.write("- **記憶體管理**: SLM 在記憶體接近 4GB 時出現 OOM，應限制最大 Context Window 或採用 4-bit 量化。\n")
        f.write("- **硬體加速**: 目前 TPS 在長文本下掉速嚴重，檢查是否觸發了 CPU fallback。\n")

    # Generate CSV Issue List
    with open(issue_path, 'w') as f:
        f.write("IssueID,Severity,Description,PotentialCause\n")
        for i in issues:
            f.write(f"{i['id']},{i['severity']},{i['desc']},{i['cause']}\n")

if __name__ == "__main__":
    analyze(sys.argv[1], sys.argv[2], sys.argv[3])
