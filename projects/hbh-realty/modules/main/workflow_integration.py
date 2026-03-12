from customer_analysis import parse_customer_requirement
from listing_matcher import match_listings
from contract_generator import generate_contract_draft

def workflow_demo():
    print("=== [Step 1] 解析客戶需求 ===")
    user_input = "我想在台北市大安區找一間3000萬左右的3房，要有電梯，離捷運站近一點。"
    requirement = parse_customer_requirement(user_input)
    print(f"解析結果：{requirement}\n")

    print("=== [Step 2] 房源智能匹配 ===")
    # 模擬數據庫
    db = [
        {"id": "A01", "title": "大安美寓", "price": 2900, "address": "大安區...", "type": "3房", "description": "近捷運，電梯大樓"},
        {"id": "B01", "title": "信義豪邸", "price": 8000, "address": "信義區...", "type": "4房", "description": "景觀好"}
    ]
    matches = match_listings(requirement, db)
    print(f"匹配到 {len(matches)} 筆房源。")
    if matches:
        print(f"最推薦：{matches[0]['title']} (分數: {matches[0]['match_score']})\n")

    print("=== [Step 3] 模擬成交後的合約生成 ===")
    deal_details = {
        "seller_name": "內部測試業主",
        "buyer_name": "潛在客戶A",
        "property_address": "台北市大安區... (房源A01)",
        "property_rights": "全部",
        "total_price": "2,900",
        "payment_1": "290", "payment_2": "290", "payment_3": "290", "payment_4": "2,030",
        "special_terms": "現況交屋。"
    }
    contract = generate_contract_draft(deal_details)
    print("合約草稿已生成片段：")
    print(contract[:200] + "...")

if __name__ == "__main__":
    workflow_demo()
