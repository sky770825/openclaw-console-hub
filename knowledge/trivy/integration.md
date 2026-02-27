# OpenClaw Trivy Integration

## Commands
trivy repo . --format sarif
trivy image node:latest

## Workflow
Pre-commit: exec trivy → LLM fix (Sonnet)

Add to AGENTS red light before push