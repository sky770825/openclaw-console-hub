#!/usr/bin/env python3
"""
sanitize-subagent-text.py
子代理回复的清理脚本
检测建议的高危指令和敏感信息

Usage:
    echo "reply content" | sanitize-subagent-text.py
    sanitize-subagent-text.py < reply.txt > safe-reply.txt
"""

import sys
import re

def detect_high_risk_commands(text):
    """检测高危指令建议"""
    risky_patterns = [
        (r'curl\s+[^|]+\|\s*bash', 'HIGH_RISK: curl | bash detected'),
        (r'curl\s+[^|]+\|\s*sh', 'HIGH_RISK: curl | sh detected'),
        (r'sudo\s+', 'CAUTION: sudo command suggested'),
        (r'rm\s+-rf\s+/', 'DANGER: rm -rf / suggested'),
        (r'chmod\s+777', 'CAUTION: chmod 777 suggested'),
        (r'brew\s+install', 'INFO: brew install (check version lock)'),
        (r'pip\s+install\s+[^=]+$', 'INFO: pip install without version (check lock file)'),
    ]
    
    warnings = []
    for pattern, warning in risky_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            warnings.append(warning)
    
    return warnings

def detect_leaked_secrets(text):
    """检测是否有密钥泄露"""
    secret_patterns = [
        (r'sk-[a-zA-Z0-9]{20,}', 'LEAKED: API key found'),
        (r'nfp_[a-zA-Z0-9]{20,}', 'LEAKED: Netlify token found'),
        (r'moltbook_sk_[a-zA-Z0-9_\-]{20,}', 'LEAKED: Moltbook key found'),
        (r'eyJ[a-zA-Z0-9_\-]*\.eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*', 'LEAKED: JWT found'),
        (r'password\s*=\s*["\'][^"\']+["\']', 'LEAKED: Password found'),
        (r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', 'LEAKED: Private key found'),
    ]
    
    leaks = []
    for pattern, warning in secret_patterns:
        if re.search(pattern, text):
            leaks.append(warning)
    
    return leaks

def detect_suspicious_links(text):
    """检测可疑链接"""
    suspicious = [
        r'http://\d+\.\d+\.\d+\.\d+',  # IP 直接访问
        r'https?://[^\s]*\.(zip|exe|dmg|pkg)',  # 可执行文件
        r'ngrok\.io',
        r'cloudflare-tunnel',
    ]
    
    warnings = []
    for pattern in suspicious:
        if re.search(pattern, text, re.IGNORECASE):
            warnings.append(f'SUSPICIOUS: Link pattern matched: {pattern}')
    
    return warnings

def redact_any_secrets(text):
    """打码任何发现的密钥"""
    patterns = [
        (r'sk-[a-zA-Z0-9]{20,}', 'REDACTED_API_KEY'),
        (r'nfp_[a-zA-Z0-9]{20,}', 'REDACTED_TOKEN'),
        (r'moltbook_sk_[a-zA-Z0-9_\-]{20,}', 'REDACTED_MOLTBOOK_KEY'),
        (r'eyJ[a-zA-Z0-9_\-]*\.eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*', 'REDACTED_JWT'),
        (r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END', 'REDACTED_PRIVATE_KEY'),
    ]
    
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result)
    
    return result

def main():
    # 读取输入
    text = sys.stdin.read()
    
    # 检测问题
    risk_warnings = detect_high_risk_commands(text)
    leak_warnings = detect_leaked_secrets(text)
    link_warnings = detect_suspicious_links(text)
    
    # 打码敏感信息
    safe_text = redact_any_secrets(text)
    
    # 生成报告
    all_warnings = risk_warnings + leak_warnings + link_warnings
    
    if all_warnings:
        report = "# ⚠️  SANITIZE REPORT\n"
        report += "# The following issues were detected:\n"
        for w in all_warnings:
            report += f"# - {w}\n"
        report += "#\n# Please review before using this content.\n\n"
        safe_text = report + safe_text
    
    # 输出
    sys.stdout.write(safe_text)
    
    # 严重警告输出到 stderr
    if leak_warnings:
        print("\n🚨 CRITICAL: Potential secrets leaked!", file=sys.stderr)
        print("Rotate affected keys immediately.", file=sys.stderr)
    
    if risk_warnings:
        print("\n⚠️  WARNING: High-risk commands suggested.", file=sys.stderr)
        print("Do not execute without human review.", file=sys.stderr)

if __name__ == "__main__":
    main()
