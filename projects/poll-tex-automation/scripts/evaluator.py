import json
import math

# 普特絲產品知識配置
CONFIG = {
    "unit_price": 405,  # 每才單價
    "min_charge": 3000, # 最低出車費
    "sq_cm_per_cai": 918.27, # 1才 = 30.3 * 30.3 cm
    "window_types": {
        "sliding": {"name": "橫拉窗", "extra_cost": 0},
        "push": {"name": "推射窗", "extra_cost": 500},
        "door": {"name": "三合一門", "extra_cost": 1500},
        "fold": {"name": "折紗/隱形紗窗", "extra_cost": 1200}
    }
}

def calculate_quote(windows):
    """
    計算預估報價
    windows: list of dicts, e.g. [{"type": "sliding", "width": 150, "height": 210, "count": 1}]
    """
    total_price = 0
    details = []
    
    for w in windows:
        type_cfg = CONFIG["window_types"].get(w["type"], CONFIG["window_types"]["sliding"])
        area_cai = (w["width"] * w["height"]) / CONFIG["sq_cm_per_cai"]
        area_cai = math.ceil(area_cai) # 通常不足1才算1才
        
        price = (area_cai * CONFIG["unit_price"] + type_cfg["extra_cost"]) * w["count"]
        total_price += price
        
        details.append({
            "type": type_cfg["name"],
            "size": f"{w['width']}x{w['height']}",
            "cai": area_cai,
            "count": w["count"],
            "subtotal": round(price)
        })
        
    final_price = max(total_price, CONFIG["min_charge"])
    
    return {
        "total": round(final_price),
        "details": details,
        "is_min_charge": final_price == CONFIG["min_charge"]
    }

def evaluate_lead(lead_data):
    """
    評估線索品質 (Score: 0-100)
    """
    score = 0
    reasons = []
    
    # 1. 痛點分析
    if lead_data.get("allergy"):
        score += 30
        reasons.append("過敏族群 (High Priority)")
    if lead_data.get("new_house"):
        score += 20
        reasons.append("新屋裝修需求")
    if lead_data.get("smoke_issue"):
        score += 20
        reasons.append("菸味困擾")
        
    # 2. 預算意識
    if lead_data.get("budget_known"):
        score += 30
        reasons.append("已有預算認知")
        
    return score, reasons

if __name__ == "__main__":
    # 模擬測試數據
    sample_lead = {
        "customer": "蔡先生",
        "allergy": True,
        "new_house": True,
        "smoke_issue": False,
        "budget_known": True,
        "windows": [
            {"type": "sliding", "width": 150, "height": 210, "count": 2}, # 落地窗
            {"type": "sliding", "width": 120, "height": 120, "count": 3}, # 半身窗
            {"type": "door", "width": 70, "height": 200, "count": 1}      # 廚房門
        ]
    }
    
    quote_result = calculate_quote(sample_lead["windows"])
    score, reasons = evaluate_lead(sample_lead)
    
    output = {
        "customer": sample_lead["customer"],
        "lead_score": score,
        "evaluation": reasons,
        "quote_summary": quote_result
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))
