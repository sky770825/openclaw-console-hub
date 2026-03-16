#!/usr/bin/env python3
"""
Generate an n8n workflow JSON that contains no LLM nodes (no token cost).

Usage:
  python3 scripts/make-no-llm-workflow.py docs/n8n/My-workflow.fixed.json docs/n8n/My-workflow.no-llm.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


REMOVE_NODE_NAMES = {
    "OpenAI Chat Model",
    "JSON Schema Parser",
    "Memory Curator AI",
    "Check shouldWrite",
    "No Memory to Write",
}


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])

    w = json.loads(src.read_text(encoding="utf-8"))

    nodes = [n for n in (w.get("nodes") or []) if n.get("name") not in REMOVE_NODE_NAMES]
    by_name = {n.get("name"): n for n in nodes}

    required = [
        "Receive Task Data",
        "Workflow Configuration",
        "Check Duplicate RunId",
        "Is Duplicate?",
        "Prepare Task Body",
        "Create Memory Sync Task",
        "HTTP Success?",
        "Mark RunId as Processed",
        "Duplicate - Skip",
        "Log Error",
    ]
    missing = [x for x in required if x not in by_name]
    if missing:
        raise SystemExit(f"Missing nodes for no-llm workflow: {missing}")

    # Fix dedupe code node if it still contains a typo.
    dedupe = by_name["Check Duplicate RunId"]
    js = (dedupe.get("parameters") or {}).get("jsCode") or ""
    if "getWorkflowStaticData(global)" in js:
        dedupe.setdefault("parameters", {})["jsCode"] = js.replace(
            "getWorkflowStaticData(global)", "getWorkflowStaticData('global')"
        )

    # Prepare Task Body must not reference any LLM output.
    ptb = by_name["Prepare Task Body"]
    assigns = (
        (ptb.get("parameters") or {})
        .get("assignments", {})
        .get("assignments", [])
    )
    for a in assigns:
        if a.get("name") == "description":
            a["value"] = "={{ 'Webhook Body:\\n' + JSON.stringify($json.body || {}, null, 2) }}"

    # Hard guard: no langchain nodes.
    for n in nodes:
        t = str(n.get("type") or "")
        if t.startswith("@n8n/n8n-nodes-langchain"):
            raise SystemExit(f"LLM node still present: {n.get('name')} {t}")

    # Rebuild a minimal, deterministic connection graph.
    con: dict[str, object] = {}
    start_next = "Clamp Payload" if "Clamp Payload" in by_name else "Workflow Configuration"

    con["Receive Task Data"] = {"main": [[{"node": start_next, "type": "main", "index": 0}]]}
    if start_next == "Clamp Payload":
        con["Clamp Payload"] = {
            "main": [[{"node": "Workflow Configuration", "type": "main", "index": 0}]]
        }

    con["Workflow Configuration"] = {
        "main": [[{"node": "Check Duplicate RunId", "type": "main", "index": 0}]]
    }
    con["Check Duplicate RunId"] = {
        "main": [[{"node": "Is Duplicate?", "type": "main", "index": 0}]]
    }
    con["Is Duplicate?"] = {
        "main": [
            [{"node": "Duplicate - Skip", "type": "main", "index": 0}],
            [{"node": "Prepare Task Body", "type": "main", "index": 0}],
        ]
    }
    con["Prepare Task Body"] = {
        "main": [[{"node": "Create Memory Sync Task", "type": "main", "index": 0}]]
    }
    con["Create Memory Sync Task"] = {
        "main": [[{"node": "HTTP Success?", "type": "main", "index": 0}]]
    }
    con["HTTP Success?"] = {
        "main": [
            [{"node": "Mark RunId as Processed", "type": "main", "index": 0}],
            [{"node": "Log Error", "type": "main", "index": 0}],
        ]
    }

    existing = {n.get("name") for n in nodes}
    con = {k: v for k, v in con.items() if k in existing}

    w["nodes"] = nodes
    w["connections"] = con
    w["name"] = "My workflow (No LLM)"
    w["active"] = False

    dst.write_text(json.dumps(w, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

