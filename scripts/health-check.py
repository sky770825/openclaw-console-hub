#!/usr/bin/env python3
"""
網站健診腳本
任務：P3 網站健診 — 建立 health-check.py
位置：/Users/sky770825/openclaw任務面版設計/scripts/health-check.py

功能：
1. 載入時間測試
2. SSL 憑證檢查
3. HTTP headers 安全性檢查
4. robots.txt 檢查
5. sitemap 檢查

輸出：JSON 報告 + 純文字摘要
範例：python3 health-check.py https://example.com
"""

import sys
import json
import ssl
import socket
import time
import urllib.request
import urllib.error
from datetime import datetime
from urllib.parse import urlparse


def check_load_time(url: str, timeout: int = 30) -> dict:
    """測試網站載入時間"""
    try:
        start_time = time.time()
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'NEUXA-HealthCheck/1.0'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response.read()
            end_time = time.time()
            load_time = round(end_time - start_time, 2)
            
            return {
                "status": "ok",
                "load_time_seconds": load_time,
                "status_code": response.getcode(),
                "size_bytes": len(response.read()) if response.readable() else 0,
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


def check_ssl_certificate(hostname: str, port: int = 443) -> dict:
    """檢查 SSL 憑證"""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                version = ssock.version()
                
                # 解析憑證到期日
                not_after = cert.get('notAfter', '')
                not_before = cert.get('notBefore', '')
                
                # 計算剩餘天數
                expiry_date = ssl.cert_time_to_seconds(not_after)
                days_until_expiry = int((expiry_date - time.time()) / 86400)
                
                return {
                    "status": "ok",
                    "valid": True,
                    "issuer": cert.get('issuer', []),
                    "subject": cert.get('subject', []),
                    "not_before": not_before,
                    "not_after": not_after,
                    "days_until_expiry": days_until_expiry,
                    "ssl_version": version,
                    "cipher": cipher[0] if cipher else "unknown",
                }
    except ssl.SSLError as e:
        return {
            "status": "error",
            "valid": False,
            "error": f"SSL Error: {str(e)}",
        }
    except Exception as e:
        return {
            "status": "error",
            "valid": False,
            "error": str(e),
        }


def check_security_headers(url: str) -> dict:
    """檢查 HTTP 安全性 headers"""
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'NEUXA-HealthCheck/1.0'},
            method='HEAD'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            headers = dict(response.headers)
            
            # 檢查關鍵安全 headers
            security_headers = {
                "Strict-Transport-Security": headers.get('Strict-Transport-Security', 'MISSING'),
                "Content-Security-Policy": headers.get('Content-Security-Policy', 'MISSING'),
                "X-Frame-Options": headers.get('X-Frame-Options', 'MISSING'),
                "X-Content-Type-Options": headers.get('X-Content-Type-Options', 'MISSING'),
                "Referrer-Policy": headers.get('Referrer-Policy', 'MISSING'),
                "Permissions-Policy": headers.get('Permissions-Policy', 'MISSING'),
            }
            
            score = sum(1 for v in security_headers.values() if v != 'MISSING')
            
            return {
                "status": "ok",
                "security_score": f"{score}/6",
                "headers": security_headers,
                "all_headers": {k: v for k, v in headers.items()},
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


def check_robots_txt(base_url: str) -> dict:
    """檢查 robots.txt"""
    try:
        robots_url = f"{base_url}/robots.txt"
        req = urllib.request.Request(
            robots_url,
            headers={'User-Agent': 'NEUXA-HealthCheck/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read().decode('utf-8', errors='ignore')
            lines = content.strip().split('\n')
            
            return {
                "status": "ok",
                "exists": True,
                "url": robots_url,
                "line_count": len(lines),
                "has_sitemap": any('Sitemap:' in line for line in lines),
                "content_preview": '\n'.join(lines[:10]),
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {
                "status": "warning",
                "exists": False,
                "url": robots_url,
                "message": "robots.txt not found (404)",
            }
        return {
            "status": "error",
            "error": str(e),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


def check_sitemap(base_url: str) -> dict:
    """檢查 sitemap.xml"""
    sitemap_urls = [
        f"{base_url}/sitemap.xml",
        f"{base_url}/sitemap_index.xml",
    ]
    
    for sitemap_url in sitemap_urls:
        try:
            req = urllib.request.Request(
                sitemap_url,
                headers={'User-Agent': 'NEUXA-HealthCheck/1.0'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8', errors='ignore')
                
                # 簡單計算 URL 數量
                url_count = content.count('<url>') + content.count('<sitemap>')
                
                return {
                    "status": "ok",
                    "exists": True,
                    "url": sitemap_url,
                    "url_count": url_count,
                    "size_bytes": len(content),
                    "content_preview": content[:500] if len(content) > 500 else content,
                }
        except urllib.error.HTTPError as e:
            if e.code == 404:
                continue
            return {
                "status": "error",
                "url": sitemap_url,
                "error": str(e),
            }
        except Exception as e:
            return {
                "status": "error",
                "url": sitemap_url,
                "error": str(e),
            }
    
    return {
        "status": "warning",
        "exists": False,
        "message": "Sitemap not found at common locations",
    }


def generate_summary(report: dict) -> str:
    """生成純文字摘要"""
    url = report.get('url', 'unknown')
    timestamp = report.get('timestamp', datetime.now().isoformat())
    
    summary = f"""
╔══════════════════════════════════════════════════════════════╗
║                  網站健診報告                                  ║
╚══════════════════════════════════════════════════════════════╝

🌐 目標網站：{url}
🕐 檢查時間：{timestamp}

────────────────────────────────────────────────────────────────

📊 載入時間測試
   狀態：{report['load_time']['status']}
   {f"⏱️  載入時間：{report['load_time'].get('load_time_seconds', 'N/A')} 秒" if report['load_time']['status'] == 'ok' else f"❌ 錯誤：{report['load_time'].get('error', 'Unknown')}"}

🔒 SSL 憑證檢查
   狀態：{report['ssl_certificate']['status']}
   {f"✅ 有效：還有 {report['ssl_certificate'].get('days_until_expiry', 'N/A')} 天到期" if report['ssl_certificate'].get('valid') else f"❌ 錯誤：{report['ssl_certificate'].get('error', 'Invalid')}"}

🛡️ HTTP Headers 安全性
   狀態：{report['security_headers']['status']}
   安全評分：{report['security_headers'].get('security_score', 'N/A')}
   {f"⚠️  缺少 headers：{', '.join([k for k, v in report['security_headers'].get('headers', {}).items() if v == 'MISSING'])}" if report['security_headers']['status'] == 'ok' else ''}

🤖 robots.txt 檢查
   狀態：{report['robots_txt']['status']}
   {f"✅ 存在：{report['robots_txt'].get('line_count', 0)} 行" if report['robots_txt'].get('exists') else f"⚠️  不存在：{report['robots_txt'].get('message', '')}"}

🗺️ Sitemap 檢查
   狀態：{report['sitemap']['status']}
   {f"✅ 存在：{report['sitemap'].get('url_count', 0)} 個 URL" if report['sitemap'].get('exists') else f"⚠️  不存在：{report['sitemap'].get('message', '')}"}

────────────────────────────────────────────────────────────────

💡 建議：
{generate_recommendations(report)}

════════════════════════════════════════════════════════════════
報告生成時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
════════════════════════════════════════════════════════════════
"""
    return summary.strip()


def generate_recommendations(report: dict) -> str:
    """生成建議"""
    recommendations = []
    
    # 載入時間建議
    if report['load_time']['status'] == 'ok':
        load_time = report['load_time'].get('load_time_seconds', 0)
        if load_time > 3:
            recommendations.append(f"   ⚠️  載入時間較慢（{load_time}s），建議優化網站效能")
        else:
            recommendations.append(f"   ✅ 載入時間良好（{load_time}s）")
    
    # SSL 建議
    if report['ssl_certificate']['status'] == 'ok':
        days = report['ssl_certificate'].get('days_until_expiry', 999)
        if days < 30:
            recommendations.append(f"   ⚠️  SSL 憑證即將到期（剩 {days} 天），請盡快續約")
        else:
            recommendations.append(f"   ✅ SSL 憑證正常（剩 {days} 天）")
    
    # Headers 建議
    if report['security_headers']['status'] == 'ok':
        score = report['security_headers'].get('security_score', '0/6')
        if score != '6/6':
            missing = [k for k, v in report['security_headers'].get('headers', {}).items() if v == 'MISSING']
            recommendations.append(f"   ⚠️  缺少安全 headers：{', '.join(missing)}")
        else:
            recommendations.append(f"   ✅ 所有安全 headers 已配置")
    
    # robots.txt 建議
    if not report['robots_txt'].get('exists'):
        recommendations.append(f"   ⚠️  建議添加 robots.txt 以改善 SEO")
    
    # sitemap 建議
    if not report['sitemap'].get('exists'):
        recommendations.append(f"   ⚠️  建議添加 sitemap.xml 以改善 SEO")
    
    return '\n'.join(recommendations) if recommendations else "   ✅ 一切正常！"


def main():
    if len(sys.argv) < 2:
        print("使用方法: python3 health-check.py <URL>")
        print("範例: python3 health-check.py https://example.com")
        sys.exit(1)
    
    url = sys.argv[1]
    
    # 確保 URL 有協議
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    parsed = urlparse(url)
    hostname = parsed.hostname
    
    print(f"🔍 開始檢查：{url}")
    print("這可能需要幾秒鐘...\n")
    
    # 執行所有檢查
    report = {
        "url": url,
        "hostname": hostname,
        "timestamp": datetime.now().isoformat(),
        "load_time": check_load_time(url),
        "ssl_certificate": check_ssl_certificate(hostname) if parsed.scheme == 'https' else {"status": "skipped", "reason": "Not HTTPS"},
        "security_headers": check_security_headers(url),
        "robots_txt": check_robots_txt(f"{parsed.scheme}://{hostname}"),
        "sitemap": check_sitemap(f"{parsed.scheme}://{hostname}"),
    }
    
    # 儲存 JSON 報告
    json_filename = f"health-report-{hostname}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # 輸出純文字摘要
    summary = generate_summary(report)
    print(summary)
    
    print(f"\n📄 JSON 報告已儲存：{json_filename}")


if __name__ == "__main__":
    main()
