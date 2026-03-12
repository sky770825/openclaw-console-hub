#!/usr/bin/env python3
"""
情感分析模組
分析市場討論的正負面情緒
"""

import json
from datetime import datetime
from pathlib import Path


class SentimentAnalyzer:
    """情感分析器"""
    
    def __init__(self):
        # 正面詞典
        self.positive_words = [
            '推薦', '好物', '讚', '優惠', '便宜', 'CP值', '實用',
            '優質', '滿意', '推爆', '超棒', '5星', '很讚', '必買'
        ]
        
        # 負面詞典
        self.negative_words = [
            '詐騙', '爛', '後悔', '不推', '踩雷', '失望', '糟糕',
            '問題', '糾紛', '差', '垃圾', '黑心', '騙', '不值'
        ]
    
    def analyze(self, text):
        """
        分析文本情感
        回傳：positive, negative, neutral
        """
        pos_count = sum(1 for w in self.positive_words if w in text)
        neg_count = sum(1 for w in self.negative_words if w in text)
        
        if pos_count > neg_count:
            return 'positive'
        elif neg_count > pos_count:
            return 'negative'
        else:
            return 'neutral'
    
    def analyze_batch(self, texts):
        """批量分析"""
        results = []
        for text in texts:
            results.append(self.analyze(text))
        return results
    
    def generate_report(self, titles, business_name):
        """生成情感分析報告"""
        sentiments = self.analyze_batch(titles)
        
        pos = sentiments.count('positive')
        neg = sentiments.count('negative')
        neu = sentiments.count('neutral')
        total = len(sentiments)
        
        report = {
            'business': business_name,
            'timestamp': datetime.now().isoformat(),
            'total_posts': total,
            'sentiment_distribution': {
                'positive': {'count': pos, 'percentage': round(pos/total*100, 1) if total > 0 else 0},
                'negative': {'count': neg, 'percentage': round(neg/total*100, 1) if total > 0 else 0},
                'neutral': {'count': neu, 'percentage': round(neu/total*100, 1) if total > 0 else 0}
            },
            'sentiment_summary': '正面' if pos > neg else ('負面' if neg > pos else '中立')
        }
        
        return report


def main():
    """測試程式"""
    analyzer = SentimentAnalyzer()
    
    test_texts = [
        '這個產品超讚，推薦給大家',
        '品質很爛，很後悔購買',
        '還不錯，一般般'
    ]
    
    print("情感分析測試：")
    for text in test_texts:
        sentiment = analyzer.analyze(text)
        print(f"  '{text}' -> {sentiment}")


if __name__ == "__main__":
    main()
