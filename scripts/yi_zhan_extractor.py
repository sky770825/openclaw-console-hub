import re
import json
import sys

def extract_urls(text):
    # 放寬的網址正規表示式
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\.-]*'
    urls = re.findall(url_pattern, text)
    # 去重
    return list(set(urls))

def main():
    target_building = "益展學院"
    # 模擬從日誌或搜尋結果中抓取
    # 這裡放入針對「益展學院」常見的房地產平台連結格式
    sample_data = f"""
    搜尋關鍵字: {target_building}
    來源 591: https://market.591.com.tw/134421
    來源 樂居: https://www.leju.com.tw/page_search_result?oid=L1231114666f7f6
    來源 信義房屋: https://www.sinyi.com.tw/community/item/0025745
    來源 益展建設官網: http://www.yizhan.com.tw/project/academy
    重複測試: https://market.591.com.tw/134421
    """
    
    found_urls = extract_urls(sample_data)
    
    result = {
        "building": target_building,
        "urls": found_urls,
        "count": len(found_urls)
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
