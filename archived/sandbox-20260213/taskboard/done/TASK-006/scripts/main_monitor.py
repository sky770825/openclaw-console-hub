#!/usr/bin/env python3
"""
市場需求監控系統主程式
整合數據收集、分析、警示和報告生成
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# 添加腳本路徑
sys.path.insert(0, str(Path(__file__).parent))

from crawler.trends_collector import TrendsCollector
from analyzer.sentiment_analyzer import SentimentAnalyzer
from alerts.alert_system import AlertSystem, AlertLevel
from dashboard.report_generator import ReportGenerator


class MarketMonitoringSystem:
    """市場監控系統主類"""
    
    def __init__(self):
        self.trends_collector = TrendsCollector()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.alert_system = AlertSystem()
        self.report_generator = ReportGenerator()
        
        self.businesses = ['real_estate', 'beverage', 'puratex']
        self.results = {}
    
    def run_full_monitoring(self):
        """執行完整監控"""
        print("="*60)
        print("市場需求監控系統 - 完整監控")
        print(f"開始時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        print()
        
        # 1. 數據收集
        print("【第一步】數據收集")
        print("-" * 60)
        self.collect_data()
        print()
        
        # 2. 數據分析
        print("【第二步】數據分析與情感判斷")
        print("-" * 60)
        self.analyze_data()
        print()
        
        # 3. 警示檢查
        print("【第三步】異常警示檢查")
        print("-" * 60)
        self.check_alerts()
        print()
        
        # 4. 報告生成
        print("【第四步】報告生成")
        print("-" * 60)
        self.generate_reports()
        print()
        
        print("="*60)
        print(f"完成時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        return self.results
    
    def collect_data(self):
        """收集所有業務的數據"""
        for business in self.businesses:
            print(f"  {business}...", end=' ')
            
            # 載入關鍵字
            keywords = self.trends_collector.load_keywords(business)
            
            # 建立監控記錄
            record = {
                'business': business,
                'timestamp': datetime.now().isoformat(),
                'keywords_count': len(keywords),
                'keywords': keywords[:5],
                'status': 'collected'
            }
            
            self.results[business] = record
            print("✓")
    
    def analyze_data(self):
        """分析收集到的數據"""
        # 測試數據
        test_titles = {
            'real_estate': [
                '房價又漲了，買房更難',
                '打炒房效果顯著，房市穩定',
                '投資客持續進場，前景看好'
            ],
            'beverage': [
                '新品上市，消費者搶購',
                '飲料價格上漲，引發討論',
                '健康飲料成趨勢，銷售增長'
            ],
            'puratex': [
                '空氣品質惡化，防霾紗窗銷售旺',
                '新產品推出，口碑不錯',
                '競品降價，消費者觀望'
            ]
        }
        
        for business in self.businesses:
            print(f"  {business}...", end=' ')
            
            titles = test_titles.get(business, [])
            sentiments = self.sentiment_analyzer.analyze_batch(titles)
            
            positive_count = sentiments.count('positive')
            negative_count = sentiments.count('negative')
            neutral_count = sentiments.count('neutral')
            
            analysis = {
                'total_posts': len(titles),
                'sentiment_distribution': {
                    'positive': positive_count,
                    'negative': negative_count,
                    'neutral': neutral_count
                }
            }
            
            if business in self.results:
                self.results[business]['analysis'] = analysis
            
            print("✓")
    
    def check_alerts(self):
        """檢查並生成警報"""
        alerts = {
            'real_estate': {
                'current_volume': 85,
                'previous_volume': 50,
                'negative_percentage': 35
            },
            'beverage': {
                'current_volume': 120,
                'previous_volume': 90,
                'negative_percentage': 28
            },
            'puratex': {
                'current_volume': 200,
                'previous_volume': 100,
                'negative_percentage': 15
            }
        }
        
        for business, data in alerts.items():
            print(f"  {business}...", end=' ')
            
            # 檢查搜尋量
            level, msg = self.alert_system.check_search_volume_spike(
                data['current_volume'],
                data['previous_volume'],
                threshold=30
            )
            
            if level != AlertLevel.INFO:
                self.alert_system.create_alert(
                    business,
                    'market_volume',
                    level,
                    msg
                )
            
            # 檢查負面聲量
            level, msg = self.alert_system.check_sentiment(
                data['negative_percentage'],
                threshold=40
            )
            
            if business in self.results:
                self.results[business]['alerts'] = {
                    'volume_alert': level.value,
                    'sentiment_alert': msg
                }
            
            print("✓")
    
    def generate_reports(self):
        """生成報告"""
        for business in self.businesses:
            print(f"  {business}...", end=' ')
            
            # 準備報告數據
            report_data = self.results.get(business, {})
            
            # 生成週報
            weekly_report = self.report_generator.generate_weekly_report(
                business,
                report_data
            )
            
            self.report_generator.save_report(weekly_report)
            
            print("✓")
    
    def save_summary(self):
        """儲存監控總結"""
        summary = {
            'monitoring_time': datetime.now().isoformat(),
            'businesses_monitored': len(self.businesses),
            'results': self.results
        }
        
        summary_file = Path('./data/reports/monitoring_summary.json')
        summary_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        return summary_file


def main():
    """主程式"""
    system = MarketMonitoringSystem()
    
    # 執行完整監控
    results = system.run_full_monitoring()
    
    # 儲存總結
    summary_file = system.save_summary()
    
    print(f"\n監控摘要已儲存：{summary_file}")


if __name__ == "__main__":
    main()
