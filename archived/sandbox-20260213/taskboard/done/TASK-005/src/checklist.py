#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
檢查清單系統
Checklist System
"""

import json
from datetime import datetime
from pathlib import Path


class ChecklistManager:
    """上架檢查清單管理系統"""
    
    def __init__(self):
        self.checks = self._define_checks()
    
    def _define_checks(self):
        """定義檢查項目"""
        return [
            {
                'id': 'basic_info',
                'name': '基本資訊',
                'description': '產品名稱、描述、價格必填',
                'check_fn': self._check_basic_info
            },
            {
                'id': 'images',
                'name': '產品圖片',
                'description': '至少需要 1 張產品圖片',
                'check_fn': self._check_images
            },
            {
                'id': 'business_specific',
                'name': '業務特定欄位',
                'description': '根據業務類型填寫必要欄位',
                'check_fn': self._check_business_specific
            },
            {
                'id': 'description_quality',
                'name': '描述品質',
                'description': '描述至少 20 個字元',
                'check_fn': self._check_description_quality
            },
            {
                'id': 'tags',
                'name': '標籤',
                'description': '至少添加 3 個標籤',
                'check_fn': self._check_tags
            },
            {
                'id': 'price_format',
                'name': '價格格式',
                'description': '價格格式正確',
                'check_fn': self._check_price_format
            }
        ]
    
    def check(self, product):
        """執行所有檢查"""
        results = []
        for check_item in self.checks:
            passed = check_item['check_fn'](product)
            results.append({
                'id': check_item['id'],
                'name': check_item['name'],
                'passed': passed,
                'message': check_item['description']
            })
        return results
    
    def verify(self, product):
        """驗證所有項目是否通過"""
        results = self.check(product)
        return all(r['passed'] for r in results)
    
    # 檢查函數
    def _check_basic_info(self, product):
        """檢查基本資訊"""
        required_fields = ['name', 'description', 'price']
        return all(product.get(field) for field in required_fields)
    
    def _check_images(self, product):
        """檢查圖片"""
        images = product.get('images', [])
        return len(images) >= 1
    
    def _check_business_specific(self, product):
        """檢查業務特定欄位"""
        business = product.get('business', '')
        
        if business == '住商不動產':
            required = ['address', 'area', 'rooms', 'floor']
        elif business == '飲料店':
            required = ['category', 'size_options', 'ingredients']
        elif business == '普特斯防霾紗窗':
            required = ['material', 'dimensions', 'warranty']
        else:
            return True
        
        return all(product.get(field) for field in required)
    
    def _check_description_quality(self, product):
        """檢查描述品質"""
        description = product.get('description', '')
        return len(description) >= 20
    
    def _check_tags(self, product):
        """檢查標籤"""
        tags = product.get('tags', [])
        return len(tags) >= 3
    
    def _check_price_format(self, product):
        """檢查價格格式"""
        price = product.get('price', '')
        try:
            # 移除逗號並轉換為數字
            float(str(price).replace(',', ''))
            return True
        except ValueError:
            return False
    
    def get_auto_suggestions(self, product):
        """取得自動建議"""
        suggestions = []
        business = product.get('business', '')
        
        # 檢查圖片數量
        images = product.get('images', [])
        if len(images) < 5:
            suggestions.append(f"建議上傳至少 5 張圖片，目前 {len(images)} 張")
        
        # 檢查標籤
        tags = product.get('tags', [])
        if len(tags) < 5:
            suggestions.append(f"建議添加至少 5 個標籤，目前 {len(tags)} 個")
        
        # 業務特定建議
        if business == '住商不動產':
            if not product.get('location_map'):
                suggestions.append("建議添加地圖位置")
            if not product.get('virtual_tour'):
                suggestions.append("建議添加虛擬導覽")
        
        elif business == '飲料店':
            if not product.get('recipe'):
                suggestions.append("建議添加製作食譜或配方說明")
            if not product.get('promotional_info'):
                suggestions.append("建議添加優惠資訊")
        
        elif business == '普特斯防霾紗窗':
            if not product.get('installation_guide'):
                suggestions.append("建議添加安裝指南")
            if not product.get('care_instructions'):
                suggestions.append("建議添加保養說明")
        
        return suggestions
    
    def generate_report(self, product):
        """生成檢查報告"""
        results = self.check(product)
        suggestions = self.get_auto_suggestions(product)
        
        all_passed = all(r['passed'] for r in results)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'product_id': product.get('id', 'N/A'),
            'product_name': product.get('name', 'N/A'),
            'status': 'ready' if all_passed else 'needs_review',
            'checks': results,
            'suggestions': suggestions,
            'readiness_score': self._calculate_readiness_score(product, results)
        }
        
        return report
    
    def _calculate_readiness_score(self, product, results):
        """計算上架準備度評分 (0-100)"""
        # 基本檢查通過: 60 分
        base_score = sum(10 for r in results if r['passed']) / len(results) * 60
        
        # 額外加分
        bonus = 0
        if len(product.get('images', [])) >= 5:
            bonus += 10
        if len(product.get('tags', [])) >= 5:
            bonus += 10
        if len(product.get('description', '')) >= 100:
            bonus += 10
        
        return min(100, int(base_score + bonus))
