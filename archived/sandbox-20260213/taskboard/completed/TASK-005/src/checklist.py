import json
from pathlib import Path
from typing import Dict, List

class ChecklistManager:
    """上架檢查清單管理器"""
    
    def __init__(self):
        self.checklists = {
            "real_estate": [
                "標題包含地點與物件類型",
                "描述包含坪數、樓層、屋齡",
                "價格已確認正確",
                "上傳至少 5 張照片（客廳、臥室、廚房、衛浴、陽台）",
                "聯絡電話正確",
                "確認產權資料",
                "周邊設施描述"
            ],
            "beverage": [
                "產品名稱清楚",
                "成分/過敏原標示",
                "容量規格",
                "價格包含容量對照",
                "產品照片（正面、側面、實際飲品）",
                "適合人群標示",
                "保存期限"
            ],
            "window_screen": [
                "產品型號明確",
                "防霾效率數據",
                "透風率規格",
                "尺寸測量方式",
                "安裝說明",
                "產品照片（正面、細節、安裝範例）",
                "保固條款",
                "適用窗型"
            ]
        }
    
    def get_checklist(self, category: str) -> List[str]:
        """取得檢查清單"""
        return self.checklists.get(category, self.checklists["beverage"])
    
    def validate_product(self, product: Dict, category: str) -> Dict:
        """驗證產品資料完整性"""
        checklist = self.get_checklist(category)
        results = []
        
        for item in checklist:
            results.append({
                "item": item,
                "checked": False,
                "required": True
            })
        
        # 自動檢查一些欄位
        if product.get('title'):
            for r in results:
                if '標題' in r['item'] or '名稱' in r['item']:
                    r['checked'] = True
        
        if product.get('images') and len(product.get('images', [])) >= 1:
            for r in results:
                if '照片' in r['item']:
                    r['checked'] = True
        
        if product.get('price'):
            for r in results:
                if '價格' in r['item']:
                    r['checked'] = True
        
        passed = sum(1 for r in results if r['checked'])
        total = len(results)
        
        return {
            "category": category,
            "items": results,
            "summary": {
                "passed": passed,
                "total": total,
                "percentage": round(passed / total * 100, 1)
            }
        }
    
    def generate_report(self, validation_result: Dict) -> str:
        """產生檢查報告"""
        report = []
        report.append(f"📋 上架檢查清單 - {validation_result['category']}")
        report.append(f"完成度: {validation_result['summary']['passed']}/{validation_result['summary']['total']} ({validation_result['summary']['percentage']}%)")
        report.append("")
        
        for item in validation_result['items']:
            status = "✅" if item['checked'] else "❌"
            report.append(f"{status} {item['item']}")
        
        return "\n".join(report)
