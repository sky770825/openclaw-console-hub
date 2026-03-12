#!/usr/bin/env python3
"""
Google Trends 數據收集器
收集關鍵字搜尋趨勢數據
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

# 注意：實際使用時需要安裝 pytrends
# pip install pytrends
try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False
    print("警告：pytrends 未安裝，將使用模擬數據")


class TrendsCollector:
    """Google Trends 數據收集器"""
    
    def __init__(self, data_dir="./data/raw"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        if PYTRENDS_AVAILABLE:
            self.pytrends = TrendReq(
                hl='zh-TW',
                tz=480,  # 台灣時區
                retries=3,
                backoff_factor=0.1
            )
    
    def load_keywords(self, business_type):
        """載入關鍵字清單"""
        keyword_file = Path(f"./keywords/{business_type}.json")
        if not keyword_file.exists():
            print(f"找不到關鍵字檔案：{keyword_file}")
            return []
        
        with open(keyword_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 收集所有關鍵字
        keywords = []
        for category in data.get('keywords', {}).values():
            if isinstance(category, list):
                for item in category:
                    if isinstance(item, dict) and 'keyword' in item:
                        keywords.append(item['keyword'])
        
        return keywords
    
    def fetch_trends(self, keywords, timeframe='today 3-m', geo='TW'):
        """
        獲取 Google Trends 數據
        
        Args:
            keywords: 關鍵字列表 (最多 5 個)
            timeframe: 時間範圍
            geo: 地區代碼
        """
        if not PYTRENDS_AVAILABLE:
            return self._generate_mock_data(keywords)
        
        try:
            # 建立 payload
            self.pytrends.build_payload(
                keywords[:5],  # Google Trends 限制最多 5 個
                cat=0,
                timeframe=timeframe,
                geo=geo
            )
            
            # 獲取趨勢數據
            data = self.pytrends.interest_over_time()
            
            if data.empty:
                return None
            
            return data
            
        except Exception as e:
            print(f"獲取 Trends 數據失敗：{e}")
            return None
    
    def fetch_related_queries(self, keyword):
        """獲取相關查詢"""
        if not PYTRENDS_AVAILABLE:
            return {}
        
        try:
            self.pytrends.build_payload([keyword], geo='TW')
            related = self.pytrends.related_queries()
            return related.get(keyword, {})
        except Exception as e:
            print(f"獲取相關查詢失敗：{e}")
            return {}
    
    def save_data(self, data, filename):
        """儲存數據"""
        filepath = self.data_dir / filename
        
        if isinstance(data, dict):
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            # pandas DataFrame
            data.to_csv(filepath)
        
        print(f"數據已儲存：{filepath}")
    
    def _generate_mock_data(self, keywords):
        """生成模擬數據（當 pytrends 不可用時）"""
        import pandas as pd
        import numpy as np
        
        dates = pd.date_range(end=datetime.now(), periods=90, freq='D')
        data = pd.DataFrame(index=dates)
        
        for kw in keywords:
            # 生成隨機但合理的趨勢數據
            base = np.random.randint(20, 80)
            trend = np.random.normal(0, 5, len(dates)).cumsum()
            values = np.clip(base + trend, 0, 100).astype(int)
            data[kw] = values
        
        data['isPartial'] = False
        return data
    
    def collect_all(self, businesses=['real_estate', 'beverage', 'puratex']):
        """收集所有業務的趨勢數據"""
        results = {}
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for business in businesses:
            print(f"\n正在收集：{business}")
            keywords = self.load_keywords(business)
            
            if not keywords:
                continue
            
            # 分批處理（每批最多 5 個關鍵字）
            for i in range(0, min(len(keywords), 15), 5):
                batch = keywords[i:i+5]
                print(f"  批次：{batch}")
                
                data = self.fetch_trends(batch)
                
                if data is not None:
                    filename = f"{business}_trends_{timestamp}_{i//5}.csv"
                    self.save_data(data, filename)
                    results[f"{business}_{i}"] = data
                
                # 避免觸發速率限制
                time.sleep(2)
        
        return results


def main():
    """主程式"""
    collector = TrendsCollector()
    
    print("=" * 50)
    print("Google Trends 數據收集器")
    print("=" * 50)
    
    # 收集所有業務數據
    results = collector.collect_all()
    
    print(f"\n完成！共收集 {len(results)} 組數據")


if __name__ == "__main__":
    main()
