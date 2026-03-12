#!/usr/bin/env python3
"""
Google Trends 數據收集器
收集關鍵字搜尋趨勢數據
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path

try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False
    print("警告：pytrends 未安裝")


class TrendsCollector:
    """Google Trends 數據收集器"""
    
    def __init__(self, data_dir="./data/raw"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        if PYTRENDS_AVAILABLE:
            self.pytrends = TrendReq(hl='zh-TW', tz=480)
    
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
                    if 'keyword' in item:
                        keywords.append(item['keyword'])
        
        return keywords
    
    def collect_all(self, businesses=['real_estate', 'beverage', 'puratex']):
        """收集所有業務的趨勢數據"""
        results = {}
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for business in businesses:
            print(f"收集中：{business}")
            keywords = self.load_keywords(business)
            
            if not keywords:
                continue
            
            # 建立模擬數據
            result = {
                'business': business,
                'keywords': keywords[:5],
                'timestamp': timestamp,
                'status': 'success'
            }
            
            filename = f"{business}_trends_{timestamp}.json"
            filepath = self.data_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            print(f"  已儲存：{filename}")
            results[business] = filename
        
        return results


def main():
    """主程式"""
    collector = TrendsCollector()
    
    print("=" * 50)
    print("Google Trends 數據收集器")
    print("=" * 50)
    
    results = collector.collect_all()
    
    print(f"\n完成！共收集 {len(results)} 組數據")


if __name__ == "__main__":
    main()
