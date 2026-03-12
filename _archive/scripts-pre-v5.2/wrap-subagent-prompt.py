#!/usr/bin/env python3
"""
wrap-subagent-prompt.py
发送给子代理前的安全过滤脚本
自动检测并打码敏感信息

Usage:
    echo "your prompt" | wrap-subagent-prompt.py
    wrap-subagent-prompt.py < prompt.txt > safe-prompt.txt
"""

import sys
import re

def redact_sensitive(text):
    """检测并替换敏感信息"""
    
    # API Keys / Tokens
    patterns = [
        # OpenAI style
        (r'sk-[a-zA-Z0-9]{20,}', 'REDACTED_API_KEY'),
        # Netlify style
        (r'nfp_[a-zA-Z0-9]{20,}', 'REDACTED_DEPLOY_TOKEN'),
        # Moltbook style
        (r'moltbook_sk_[a-zA-Z0-9_\-]{20,}', 'REDACTED_MOLTBOOK_KEY'),
        # JWT
        (r'eyJ[a-zA-Z0-9_\-]*\.eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*', 'REDACTED_JWT'),
        # Bearer token
        (r'Bearer\s+[a-zA-Z0-9_\-\.]+', 'Bearer REDACTED'),
        # IP 地址
        (r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', 'REDACTED_IP'),
        # 本地路径
        (r'/Users/[^/\s]+', 'REDACTED_HOME'),
        # .env 内容
        (r'^[A-Z_]+=[^\s]+$', '[REDACTED_ENV_VAR]', re.MULTILINE),
        # Password/Secret
        (r'(password|secret|key|token)\s*=\s*["\'][^"\']+["\']', r'\1=REDACTED', re.IGNORECASE),
    ]
    
    result = text
    for pattern in patterns:
        if len(pattern) == 3:
            result = re.sub(pattern[0], pattern[1], result, flags=pattern[2])
        else:
            result = re.sub(pattern[0], pattern[1], result)
    
    return result

def add_security_header(text):
    """添加安全提醒头部"""
    header = """# Security Notice
# This prompt has been filtered for sensitive information.
# REDACTED items were removed for security.
# 

"""
    return header + text

def main():
    # 读取输入
    text = sys.stdin.read()
    
    # 打码敏感信息
    safe_text = redact_sensitive(text)
    
    # 添加安全头部
    final_text = add_security_header(safe_text)
    
    # 输出
    sys.stdout.write(final_text)
    
    # 如果有替换，输出警告到 stderr
    if safe_text != text:
        print("\n⚠️  WARNING: Sensitive information was REDACTED", file=sys.stderr)
        print("Please review before sending to external AI.", file=sys.stderr)

if __name__ == "__main__":
    main()
