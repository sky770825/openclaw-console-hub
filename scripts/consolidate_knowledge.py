#!/usr/bin/env python3
"""
RAG 定時更新：掃描 docs/，整合為 knowledge_auto.md
供 ollama_bot2 載入。嚴格控制總大小，避免 context 過長拖慢回覆。
"""

import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
DOCS_DIR = PROJECT / "docs"
KNOWLEDGE_DIR = PROJECT / "knowledge"
OUTPUT = KNOWLEDGE_DIR / "knowledge_auto.md"
MAX_LINES_PER_FILE = 5  # 每個 doc 最多幾行
MAX_TOTAL_CHARS = 6000  # 總輸出上限（約 3K tokens），避免拖慢 Ollama
PRIORITY_KEYWORDS = ("任務板", "Ollama", "ollama", "OpenClaw", "bot", "Bot", "檢查", "排查")


def _score_file(name: str) -> int:
    """優先納入含關鍵字的 doc。"""
    for kw in PRIORITY_KEYWORDS:
        if kw in name:
            return 1
    return 0


def _extract_key_content(path: Path) -> str:
    """從 md 檔萃取標題與前幾行。"""
    try:
        text = path.read_text(encoding="utf-8").strip()
    except Exception:
        return ""
    lines = text.splitlines()
    out = []
    for i, line in enumerate(lines):
        if i >= MAX_LINES_PER_FILE:
            break
        s = line.strip()
        if s and not s.startswith("```"):
            out.append(line)
    return "\n".join(out).strip()


def main() -> int:
    KNOWLEDGE_DIR.mkdir(exist_ok=True)
    header = "# 知識庫自動整合\n\n以下來自 docs/ 摘要。\n\n---\n\n"
    total = len(header)
    parts = [header]
    # 優先處理含關鍵字的檔，再處理其餘
    files = sorted(DOCS_DIR.glob("*.md")) if DOCS_DIR.exists() else []
    files.sort(key=lambda f: (1 - _score_file(f.stem), f.stem))
    for f in files:
        if total >= MAX_TOTAL_CHARS:
            break
        content = _extract_key_content(f)
        if not content:
            continue
        block = f"## {f.stem}\n\n{content}\n\n---\n\n"
        if total + len(block) > MAX_TOTAL_CHARS:
            block = block[: MAX_TOTAL_CHARS - total - 20] + "\n...(已截斷)\n\n"
        total += len(block)
        parts.append(block)
    result = "".join(parts).strip()
    OUTPUT.write_text(result + "\n", encoding="utf-8")
    print(f"已更新 {OUTPUT} ({len(result)} 字元)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
