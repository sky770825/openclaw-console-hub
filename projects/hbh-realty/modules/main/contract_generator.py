def generate_contract_draft(details):
    """
    基於交易細節填充合約草案。
    """
    template = """
    【不動產買賣契約書 (草案)】
    
    賣方(甲方)：{seller_name}
    買方(乙方)：{buyer_name}
    
    第一條：買賣標的物
    地址：{property_address}
    權利範圍：{property_rights}
    
    第二條：買賣價款
    總價金額：新台幣 {total_price} 萬元整。
    
    第三條：付款約定
    1. 簽約款：{payment_1} 萬元。
    2. 用印款：{payment_2} 萬元。
    3. 完稅款：{payment_3} 萬元。
    4. 尾款：{payment_4} 萬元。
    
    第四條：特約事項
    {special_terms}
    
    --------------------------------------
    系統自動生成時間：{timestamp}
    """
    
    import datetime
    details['timestamp'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return template.format(**details)

if __name__ == "__main__":
    deal_info = {
        "seller_name": "王小明",
        "buyer_name": "李大華",
        "property_address": "台北市大安區新生南路二段x號x樓",
        "property_rights": "全部持分 1/1",
        "total_price": "3,150",
        "payment_1": "315",
        "payment_2": "315",
        "payment_3": "315",
        "payment_4": "2,205",
        "special_terms": "1. 賣方同意贈送現有冷氣三台。\n2. 預定 2026/04/01 點交。"
    }
    
    print(generate_contract_draft(deal_info))
