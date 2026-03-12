import json
import random
from datetime import datetime, timedelta

def generate_data():
    services = ["美髮剪燙", "凝膠美甲", "美睫嫁接", "臉部撥筋", "全身精油按摩"]
    data = []
    start_date = datetime.now() - timedelta(days=90)
    
    for i in range(500):
        date = start_date + timedelta(days=random.randint(0, 90), hours=random.randint(9, 20))
        service = random.choice(services)
        price = {
            "美髮剪燙": random.randint(1200, 5000),
            "凝膠美甲": random.randint(800, 2500),
            "美睫嫁接": random.randint(1000, 2000),
            "臉部撥筋": random.randint(1500, 3000),
            "全身精油按摩": random.randint(1800, 4500)
        }[service]
        
        data.append({
            "id": i,
            "timestamp": date.isoformat(),
            "service": service,
            "price": price,
            "customer_type": random.choice(["新客", "舊客"]),
            "source": random.choice(["FB廣告", "IG貼文", "Google搜尋", "朋友推薦"]),
            "satisfaction": random.randint(3, 5)
        })
    
    return data

if __name__ == "__main__":
    mock_data = generate_data()
    with open("beauty_data.json", "w", encoding="utf-8") as f:
        json.dump(mock_data, f, ensure_ascii=False, indent=2)
