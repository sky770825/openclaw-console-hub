#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
排程系統
Scheduling System
"""

import json
import schedule
import threading
import time
from datetime import datetime
from pathlib import Path
from uuid import uuid4


class Scheduler:
    """產品發布排程管理系統"""
    
    def __init__(self, data_dir="data"):
        self.data_dir = Path(data_dir)
        self.scheduled_dir = self.data_dir / "scheduled"
        self.scheduled_dir.mkdir(parents=True, exist_ok=True)
        self.scheduled_file = self.scheduled_dir / "jobs.json"
        self.jobs = self._load_jobs()
        self._scheduler_thread = None
    
    def add_job(self, product_id, schedule_time, platforms, callback=None):
        """
        新增排程任務
        
        Args:
            product_id: 產品 ID
            schedule_time: 排程時間 (格式: YYYY-MM-DD HH:MM)
            platforms: 平台列表
            callback: 執行時的回呼函數
        
        Returns:
            job_id: 任務 ID
        """
        job_id = str(uuid4())[:8]
        
        job = {
            'id': job_id,
            'product_id': product_id,
            'schedule_time': schedule_time,
            'platforms': platforms,
            'status': 'scheduled',
            'created_at': datetime.now().isoformat(),
            'executed_at': None,
            'result': None
        }
        
        self.jobs.append(job)
        self._save_jobs()
        
        # 排程任務
        self._schedule_job(job)
        
        return job_id
    
    def _schedule_job(self, job):
        """排程任務執行"""
        schedule_time = job['schedule_time']
        hour, minute = schedule_time.split()[1].split(':')
        
        schedule.at(f"{hour}:{minute}").do(
            self._execute_job,
            job_id=job['id']
        )
    
    def _execute_job(self, job_id):
        """執行排程任務"""
        job = self._get_job(job_id)
        if not job:
            return
        
        # 更新狀態
        job['status'] = 'executing'
        job['executed_at'] = datetime.now().isoformat()
        self._save_jobs()
        
        # 執行發布 (實際實現需要調用 CLI)
        result = {
            'success': True,
            'message': f"已發布產品 {job['product_id']} 到 {', '.join(job['platforms'])}",
            'timestamp': datetime.now().isoformat()
        }
        
        job['status'] = 'completed'
        job['result'] = result
        self._save_jobs()
    
    def list_jobs(self, status=None):
        """列出任務"""
        if status:
            return [j for j in self.jobs if j['status'] == status]
        return self.jobs
    
    def get_job(self, job_id):
        """取得任務詳情"""
        return self._get_job(job_id)
    
    def _get_job(self, job_id):
        """內部: 取得任務"""
        for job in self.jobs:
            if job['id'] == job_id:
                return job
        return None
    
    def delete_job(self, job_id):
        """刪除任務"""
        self.jobs = [j for j in self.jobs if j['id'] != job_id]
        self._save_jobs()
    
    def reschedule_job(self, job_id, new_time):
        """重新排程任務"""
        job = self._get_job(job_id)
        if job:
            job['schedule_time'] = new_time
            self._save_jobs()
            return True
        return False
    
    def start_scheduler(self):
        """啟動排程執行緒"""
        if self._scheduler_thread and self._scheduler_thread.is_alive():
            return
        
        self._scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self._scheduler_thread.start()
    
    def _run_scheduler(self):
        """執行排程迴圈"""
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    def _load_jobs(self):
        """載入排程任務"""
        if self.scheduled_file.exists():
            with open(self.scheduled_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def _save_jobs(self):
        """儲存排程任務"""
        with open(self.scheduled_file, 'w', encoding='utf-8') as f:
            json.dump(self.jobs, f, indent=2, ensure_ascii=False)
    
    def get_stats(self):
        """取得排程統計"""
        total = len(self.jobs)
        scheduled = len([j for j in self.jobs if j['status'] == 'scheduled'])
        completed = len([j for j in self.jobs if j['status'] == 'completed'])
        failed = len([j for j in self.jobs if j['status'] == 'failed'])
        
        return {
            'total': total,
            'scheduled': scheduled,
            'completed': completed,
            'failed': failed
        }
