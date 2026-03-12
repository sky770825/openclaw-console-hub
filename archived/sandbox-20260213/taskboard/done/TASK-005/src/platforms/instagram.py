#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Instagram 適配器
Instagram Platform Adapter
"""

import requests
import json
from datetime import datetime
from .base import PlatformAdapter


class InstagramAdapter(PlatformAdapter):
    """Instagram 適配器"""
    
    def __init__(self, config=None):
        super().__init__(config)
        self.platform_name = "Instagram"
        self.api_version = "v18.0"
        self.base_url = f"https://graph.instagram.com/{self.api_version}"
        self.account_id = self.config.get('account_id', '')
        self.access_token = self.config.get('access_token', '')
    
    def authenticate(self):
        """驗證 Instagram 連線"""
        if not self.access_token or not self.account_id:
            raise ValueError("Instagram 認證資訊不完整")
        
        # 驗證 token
        url = f"{self.base_url}/me"
        params = {'access_token': self.access_token}
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return True
        else:
            raise Exception(f"Instagram 認證失敗: {response.text}")
    
    def publish(self, product):
        """發布產品到 Instagram"""
        try:
            content = self.prepare_content(product)
            if not self.validate_content(content):
                raise ValueError("產品內容不完整")
            
            # 準備 Instagram 動態
            caption = self._prepare_instagram_caption(product, content)
            
            # 上傳第一張圖片作為媒體
            media_id = self._upload_media(product.get('images', [''])[0])
            
            if not media_id:
                return {
                    'success': False,
                    'platform': 'Instagram',
                    'error': '圖片上傳失敗'
                }
            
            # 發布動態
            url = f"{self.base_url}/{self.account_id}/media"
            post_data = {
                'image_url': product.get('images', [''])[0],
                'caption': caption,
                'access_token': self.access_token
            }
            
            response = requests.post(url, data=post_data)
            
            if response.status_code in [200, 201]:
                result = response.json()
                media_id = result.get('id', '')
                return {
                    'success': True,
                    'platform': 'Instagram',
                    'post_id': media_id,
                    'url': f"https://instagram.com/p/{media_id}",
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'platform': 'Instagram',
                    'error': response.text
                }
        except Exception as e:
            return {
                'success': False,
                'platform': 'Instagram',
                'error': str(e)
            }
    
    def _upload_media(self, image_path):
        """上傳媒體"""
        try:
            url = f"{self.base_url}/{self.account_id}/media"
            with open(image_path, 'rb') as f:
                files = {'file': f}
                params = {'access_token': self.access_token}
                response = requests.post(url, files=files, params=params)
            
            if response.status_code in [200, 201]:
                return response.json().get('id')
            return None
        except Exception as e:
            print(f"媒體上傳失敗: {e}")
            return None
    
    def _prepare_instagram_caption(self, product, content):
        """準備 Instagram 文案"""
        business = product.get('business', '')
        
        if business == '住商不動產':
            caption = self._prepare_real_estate_caption(product, content)
        elif business == '飲料店':
            caption = self._prepare_beverage_caption(product, content)
        elif business == '普特斯防霾紗窗':
            caption = self._prepare_window_screen_caption(product, content)
        else:
            caption = content['description']
        
        # Instagram 限制 2,200 字元
        if len(caption) > 2200:
            caption = caption[:2197] + "..."
        
        return caption
    
    def _prepare_real_estate_caption(self, product, content):
        """準備不動產文案"""
        hashtags = "#不動產 #房屋 #住商不動產 #房地產 #台灣房屋"
        return f"{content['title']}\n\n📍 {product.get('address', '')}\n💰 {content['price']}\n\n{content['description']}\n\n{hashtags}"
    
    def _prepare_beverage_caption(self, product, content):
        """準備飲料店文案"""
        hashtags = "#飲料 #飲品 #咖啡 #台灣飲料"
        return f"{content['title']}\n\n🥤 {product.get('category', '')}\n💰 {content['price']}\n\n{content['description']}\n\n{hashtags}"
    
    def _prepare_window_screen_caption(self, product, content):
        """準備防霾紗窗文案"""
        hashtags = "#防霾紗窗 #家居 #環保 #健康"
        return f"{content['title']}\n\n🪟 {product.get('material', '')}\n💰 {content['price']}\n\n{content['description']}\n\n{hashtags}"
    
    def update(self, product_id, product):
        """更新 Instagram 產品"""
        # 更新文案
        caption = self._prepare_instagram_caption(product, self.prepare_content(product))
        url = f"{self.base_url}/{product_id}"
        params = {
            'caption': caption,
            'access_token': self.access_token
        }
        response = requests.post(url, params=params)
        return response.status_code in [200, 201]
    
    def delete(self, product_id):
        """刪除 Instagram 動態"""
        url = f"{self.base_url}/{product_id}"
        params = {'access_token': self.access_token}
        response = requests.delete(url, params=params)
        return response.status_code in [200, 204]
    
    def get_posting_url(self, product_id):
        """取得貼文連結"""
        return f"https://instagram.com/p/{product_id}"
