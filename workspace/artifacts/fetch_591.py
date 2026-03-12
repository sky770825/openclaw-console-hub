import requests
import json
import sys
import argparse
import time
import random

def fetch_591(region_name):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
    }

    session = requests.Session()
    
    # 1. Get CSRF token and session cookies
    try:
        main_url = "https://sale.591.com.tw/"
        res = session.get(main_url, headers=headers, timeout=10)
        
        # Extract CSRF token from meta tag if needed, but 591 often uses cookies
        # For the Sale API, it usually needs the X-CSRF-TOKEN from the cookie or a specific header
        csrf_token = session.cookies.get('csrf_token')
        if not csrf_token:
            # Fallback for older versions or different endpoints
            import re
            match = re.search(r'<meta name="csrf-token" content="([^"]+)">', res.text)
            if match:
                csrf_token = match.group(1)
        
        if csrf_token:
            headers['X-CSRF-TOKEN'] = csrf_token

    except Exception as e:
        return {"error": f"Failed to initialize session: {str(e)}"}

    # 2. Search for the region/keyword
    # Note: 591 API for sales list
    # query params: type=2 (sale), keywords=region_name
    api_url = "https://sale.591.com.tw/home/search/list"
    params = {
        "type": "2",
        "shType": "list",
        "keywords": region_name,
        "regionid": "0", # 0 allows global search with keywords
    }

    try:
        # Some anti-bot delay
        time.sleep(random.uniform(1, 2))
        
        response = session.get(api_url, headers=headers, params=params, timeout=15)
        if response.status_code != 200:
            return {"error": f"API returned status code {response.status_code}"}
        
        data = response.json()
        
        if 'data' not in data or 'house_list' not in data['data']:
            return {"error": "Unexpected data structure from 591 API", "raw": data}
        
        results = []
        for item in data['data']['house_list']:
            # Standardizing fields
            # 591 sale item fields: title, address, price, area, houseid
            title = item.get('title')
            address = item.get('address')
            price = f"{item.get('price')} {item.get('unit')}"
            area = f"{item.get('area')} 坪"
            link = f"https://sale.591.com.tw/home/housesecond/detail/v2/{item.get('houseid')}.html"
            
            results.append({
                "title": title,
                "address": address,
                "price": price,
                "area": area,
                "link": link
            })
            
            if len(results) >= 15: # Grab at least 10, target 15
                break
                
        return results

    except Exception as e:
        return {"error": f"Failed during data fetching: {str(e)}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True, help="Region to search")
    args = parser.parse_args()
    
    results = fetch_591(args.region)
    print(json.dumps(results, ensure_ascii=False, indent=2))
