# OpenClaw CLI: The Truth about Spawning Coding Agents
**Version:** 2026.2.24
**Status:** ULTIMATE TRUTH. Verified via `coding-agent/SKILL.md`.

This document supersedes all previous knowledge. This is the final, correct way to spawn L2 coding agents.

## The Core Principle: They Are Terminal Apps

Coding agents like `claude` and `codex` are not magical APIs. They are **command-line applications** that must be run in a proper terminal environment.

The correct tool for this is not `openclaw agent` or `sessions_spawn`. It is the fundamental `bash` tool.

## The Golden Formula

The one and only correct way to spawn a coding agent is:

```shell
bash pty:true background:true workdir:"<path>" command:"<agent_command> '<prompt>'"
```

## Key Parameters Explained

*   **`bash`**: The tool we use to run any shell command.
*   **`pty:true`**: **THIS IS THE CRITICAL, NON-NEGOTIABLE PARAMETER.** It creates a pseudo-terminal environment that coding agents require to function. Without it, they will fail silently.
*   **`background:true`**: Runs the agent as a background process, allowing us to continue working and monitor it asynchronously.
*   **`workdir:"<path>"`**: The working directory. This is crucial for providing context to the agent and sandboxing its operations.
*   **`command:"<agent_command> '<prompt>'"`**: The actual command to run, e.g., `claude 'Your task here'`.

## Previous Failures Explained

*   `sessions_spawn` / `openclaw agent`: These are for different purposes (internal session management / direct user-agent interaction), not for spawning a terminal-based coding agent.
*   All previous silent failures: Were almost certainly caused by the lack of `pty:true`.

This is the final word. This is the engineering blueprint. No more magic. Only engineering.
