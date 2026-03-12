#!/usr/bin/env python3
import sys
import re
import json

class SecurityGateway:
    """
    Clawhub Security Gateway
    Provides input sanitization and virtual patching for skills.
    """
    def __init__(self):
        self.blocked_patterns = [
            r";\s*rm\s+-rf",
            r"\|\s*bash",
            r">\s*/etc/",
            r"\$\(.*\)",
            r"`.*`",
            r"eval\(",
            r"__import__\(",
            r"os\.system\("
        ]

    def sanitize_input(self, data):
        """Sanitize strings for common injection patterns."""
        if isinstance(data, str):
            for pattern in self.blocked_patterns:
                if re.search(pattern, data, re.IGNORECASE):
                    raise ValueError(f"Security Violation: Potential injection detected in input: {pattern}")
            return data
        elif isinstance(data, dict):
            return {k: self.sanitize_input(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_input(i) for i in data]
        return data

    def validate_skill_request(self, payload_json):
        try:
            payload = json.loads(payload_json)
            sanitized = self.sanitize_input(payload)
            return json.dumps({"status": "safe", "data": sanitized})
        except Exception as e:
            return json.dumps({"status": "blocked", "reason": str(e)})

if __name__ == "__main__":
    gateway = SecurityGateway()
    if len(sys.argv) > 1:
        print(gateway.validate_skill_request(sys.argv[1]))
    else:
        print("Usage: python3 clawhub_security_gateway.py '<json_payload>'")
