import json
import sys
import os

def evaluate_lead(lead, market_data):
    # 找尋對應區域的市場數據
    market = next((m for m in market_data if m['area'] == lead['location_preference']), None)
    
    score = 0
    reasons = []

    if market:
        # 預算與市場匹配度
        estimated_market_price = market['avg_price_per_ping'] * lead['min_size']
        if lead['budget'] >= estimated_market_price:
            score += 40
            reasons.append(f"預算 ({lead['budget']:,}) 高於預估市場價 ({estimated_market_price:,.0f})")
        elif lead['budget'] >= estimated_market_price * 0.8:
            score += 20
            reasons.append(f"預算 ({lead['budget']:,}) 接近市場價，成交機會中等")
        else:
            score += 5
            reasons.append(f"預算 ({lead['budget']:,}) 顯著低於市場行情")

        # 流動性評估
        if market['liquidity'] == '高':
            score += 30
            reasons.append("目標區域流動性高，抗跌性強")
        elif market['liquidity'] == '中':
            score += 15
            reasons.append("目標區域流動性中等")

        # 趨勢評估
        if market['trend'] == '穩定成長':
            score += 30
            reasons.append("區域市場趨勢看好")
        elif market['trend'] == '微幅上升':
            score += 20
            reasons.append("區域市場穩定")
    else:
        score = 0
        reasons.append("找不到目標區域的市場數據")

    # 綜合等級
    level = "低"
    if score >= 80:
        level = "高 (Hot Lead)"
    elif score >= 50:
        level = "中 (Warm Lead)"
    
    return {
        "id": lead['id'],
        "name": lead['name'],
        "score": score,
        "level": level,
        "reasons": reasons
    }

def main():
    try:
        data_dir = "projects/real-estate-pilot/data"
        with open(f"{data_dir}/leads.json", "r", encoding="utf-8") as f:
            leads = json.load(f)
        with open(f"{data_dir}/market_stats.json", "r", encoding="utf-8") as f:
            market_stats = json.load(f)

        evaluations = [evaluate_lead(l, market_stats) for l in leads]

        output_path = "projects/real-estate-pilot/data/evaluations.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(evaluations, f, ensure_ascii=False, indent=4)
        
        print(f"評估完成，結果已存至 {output_path}")
    except Exception as e:
        print(f"錯誤: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
