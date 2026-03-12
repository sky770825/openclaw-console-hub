# Clawhub User Manual
## Introduction
Clawhub allows the AI executor to utilize various "Skills" to interact with the environment.

## How to use Skills
Skills are triggered automatically by the AI when a task requires specific functionality (e.g., searching the web, reading files).

## Available Functions
1. **File Management**: Create, read, and list files in your workspace.
2. **Web Search**: Retrieve real-time information from the internet.
3. **Code Execution**: Run Python or Bash scripts safely.
4. **Task Planning**: Decompose complex tasks into actionable steps.

## Troubleshooting
If a skill fails, use the health check script:
`bash /Users/caijunchang/.openclaw/workspace/scripts/skill_health_check.sh`
