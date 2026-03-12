#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量上傳產品腳本
Batch Upload Script
"""

import json
import csv
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cli import get_default_template, get_template_name


def load_csv(csv_file):
    """從 CSV 檔案載入產品"""
    products = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(row)
    return products


def create_product_from_row(row, business):
    """從 CSV 行建立產品"""
    template = get_default_template(business)
    
    # 基本欄位
    product = {
        **template,
        'name': row.get('名稱', ''),
        'price': row.get('價格', ''),
        'description': row.get('描述', ''),
        'images': [img.strip() for img in row.get('圖片', '').split(';')],
        'tags': [tag.strip() for tag in row.get('標籤', '').split(',')],
    }
    
    # 業務特定欄位
    if business == '住商不動產':
        product.update({
            'address': row.get('地址', ''),
            'area': row.get('坪數', ''),
            'rooms': row.get('房數', ''),
            'floor': row.get('樓層', '')
        })
    elif business == '飲料店':
        product.update({
            'category': row.get('分類', ''),
            'size_options': row.get('容量', ''),
            'ingredients': row.get('成分', '')
        })
    elif business == '普特斯防霾紗窗':
        product.update({
            'material': row.get('材質', ''),
            'dimensions': row.get('尺寸', ''),
            'warranty': row.get('保固', '')
        })
    
    return product


def batch_upload(csv_file, business, dry_run=False):
    """批量上傳產品"""
    print(f"📁 讀取 CSV 檔案: {csv_file}")
    
    products = load_csv(csv_file)
    print(f"📦 找到 {len(products)} 個產品")
    
    success_count = 0
    error_count = 0
    
    for i, row in enumerate(products, 1):
        try:
            product = create_product_from_row(row, business)
            
            if not product['name']:
                print(f"⚠️  第 {i} 行: 缺少產品名稱，跳過")
                error_count += 1
                continue
            
            product_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{i:03d}"
            product['id'] = product_id
            product['created_at'] = datetime.now().isoformat()
            
            # 保存產品
            data_dir = Path(__file__).parent.parent / "data"
            product_file = data_dir / "products" / f"{product_id}.json"
            
            product_file.parent.mkdir(parents=True, exist_ok=True)
            with open(product_file, 'w', encoding='utf-8') as f:
                json.dump(product, f, indent=2, ensure_ascii=False)
            
            print(f"✅ 第 {i} 行: {product['name']} (ID: {product_id})")
            success_count += 1
            
        except Exception as e:
            print(f"❌ 第 {i} 行: 錯誤 - {e}")
            error_count += 1
    
    print("\n" + "="*50)
    print(f"✅ 成功: {success_count}")
    print(f"❌ 失敗: {error_count}")
    print("="*50)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='批量上傳產品')
    parser.add_argument('csv_file', help='CSV 檔案路徑')
    parser.add_argument('--business', choices=['住商不動產', '飲料店', '普特斯防霾紗窗'],
                       required=True, help='業務類型')
    parser.add_argument('--dry-run', action='store_true', help='測試模式')
    
    args = parser.parse_args()
    
    batch_upload(args.csv_file, args.business, args.dry_run)
