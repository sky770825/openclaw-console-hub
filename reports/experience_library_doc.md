# Experience Library Documentation

## Overview
This tool abstracts the "Fingerprint + Experience" pattern. It allows any script to store successful execution patterns (experiences) and retrieve them later using a hash-based lookup, reducing the need for expensive re-computation or AI calls.

## Location
- Library: `/Users/sky770825/.openclaw/workspace/scripts/lib_experience.sh`
- Database Dir: `/Users/sky770825/.openclaw/workspace/knowledge/experience_db`

## API Reference

### `exp_init <db_name>`
Initializes a JSON database file in the knowledge workspace.

### `exp_fingerprint <string>`
Generates a unique SHA256 hash for the input string. Useful for creating keys for tasks or code blocks.

### `exp_lookup <fingerprint>`
Retrieves stored JSON experience for a fingerprint. Returns non-zero if not found.

### `exp_record <fingerprint> <json_data>`
Stores or updates an experience. Automatically manages timestamps and hit counts.

### `exp_smart_run <task> <cmd>`
Higher-level wrapper that checks if a task has been done before. If yes, it runs the cached solution; if no, it runs the command and saves it.

## Example Usage
```bash
source "/Users/sky770825/.openclaw/workspace/scripts/lib_experience.sh"
exp_init "my_tool_cache"
exp_smart_run "Generate report" "./run_complex_analysis.sh"
```
