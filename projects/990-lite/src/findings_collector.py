"""
FindingsCollector — 掃描引擎
負責：LeakScan + CommandGuard + PathWatch
"""
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import List
from datetime import datetime

@dataclass
class Finding:
    file: str
    line: int
    rule: str
    severity: str  # HIGH / MED / LOW
    detail: str

@dataclass
class FindingsCollector:
    findings: List[Finding] = field(default_factory=list)

    # ── LeakScan 規則（API Key / Secret / Token）
    LEAK_PATTERNS = [
        (r'(?i)(api[_-]?key|secret|token|password)\s*=\s*["\']([^"\']{8,})["\']', 'LeakScan', 'HIGH'),
        (r'(?i)AKIA[0-9A-Z]{16}', 'LeakScan-AWS', 'HIGH'),
        (r'(?i)ghp_[A-Za-z0-9]{36}', 'LeakScan-GitHub', 'HIGH'),
    ]

    # ── CommandGuard 規則（危險指令）
    COMMAND_PATTERNS = [
        (r'\brm\s+-rf\b', 'CommandGuard', 'HIGH'),
        (r'\bchmod\s+777\b', 'CommandGuard', 'MED'),
        (r'\bsudo\b', 'CommandGuard', 'MED'),
        (r'\bcurl\b.*\|\s*bash', 'CommandGuard', 'HIGH'),
    ]

    # ── PathWatch 敏感路徑
    PATH_PATTERNS = [
        (r'/etc/shadow', 'PathWatch', 'HIGH'),
        (r'/etc/passwd', 'PathWatch', 'MED'),
        (r'\.ssh/', 'PathWatch', 'HIGH'),
        (r'\.env\b', 'PathWatch', 'MED'),
    ]

    SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'}
    SCAN_EXTS = {'.py', '.sh', '.js', '.ts', '.env', '.yaml', '.yml', '.json', '.md', '.txt', '.bash'}

    def scan(self, root: Path) -> None:
        for path in root.rglob('*'):
            if any(skip in path.parts for skip in self.SKIP_DIRS):
                continue
            if not path.is_file():
                continue
            if path.suffix not in self.SCAN_EXTS and path.name not in {'.env', '.bashrc', '.zshrc'}:
                continue
            try:
                self._scan_file(path)
            except (UnicodeDecodeError, PermissionError):
                pass

    def _scan_file(self, path: Path) -> None:
        text = path.read_text(encoding='utf-8', errors='ignore')
        for i, line in enumerate(text.splitlines(), 1):
            for pattern, rule, severity in self.LEAK_PATTERNS + self.COMMAND_PATTERNS + self.PATH_PATTERNS:
                if re.search(pattern, line):
                    self.findings.append(Finding(
                        file=str(path),
                        line=i,
                        rule=rule,
                        severity=severity,
                        detail=line.strip()[:120],
                    ))

    def report(self) -> None:
        if not self.findings:
            print("✅ 掃描完成，未發現問題。")
            return

        high = [f for f in self.findings if f.severity == 'HIGH']
        med  = [f for f in self.findings if f.severity == 'MED']
        low  = [f for f in self.findings if f.severity == 'LOW']

        print(f"⚠️  共發現 {len(self.findings)} 個問題：HIGH={len(high)} MED={len(med)} LOW={len(low)}\n")
        for f in sorted(self.findings, key=lambda x: ('LOW','MED','HIGH').index(x.severity), reverse=True):
            icon = {'HIGH':'🔴','MED':'🟡','LOW':'🟢'}.get(f.severity,'⚪')
            print(f"{icon} [{f.rule}] {f.file}:{f.line}")
            print(f"   {f.detail}\n")

    def save_report(self, path: str, scanned_dir: str = '.') -> None:
        """把 findings 格式化成 Markdown 報告並寫入指定路徑"""
        scan_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        high = [f for f in self.findings if f.severity == 'HIGH']
        med  = [f for f in self.findings if f.severity == 'MED']
        low  = [f for f in self.findings if f.severity == 'LOW']

        # 依引擎統計
        engine_counts: dict = {}
        for f in self.findings:
            engine_counts[f.rule] = engine_counts.get(f.rule, 0) + 1

        lines = []
        lines.append("# 990 Lite 安全掃描報告\n")
        lines.append(f"- **掃描時間**：{scan_time}")
        lines.append(f"- **掃描目錄**：`{scanned_dir}`")
        lines.append(f"- **總發現數**：{len(self.findings)}（HIGH={len(high)}  MED={len(med)}  LOW={len(low)}）")
        lines.append("")

        # 引擎摘要表
        lines.append("## 各引擎發現數量摘要\n")
        lines.append("| 引擎 | 發現數 |")
        lines.append("|------|--------|")
        if engine_counts:
            for engine, count in sorted(engine_counts.items(), key=lambda x: -x[1]):
                lines.append(f"| {engine} | {count} |")
        else:
            lines.append("| — | 0 |")
        lines.append("")

        # 詳細問題清單
        lines.append("## 詳細問題清單\n")
        if not self.findings:
            lines.append("_未發現問題。_")
        else:
            lines.append("| 嚴重度 | 引擎 | 檔案 | 行號 | 描述 |")
            lines.append("|--------|------|------|------|------|")
            for f in sorted(self.findings, key=lambda x: ('LOW', 'MED', 'HIGH').index(x.severity), reverse=True):
                severity_label = {'HIGH': '🔴 HIGH', 'MED': '🟡 MED', 'LOW': '🟢 LOW'}.get(f.severity, f.severity)
                detail_escaped = f.detail.replace('|', '\\|')
                lines.append(f"| {severity_label} | {f.rule} | `{f.file}` | {f.line} | {detail_escaped} |")
        lines.append("")
        lines.append("---")
        lines.append("_由 990 Lite 自動產生_")

        report_text = "\n".join(lines) + "\n"
        Path(path).write_text(report_text, encoding='utf-8')
        print(f"📄 報告已儲存至 {path}")
