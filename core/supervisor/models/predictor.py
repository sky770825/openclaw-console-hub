import json
import os
from datetime import datetime, timedelta

class Predictor:
    def __init__(self, metrics_path='logs/supervisor_metrics.jsonl'):
        self.metrics_path = metrics_path

    def predict_failure(self):
        """簡單的趨勢分析預測"""
        if not os.path.exists(self.metrics_path):
            return {"risk": "none", "reason": "No data"}

        # 讀取最近 10 筆數據
        metrics = []
        with open(self.metrics_path, 'r') as f:
            for line in f:
                metrics.append(json.loads(line))
        
        recent = metrics[-10:]
        if len(recent) < 5:
            return {"risk": "low", "reason": "Insufficient data for trend"}

        # 檢查磁碟增長速度
        disk_trend = [m['system']['disk_usage'] for m in recent]
        if disk_trend[-1] > disk_trend[0] + 5: # 增長超過 5%
            return {"risk": "medium", "reason": "Rapid disk usage growth detected"}

        # 檢查 API 延遲
        latencies = [m['api_health'].get('latency_ms', 0) for m in recent if m['api_health']['status'] == 'up']
        if latencies and latencies[-1] > sum(latencies)/len(latencies) * 1.5:
            return {"risk": "medium", "reason": "API latency degradation"}

        return {"risk": "low", "reason": "Normal operations"}
