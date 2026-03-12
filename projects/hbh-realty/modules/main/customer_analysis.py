import json
import os

def parse_customer_requirement(raw_text):
    """
    模擬 L2 Claude Code 呼叫本地 LLM (如 qwen3:8b) 進行實體提取。
    這裡使用 Mock 邏輯展示解析過程。
    """
    # 預期提取的欄位：區域, 房型, 預算, 關鍵需求, 優先級
    
    # 實際開發時會呼叫:
    # curl -s http://localhost:11434/api/generate -d '{"model":"qwen3:8b","prompt":"..."}'
    
    # 模擬解析結果
    structured_data = {
        "location": ["大安區", "中正區"],
        "room_type": "3房",
        "budget": {
            "min": 2500,
            "max": 3500,
            "unit": "萬"
        },
        "keywords": ["近捷運", "高樓層", "採光好", "電梯"],
        "urgency": "high"
    }
    
    return structured_data

if __name__ == "__main__":
    sample_input = "我想找大安或中正區的電梯大樓，預算大概3000萬左右，要3房，希望高樓層採光好，最近要結婚了，希望下個月能看好。"
    result = parse_customer_requirement(sample_input)
    print(json.dumps(result, indent=2, ensure_ascii=False))
