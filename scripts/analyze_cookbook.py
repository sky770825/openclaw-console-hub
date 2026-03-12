#!/usr/bin/env python3
import os

def analyze():
    cookbook_dir = os.path.expanduser("/Users/caijunchang/.openclaw/workspace/cookbook/")
    files = sorted([f for f in os.listdir(cookbook_dir) if f.endswith(".md")])

    report = [
        "# Cookbook 內容總覽",
        "",
        "| 編號 | 手冊名稱 | 大小 (Bytes) |",
        "|:---|:---|---:|"
    ]

    total_files = 0
    total_size = 0

    for fname in files:
        fpath = os.path.join(cookbook_dir, fname)
        size = os.path.getsize(fpath)
        total_files += 1
        total_size += size

        try:
            parts = fname.replace(".md", "").split("-", 1)
            num = parts[0].strip()
            title = parts[1].strip()
            report.append(f"| {num} | {title} | {size:,} |")
        except IndexError:
            report.append(f"| N/A | {fname} | {size:,} |")

    report.append("\n---")
    report.append(f"總計：{total_files} 份手冊，共 {total_size:,} Bytes。")

    print("\n".join(report))

if __name__ == "__main__":
    analyze()
