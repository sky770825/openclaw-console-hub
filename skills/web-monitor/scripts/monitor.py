#!/usr/bin/env python3
"""
Web Monitor - 網頁內容監控核心腳本
功能：抓取網頁、比對差異、觸發通知
"""

import sys
import os
import json
import hashlib
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urlparse

# 資料目錄
DATA_DIR = Path(os.getenv("WEB_MONITOR_DATA", "~/.web-monitor")).expanduser()
DATA_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class MonitorConfig:
    """監控項目配置"""
    url: str
    name: str
    selector: Optional[str] = None  # CSS 選擇器，抓取特定區域
    interval_minutes: int = 60
    enabled: bool = True
    last_check: Optional[str] = None
    last_hash: Optional[str] = None
    notify_on_change: bool = True
    
    @property
    def id(self) -> str:
        """生成唯一 ID"""
        return hashlib.md5(f"{self.name}:{self.url}".encode()).hexdigest()[:12]

@dataclass
class CheckResult:
    """檢查結果"""
    url: str
    timestamp: str
    changed: bool
    old_hash: Optional[str]
    new_hash: str
    diff: Optional[str] = None
    content_preview: Optional[str] = None
    error: Optional[str] = None

class WebMonitor:
    """網頁監控器"""
    
    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = data_dir
        self.config_file = data_dir / "monitors.json"
        self.snapshots_dir = data_dir / "snapshots"
        self.snapshots_dir.mkdir(exist_ok=True)
        
    def _load_configs(self) -> List[MonitorConfig]:
        """載入所有監控配置"""
        if not self.config_file.exists():
            return []
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [MonitorConfig(**item) for item in data.get('monitors', [])]
        except Exception as e:
            print(f"載入配置失敗: {e}", file=sys.stderr)
            return []
    
    def _save_configs(self, configs: List[MonitorConfig]):
        """保存監控配置"""
        data = {'monitors': [asdict(c) for c in configs]}
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _fetch_content(self, url: str, selector: Optional[str] = None) -> Tuple[str, str]:
        """
        抓取網頁內容
        回傳: (content, hash)
        """
        # 使用 curl 抓取
        try:
            result = subprocess.run(
                ['curl', '-sL', '--max-time', '30', '-A', 'WebMonitor/1.0', url],
                capture_output=True,
                text=True,
                timeout=35
            )
            
            if result.returncode != 0:
                raise Exception(f"抓取失敗: {result.stderr}")
            
            content = result.stdout
            
            # 如果有選擇器，嘗試提取（簡化版，實際可用 BeautifulSoup）
            if selector:
                # 這裡可以用更複雜的 HTML 解析
                # 現在先用完整內容
                pass
            
            content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]
            return content, content_hash
            
        except subprocess.TimeoutExpired:
            raise Exception("抓取超時")
        except Exception as e:
            raise Exception(f"抓取錯誤: {e}")
    
    def _save_snapshot(self, monitor_id: str, content: str):
        """保存內容快照"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_file = self.snapshots_dir / f"{monitor_id}_{timestamp}.html"
        with open(snapshot_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 保留最近 10 個快照
        self._cleanup_old_snapshots(monitor_id)
        return snapshot_file
    
    def _cleanup_old_snapshots(self, monitor_id: str, keep: int = 10):
        """清理舊快照"""
        pattern = f"{monitor_id}_*.html"
        snapshots = sorted(self.snapshots_dir.glob(pattern))
        if len(snapshots) > keep:
            for old in snapshots[:-keep]:
                old.unlink()
    
    def _generate_diff(self, old_content: Optional[str], new_content: str) -> str:
        """生成差異報告（簡化版）"""
        if old_content is None:
            return "首次監控，無先前內容"
        
        # 簡單的長度變化報告
        old_len = len(old_content)
        new_len = len(new_content)
        change = new_len - old_len
        
        if change > 0:
            return f"內容增加 {change} 字符 ({old_len} → {new_len})"
        elif change < 0:
            return f"內容減少 {abs(change)} 字符 ({old_len} → {new_len})"
        else:
            return "內容長度相同，但哈希值變化"
    
    def check(self, monitor_id: Optional[str] = None) -> List[CheckResult]:
        """
        執行監控檢查
        """
        configs = self._load_configs()
        results = []
        
        for config in configs:
            if monitor_id and config.id != monitor_id:
                continue
            if not config.enabled:
                continue
                
            result = CheckResult(
                url=config.url,
                timestamp=datetime.now().isoformat(),
                changed=False,
                old_hash=config.last_hash,
                new_hash="",
            )
            
            try:
                # 抓取內容
                content, content_hash = self._fetch_content(config.url, config.selector)
                result.new_hash = content_hash
                result.content_preview = content[:500] + "..." if len(content) > 500 else content
                
                # 比對變化
                if config.last_hash is None:
                    result.changed = True  # 首次檢查
                    result.diff = "首次監控"
                elif config.last_hash != content_hash:
                    result.changed = True
                    result.diff = self._generate_diff(
                        self._load_previous_content(config.id),
                        content
                    )
                
                # 保存快照
                if result.changed:
                    snapshot_path = self._save_snapshot(config.id, content)
                    result.diff += f"\n快照已保存: {snapshot_path}"
                
                # 更新配置
                config.last_check = result.timestamp
                config.last_hash = content_hash
                
            except Exception as e:
                result.error = str(e)
            
            results.append(result)
        
        # 保存更新後的配置
        self._save_configs(configs)
        
        return results
    
    def _load_previous_content(self, monitor_id: str) -> Optional[str]:
        """載入先前的內容"""
        pattern = f"{monitor_id}_*.html"
        snapshots = sorted(self.snapshots_dir.glob(pattern))
        if len(snapshots) >= 2:
            with open(snapshots[-2], 'r', encoding='utf-8') as f:
                return f.read()
        return None
    
    def add(self, url: str, name: str, selector: Optional[str] = None, 
            interval: int = 60) -> MonitorConfig:
        """新增監控項目"""
        configs = self._load_configs()
        
        # 檢查是否已存在
        for c in configs:
            if c.url == url and c.name == name:
                raise ValueError(f"監控項目已存在: {name}")
        
        config = MonitorConfig(
            url=url,
            name=name,
            selector=selector,
            interval_minutes=interval
        )
        configs.append(config)
        self._save_configs(configs)
        return config
    
    def remove(self, monitor_id: str) -> bool:
        """移除監控項目"""
        configs = self._load_configs()
        original_len = len(configs)
        configs = [c for c in configs if c.id != monitor_id]
        
        if len(configs) < original_len:
            self._save_configs(configs)
            # 清理相關快照
            for snapshot in self.snapshots_dir.glob(f"{monitor_id}_*.html"):
                snapshot.unlink()
            return True
        return False
    
    def list(self) -> List[MonitorConfig]:
        """列出所有監控項目"""
        return self._load_configs()
    
    def enable(self, monitor_id: str) -> bool:
        """啟用監控"""
        configs = self._load_configs()
        for c in configs:
            if c.id == monitor_id:
                c.enabled = True
                self._save_configs(configs)
                return True
        return False
    
    def disable(self, monitor_id: str) -> bool:
        """停用監控"""
        configs = self._load_configs()
        for c in configs:
            if c.id == monitor_id:
                c.enabled = False
                self._save_configs(configs)
                return True
        return False

def main():
    parser = argparse.ArgumentParser(description='Web Monitor - 網頁內容監控')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # add 命令
    add_parser = subparsers.add_parser('add', help='新增監控項目')
    add_parser.add_argument('url', help='要監控的網址')
    add_parser.add_argument('name', help='監控項目名稱')
    add_parser.add_argument('--selector', '-s', help='CSS 選擇器（抓取特定區域）')
    add_parser.add_argument('--interval', '-i', type=int, default=60, help='檢查間隔（分鐘，預設 60）')
    
    # remove 命令
    remove_parser = subparsers.add_parser('remove', help='移除監控項目')
    remove_parser.add_argument('id', help='監控項目 ID')
    
    # list 命令
    list_parser = subparsers.add_parser('list', help='列出所有監控項目')
    list_parser.add_argument('--json', '-j', action='store_true', help='JSON 格式輸出')
    
    # check 命令
    check_parser = subparsers.add_parser('check', help='執行監控檢查')
    check_parser.add_argument('--id', help='只檢查特定項目')
    check_parser.add_argument('--notify', '-n', action='store_true', help='有變化時發送通知')
    
    # enable/disable 命令
    enable_parser = subparsers.add_parser('enable', help='啟用監控項目')
    enable_parser.add_argument('id', help='監控項目 ID')
    
    disable_parser = subparsers.add_parser('disable', help='停用監控項目')
    disable_parser.add_argument('id', help='監控項目 ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    monitor = WebMonitor()
    
    if args.command == 'add':
        try:
            config = monitor.add(args.url, args.name, args.selector, args.interval)
            print(f"✅ 新增監控項目:")
            print(f"   ID: {config.id}")
            print(f"   名稱: {config.name}")
            print(f"   網址: {config.url}")
            print(f"   間隔: {config.interval_minutes} 分鐘")
        except ValueError as e:
            print(f"❌ {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'remove':
        if monitor.remove(args.id):
            print(f"✅ 已移除監控項目: {args.id}")
        else:
            print(f"❌ 找不到監控項目: {args.id}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'list':
        configs = monitor.list()
        if args.json:
            print(json.dumps([asdict(c) for c in configs], ensure_ascii=False, indent=2))
        else:
            if not configs:
                print("尚無監控項目")
            else:
                print(f"{'ID':<12} {'狀態':<6} {'名稱':<20} {'網址':<30} {'最後檢查':<20}")
                print("-" * 90)
                for c in configs:
                    status = "🟢" if c.enabled else "🔴"
                    last = c.last_check or "從未"
                    name = c.name[:18] + ".." if len(c.name) > 20 else c.name
                    url = c.url[:28] + ".." if len(c.url) > 30 else c.url
                    print(f"{c.id:<12} {status:<6} {name:<20} {url:<30} {last:<20}")
    
    elif args.command == 'check':
        results = monitor.check(args.id)
        changed_count = sum(1 for r in results if r.changed)
        error_count = sum(1 for r in results if r.error)
        
        print(f"📊 檢查完成: {len(results)} 個項目")
        print(f"   有變化: {changed_count}")
        print(f"   錯誤: {error_count}")
        
        for result in results:
            if result.error:
                print(f"\n🔴 {result.url}")
                print(f"   錯誤: {result.error}")
            elif result.changed:
                print(f"\n🟢 {result.url}")
                print(f"   時間: {result.timestamp}")
                print(f"   變化: {result.diff}")
                if args.notify:
                    # 這裡可以整合通知系統
                    pass
        
        # JSON 輸出（供其他腳本使用）
        print("\n" + "="*50)
        print("JSON 輸出:")
        print(json.dumps([{
            'url': r.url,
            'timestamp': r.timestamp,
            'changed': r.changed,
            'error': r.error,
            'diff': r.diff
        } for r in results], ensure_ascii=False))
    
    elif args.command == 'enable':
        if monitor.enable(args.id):
            print(f"✅ 已啟用監控項目: {args.id}")
        else:
            print(f"❌ 找不到監控項目: {args.id}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'disable':
        if monitor.disable(args.id):
            print(f"✅ 已停用監控項目: {args.id}")
        else:
            print(f"❌ 找不到監控項目: {args.id}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
