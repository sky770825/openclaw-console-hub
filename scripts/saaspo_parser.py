import sys
import urllib.request
from html.parser import HTMLParser
import json

class SaaspoParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.in_title = False
        self.tags = []
        self.content_snippets = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            attr_dict = dict(attrs)
            if attr_dict.get("name") == "description":
                self.description = attr_dict.get("content", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title = data.strip()
        elif len(data.strip()) > 40:
            self.content_snippets.append(data.strip())

def scrape(url):
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
            parser = SaaspoParser()
            parser.feed(html)
            return {
                "title": parser.title,
                "description": parser.description,
                "snippets": parser.content_snippets[:15]
            }
    except Exception as e:
        print(f"Error during scraping: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    url = sys.argv[1]
    data = scrape(url)
    if data:
        print(json.dumps(data, indent=2))
    else:
        sys.exit(1)
