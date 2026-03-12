from .base import PlatformAdapter
from typing import Dict

class ShopeeAdapter(PlatformAdapter):
    """蝦皮購物平台適配器"""
    
    def authenticate(self) -> bool:
        shop_id = self.config.get('shop_id')
        partner_id = self.config.get('partner_id')
        if not shop_id or not partner_id:
            raise ValueError("缺少蝦皮 shop_id 或 partner_id")
        return True
    
    def upload_product(self, product_data: Dict) -> Dict:
        errors = self.validate_product(product_data)
        if errors:
            return {"success": False, "errors": errors}
        
        # 蝦皮特有欄位驗證
        if not product_data.get('category_id'):
            errors.append("蝦皮需要 category_id")
        if not product_data.get('stock'):
            errors.append("蝦皮需要 stock 庫存數量")
        
        if errors:
            return {"success": False, "errors": errors}
        
        return {
            "success": True,
            "platform": "shopee",
            "product_id": f"sp_{product_data.get('id', 'temp')}",
            "url": f"https://shopee.tw/product/{product_data.get('id', 'temp')}",
            "message": "產品已成功上架至蝦皮"
        }
    
    def schedule_post(self, product_data: Dict, schedule_time: str) -> Dict:
        return {
            "success": True,
            "platform": "shopee",
            "scheduled_at": schedule_time,
            "message": f"已排程於 {schedule_time} 上架"
        }
    
    def get_status(self, product_id: str) -> Dict:
        return {
            "platform": "shopee",
            "product_id": product_id,
            "status": "active",
            "stock": 0,
            "sold": 0
        }
