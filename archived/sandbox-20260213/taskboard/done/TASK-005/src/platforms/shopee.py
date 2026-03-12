#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蝦皮購物適配器
Shopee Platform Adapter
"""

import requests
import json
import hmac
import hashlib
from datetime import datetime
from .base import PlatformAdapter


class ShopeeAdapter(PlatformAdapter):
    """蝦皮購物適配器"""
    
    def __init__(self, config=None):
        super().__init__(config)
        self.platform_name = "Shopee"
        self.base_url = "https://partner.shopeemobile.com/api/v2"
        self.shop_id = self.config.get('shop_id', '')
        self.partner_id = self.config.get('partner_id', '')
        self.partner_key = self.config.get('partner_key', '')
    
    def authenticate(self):
        """驗證蝦皮連線"""
        if not all([self.shop_id, self.partner_id, self.partner_key]):
            raise ValueError("蝦皮認證資訊不完整")
        return True
    
    def publish(self, product):
        """發布產品到蝦皮"""
        try:
            content = self.prepare_content(product)
            if not self.validate_content(content):
                raise ValueError("產品內容不完整")
            
            # 準備蝦皮商品資訊
            item_data = self._prepare_shopee_item(product, content)
            
            # 發布到蝦皮
            url = f"{self.base_url}/product/add_item"
            headers = self._get_headers()
            
            response = requests.post(url, json=item_data, headers=headers)
            
            if response.status_code in [200, 201]:
                result = response.json()
                if result.get('error') == '':
                    item_id = result.get('response', {}).get('item_id', '')
                    return {
                        'success': True,
                        'platform': 'Shopee',
                        'item_id': item_id,
                        'url': f"https://shopee.tw/product/{self.shop_id}/{item_id}",
                        'timestamp': datetime.now().isoformat()
                    }
            
            return {
                'success': False,
                'platform': 'Shopee',
                'error': response.text
            }
        except Exception as e:
            return {
                'success': False,
                'platform': 'Shopee',
                'error': str(e)
            }
    
    def _prepare_shopee_item(self, product, content):
        """準備蝦皮商品資訊"""
        business = product.get('business', '')
        
        item = {
            'item_name': content['title'],
            'description': content['description'],
            'item_sku': f"{business}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'price': int(float(content['price'].replace(',', '')) * 100),  # 蝦皮用分為單位
            'stock': 999,  # 預設庫存
            'images': self._prepare_images(product.get('images', [])),
            'category_id': self._get_category_id(business),
            'attributes': self._prepare_attributes(product, business)
        }
        
        return {'item': item, 'shop_id': self.shop_id}
    
    def _prepare_images(self, images):
        """準備圖片"""
        return [
            {
                'image_url': img,
                'image_id_list': []
            } for img in images[:9]  # 蝦皮最多 9 張圖片
        ]
    
    def _get_category_id(self, business):
        """取得蝦皮分類 ID"""
        categories = {
            '住商不動產': 26001,  # 房地產
            '飲料店': 26007,      # 食品飲料
            '普特斯防霾紗窗': 26005  # 家居用品
        }
        return categories.get(business, 26001)
    
    def _prepare_attributes(self, product, business):
        """準備商品屬性"""
        attributes = []
        
        if business == '住商不動產':
            attributes = [
                {'attribute_id': 1, 'attribute_value': product.get('address', '')},
                {'attribute_id': 2, 'attribute_value': product.get('area', '')},
                {'attribute_id': 3, 'attribute_value': product.get('rooms', '')}
            ]
        elif business == '飲料店':
            attributes = [
                {'attribute_id': 1, 'attribute_value': product.get('category', '')},
                {'attribute_id': 2, 'attribute_value': product.get('size_options', '')},
            ]
        elif business == '普特斯防霾紗窗':
            attributes = [
                {'attribute_id': 1, 'attribute_value': product.get('material', '')},
                {'attribute_id': 2, 'attribute_value': product.get('dimensions', '')},
            ]
        
        return attributes
    
    def _get_headers(self):
        """取得請求標頭"""
        timestamp = str(int(datetime.now().timestamp()))
        authorization = self._generate_signature(timestamp)
        
        return {
            'Content-Type': 'application/json',
            'Authorization': authorization,
            'X-API-Source': 'seller-api'
        }
    
    def _generate_signature(self, timestamp):
        """生成簽名"""
        base_string = f"{self.partner_id}{timestamp}"
        signature = hmac.new(
            self.partner_key.encode(),
            base_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{self.partner_id}:{timestamp}:{signature}"
    
    def update(self, product_id, product):
        """更新蝦皮商品"""
        # 蝦皮通常需要刪除後重新發布
        self.delete(product_id)
        return self.publish(product)
    
    def delete(self, product_id):
        """刪除蝦皮商品"""
        url = f"{self.base_url}/product/delete_item"
        headers = self._get_headers()
        data = {
            'item_id': product_id,
            'shop_id': self.shop_id
        }
        
        response = requests.post(url, json=data, headers=headers)
        return response.status_code in [200, 201]
    
    def get_posting_url(self, product_id):
        """取得商品連結"""
        return f"https://shopee.tw/product/{self.shop_id}/{product_id}"
