import csv
import sys

def analyze(input_path, report_path):
    total_input = 0
    total_output = 0
    days = 0
    
    with open(input_path, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            total_input += int(row['input_tokens'])
            total_output += int(row['output_tokens'])
            days += 1
            
    # Mock costs: $5 per 1M input, $15 per 1M output
    cloud_cost = (total_input / 1000000 * 5) + (total_output / 1000000 * 15)
    # M3 Ultra amortized cost (approx $5000 over 3 years, monthly)
    m3_monthly_cost = 5000 / 36
    
    with open(report_path, 'w') as f:
        f.write("# 成本與安全優勢分析報告\n\n")
        f.write(f"## 數據總結 (過去 {days} 天)\n")
        f.write(f"- 總輸入 Token: {total_input:,}\n")
        f.write(f"- 總輸出 Token: {total_output:,}\n\n")
        f.write("## 成本對比\n")
        f.write(f"- 預估雲端費用 (月): ${cloud_cost:.2f}\n")
        f.write(f"- M3 Ultra 折舊成本 (月): ${m3_monthly_cost:.2f}\n")
        f.write(f"- **節省比例: {((cloud_cost - m3_monthly_cost) / cloud_cost * 100):.1f}%**\n\n")
        f.write("## 安全優勢\n")
        f.write("1. 數據 100% 本地化，無洩漏至第三方 API 風險。\n")
        f.write("2. 符合企業資安合規需求，支援斷網環境運行。\n")

if __name__ == "__main__":
    analyze(sys.argv[1], sys.argv[2])
