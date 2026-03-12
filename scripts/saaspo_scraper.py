import urllib.request
import re
import sys
from html.parser import HTMLParser

class ContentExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.content = []
        self.in_script_or_style = False

    def handle_starttag(self, tag, attrs):
        if tag in ["script", "style"]:
            self.in_script_or_style = True

    def handle_endtag(self, tag):
        if tag in ["script", "style"]:
            self.in_script_or_style = False

    def handle_data(self, data):
        if not self.in_script_or_style:
            text = data.strip()
            if text:
                self.content.append(text)

    def get_text(self):
        return "\n".join(self.content)

def scrape(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html_data = response.read().decode('utf-8')
            
            # Extract Title
            title_match = re.search(r'<title>(.*?)</title>', html_data, re.IGNORECASE)
            title = title_match.group(1) if title_match else "SaaS Landing Page Inspiration"
            
            parser = ContentExtractor()
            parser.feed(html_data)
            text_content = parser.get_text()
            
            return title, text_content
    except Exception as e:
        return None, str(e)

if __name__ == "__main__":
    target_url = "https://saaspo.com"
    title, content = scrape(target_url)
    if title:
        print(f"TITLE: {title}")
        print("---CONTENT---")
        print(content)
    else:
        print(f"FAILED: {content}")
        sys.exit(1)
