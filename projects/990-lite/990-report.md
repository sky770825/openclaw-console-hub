# 990 Lite 安全掃描報告

- **掃描時間**：2026-03-03 11:27:12
- **掃描目錄**：`/Users/sky770825/.openclaw/workspace/projects/990-lite`
- **總發現數**：7（HIGH=2  MED=5  LOW=0）

## 各引擎發現數量摘要

| 引擎 | 發現數 |
|------|--------|
| PathWatch | 6 |
| CommandGuard | 1 |

## 詳細問題清單

| 嚴重度 | 引擎 | 檔案 | 行號 | 描述 |
|--------|------|------|------|------|
| 🔴 HIGH | PathWatch | `src/findings_collector.py` | 40 | (r'/etc/shadow', 'PathWatch', 'HIGH'), |
| 🔴 HIGH | PathWatch | `src/findings_collector.py` | 42 | (r'\.ssh/', 'PathWatch', 'HIGH'), |
| 🟡 MED | CommandGuard | `MVP-SPEC.md` | 8 | - CommandGuard: 識別危險指令 (sudo, rm, chmod) 與可疑腳本。 |
| 🟡 MED | PathWatch | `src/findings_collector.py` | 41 | (r'/etc/passwd', 'PathWatch', 'MED'), |
| 🟡 MED | PathWatch | `src/findings_collector.py` | 43 | (r'\.env\b', 'PathWatch', 'MED'), |
| 🟡 MED | PathWatch | `src/findings_collector.py` | 47 | SCAN_EXTS = {'.py', '.sh', '.js', '.ts', '.env', '.yaml', '.yml', '.json', '.md', '.txt', '.bash'} |
| 🟡 MED | PathWatch | `src/findings_collector.py` | 55 | if path.suffix not in self.SCAN_EXTS and path.name not in {'.env', '.bashrc', '.zshrc'}: |

---
_由 990 Lite 自動產生_
