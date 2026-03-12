#!/usr/bin/env python3
"""
報告生成器
產生市場監控週報和月報
"""

import json
from datetime import datetime, timedelta
from pathlib import Path


class ReportGenerator:
    """報告生成器"""
    
    def __init__(self, data_dir="./data"):
        self.data_dir = Path(data_dir)
        self.reports_dir = self.data_dir / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_weekly_report(self, business_name, data):
        """生成週報"""
        report = {
            'report_type': 'weekly',
            'business': business_name,
            'period': {
                'start': (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
                'end': datetime.now().strftime('%Y-%m-%d')
            },
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_mentions': len(data.get('mentions', [])),
                'trending_keywords': data.get('trending_keywords', []),
                'sentiment_overview': data.get('sentiment', {}),
                'top_competitors': data.get('top_competitors', []),
                'key_insights': self._generate_insights(data)
            },
            'detailed_data': data
        }
        
        return report
    
    def generate_monthly_report(self, business_name, weekly_data):
        """生成月報"""
        report = {
            'report_type': 'monthly',
            'business': business_name,
            'period': {
                'start': (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'),
                'end': datetime.now().strftime('%Y-%m-%d')
            },
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_mentions': sum(w.get('summary', {}).get('total_mentions', 0) 
                                      for w in weekly_data),
                'weeks_analyzed': len(weekly_data),
                'average_sentiment': self._calculate_avg_sentiment(weekly_data),
                'emerging_trends': self._extract_emerging_trends(weekly_data),
                'competitive_landscape': self._analyze_competitors(weekly_data)
            },
            'weekly_reports': weekly_data
        }
        
        return report
    
    def _generate_insights(self, data):
        """生成洞察"""
        insights = []
        
        mentions = data.get('mentions', [])
        if len(mentions) > 100:
            insights.append("市場討論活躍")
        
        sentiment = data.get('sentiment', {})
        if sentiment.get('negative', 0) > 40:
            insights.append("負面聲量較高，建議關注")
        
        trending = data.get('trending_keywords', [])
        if trending:
            insights.append(f"熱門話題：{', '.join(trending[:3])}")
        
        return insights
    
    def _calculate_avg_sentiment(self, weekly_data):
        """計算平均情感分數"""
        total_positive = 0
        total_records = 0
        
        for week in weekly_data:
            sentiment = week.get('summary', {}).get('sentiment_overview', {})
            total_positive += sentiment.get('positive', 0)
            total_records += week.get('summary', {}).get('total_mentions', 0)
        
        if total_records == 0:
            return 0
        
        return round(total_positive / total_records * 100, 1)
    
    def _extract_emerging_trends(self, weekly_data):
        """提取新興趨勢"""
        trends = {}
        
        for week in weekly_data:
            keywords = week.get('summary', {}).get('trending_keywords', [])
            for kw in keywords:
                trends[kw] = trends.get(kw, 0) + 1
        
        # 按出現次數排序
        return sorted(trends.items(), key=lambda x: x[1], reverse=True)[:5]
    
    def _analyze_competitors(self, weekly_data):
        """分析競品動態"""
        competitors = {}
        
        for week in weekly_data:
            comps = week.get('summary', {}).get('top_competitors', [])
            for comp in comps:
                if isinstance(comp, dict):
                    name = comp.get('name', comp)
                    competitors[name] = competitors.get(name, 0) + 1
        
        return dict(sorted(competitors.items(), key=lambda x: x[1], reverse=True)[:5])
    
    def save_report(self, report, filename=None):
        """儲存報告"""
        if filename is None:
            report_type = report.get('report_type', 'report')
            business = report.get('business', 'unknown')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{report_type}_{business}_{timestamp}.json"
        
        filepath = self.reports_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"報告已儲存：{filename}")
        return filepath
    
    def export_html_report(self, report, filename=None):
        """匯出 HTML 報告"""
        if filename is None:
            report_type = report.get('report_type', 'report')
            business = report.get('business', 'unknown')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{report_type}_{business}_{timestamp}.html"
        
        filepath = self.reports_dir / filename
        
        html_content = self._generate_html(report)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML 報告已儲存：{filename}")
        return filepath
    
    def _generate_html(self, report):
        """生成 HTML 內容"""
        report_type = report.get('report_type', 'Report')
        business = report.get('business', 'Business')
        summary = report.get('summary', {})
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{report_type.upper()} - {business}</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        .summary {{ background: #f5f5f5; padding: 15px; border-radius: 5px; }}
        .metric {{ display: inline-block; margin: 10px 20px 10px 0; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #0066cc; }}
        .metric-label {{ color: #666; }}
    </style>
</head>
<body>
    <h1>{report_type.upper()} - {business}</h1>
    <div class="summary">
        <h2>監控摘要</h2>
        <div class="metric">
            <div class="metric-value">{summary.get('total_mentions', 0)}</div>
            <div class="metric-label">總提及數</div>
        </div>
        <div class="metric">
            <div class="metric-value">{summary.get('average_sentiment', 0):.1f}%</div>
            <div class="metric-label">正面情感</div>
        </div>
    </div>
</body>
</html>
        """
        
        return html


def main():
    """測試程式"""
    generator = ReportGenerator()
    
    print("="*50)
    print("報告生成器測試")
    print("="*50)
    print()
    
    # 建立測試數據
    test_data = {
        'mentions': ['文章1', '文章2', '文章3'],
        'trending_keywords': ['房價', '買房', '貸款'],
        'sentiment': {'positive': 60, 'negative': 30, 'neutral': 10},
        'top_competitors': [{'name': '台灣房屋', 'mentions': 50}]
    }
    
    # 生成週報
    weekly = generator.generate_weekly_report('住商不動產', test_data)
    generator.save_report(weekly)
    
    print("\n完成！")


if __name__ == "__main__":
    main()
