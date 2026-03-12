# Security Scanner Skill (armory/security-scanner)

## Overview
The `security-scanner` is designed to perform local security audits on project directories. It focuses on dependency vulnerabilities and secret detection.

## Core Features
- **Local Scanning**: Unlike cloud-based tools, this scans files directly on the local filesystem.
- **Dependency Audit**: Integrates with `npm audit` to identify CVEs in Node.js projects.
- **Secret Detection**: Uses pattern matching to find exposed API keys, passwords, and tokens.
- **Report Generation**: Produces a clean, readable text report of all findings.

## Usage
Run the scanner by providing a target directory and an output path:

```bash
/Users/caijunchang/.openclaw/workspace/sandbox/output/security-scanner.sh <target_path> <output_report_path>
```

## Requirements
- `node` / `npm` (for dependency auditing)
- `jq` (for report parsing)
- `grep` (for secret detection)
