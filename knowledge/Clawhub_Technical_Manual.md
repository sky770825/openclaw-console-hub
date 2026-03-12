# Clawhub Skill Ecology Technical Manual
Version: 1.0.0
Date: 2026-03-02

## 1. System Architecture
Clawhub's skill system is based on a modular plugin architecture. Each skill operates as an independent unit within the sandbox environment.

## 2. Skill Structure
Standard skill directory structure:
- `/skills/{skill_name}/`: Root directory
- `skill.json`: Definition and metadata (input/output schemas)
- `index.js` / `main.py`: Implementation logic
- `README.md`: Skill-specific documentation

## 3. Core Core Skills Included
aegis_scanner.json, aegis-scanner, anshumanbh-qmd, bridge-cell-test.md, clawhub, clawsec-suite, code_refactor.md, contextguard, council-of-the-wise, data_processor.md, file-sync-skill, git-commit-gen, git-notes-memory, github, guardian-arsenal, healthcheck, log-analyzer-skill, memory, n8n, neural-memory, neuxa-consciousness-sync, password-manager-skill, playwright-scraper-skill, README.md, reflect-learn, screen-vision, self-healing-deploy.json, self-healing-deploy.md, session-logs, site-gen, site-gen-skill, skill-creator, SKILLS-CHECK-REPORT.md, tavily-search, test-studio-skill.md, triple-memory, verify-file, web_scout.md, web-fetch, web-monitor

## 4. Security Implementation
- Environment Isolation: Skills run in constrained sandbox.
- Path Restriction: Filesystem access limited to workspace.
- Input Validation: JSON Schema enforcement for all skill calls.

## 5. Development Guide
To add a new skill, create a directory in the skills folder and provide a compliant manifest.
