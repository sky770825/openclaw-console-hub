import os
import sys
import json
from datetime import datetime, timedelta
import requests

# 配置
BASE_URL = 'http://localhost:3011/api/openclaw'
API_KEY = os.environ.get('OPENCLAW_API_KEY')
HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

def cleanup():
    print('🚀 開始清理任務板...')
    # 1. 取得所有任務
    res = requests.get(f'{BASE_URL}/tasks', headers=HEADERS)
    if res.status_code != 200:
        print(f'❌ 無法取得任務: {res.text}')
        return

    tasks = res.json()
    now = datetime.now()
    cutoff = now - timedelta(hours=24)
    
    count = 0
    for t in tasks:
        # 找出超過 24 小時且已結束的任務
        updated_at = datetime.fromisoformat(t['updated_at'].replace('Z', '+00:00')).replace(tzinfo=None)
        if t['status'] in ['done', 'failed'] and updated_at < cutoff:
            print(f'🧹 清理過期任務: [{t["status"]}] {t["title"]} ({t["id"]})')
            del_res = requests.delete(f'{BASE_URL}/tasks/{t["id"]}', headers=HEADERS)
            if del_res.status_code == 200:
                count += 1
    
    print(f'✅ 清理完成，共移除 {count} 個過期任務。')

if __name__ == '__main__':
    cleanup()