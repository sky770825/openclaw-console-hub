# CLI 工具入口
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
行銷自動化產品上架 CLI 工具
Marketing Automation Product Listing CLI

Usage:
    python cli.py [command] [options]
"""

import os
import sys
import json
import click
from datetime import datetime
from pathlib import Path

# 加入專案路徑
sys.path.insert(0, str(Path(__file__).parent))

from platforms.facebook import FacebookAdapter
from platforms.instagram import InstagramAdapter
from platforms.shopee import ShopeeAdapter
from scheduler import Scheduler
from checklist import ChecklistManager

# 設定檔路徑
CONFIG_DIR = Path(__file__).parent.parent / "config"
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

@click.group()
def cli():
    """行銷自動化產品上架系統"""
    pass

@cli.command()
def init():
    """初始化系統設定"""
    click.echo("🚀 初始化行銷自動化系統...")
    
    # 建立必要的目錄
    (DATA_DIR / "products").mkdir(exist_ok=True)
    (DATA_DIR / "scheduled").mkdir(exist_ok=True)
    (DATA_DIR / "logs").mkdir(exist_ok=True)
    
    # 建立平台設定檔範本
    platform_config = {
        "facebook": {
            "enabled": False,
            "page_id": "",
            "access_token": "",
            "marketplace_enabled": True
        },
        "instagram": {
            "enabled": False,
            "account_id": "",
            "access_token": "",
            "shopping_enabled": True
        },
        "shopee": {
            "enabled": False,
            "shop_id": "",
            "partner_id": "",
            "partner_key": ""
        }
    }
    
    config_file = CONFIG_DIR / "platforms.json"
    if not config_file.exists():
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(platform_config, f, indent=2, ensure_ascii=False)
        click.echo(f"✅ 建立平台設定: {config_file}")
    
    click.echo("✅ 初始化完成！請編輯 config/platforms.json 設定平台連線資訊")

@cli.command()
@click.option('--business', type=click.Choice(['住商不動產', '飲料店', '普特斯防霾紗窗']), 
              prompt='選擇業務類型')
def create(business):
    """建立新產品"""
    click.echo(f"🏗️ 建立新產品 - {business}")
    
    # 載入對應模板
    template_file = TEMPLATE_DIR / f"{get_template_name(business)}.json"
    if template_file.exists():
        with open(template_file, 'r', encoding='utf-8') as f:
            template = json.load(f)
    else:
        template = get_default_template(business)
    
    # 互動式輸入產品資訊
    product = fill_product_info(template, business)
    
    # 儲存產品
    product_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}"
    product['id'] = product_id
    product['created_at'] = datetime.now().isoformat()
    
    product_file = DATA_DIR / "products" / f"{product_id}.json"
    with open(product_file, 'w', encoding='utf-8') as f:
        json.dump(product, f, indent=2, ensure_ascii=False)
    
    click.echo(f"✅ 產品已建立: {product_id}")
    click.echo(f"📁 檔案: {product_file}")
    
    # 執行檢查清單
    run_checklist(product)

@cli.command()
@click.option('--product-id', required=True, help='產品 ID')
def preview(product_id):
    """預覽產品上架內容"""
    product_file = DATA_DIR / "products" / f"{product_id}.json"
    if not product_file.exists():
        click.echo(f"❌ 找不到產品: {product_id}")
        return
    
    with open(product_file, 'r', encoding='utf-8') as f:
        product = json.load(f)
    
    click.echo("\n" + "="*60)
    click.echo("📦 產品預覽")
    click.echo("="*60)
    click.echo(f"🏷️  名稱: {product.get('name', 'N/A')}")
    click.echo(f"🏢 業務: {product.get('business', 'N/A')}")
    click.echo(f"💰 價格: {product.get('price', 'N/A')}")
    click.echo(f"📝 描述:\n{product.get('description', 'N/A')[:200]}...")
    click.echo(f"🏷️  標籤: {', '.join(product.get('tags', []))}")
    click.echo(f"📷 圖片: {len(product.get('images', []))} 張")
    click.echo("="*60)

@cli.command()
@click.option('--product-id', required=True, help='產品 ID')
@click.option('--platforms', default='facebook,instagram,shopee', 
              help='平台列表，逗號分隔')
@click.option('--dry-run', is_flag=True, help='測試模式，不上架')
def publish(product_id, platforms, dry_run):
    """執行產品上架"""
    product_file = DATA_DIR / "products" / f"{product_id}.json"
    if not product_file.exists():
        click.echo(f"❌ 找不到產品: {product_id}")
        return
    
    with open(product_file, 'r', encoding='utf-8') as f:
        product = json.load(f)
    
    # 檢查清單
    checklist = ChecklistManager()
    if not checklist.verify(product):
        click.echo("❌ 檢查清單未通過，請修正後再試")
        return
    
    platform_list = [p.strip() for p in platforms.split(',')]
    
    click.echo(f"🚀 開始上架: {product['name']}")
    click.echo(f"📱 平台: {', '.join(platform_list)}")
    
    if dry_run:
        click.echo("🔍 [測試模式] 不上架")
        return
    
    results = {}
    for platform in platform_list:
        try:
            adapter = get_adapter(platform)
            result = adapter.publish(product)
            results[platform] = result
            click.echo(f"✅ {platform}: 上架成功")
        except Exception as e:
            results[platform] = {"success": False, "error": str(e)}
            click.echo(f"❌ {platform}: 上架失敗 - {e}")
    
    # 記錄結果
    log_result(product_id, results)

@cli.command()
@click.option('--product-id', required=True, help='產品 ID')
@click.option('--datetime', 'schedule_time', required=True, 
              help='排程時間 (YYYY-MM-DD HH:MM)')
@click.option('--platforms', default='facebook,instagram,shopee',
              help='平台列表，逗號分隔')
def schedule(product_id, schedule_time, platforms):
    """排程產品上架"""
    scheduler = Scheduler()
    job_id = scheduler.add_job(product_id, schedule_time, platforms.split(','))
    click.echo(f"📅 已排程上架")
    click.echo(f"   產品: {product_id}")
    click.echo(f"   時間: {schedule_time}")
    click.echo(f"   平台: {platforms}")
    click.echo(f"   任務ID: {job_id}")

@cli.command()
def list_scheduled():
    """列出排程任務"""
    scheduler = Scheduler()
    jobs = scheduler.list_jobs()
    
    if not jobs:
        click.echo("📭 沒有排程任務")
        return
    
    click.echo("\n📅 排程任務列表:")
    click.echo("-" * 80)
    for job in jobs:
        click.echo(f"🆔 {job['id']} | 📦 {job['product_id']} | 🕐 {job['schedule_time']}")

@cli.command()
@click.option('--product-id', required=True, help='產品 ID')
def checklist(product_id):
    """執行上架檢查清單"""
    product_file = DATA_DIR / "products" / f"{product_id}.json"
    if not product_file.exists():
        click.echo(f"❌ 找不到產品: {product_id}")
        return
    
    with open(product_file, 'r', encoding='utf-8') as f:
        product = json.load(f)
    
    run_checklist(product)

# 輔助函數
def get_template_name(business):
    mapping = {
        '住商不動產': 'real_estate',
        '飲料店': 'beverage',
        '普特斯防霾紗窗': 'window_screen'
    }
    return mapping.get(business, 'default')

def get_default_template(business):
    return {
        "business": business,
        "name": "",
        "price": "",
        "description": "",
        "images": [],
        "tags": [],
        "platform_settings": {}
    }

def fill_product_info(template, business):
    product = template.copy()
    product['business'] = business
    
    click.echo("\n請輸入產品資訊：")
    product['name'] = click.prompt('產品名稱', type=str)
    product['price'] = click.prompt('價格', type=str)
    
    # 根據業務類型詢問特定欄位
    if business == '住商不動產':
        product['address'] = click.prompt('地址', type=str)
        product['area'] = click.prompt('坪數', type=str)
        product['rooms'] = click.prompt('房數', type=str)
        product['floor'] = click.prompt('樓層', type=str)
    elif business == '飲料店':
        product['category'] = click.prompt('飲品分類', type=str)
        product['size_options'] = click.prompt('容量選項 (用逗號分隔)', type=str)
        product['ingredients'] = click.prompt('主要成分', type=str)
    elif business == '普特斯防霾紗窗':
        product['material'] = click.prompt('材質', type=str)
        product['dimensions'] = click.prompt('尺寸規格', type=str)
        product['warranty'] = click.prompt('保固期限', type=str)
    
    product['description'] = click.prompt('產品描述', type=str)
    images_input = click.prompt('圖片路徑 (用逗號分隔)', type=str, default="")
    product['images'] = [img.strip() for img in images_input.split(',') if img.strip()]
    
    tags_input = click.prompt('標籤 (用逗號分隔)', type=str, default="")
    product['tags'] = [tag.strip() for tag in tags_input.split(',') if tag.strip()]
    
    return product

def run_checklist(product):
    checklist = ChecklistManager()
    results = checklist.check(product)
    
    click.echo("\n📋 上架檢查清單:")
    click.echo("-" * 40)
    
    all_passed = True
    for item in results:
        status = "✅" if item['passed'] else "❌"
        click.echo(f"{status} {item['name']}: {item['message']}")
        if not item['passed']:
            all_passed = False
    
    if all_passed:
        click.echo("\n✅ 所有檢查項目通過，可以上架！")
    else:
        click.echo("\n⚠️  部分檢查項目未通過，請修正後再試")
    
    return all_passed

def get_adapter(platform):
    adapters = {
        'facebook': FacebookAdapter,
        'instagram': InstagramAdapter,
        'shopee': ShopeeAdapter
    }
    adapter_class = adapters.get(platform)
    if not adapter_class:
        raise ValueError(f"不支援的平台: {platform}")
    return adapter_class()

def log_result(product_id, results):
    log_file = DATA_DIR / "logs" / f"{datetime.now().strftime('%Y%m%d')}.json"
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "product_id": product_id,
        "results": results
    }
    
    logs = []
    if log_file.exists():
        with open(log_file, 'r', encoding='utf-8') as f:
            logs = json.load(f)
    
    logs.append(log_entry)
    
    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(logs, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    cli()
