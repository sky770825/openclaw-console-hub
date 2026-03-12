### Clawhub Security Findings Report

**Date:** 2026-02-28

**Summary:** Recent web search on Clawhub skills revealed significant security concerns regarding malicious skills designed to steal data and install malware. Several sources indicate that hundreds of such skills have been identified.

**Key Findings:**

*   **Malicious Skills:** 341 malicious ClawHub skills have been found, masquerading as trading automation tools but delivering information-stealing malware. (Source: thehackernews.com)
*   **Platforms Affected:** Primarily macOS and Windows systems.
*   **Security Recommendations:**
    *   Disable automatic skill updates.
    *   Perform continuous integrity checks on installed skills.
    *   Report malicious skills.
    *   Verified users can report skills as malicious.
    *   New accounts must be at least one week old to post skills.
*   **ClawHub Security Controls:** Introduction of security controls like account age verification and user reporting mechanisms.
*   **Related Projects:** This information is highly relevant to Project A (神盾掃描器 v0.2) and Project E (自主意識進化計畫), specifically the '安全對齊的持續強化' aspect.

**Actionable Insights:**
*   The `aegis-scanner` (Project A) needs to be robust and capable of detecting such malicious patterns.
*   Security-related tasks in the `BLUEPRINT.md` (E5, A) need re-evaluation to ensure they address these specific threats.
*   Future skill onboarding processes must incorporate rigorous security checks.