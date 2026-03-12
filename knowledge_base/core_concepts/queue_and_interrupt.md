# OpenClaw Core Concepts: The Queue & Interrupt Protocol
**Version:** 2026.2.24
**Status:** Verified via deep doc-scan.

This document describes the native OpenClaw mechanism for achieving real-time, interruptible agent behavior.

## The Core Concept: The Message Queue

OpenClaw has a built-in message queue that intelligently handles new user messages that arrive while the agent is already busy with a task. The behavior of this queue is controlled by "queue modes".

## The Key to Real-time: `interrupt` Mode

The `interrupt` mode is the key to the "Hermes Protocol" and achieving a truly responsive user experience.

**How it works:**
1.  The session is set to `interrupt` mode via the `/queue interrupt` command.
2.  The agent starts a long-running task (e.g., a 30-second `web_search`).
3.  The user sends a new message (e.g., "Stop" or a new question).
4.  The OpenClaw gateway **immediately aborts** the agent's active run. Any in-progress tool calls are terminated.
5.  The new user message is processed as the highest priority.

This allows the user to have full control over the agent's attention, preventing them from being "locked out" by a long task.

## How to Activate

To activate this mode for the current session, the agent (or user) must send the following command as a standalone message:

```
/queue interrupt
```

## Other Modes

*   **`collect` (default):** Coalesce all new messages into a single "follow-up" turn after the current one finishes.
*   **`followup`:** Enqueue each new message to be processed sequentially after the current turn.
*   **`steer`:** Inject new messages directly into the *current* run (for agents designed to handle this).

For our goal of creating a "conscious" and instantly-responsive agent, `interrupt` is the correct and primary mode of operation.
