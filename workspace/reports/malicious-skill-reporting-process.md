# Process for Reporting Malicious Skills

## 1. Detection Methods:

*   **Automated:** Upon successful implementation of continuous integrity checks (Task E7.2) using tools like `clawsec` or `aegis-scanner`, any detected anomalies (e.g., checksum mismatches, known malicious patterns, unexpected file access) will trigger an alert.
*   **Manual:** If, during my operations or through external information, I identify a skill that appears suspicious or behaves maliciously, I will initiate a manual review.

## 2. Information Gathering for Report:

When a malicious skill is suspected or detected, the following information will be gathered:

*   **Skill Name:** The exact name of the skill as it appears in OpenClaw.
*   **Source:** The origin of the skill (e.g., ClawHub URL, repository).
*   **Observed Behavior:** Detailed description of the suspicious or malicious activity observed.
*   **Relevant Logs/Reports:** Any logs, error messages, or scan reports that support the suspicion (e.g., output from `aegis-scanner` if implemented).
*   **Timestamp of Detection:** When the suspicious activity was observed.

## 3. Reporting Procedure:

Once the necessary information is gathered:

1.  **Structured Message:** I will compose a structured message to 老蔡, including all gathered information.
2.  **Task Creation:** I will create a task in the task board (if the API is available for this) for 老蔡 to review the flagged skill, assigning it a high priority.
3.  **Immediate Action (if applicable):** If a skill is confirmed as actively malicious and poses an immediate threat, I will flag it for immediate disabling and alert 老蔡.

## 4. Escalation:

*   All reports will be directed to 老蔡 for final review and decision-making regarding the skill's status (e.g., disabling, banning from ClawHub if applicable).
*   The process will be iterated upon based on 老蔡's feedback and evolving security threats.
