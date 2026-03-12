import json

def match_listings(requirement, listings):
    """
    簡易房源匹配邏輯。
    生產環境應結合 Embedding 相似度計算。
    """
    recommendations = []
    
    for item in listings:
        score = 0
        reasons = []
        
        # 1. 區域匹配
        if any(loc in item['address'] for loc in requirement['location']):
            score += 40
            reasons.append(f"位於目標區域: {item['address'][:3]}")
            
        # 2. 預算匹配
        if requirement['budget']['min'] <= item['price'] <= requirement['budget']['max']:
            score += 30
            reasons.append(f"符合預算區間: {item['price']} 萬")
            
        # 3. 房型匹配
        if requirement['room_type'] in item['type']:
            score += 20
            reasons.append(f"符合需求房型: {item['type']}")

        # 4. 關鍵字加分 (模擬語意匹配)
        for kw in requirement['keywords']:
            if kw in item['description']:
                score += 5
                reasons.append(f"具備關鍵特徵: {kw}")
        
        if score > 50:
            item['match_score'] = score
            item['recommendation_reasons'] = reasons
            recommendations.append(item)
            
    # 按分數排序
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return recommendations

if __name__ == "__main__":
    # 模擬需求
    req = {
        "location": ["大安區"],
        "budget": {"min": 2500, "max": 3500},
        "room_type": "3房",
        "keywords": ["捷運", "採光"]
    }
    
    # 模擬房源資料庫
    db = [
        {
            "id": "A001", 
            "title": "大安森林公園景觀宅", 
            "price": 3200, 
            "address": "台北市大安區新生南路", 
            "type": "3房2廳",
            "description": "近捷運大安森林公園站，高樓層採光絕佳，視野好。"
        },
        {
            "id": "B002", 
            "title": "中正區超值公寓", 
            "price": 1800, 
            "address": "台北市中正區羅斯福路", 
            "type": "2房1廳",
            "description": "生活機能好，近古亭捷運站。"
        }
    ]
    
    results = match_listings(req, db)
    print(json.dumps(results, indent=2, ensure_ascii=False))
