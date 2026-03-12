#!/usr/bin/env python3
"""
市場需求監控系統 - 主程式
Market Monitoring System - Main Script

用途：整合數據收集、分析、警示和報告生成
Usage: Integrated data collection, analysis, alerting and reporting
"""

import json
import sys
import argparse
from datetime import datetime
from pathlib import Path

def load_keywords(business_type, keywords_dir="./"):
    """載入監控清單"""
    keyword_file = Path(f"{keywords_dir}TASK-006-keywords-{business_type}.json")
    
    try:
        with open(keyword_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ 未找到關鍵字檔案: {keyword_file}")
        return None

def collect_data(business_config):
    """收集數據"""
    business_name = business_config.get('business_name', 'Unknown')
    print(f"  📊 {business_name}...", end=' ', flush=True)
    
    # 模擬數據收集
    # 實際實現應調用 Google Trends API、爬蟲等
    
    print("✓")
    return {
        'business': business_name,
        'timestamp': datetime.now().isoformat(),
        'status': 'collected',
        'records': 100
    }

def analyze_data(business_config):
    """分析數據"""
    business_name = business_config.get('business_name', 'Unknown')
    print(f"  📈 {business_name}...", end=' ', flush=True)
    
    # 模擬數據分析
    # 實際實現應進行情感分析、趨勢計算等
    
    print("✓")
    return {
        'business': business_name,
        'sentiment': {
            'positive': 60,
            'negative': 25,
            'neutral': 15
        },
        'status': 'analyzed'
    }

def check_alerts(business_config, analysis):
    """檢查警示"""
    business_name = business_config.get('business_name', 'Unknown')
    print(f"  🚨 {business_name}...", end=' ', flush=True)
    
    alerts = []
    thresholds = business_config.get('alert_thresholds', {})
    
    negative_percentage = analysis.get('sentiment', {}).get('negative', 0)
    threshold = thresholds.get('negative_sentiment', 40)
    
    if negative_percentage > threshold:
        alerts.append({
            'level': 'WARNING',
            'message': f'負面聲量 {negative_percentage}% (超過閾值 {threshold}%)'
        })
    
    print("✓")
    return alerts

def generate_report(business_config, analysis, alerts):
    """生成報告"""
    business_name = business_config.get('business_name', 'Unknown')
    print(f"  📝 {business_name}...", end=' ', flush=True)
    
    # 確保報告目錄存在
    report_dir = Path("./data/reports")
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report = {
        'business': business_name,
        'timestamp': datetime.now().isoformat(),
        'analysis': analysis,
        'alerts': alerts,
        'status': 'reported'
    }
    
    # 儲存報告
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = report_dir / f"report_{business_name}_{timestamp}.json"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("✓")
    return report_file

def run_monitoring(businesses=['real_estate', 'beverage', 'puratex'], mode='full'):
    """執行監控"""
    print("\n" + "="*60)
    print("市場需求監控系統 - 完整監控")
    print(f"執行時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    results = {}
    
    for business in businesses:
        print(f"[\u2713] 監控業務: {business}")
        
        # 1. 載入配置
        config = load_keywords(business)
        if not config:
            continue
        
        # 2. 數據收集
        if mode in ['full', 'quick']:
            print("  [步驟 1/4] 數據收集")
            data = collect_data(config)
        else:
            data = {'business': config.get('business_name')}
        
        # 3. 數據分析
        if mode in ['full', 'report']:
            print("  [步驟 2/4] 數據分析")
            analysis = analyze_data(config)
        else:
            analysis = {}
        
        # 4. 警示檢查
        if mode in ['full', 'report']:
            print("  [步驟 3/4] 警示檢查")
            alerts = check_alerts(config, analysis)
        else:
            alerts = []
        
        # 5. 報告生成
        if mode in ['full', 'report']:
            print("  [步驟 4/4] 報告生成")
            report_file = generate_report(config, analysis, alerts)
            results[business] = {
                'status': 'success',
                'report': str(report_file)
            }
        
        print()
    
    print("="*60)
    print(f"完成時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # 顯示總結
    print(f"\n✅ 監控完成！共處理 {len(results)} 個業務\n")
    
    # 顯示報告位置
    print("📂 報告位置: ./data/reports/\n")
    
    for business, result in results.items():
        if result.get('status') == 'success':
            print(f"   ✓ {business}: {result['report']}")

def main():
    """主函數"""
    parser = argparse.ArgumentParser(description='市場需求監控系統')
    parser.add_argument(
        '--mode',
        choices=['full', 'quick', 'report'],
        default='full',
        help='執行模式 (default: full)'
    )
    parser.add_argument(
        '--business',
        nargs='+',
        default=['real_estate', 'beverage', 'puratex'],
        help='監控業務 (default: 全部)'
    )
    
    args = parser.parse_args()
    
    # 建立必要的目錄
    for directory in ['data/raw', 'data/processed', 'data/reports']:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    # 執行監控
    run_monitoring(businesses=args.business, mode=args.mode)

if __name__ == '__main__':
    main()
