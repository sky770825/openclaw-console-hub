#!/usr/bin/env python3
"""
警示系統
監控異常情況並發送警報
"""

import json
from datetime import datetime
from pathlib import Path
from enum import Enum


class AlertLevel(Enum):
    """警示級別"""
    INFO = "INFO"      # 藍
    WARNING = "WARNING"  # 黃
    ALERT = "ALERT"    # 紅


class AlertSystem:
    """警示系統"""
    
    def __init__(self, output_dir="./data/reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.alerts = []
    
    def check_search_volume_spike(self, current, previous, threshold=30):
        """檢查搜尋量異常"""
        if previous == 0:
            change_rate = 100 if current > 0 else 0
        else:
            change_rate = abs((current - previous) / previous * 100)
        
        if change_rate > threshold:
            return AlertLevel.ALERT, f"搜尋量波動 {change_rate:.1f}%"
        elif change_rate > threshold * 0.7:
            return AlertLevel.WARNING, f"搜尋量波動 {change_rate:.1f}%"
        else:
            return AlertLevel.INFO, f"搜尋量變化 {change_rate:.1f}%"
    
    def check_sentiment(self, negative_percentage, threshold=40):
        """檢查負面聲量"""
        if negative_percentage > threshold:
            return AlertLevel.ALERT, f"負面聲量 {negative_percentage:.1f}%（超過閾值）"
        elif negative_percentage > threshold * 0.8:
            return AlertLevel.WARNING, f"負面聲量 {negative_percentage:.1f}%"
        else:
            return AlertLevel.INFO, f"負面聲量 {negative_percentage:.1f}%"
    
    def create_alert(self, business, keyword, level, message, data=None):
        """建立警報"""
        alert = {
            'timestamp': datetime.now().isoformat(),
            'business': business,
            'keyword': keyword,
            'level': level.value,
            'message': message,
            'data': data or {}
        }
        
        self.alerts.append(alert)
        self._display_alert(alert)
        
        return alert
    
    def _display_alert(self, alert):
        """顯示警報"""
        level = alert['level']
        symbol = {'INFO': '🟦', 'WARNING': '🟨', 'ALERT': '🟥'}.get(level, '⚪')
        
        print(f"{symbol} [{alert['level']}] {alert['business']} - {alert['keyword']}")
        print(f"   {alert['message']}")
        print()
    
    def generate_alert_report(self, business_name):
        """生成警報報告"""
        business_alerts = [a for a in self.alerts if a['business'] == business_name]
        
        report = {
            'business': business_name,
            'timestamp': datetime.now().isoformat(),
            'total_alerts': len(business_alerts),
            'alerts_by_level': {
                'INFO': len([a for a in business_alerts if a['level'] == 'INFO']),
                'WARNING': len([a for a in business_alerts if a['level'] == 'WARNING']),
                'ALERT': len([a for a in business_alerts if a['level'] == 'ALERT'])
            },
            'alerts': business_alerts
        }
        
        return report
    
    def save_alerts(self, business_name):
        """儲存警報"""
        report = self.generate_alert_report(business_name)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"alerts_{business_name}_{timestamp}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"警報已儲存：{filename}")
        return filepath


def main():
    """測試程式"""
    alert_system = AlertSystem()
    
    print("="*50)
    print("警示系統測試")
    print("="*50)
    print()
    
    # 測試搜尋量異常
    level, msg = alert_system.check_search_volume_spike(100, 50, threshold=30)
    alert_system.create_alert('住商不動產', '房價', level, msg)
    
    # 測試負面聲量
    level, msg = alert_system.check_sentiment(45, threshold=40)
    alert_system.create_alert('飲料店', '手搖飲', level, msg)
    
    # 儲存報告
    alert_system.save_alerts('住商不動產')


if __name__ == "__main__":
    main()
