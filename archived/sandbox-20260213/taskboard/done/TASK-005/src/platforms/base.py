#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
平台適配器基類
Base Platform Adapter
"""

from abc import ABC, abstractmethod
from datetime import datetime
import json


class PlatformAdapter(ABC):
    """平台適配器基類"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.platform_name = self.__class__.__name__
    
    @abstractmethod
    def authenticate(self):
        """認證平台連線"""
        pass
    
    @abstractmethod
    def publish(self, product):
        """發布產品到平台"""
        pass
    
    @abstractmethod
    def update(self, product_id, product):
        """更新平台上的產品"""
        pass
    
    @abstractmethod
    def delete(self, product_id):
        """刪除平台上的產品"""
        pass
    
    @abstractmethod
    def get_posting_url(self, product_id):
        """取得發布連結"""
        pass
    
    def prepare_content(self, product):
        """準備產品內容"""
        return {
            'title': product.get('name', ''),
            'description': product.get('description', ''),
            'price': product.get('price', ''),
            'images': product.get('images', []),
            'tags': product.get('tags', []),
            'timestamp': datetime.now().isoformat()
        }
    
    def validate_content(self, content):
        """驗證內容是否有效"""
        required_fields = ['title', 'description', 'price']
        return all(content.get(field) for field in required_fields)
    
    def log_event(self, event_type, product_id, details):
        """記錄事件"""
        log_entry = {
            'platform': self.platform_name,
            'event_type': event_type,
            'product_id': product_id,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        return log_entry
