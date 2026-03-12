#!/usr/bin/env python3
"""
PTT 爬蟲模組
監控指定看板的相關討論
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("警告：requests 或 beautifulsoup4 未安裝")


class PttCrawler:
    """PTT 爬蟲"""
    
    BASE_URL = "https://www.ptt.cc"
    
    # 各業務相關看板
    BOARDS = {
        'real_estate': ['home-sale', 'loan'],
        'beverage': ['Drink', 'Food'],
        'puratex': [
            'home-sale',  # 房屋相關討論
        ]
    }
    
    def __init__(self, data_dir="./data/raw"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session() if REQUESTS_AVAILABLE else None
        
        if self.session:
            # 設定 PTT 年齡確認 cookie
            self.session.cookies.set('over18', '1')
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
    
    def load_keywords(self, business_type):
        """載入關鍵字清單"""
        keyword_file = Path(f"./keywords/{business_type}.json")
        if not keyword_file.exists():
            return []
        
        with open(keyword_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        keywords = []
        for category in data.get('keywords', {}).values():
            if isinstance(category, list):
                for item in category:
                    if isinstance(item, dict) and 'keyword' in item:
                        keywords.append(item['keyword'])
        
        return keywords
    
    def get_board_list(self, board_name, pages=3):
        """獲取看板文章列表"""
        if not REQUESTS_AVAILABLE:
            return self._generate_mock_posts(board_name)
        
        posts = []
        url = f"{self.BASE_URL}/bbs/{board_name}/index.html"
        
        for _ in range(pages):
            try:
                response = self.session.get(url, timeout=10)
                response.encoding = 'utf-8'
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 解析文章列表
                entries = soup.find_all('div', class_='r-ent')
                
                for entry in entries:
                    title_elem = entry.find('div', class_='title')
                    if title_elem and title_elem.a:
                        title = title_elem.a.text.strip()
                        link = urljoin(self.BASE_URL, title_elem.a['href'])
                        
                        # 獲取日期和作者
                        date_elem = entry.find('div', class_='date')
                        author_elem = entry.find('div', class_='author')
                        
                        posts.append({
                            'title': title,
                            'link': link,
                            'date': date_elem.text.strip() if date_elem else '',
                            'author': author_elem.text.strip() if author_elem else '',
                            'board': board_name
                        })
                
                # 獲取上一頁連結
                prev_link = soup.find('a', string='‹ 上頁')
                if prev_link:
                    url = urljoin(self.BASE_URL, prev_link['href'])
                else:
                    break
                
                time.sleep(1)  # 禮貌性延遲
                
            except Exception as e:
                print(f"爬取 {board_name} 失敗：{e}")
                break
        
        return posts
    
    def filter_by_keywords(self, posts, keywords):
        """根據關鍵字過濾文章"""
        filtered = []
        
        for post in posts:
            title = post['title']
            
            # 檢查是否包含任何關鍵字
            for kw in keywords:
                if kw in title:
                    post['matched_keyword'] = kw
                    filtered.append(post)
                    break
        
        return filtered
    
    def analyze_sentiment(self, title):
        """
        簡易情感分析
        回傳：positive, negative, neutral
        """
        positive_words = ['推薦', '好物', '讚', '優惠', '便宜', 'CP值', '實用']
        negative_words = ['詐騙', '爛', '後悔', '不推', '踩雷', '失望', '糟糕', '問題', '糾紛']
        
        pos_count = sum(1 for w in positive_words if w in title)
        neg_count = sum(1 for w in negative_words if w in title)
        
        if pos_count > neg_count:
            return 'positive'
        elif neg_count > pos_count:
            return 'negative'
        else:
            return 'neutral'
    
    def crawl_business(self, business_type):
        """爬取特定業務的相關討論"""
        print(f"\n爬取業務：{business_type}")
        
        # 載入關鍵字
        keywords = self.load_keywords(business_type)
        if not keywords:
            print(f"  無關鍵字可搜尋")
            return []
        
        # 獲取相關看板
        boards = self.BOARDS.get(business_type, [])
        
        all_posts = []
        for board in boards:
            print(f"  看板：{board}")
            posts = self.get_board_list(board, pages=2)
            
            # 過濾相關文章
            filtered = self.filter_by_keywords(posts, keywords)
            
            # 情感分析
            for post in filtered:
                post['sentiment'] = self.analyze_sentiment(post['title'])
                post['crawled_at'] = datetime.now().isoformat()
            
            all_posts.extend(filtered)
            print(f"    找到 {len(filtered)} 篇相關文章")
        
        return all_posts
    
    def save_results(self, posts, business_type):
        """儲存爬取結果"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"ptt_{business_type}_{timestamp}.json"
        filepath = self.data_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
        
        print(f"  結果已儲存：{filepath}")
        return filepath
    
    def _generate_mock_posts(self, board_name):
        """生成模擬文章數據"""
        mock_posts = [
            {
                'title': f'[討論] {board_name} 相關話題',
                'link': f'/mock/{board_name}/1',
                'date': '2/13',
                'author': 'mock_user1',
                'board': board_name
            },
            {
                'title': f'[心得] {board_name} 使用經驗分享',
                'link': f'/mock/{board_name}/2',
                'date': '2/12',
                'author': 'mock_user2',
                'board': board_name
            }
        ]
        return mock_posts
    
    def crawl_all(self):
        """爬取所有業務"""
        results = {}
        
        for business in self.BOARDS.keys():
            posts = self.crawl_business(business)
            if posts:
                filepath = self.save_results(posts, business)
                results[business] = {
                    'posts': posts,
                    'filepath': str(filepath),
                    'count': len(posts)
                }
        
        return results


def main():
    """主程式"""
    crawler = PttCrawler()
    
    print("=" * 50)
    print("PTT 社群監控爬蟲")
    print("=" * 50)
    
    results = crawler.crawl_all()
    
    print(f"\n完成！共爬取 {sum(r['count'] for r in results.values())} 篇文章")


if __name__ == "__main__":
    main()
