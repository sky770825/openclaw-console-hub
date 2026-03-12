# Core Tools SOP (Standard Operating Procedure)

## 1. Scalpel (Precision Modification)
- **Usage**: Use when exact code changes are needed without affecting the whole file.
- **Script**: `scripts/scalpel_tool.sh [target] [search] [replace] [output]`
- **Constraint**: Never target project source directly; output to workspace.

## 2. Browser (Dynamic Browsing)
- **Usage**: Explore directory structures and preview file contents.
- **Script**: `scripts/browser_tool.sh [path]`

## 3. Code Map (Structural Analysis)
- **Usage**: Understand project architecture and identify key components/functions.
- **Script**: `scripts/codemap_tool.sh [directory]`

## 4. Interactive Terminal
- **Usage**: Run commands with automatic logging to `sandbox/terminal_history.log`.
- **Script**: `scripts/terminal_tool.sh [command]`

## 5. Visual Feedback
- **Usage**: Format raw output into a readable report structure.
- **Script**: `scripts/visual_feedback_tool.sh [file]`
