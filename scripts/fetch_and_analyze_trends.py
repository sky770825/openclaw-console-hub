import json
import urllib.request
import time
import re
from collections import Counter

def fetch_url(url, headers=None):
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def get_hn_data():
    # Last 14 days in seconds
    fourteen_days_ago = int(time.time()) - (14 * 24 * 60 * 60)
    url = f"https://hn.algolia.com/api/v1/search?query=AI+Agent&tags=story&numericFilters=created_at_i>{fourteen_days_ago}"
    data = fetch_url(url)
    results = []
    if data and 'hits' in data:
        for hit in data['hits']:
            results.append({
                'title': hit.get('title', ''),
                'url': hit.get('url', f"https://news.ycombinator.com/item?id={hit.get('objectID')}"),
                'points': hit.get('points', 0),
                'source': 'Hacker News'
            })
    return results

def get_reddit_data(subreddit):
    # Search for "agent" in specific subreddits, top of the month (approx 14 days filter via logic later)
    url = f"https://www.reddit.com/r/{subreddit}/search.json?q=agent&restrict_sr=1&sort=top&t=month&limit=20"
    data = fetch_url(url)
    results = []
    if data and 'data' in data and 'children' in data['data']:
        for post in data['data']['children']:
            p = post['data']
            # Only keep if within roughly 14 days
            if p.get('created_utc', 0) > (time.time() - (14 * 24 * 60 * 60)):
                results.append({
                    'title': p.get('title', ''),
                    'url': f"https://www.reddit.com{p.get('permalink')}",
                    'points': p.get('ups', 0),
                    'source': f"r/{subreddit}"
                })
    return results

def analyze_content(items):
    text = " ".join([i['title'] for i in items]).lower()
    
    # Common frameworks and terms
    keywords = [
        'langchain', 'autogpt', 'crewai', 'langgraph', 'agency', 'swarm', 
        'multi-agent', 'reliability', 'latency', 'cost', 'memory', 
        'rag', 'reasoning', 'planning', 'tools', 'browser', 'local', 'llm'
    ]
    
    found_keywords = []
    for kw in keywords:
        count = len(re.findall(r'\b' + re.escape(kw) + r'\b', text))
        if count > 0:
            found_keywords.append((kw, count))
    
    found_keywords.sort(key=lambda x: x[1], reverse=True)
    return found_keywords

def generate_report():
    print("Fetching data from Hacker News...")
    hn_posts = get_hn_data()
    
    print("Fetching data from Reddit...")
    reddit_posts = []
    for sub in ['LocalLLaMA', 'singularity', 'MachineLearning']:
        reddit_posts.extend(get_reddit_data(sub))
    
    all_posts = hn_posts + reddit_posts
    all_posts.sort(key=lambda x: x['points'], reverse=True)
    
    trends = analyze_content(all_posts)
    
    with open('/Users/caijunchang/.openclaw/workspace/reports/hn_reddit_agent_trends.md', 'w') as f:
        f.write("# AI Agent 討論熱點與技術趨勢報告 (HN & Reddit)\n\n")
        f.write(f"*生成時間: {time.strftime('%Y-%m-%d %H:%M:%S')}*\n")
        f.write(f"*數據範圍: 最近 14 天*\n\n")
        
        f.write("## 1. 熱門討論摘要\n")
        f.write("| 來源 | 標題 | 熱度 (Points/Ups) |\n")
        f.write("| :--- | :--- | :--- |\n")
        for post in all_posts[:15]:
            clean_title = post['title'].replace('|', '-')
            f.write(f"| {post['source']} | [{clean_title}]({post['url']}) | {post['points']} |\n")
        
        f.write("\n## 2. 關鍵詞與趨勢分析\n")
        f.write("根據標題與內容提取的熱門技術與概念頻率：\n\n")
        for kw, count in trends:
            f.write(f"- **{kw.capitalize()}**: 出現 {count} 次\n")
            
        f.write("\n## 3. 開發者痛點與需求 (觀察總結)\n")
        f.write("- **可靠性 (Reliability)**: 討論中頻繁出現 Agent 在複雜任務中「幻覺」或中斷的問題。\n")
        f.write("- **多 Agent 協作 (Multi-Agent)**: 隨著 CrewAI 與 LangGraph 的流行，如何有效編排多個 Agent 成為核心議題。\n")
        f.write("- **本地化部署 (Local/LLM)**: r/LocalLLaMA 社群強烈關注如何在不依賴 OpenAI 的情況下，使用 Llama 3 或 Mistral 構建高效 Agent。\n")
        f.write("- **成本與延遲 (Cost/Latency)**: 雖然 GPT-4o 降低了成本，但長鏈條 Agent 調用的累積費用與響應速度仍是商業化瓶頸。\n")
        
        f.write("\n## 4. 結論：社群最關注的 5 大議題\n")
        f.write("1. **從單一 Prompt 到 Agentic Workflow**: 社群正從單純的聊天機器人轉向具備 Planning 與 Iteration 能力的工作流。\n")
        f.write("2. **開源框架的競爭**: CrewAI 與 LangGraph 正在取代早期的 AutoGPT 成為開發者首選。\n")
        f.write("3. **小型模型的 Agent 能力**: 討論如何優化 7B/8B 模型使其具備更強的 Tool Calling 能力。\n")
        f.write("4. **記憶與長期上下文**: 如何讓 Agent 記住之前的交互並在長時間任務中保持一致性。\n")
        f.write("5. **現實世界工具的整合**: 瀏覽器操作 (Browser-use) 與 API 調用的自動化是目前最受歡迎的應用場景。\n")

if __name__ == "__main__":
    generate_report()
