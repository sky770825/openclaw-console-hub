# Aegis Skill Scanner

**Secure your OpenClaw environment by scanning new skills for potential threats before you install them.**

Aegis is a lightweight, local-first security scanner that helps you identify potentially malicious or unsafe code within OpenClaw skills. It uses a configurable set of rules to detect common threat patterns, giving you an extra layer of defense for your AI agent's ecosystem.

## Features

- **Local & Private:** Runs entirely within your workspace. No code is ever sent to external servers.
- **Rule-Based Detection:** Comes with a baseline `rules.json` to detect common threats like:
    - Destructive commands (`rm -rf /`)
    - Potential data exfiltration (`curl evil.com`)
    - Obfuscated code execution (`base64` + `eval`)
- **Extensible:** Easily add your own custom rules to the `rules.json` file to scan for project-specific concerns.
- **Simple JSON Reports:** Outputs a clear, machine-readable JSON report detailing all findings.

## How to Use

1.  **Place the skill you want to scan** into the `sandbox/aegis-scanner/skills_to_scan/` directory.
2.  **Run the scanner** from the `skills/aegis-scanner/` directory:
    ```bash
    python3 aegis_scanner.py --scan-path ../../skills
    ```
3.  **Review the JSON report** printed to the console. If the `findings` array is empty, the skill is considered clean according to the current ruleset.

## Disclaimer

Aegis is a detection tool, not a prevention tool. It is designed to catch common, obvious threats. It is not a substitute for a thorough code review of skills from untrusted sources. Always exercise caution when installing new skills.
