import json

def generate_report(data_file, report_file):
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    total_revenue = sum(item['price'] for item in data)
    total_bookings = len(data)
    new_customers = len([item for item in data if item['customer_type'] == "新客"])
    avg_satisfaction = sum(item['satisfaction'] for item in data) / total_bookings
    
    report = f"""# 美業數據分析營運報告
日期: {json.dumps(data[0]['timestamp'][:10])} 至 {json.dumps(data[-1]['timestamp'][:10])}

## 關鍵績效指標 (KPI)
- 總累積營收: TWD {total_revenue:,}
- 總預約數: {total_bookings} 次
- 客單價 (Avg Ticket): TWD {int(total_revenue/total_bookings)}
- 新客佔比: {(new_customers/total_bookings)*100:.1f}%
- 平均顧客滿意度: {avg_satisfaction:.2f} / 5.0

## 營運決策建議
1. **行銷優化**: 觀察通路營收，若某通路轉換率高，建議增加投放。
2. **服務調整**: 針對低頻次但高單價的服務進行促銷組合。
"""
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)

if __name__ == "__main__":
    generate_report("beauty_data.json", "kpi_report.md")
