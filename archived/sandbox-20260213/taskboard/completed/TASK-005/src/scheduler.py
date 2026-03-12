import json
import schedule
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Callable

class Scheduler:
    """上架排程管理器"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.scheduled_dir = data_dir / "scheduled"
        self.scheduled_dir.mkdir(exist_ok=True)
        self.jobs = {}
    
    def schedule_product(self, product_id: str, schedule_time: str, 
                        platforms: List[str], callback: Callable) -> Dict:
        """排程產品上架"""
        try:
            dt = datetime.fromisoformat(schedule_time.replace('Z', '+00:00'))
        except ValueError:
            try:
                dt = datetime.strptime(schedule_time, "%Y-%m-%d %H:%M")
            except ValueError:
                return {"success": False, "error": "無效的時間格式"}
        
        schedule_data = {
            "product_id": product_id,
            "scheduled_at": schedule_time,
            "platforms": platforms,
            "status": "scheduled",
            "created_at": datetime.now().isoformat()
        }
        
        # 儲存排程
        job_file = self.scheduled_dir / f"{product_id}_{dt.strftime('%Y%m%d%H%M')}.json"
        with open(job_file, 'w', encoding='utf-8') as f:
            json.dump(schedule_data, f, indent=2, ensure_ascii=False)
        
        # 設定排程
        job = schedule.every().day.at(dt.strftime("%H:%M")).do(callback, product_id, platforms)
        self.jobs[product_id] = job
        
        return {
            "success": True,
            "message": f"已排程於 {schedule_time} 上架至 {', '.join(platforms)}",
            "job_id": product_id
        }
    
    def list_scheduled(self) -> List[Dict]:
        """列出所有排程"""
        scheduled = []
        for job_file in self.scheduled_dir.glob("*.json"):
            with open(job_file, 'r', encoding='utf-8') as f:
                scheduled.append(json.load(f))
        return scheduled
    
    def cancel_schedule(self, product_id: str) -> Dict:
        """取消排程"""
        if product_id in self.jobs:
            schedule.cancel_job(self.jobs[product_id])
            del self.jobs[product_id]
        
        # 刪除排程檔案
        for job_file in self.scheduled_dir.glob(f"{product_id}_*.json"):
            job_file.unlink()
        
        return {"success": True, "message": f"已取消 {product_id} 的排程"}
    
    def run_pending(self):
        """執行待處理的排程"""
        schedule.run_pending()
