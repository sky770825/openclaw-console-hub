#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Facebook 適配器
Facebook Platform Adapter
"""

import requests
import json
from datetime import datetime
from .base import PlatformAdapter


class FacebookAdapter(PlatformAdapter):
    """Facebook/Marketplace 適配器"""
    
    def __init__(self, config=None):
        super().__init__(config)
        self.platform_name = "Facebook"
        self.api_version = "v18.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.page_id = self.config.get('page_id', '')
        self.access_token = self.config.get('access_token', '')
    
    def authenticate(self):
        """驗證 Facebook 連線"""
        if not self.access_token or not self.page_id:
            raise ValueError("Facebook 認證資訊不完整")
        
        # 驗證 token
        url = f"{self.base_url}/me"
        params = {'access_token': self.access_token}
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return True
        else:
            raise Exception(f"Facebook 認證失敗: {response.text}")
    
    def publish(self, product):
        """發布產品到 Facebook"""
        try:
            # 準備內容
            content = self.prepare_content(product)
            if not self.validate_content(content):
                raise ValueError("產品內容不完整")
            
            # 準備 Facebook 發文
            post_data = self._prepare_facebook_post(product, content)
            
            # 發布到粉絲專頁
            url = f"{self.base_url}/{self.page_id}/feed"
            params = {'access_token': self.access_token}
            response = requests.post(url, data=post_data, params=params)
            
            if response.status_code in [200, 201]:
                result = response.json()
                post_id = result.get('id', '')
                return {
                    'success': True,
                    'platform': 'Facebook',
                    'post_id': post_id,
                    'url': f"https://facebook.com/{post_id}",
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'platform': 'Facebook',
                    'error': response.text
                }
        except Exception as e:
            return {
                'success': False,
                'platform': 'Facebook',
                'error': str(e)
            }
    
    def _prepare_facebook_post(self, product, content):
        """準備 Facebook 發文"""
        business = product.get('business', '')
        
        # 根據業務類型準備特定內容
        if business == '住商不動產':
            message = self._prepare_real_estate_post(product, content)
        elif business == '飲料店':
            message = self._prepare_beverage_post(product, content)
        elif business == '普特斯防霾紗窗':
            message = self._prepare_window_screen_post(product, content)
        else:
            message = content['description']
        
        post_data = {
            'message': message,
            'link': product.get('link', ''),
            'picture': product.get('images', [''])[0] if product.get('images') else '',
            'caption': content['title']
        }
        
        return post_data
    
    def _prepare_real_estate_post(self, product, content):
        """準備不動產發文"""
        return f"""
🏠 {content['title']}

📍 地址: {product.get('address', 'N/A')}
📏 坪數: {product.get('area', 'N/A')} 坪
🚪 房數: {product.get('rooms', 'N/A')} 房
🏢 樓層: {product.get('floor', 'N/A')} 樓
💰 價格: {content['price']}

{content['description']}

#不動產 #房屋 #住商不動產
        """
    
    def _prepare_beverage_post(self, product, content):
        """準備飲料店發文"""
        return f"""
🥤 {content['title']}

🏷️ 分類: {product.get('category', 'N/A')}
📦 容量: {product.get('size_options', 'N/A')}
🌿 成分: {product.get('ingredients', 'N/A')}
💰 價格: {content['price']}

{content['description']}

#飲料 #飲品 #{product.get('category', '飲料')}
        """
    
    def _prepare_window_screen_post(self, product, content):
        """準備防霾紗窗發文"""
        return f"""
🪟 {content['title']}

🔧 材質: {product.get('material', 'N/A')}
📐 尺寸: {product.get('dimensions', 'N/A')}
🛡️ 保固: {product.get('warranty', 'N/A')}
💰 價格: {content['price']}

{content['description']}

#防霾紗窗 #家居 #普特斯
        """
    
    def update(self, product_id, product):
        """更新 Facebook 產品"""
        # Facebook 貼文通常透過刪除後重新發布
        return self.publish(product)
    
    def delete(self, product_id):
        """刪除 Facebook 貼文"""
        url = f"{self.base_url}/{product_id}"
        params = {'access_token': self.access_token}
        response = requests.delete(url, params=params)
        
        return response.status_code in [200, 204]
    
    def get_posting_url(self, product_id):
        """取得貼文連結"""
        return f"https://facebook.com/{product_id}"
