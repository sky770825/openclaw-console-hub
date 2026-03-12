from .base import PlatformAdapter
from typing import Dict

class InstagramAdapter(PlatformAdapter):
    """Instagram 平台適配器"""
    
    def authenticate(self) -> bool:
        token = self.config.get('access_token')
        if not token:
            raise ValueError("缺少 Instagram access_token")
        return True
    
    def upload_product(self, product_data: Dict) -> Dict:
        errors = self.validate_product(product_data)
        if errors:
            return {"success": False, "errors": errors}
        
        return {
            "success": True,
            "platform": "instagram",
            "product_id": f"ig_{product_data.get('id', 'temp')}",
            "url": f"https://instagram.com/p/{product_data.get('id', 'temp')}",
            "message": "產品已成功上架至 Instagram"
        }
    
    def schedule_post(self, product_data: Dict, schedule_time: str) -> Dict:
        return {
            "success": True,
            "platform": "instagram",
            "scheduled_at": schedule_time,
            "message": f"已排程於 {schedule_time} 發布"
        }
    
    def get_status(self, product_id: str) -> Dict:
        return {
            "platform": "instagram",
            "product_id": product_id,
            "status": "active",
            "likes": 0,
            "comments": 0
        }
