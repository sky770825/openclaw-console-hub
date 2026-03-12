#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
行銷自動化平台適配器包
Marketing Automation Platform Adapters
"""

from .base import PlatformAdapter
from .facebook import FacebookAdapter
from .instagram import InstagramAdapter
from .shopee import ShopeeAdapter

__all__ = [
    'PlatformAdapter',
    'FacebookAdapter',
    'InstagramAdapter',
    'ShopeeAdapter'
]
