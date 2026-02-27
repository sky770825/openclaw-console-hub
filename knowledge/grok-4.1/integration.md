# OpenClaw Integration for Grok 4.1

## Setup
- Set `model=xai/grok-4-1-fast` in runtime/config
- OpenRouter API key for access

## Example Prompts
```
For reasoning: \"Step-by-step solve this math: ...\"
For agents: Use with browser/exec tools
```

## Routing
In AGENTS.md: Route coding/reasoning to L? Grok

Test: exec 'openclaw session model=xai/grok-4-1-fast'