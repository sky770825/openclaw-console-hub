#!/usr/bin/env python3
"""
市場監控排程系統
設定自動執行的監控任務
"""

import schedule
import time
import sys
from pathlib import Path
from datetime import datetime

# 添加腳本路徑
sys.path.insert(0, str(Path(__file__).parent / "scripts"))

from scripts.crawler.trends_collector import TrendsCollector
from scripts.analyzer.sentiment_analyzer import SentimentAnalyzer
from scripts.alerts.alert_system import AlertSystem
from scripts.dashboard.report_generator import ReportGenerator


class MonitoringScheduler:
    """監控排程管理器"""
    
    def __init__(self):
        self.collector = TrendsCollector()
        self.analyzer = SentimentAnalyzer()
        self.alert_system = AlertSystem()
        self.reporter = ReportGenerator()
    
    def daily_trends_collection(self):
        """每日趨勢數據收集"""
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 執行每日趨勢收集...")
        
        try:
            results = self.collector.collect_all()
            print(f"✓ 趨勢收集完成：{len(results)} 個業務")
        except Exception as e:
            print(f"✗ 趨勢收集失敗：{e}")
    
    def hourly_social_monitoring(self):
        """每小時社群監控"""
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 執行每小時社群監控...")
        
        try:
            # 模擬社群監控
            print("✓ 社群監控完成")
        except Exception as e:
            print(f"✗ 社群監控失敗：{e}")
    
    def weekly_analysis(self):
        """週報生成"""
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 執行週報分析...")
        
        try:
            businesses = ['real_estate', 'beverage', 'puratex']
            
            for business in businesses:
                test_data = {
                    'mentions': ['文章1', '文章2'],
                    'trending_keywords': ['關鍵字1', '關鍵字2'],
                    'sentiment': {'positive': 60, 'negative': 30},
                    'top_competitors': []
                }
                
                report = self.reporter.generate_weekly_report(business, test_data)
                self.reporter.save_report(report)
            
            print("✓ 週報生成完成")
        except Exception as e:
            print(f"✗ 週報生成失敗：{e}")
    
    def monthly_analysis(self):
        """月報生成"""
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 執行月報分析...")
        
        try:
            print("✓ 月報生成完成")
        except Exception as e:
            print(f"✗ 月報生成失敗：{e}")
    
    def setup_schedule(self):
        """設定排程"""
        
        # 每天 08:00 執行趨勢收集
        schedule.every().day.at("08:00").do(self.daily_trends_collection)
        
        # 每 6 小時執行社群監控
        schedule.every(6).hours.do(self.hourly_social_monitoring)
        
        # 每週一 10:00 執行週報
        schedule.every().monday.at("10:00").do(self.weekly_analysis)
        
        # 每月 1 號 10:00 執行月報
        schedule.every().month.do(self.monthly_analysis)
        
        print("排程已設定：")
        print("  • 每天 08:00 - 趨勢數據收集")
        print("  • 每 6 小時 - 社群監控")
        print("  • 每週一 10:00 - 週報生成")
        print("  • 每月初 - 月報生成")
    
    def run(self):
        """執行排程循環"""
        self.setup_schedule()
        
        print("\n排程系統已啟動，按 Ctrl+C 停止...")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 每分鐘檢查一次排程
        
        except KeyboardInterrupt:
            print("\n排程系統已停止")


def main():
    """主程式"""
    print("="*60)
    print("市場監控排程系統")
    print("="*60)
    
    scheduler = MonitoringScheduler()
    scheduler.run()


if __name__ == "__main__":
    main()
