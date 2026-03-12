# 平台適配器基底類別
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

class PlatformAdapter(ABC):
    """平台適配器基底類別"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.name = self.__class__.__name__.replace('Adapter', '').lower()
    
    @abstractmethod
    def authenticate(self) -> bool:
        """認證平台"""
        pass
    
    @abstractmethod
    def upload_product(self, product_data: Dict) -> Dict:
        """上傳產品"""
        pass
    
    @abstractmethod
    def schedule_post(self, product_data: Dict, schedule_time: str) -> Dict:
        """排程發布"""
        pass
    
    @abstractmethod
    def get_status(self, product_id: str) -> Dict:
        """取得上架狀態"""
        pass
    
    def validate_product(self, product_data: Dict) -> List[str]:
        """驗證產品資料"""
        errors = []
        required = ['title', 'description', 'price', 'images']
        for field in required:
            if not product_data.get(field):
                errors.append(f"缺少必要欄位: {field}")
        return errors
