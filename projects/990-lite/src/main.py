#!/usr/bin/env python3
"""
990 Lite — AI 代碼安全守護者 v0.1
用法: python3 main.py <掃描目錄>
"""
import sys
from pathlib import Path
from findings_collector import FindingsCollector

def main():
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
    if not target.exists():
        print(f"[990] 錯誤：目錄不存在 {target}")
        sys.exit(1)

    resolved = target.resolve()
    print(f"[990 Lite] 開始掃描：{resolved}\n")
    collector = FindingsCollector()
    collector.scan(target)
    collector.report()
    collector.save_report('990-report.md', scanned_dir=str(resolved))

if __name__ == '__main__':
    main()
