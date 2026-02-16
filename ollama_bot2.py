#!/usr/bin/env python3
"""
Ollama 輕量手動監控 Bot - 純手動操作版本
移除自動監控，只保留手動檢查和控制功能
"""

import os
import sys
import asyncio
import logging
import json
import atexit
import fcntl
import tarfile
import tempfile
import shutil
import re
from urllib import request, error
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from telegram.error import InvalidToken as TelegramInvalidToken

# 導入我們的模組
sys.path.append(str(Path(__file__).parent))
from monitoring_engine import MonitoringEngine
from control_scripts import ControlScripts

# 載入環境變數
# 優先使用 ollama_bot2.env；若不存在則回退舊檔名以相容既有部署。
_env_candidates = [
    Path(__file__).parent / "ollama_bot2.env",
    Path(__file__).parent / "ollama_monitor_bot.env",
]
TELEGRAM_BOT_TOKEN = None
AUTHORIZED_CHAT_ID = 5819565005  # 老蔡的 Telegram ID

for _env_path in _env_candidates:
    if not _env_path.exists():
        continue
    for line in _env_path.read_text(encoding="utf-8").strip().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip("'\"")
            if k == "TELEGRAM_BOT_TOKEN" and v:
                TELEGRAM_BOT_TOKEN = v
            elif k == "AUTHORIZED_CHAT_ID" and v:
                AUTHORIZED_CHAT_ID = int(v)
    if TELEGRAM_BOT_TOKEN:
        break

# 日誌設定
LOG_DIR = Path(__file__).parent
LOG_FILE = LOG_DIR / "ollama_monitor_bot.log"
RECOVERY_DIR = Path.home() / "Desktop" / "小蔡" / "系統備份"
RECOVERY_SCRIPT = RECOVERY_DIR / "🛠️系統恢復.command"
RECOVERY_MANUAL = RECOVERY_DIR / "📖 操作手冊.md"
RECOVERY_QUICK_REF = RECOVERY_DIR / "🆘 快速參考.txt"
RECOVERY_LATEST_INFO = RECOVERY_DIR / "最新備份資訊.json"
OPENCLAW_HOME = Path(os.getenv("OPENCLAW_HOME", str(Path.home() / ".openclaw")))
RESTORE_DIRS = ("config", "memory", "docs", "extensions", "scripts", "cron")
AUTOMATION_DIR = OPENCLAW_HOME / "automation"
SELF_HEAL_STATE_FILE = AUTOMATION_DIR / "self-heal-state.json"
SELF_HEAL_ENABLED = os.getenv("SELF_HEAL_ENABLED", "1").strip().lower() in {"1", "true", "yes", "on"}
SELF_HEAL_GATEWAY_DOWN_MINUTES = int(os.getenv("SELF_HEAL_GATEWAY_DOWN_MINUTES", "20"))
SELF_HEAL_COOLDOWN_MINUTES = int(os.getenv("SELF_HEAL_COOLDOWN_MINUTES", "120"))
AUTO_PREHEAL_KEEP_MAX = int(os.getenv("AUTO_PREHEAL_KEEP_MAX", "100"))
AUTO_PREHEAL_KEEP_DAYS = int(os.getenv("AUTO_PREHEAL_KEEP_DAYS", "90"))
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def _is_token_format_valid(token: str) -> bool:
    """快速格式檢查：<digits>:<token body>。"""
    if ":" not in token:
        return False
    left, right = token.split(":", 1)
    return left.isdigit() and len(left) >= 6 and len(right) >= 20


def _verify_telegram_token(token: str) -> tuple[str, str]:
    """向 Telegram getMe 做一次預檢。

    回傳:
    - ("ok", msg): 檢查通過
    - ("fatal", msg): 明確無效（格式錯誤、401），應阻止啟動
    - ("warn", msg): 網路暫時異常等不確定狀態，可先啟動
    """
    if not _is_token_format_valid(token):
        return "fatal", "TELEGRAM_BOT_TOKEN 格式不正確"
    url = f"https://api.telegram.org/bot{token}/getMe"
    req = request.Request(url, method="GET")
    try:
        with request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        if payload.get("ok"):
            return "ok", "token 驗證成功"
        # API 明確返回失敗但不是 401，先視為警告，避免短暫網路問題造成無法啟動
        return "warn", f"Telegram 回應異常: {payload}"
    except error.HTTPError as exc:
        if exc.code == 401:
            return "fatal", "Telegram token 無效（401 Unauthorized）"
        return "warn", f"Telegram HTTP 錯誤: {exc.code}"
    except Exception as exc:  # noqa: BLE001
        return "warn", f"Telegram token 檢查失敗: {exc}"

# 初始化引擎
monitoring = MonitoringEngine()
control = ControlScripts()

# 全域狀態
operation_cooldown = {}  # 操作冷卻時間
_LOCK_FD = None
_LOCK_PATH = Path("/tmp/ollama_bot2.lock")


def _acquire_single_instance_lock() -> bool:
    """避免重複啟動造成 Telegram getUpdates 衝突。"""
    global _LOCK_FD
    try:
        _LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
        _LOCK_FD = open(_LOCK_PATH, "w", encoding="utf-8")
        fcntl.flock(_LOCK_FD.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        _LOCK_FD.write(str(os.getpid()))
        _LOCK_FD.flush()
        return True
    except OSError:
        return False


def _release_single_instance_lock() -> None:
    global _LOCK_FD
    if _LOCK_FD is None:
        return
    try:
        fcntl.flock(_LOCK_FD.fileno(), fcntl.LOCK_UN)
    except OSError:
        pass
    try:
        _LOCK_FD.close()
    except OSError:
        pass
    _LOCK_FD = None


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """錯誤處理"""
    logger.error("處理更新時發生錯誤: %s", context.error, exc_info=context.error)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /start - 顯示功能鍵"""
    user = update.effective_user
    logger.info("收到 /start from @%s (id=%s)", user.username, user.id)
    
    # 建立功能鍵盤 - 包含 Gateway 控制按鈕
    keyboard = [
        [
            InlineKeyboardButton("📊 系統狀態", callback_data="show_status"),
            InlineKeyboardButton("🔍 健康檢查", callback_data="health_check")
        ],
        [
            InlineKeyboardButton("▶️ 啟動 Gateway", callback_data="start_gateway"),
            InlineKeyboardButton("⏹️ 停止 Gateway", callback_data="stop_gateway")
        ],
        [
            InlineKeyboardButton("🔄 重啟 Gateway", callback_data="restart_gateway"),
            InlineKeyboardButton("🧹 清理系統", callback_data="cleanup_system")
        ],
        [
            InlineKeyboardButton("📋 查看日誌", callback_data="show_logs"),
            InlineKeyboardButton("❓ 使用說明", callback_data="show_help")
        ],
        [
            InlineKeyboardButton("🏥 系統還原中心", callback_data="show_recovery_menu")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🤖 Ollama 智能監控 Bot (ollama168bot)\n\n"
        "✨ 輕量手動監控模式\n\n"
        "🎯 純手動操作，不佔資源：\n"
        "• 需要時才檢查系統狀態\n"
        "• 一鍵啟動/停止/重啟 Gateway\n"
        "• 快速查看各服務日誌\n"
        "• 完全控制，隨叫隨用\n\n"
        "👇 點擊下方按鈕開始使用：",
        reply_markup=reply_markup
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /status - 查詢 Ollama 狀態（保留原有功能）"""
    user = update.effective_user
    logger.info("收到 /status from @%s (id=%s)", user.username, user.id)
    ok, msg = monitoring.check_ollama()
    await update.message.reply_text(msg)


async def cmd_model(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /model - 切換模型（保留原有功能）"""
    user = update.effective_user
    if context.args:
        new_model = context.args[0].strip()
        context.user_data["ollama_model"] = new_model
        logger.info("用戶 @%s 切換模型為 %s", user.username, new_model)
        await update.message.reply_text(f"✅ 已切換模型為: {new_model}")
    else:
        ok, names = monitoring.check_ollama()  # 簡化版，直接返回模型列表
        current = context.user_data.get("ollama_model", "qwen3:8b")
        if ok:
            keyboard = [
                [InlineKeyboardButton(n, callback_data=f"model:{n}")] for n in names
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                f"目前模型: {current}\n點選下方按鈕切換：",
                reply_markup=reply_markup,
            )
        else:
            await update.message.reply_text(
                f"目前模型: {current}\n使用 /model <名稱> 切換\n（Ollama 未連線或無模型）"
            )


async def perform_manual_check() -> Dict:
    """執行手動檢查 - 輕量版本"""
    logger.info("執行手動系統檢查...")
    
    # 只檢查關鍵項目，減少資源消耗
    gateway_ok, gateway_msg = monitoring.check_gateway()
    seekdb_ok, seekdb_msg = monitoring.check_seekdb()
    disk_ok, disk_msg = monitoring.check_disk_space()
    ollama_ok, ollama_msg = monitoring.check_ollama()
    
    # 簡化問題分析
    issues = []
    if not gateway_ok:
        issues.append(("gateway", gateway_msg, "🔴"))
    if not seekdb_ok:
        issues.append(("seekdb", seekdb_msg, "🟡"))
    if not disk_ok:
        issues.append(("disk", disk_msg, "🔴"))
    if not ollama_ok:
        issues.append(("ollama", ollama_msg, "🟡"))
    
    return {
        "gateway": (gateway_ok, gateway_msg),
        "seekdb": (seekdb_ok, seekdb_msg),
        "disk": (disk_ok, disk_msg),
        "ollama": (ollama_ok, ollama_msg),
        "issues": issues,
        "overall_status": "problem" if issues else "ok"
    }


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理所有回調查詢（按鈕點擊）"""
    query = update.callback_query
    await query.answer()
    
    user = update.effective_user
    chat_id = update.effective_chat.id
    data = query.data
    
    logger.info("用戶 @%s 點擊按鈕: %s", user.username, data)
    
    # 檢查權限（只允許老蔡）
    if chat_id != AUTHORIZED_CHAT_ID:
        await query.edit_message_text("❌ 您沒有權限使用此功能")
        return
    
    # 檢查冷卻時間（防止濫用）
    now = datetime.now()
    if data in operation_cooldown:
        last_time = operation_cooldown[data]
        if now - last_time < timedelta(minutes=2):  # 2 分鐘冷卻
            remaining = (timedelta(minutes=2) - (now - last_time)).seconds
            await query.edit_message_text(f"⏳ 操作太快，請 {remaining} 秒後再試")
            return
    
    # 處理各種按鈕動作
    if data == "show_status":
        await handle_show_status(query)
    elif data == "health_check":
        await handle_health_check(query)
    elif data == "start_gateway":
        await handle_start_gateway(query)
    elif data == "stop_gateway":
        await handle_stop_gateway(query)
    elif data == "restart_gateway":
        await handle_restart_gateway(query)
    elif data == "cleanup_system":
        await handle_cleanup_system(query)
    elif data == "show_logs":
        await handle_show_logs(query)
    elif data == "show_help":
        await handle_show_help(query)
    elif data == "show_recovery_menu":
        await handle_show_recovery_menu(query)
    elif data == "recovery:list":
        await handle_show_recovery_points(query)
    elif data.startswith("recovery:sel:"):
        await handle_select_recovery_point(query, data)
    elif data.startswith("recovery:run:"):
        await handle_run_recovery_point(query, data)
    elif data == "recovery:panic":
        await handle_run_recovery_latest(query)
    elif data == "recovery:intro":
        await handle_show_recovery_intro(query)
    elif data == "recovery:quick":
        await handle_show_recovery_quick_ref(query)
    elif data == "recovery:latest":
        await handle_show_recovery_latest(query)
    elif data == "recovery:path":
        await handle_show_recovery_path(query)
    elif data.startswith("model:"):
        await handle_model_switch(query, data)
    elif data.startswith("logs:"):
        await handle_show_log_content(query, data)
    else:
        await query.edit_message_text(f"❌ 未知的操作: {data}")


async def handle_show_status(query):
    """顯示系統狀態"""
    await query.edit_message_text("📊 正在檢查系統狀態...")
    
    results = await perform_manual_check()
    
    if results["overall_status"] == "ok":
        message = "✅ *系統狀態正常*\n\n所有關鍵服務運作正常"
    else:
        message = "⚠️ *發現問題*\n\n"
        for issue_type, issue_msg, icon in results["issues"]:
            message += f"{icon} {issue_msg}\n"
    
    # 添加簡易狀態
    message += "\n*快速狀態:*\n"
    message += f"{'✅' if results['gateway'][0] else '❌'} Gateway\n"
    message += f"{'✅' if results['seekdb'][0] else '❌'} SeekDB\n"
    message += f"{'✅' if results['disk'][0] else '❌'} 磁碟空間\n"
    message += f"{'✅' if results['ollama'][0] else '❌'} Ollama"
    
    keyboard = [[InlineKeyboardButton("🔄 重新整理", callback_data="show_status")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode="Markdown")


async def handle_health_check(query):
    """執行完整健康檢查"""
    await query.edit_message_text("🔍 正在執行完整健康檢查...")
    
    results = await perform_manual_check()
    
    message = "📋 *健康檢查報告*\n\n"
    message += f"🕐 檢查時間: {datetime.now().strftime('%H:%M:%S')}\n\n"
    
    # 詳細狀態
    message += "*各服務狀態:*\n"
    message += f"🌐 Gateway: {results['gateway'][1]}\n"
    message += f"🗄️ SeekDB: {results['seekdb'][1]}\n"
    message += f"💾 磁碟: {results['disk'][1]}\n"
    message += f"🤖 Ollama: {results['ollama'][1]}\n\n"
    
    if results["issues"]:
        message += "*⚠️ 建議操作:*\n"
        for issue_type, issue_msg, icon in results["issues"]:
            message += f"{icon} {issue_msg}\n"
        message += "\n"
    
    message += f"整體評估: {'✅ 系統健康' if results['overall_status'] == 'ok' else '⚠️ 需要關注'}"
    
    keyboard = [[InlineKeyboardButton("🔙 返回", callback_data="show_status")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode="Markdown")


async def handle_start_gateway(query):
    """啟動 Gateway"""
    operation_cooldown["start_gateway"] = datetime.now()
    
    await query.edit_message_text("▶️ 正在啟動 Gateway...\n\n這可能需要 5-10 秒鐘...")
    success, message = control.start_gateway()
    
    status_icon = "✅" if success else "❌"
    result_msg = f"{status_icon} {message}\n\n"
    
    if success:
        result_msg += "Gateway 啟動完成！請稍後幾秒讓服務完全初始化。"
    else:
        result_msg += "啟動可能失敗，請檢查日誌了解詳細資訊。"
    
    keyboard = [
        [
            InlineKeyboardButton("🔍 檢查狀態", callback_data="show_status"),
            InlineKeyboardButton("🔙 返回", callback_data="show_status")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(result_msg, reply_markup=reply_markup)


async def handle_stop_gateway(query):
    """停止 Gateway"""
    operation_cooldown["stop_gateway"] = datetime.now()
    
    await query.edit_message_text("⏹️ 正在停止 Gateway...")
    success, message = control.stop_gateway()
    
    status_icon = "✅" if success else "❌"
    result_msg = f"{status_icon} {message}\n\n"
    
    if success:
        result_msg += "Gateway 已停止。小蔡（主機器人）將無法回應，直到重新啟動 Gateway。"
    else:
        result_msg += "停止命令執行結果不明，請檢查狀態確認。"
    
    keyboard = [
        [
            InlineKeyboardButton("▶️ 重新啟動", callback_data="start_gateway"),
            InlineKeyboardButton("🔙 返回", callback_data="show_status")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(result_msg, reply_markup=reply_markup)


async def handle_restart_gateway(query):
    """重啟 Gateway"""
    operation_cooldown["restart_gateway"] = datetime.now()
    
    await query.edit_message_text("🔄 正在重啟 Gateway...\n\n1️⃣ 停止服務...\n2️⃣ 啟動服務...\n3️⃣ 驗證狀態...")
    success, message = control.restart_gateway()
    
    status_icon = "✅" if success else "❌"
    result_msg = f"{status_icon} {message}\n\n"
    
    if success:
        result_msg += "Gateway 重啟完成！請稍後幾秒鐘讓服務完全啟動。"
    else:
        result_msg += "重啟可能失敗，請檢查日誌了解詳細錯誤資訊。"
    
    keyboard = [[InlineKeyboardButton("🔙 返回狀態", callback_data="show_status")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(result_msg, reply_markup=reply_markup)


async def handle_cleanup_system(query):
    """清理系統"""
    operation_cooldown["cleanup_system"] = datetime.now()
    
    await query.edit_message_text("🧹 正在清理系統...")
    
    # 執行清理操作
    success1, msg1 = control.cleanup_docker()
    success2, msg2 = control.cleanup_disk()
    
    message = "*系統清理報告*\n\n"
    message += f"🐳 Docker 清理: {'✅' if success1 else '❌'}\n{msg1}\n\n"
    message += f"💾 磁碟清理: {'✅' if success2 else '❌'}\n{msg2}\n\n"
    
    if success1 or success2:
        message += "✅ 清理操作完成，系統資源已釋放。"
    else:
        message += "⚠️ 部分清理操作失敗，請查看詳細訊息。"
    
    keyboard = [[InlineKeyboardButton("🔙 返回狀態", callback_data="show_status")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(message, reply_markup=reply_markup, parse_mode="Markdown")


async def handle_show_logs(query):
    """顯示日誌選單"""
    keyboard = [
        [InlineKeyboardButton("📋 Gateway 日誌", callback_data="logs:gateway")],
        [InlineKeyboardButton("🤖 Ollama 日誌", callback_data="logs:ollama")],
        [InlineKeyboardButton("📊 監控日誌", callback_data="logs:monitor")],
        [InlineKeyboardButton("🔙 返回", callback_data="show_status")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        "📋 *查看系統日誌*\n\n選擇要查看的日誌類型：",
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )


async def handle_show_log_content(query, data: str):
    """顯示特定日誌內容"""
    service = data.replace("logs:", "", 1)
    
    await query.edit_message_text(f"📋 正在讀取 {service} 日誌...")
    
    # 使用 control 模組讀取日誌
    success, log_content = control.show_logs(service, lines=30)
    
    if success:
        # 限制訊息長度（Telegram 限制 4096 字元）
        if len(log_content) > 3800:
            log_content = log_content[-3800:] + "\n\n...(內容已截斷)"
        
        keyboard = [
            [InlineKeyboardButton("🔄 重新整理", callback_data=f"logs:{service}")],
            [InlineKeyboardButton("🔙 返回選單", callback_data="show_logs")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            log_content,
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )
    else:
        keyboard = [[InlineKeyboardButton("🔙 返回", callback_data="show_logs")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(
            f"❌ 無法讀取日誌：{log_content}",
            reply_markup=reply_markup
        )


async def handle_show_help(query):
    """顯示使用說明"""
    help_text = (
        "*📖 使用說明*\n\n"
        "*主要功能鍵：*\n"
        "📊 系統狀態 - 快速查看各服務狀態\n"
        "🔍 健康檢查 - 完整系統健康評估\n"
        "▶️ 啟動 Gateway - 啟動 OpenClaw Gateway\n"
        "⏹️ 停止 Gateway - 停止 OpenClaw Gateway\n"
        "🔄 重啟 Gateway - 重啟 OpenClaw 服務\n"
        "🧹 清理系統 - 清理 Docker 和磁碟空間\n"
        "📋 查看日誌 - 顯示各服務最近日誌\n\n"
        "*指令：*\n"
        "/status - 查詢 Ollama 狀態\n"
        "/model - 切換 AI 模型\n\n"
        "*特色：*\n"
        "✅ 純手動操作，不佔系統資源\n"
        "✅ 2 分鐘操作冷卻時間\n"
        "✅ 僅限老蔡使用（安全認證）\n"
        "✅ 一鍵啟動/停止/重啟 Gateway"
    )
    
    keyboard = [[InlineKeyboardButton("🔙 返回", callback_data="show_status")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(help_text, reply_markup=reply_markup, parse_mode="Markdown")


def _read_text_safe(path: Path, max_chars: int = 3200) -> str:
    if not path.exists():
        return "（檔案不存在）"
    try:
        text = path.read_text(encoding="utf-8").strip()
    except Exception as e:  # noqa: BLE001
        return f"（讀取失敗: {e}）"
    if len(text) > max_chars:
        return text[:max_chars] + "\n\n...(內容已截斷)"
    return text


def _recovery_latest_summary() -> str:
    if not RECOVERY_LATEST_INFO.exists():
        return "（找不到 最新備份資訊.json）"
    try:
        data = json.loads(RECOVERY_LATEST_INFO.read_text(encoding="utf-8"))
        ts = data.get("timestamp", "未知")
        btype = data.get("type", "未知")
        size = data.get("size_bytes", 0)
        files = data.get("files_count", 0)
        checksum = data.get("checksum", "未知")
        return (
            f"類型: {btype}\n"
            f"時間: {ts}\n"
            f"大小: {size} bytes\n"
            f"檔案數: {files}\n"
            f"Checksum: {checksum}"
        )
    except Exception as e:  # noqa: BLE001
        return f"（解析失敗: {e}）"


def _list_recovery_points() -> List[str]:
    if not RECOVERY_DIR.exists():
        return []
    points = []
    for entry in RECOVERY_DIR.iterdir():
        if not entry.is_dir():
            continue
        if (entry / "backup.tar.gz").exists():
            points.append(entry.name)
    points.sort(reverse=True)
    return points


def _point_manifest_summary(point_name: str) -> str:
    manifest = RECOVERY_DIR / point_name / "manifest.json"
    backup = RECOVERY_DIR / point_name / "backup.tar.gz"
    if not manifest.exists():
        size = backup.stat().st_size if backup.exists() else 0
        return f"時間點: {point_name}\n大小: {size} bytes\n（無 manifest）"
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        ts = data.get("timestamp", "未知")
        btype = data.get("type", "未知")
        size = data.get("size_bytes", backup.stat().st_size if backup.exists() else 0)
        files = data.get("files_count", "未知")
        return (
            f"時間點: {point_name}\n"
            f"類型: {btype}\n"
            f"建立時間: {ts}\n"
            f"大小: {size} bytes\n"
            f"檔案數: {files}"
        )
    except Exception as e:  # noqa: BLE001
        return f"時間點: {point_name}\n（manifest 解析失敗: {e}）"


def _restore_backup_point(point_name: str) -> tuple[bool, str]:
    if not re.match(r"^[0-9A-Za-z._-]+$", point_name):
        return False, "備份名稱格式不合法"
    backup_dir = RECOVERY_DIR / point_name
    backup_tar = backup_dir / "backup.tar.gz"
    if not backup_tar.exists():
        return False, f"找不到備份檔: {backup_tar}"

    OPENCLAW_HOME.mkdir(parents=True, exist_ok=True)
    for d in RESTORE_DIRS:
        (OPENCLAW_HOME / d).mkdir(parents=True, exist_ok=True)

    restored_items = []
    try:
        with tempfile.TemporaryDirectory(prefix="openclaw-restore-") as td:
            tmp = Path(td)
            with tarfile.open(backup_tar, "r:gz") as tar:
                tar.extractall(path=tmp)

            # tar 內容是 "./..."，先定位實際根目錄
            root = tmp
            if (tmp / "openclaw.json").exists():
                root = tmp
            else:
                dirs = [p for p in tmp.iterdir() if p.is_dir()]
                if len(dirs) == 1 and (dirs[0] / "openclaw.json").exists():
                    root = dirs[0]

            src_json = root / "openclaw.json"
            if src_json.exists():
                dst_json = OPENCLAW_HOME / "openclaw.json"
                if dst_json.exists():
                    bak = OPENCLAW_HOME / f"openclaw.json.pre-restore-{datetime.now().strftime('%Y%m%d-%H%M%S')}.bak"
                    shutil.copy2(dst_json, bak)
                shutil.copy2(src_json, dst_json)
                restored_items.append("openclaw.json")

            for dirname in RESTORE_DIRS:
                src_dir = root / dirname
                dst_dir = OPENCLAW_HOME / dirname
                if not src_dir.exists():
                    continue
                shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)
                restored_items.append(dirname)

        restart_ok, restart_msg = control.restart_gateway()
        if restart_ok:
            return True, f"已還原 {point_name}，並完成 OpenClaw 重啟。\n內容: {', '.join(restored_items)}"
        return False, f"已還原 {point_name}，但重啟失敗: {restart_msg}"
    except Exception as e:  # noqa: BLE001
        return False, f"還原失敗: {e}"


def _create_preheal_snapshot() -> tuple[bool, str]:
    """自癒還原前建立臨時快照，便於回滾。"""
    try:
        ts = datetime.now().strftime("%Y-%m-%d-%H%M%S")
        snapshot_name = f"auto-preheal-{ts}"
        snapshot_dir = RECOVERY_DIR / snapshot_name
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        tar_path = snapshot_dir / "backup.tar.gz"

        with tarfile.open(tar_path, "w:gz") as tar:
            src_json = OPENCLAW_HOME / "openclaw.json"
            if src_json.exists():
                tar.add(src_json, arcname="./openclaw.json")
            for dirname in RESTORE_DIRS:
                src_dir = OPENCLAW_HOME / dirname
                if src_dir.exists():
                    tar.add(src_dir, arcname=f"./{dirname}")

        manifest = {
            "type": "auto-preheal",
            "timestamp": datetime.now().isoformat(),
            "source": str(OPENCLAW_HOME),
            "size_bytes": tar_path.stat().st_size if tar_path.exists() else 0,
        }
        (snapshot_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        _cleanup_auto_preheal_snapshots()
        return True, snapshot_name
    except Exception as e:  # noqa: BLE001
        return False, f"{e}"


def _cleanup_auto_preheal_snapshots() -> tuple[int, int]:
    """清理 auto-preheal 快照：先依天數，再依最大份數。"""
    if not RECOVERY_DIR.exists():
        return 0, 0

    candidates = []
    for entry in RECOVERY_DIR.iterdir():
        if not entry.is_dir():
            continue
        if not entry.name.startswith("auto-preheal-"):
            continue
        try:
            mtime = datetime.fromtimestamp(entry.stat().st_mtime)
        except Exception:
            mtime = datetime.now()
        candidates.append((entry, mtime))

    removed_by_age = 0
    removed_by_count = 0
    cutoff = datetime.now() - timedelta(days=max(AUTO_PREHEAL_KEEP_DAYS, 1))

    # 1) 先刪超過天數
    alive = []
    for path, mtime in candidates:
        if mtime < cutoff:
            try:
                shutil.rmtree(path)
                removed_by_age += 1
            except Exception:
                alive.append((path, mtime))
        else:
            alive.append((path, mtime))

    # 2) 再依數量上限刪最舊
    keep_max = max(AUTO_PREHEAL_KEEP_MAX, 1)
    if len(alive) > keep_max:
        alive.sort(key=lambda x: x[1])  # oldest first
        to_remove = len(alive) - keep_max
        for path, _ in alive[:to_remove]:
            try:
                shutil.rmtree(path)
                removed_by_count += 1
            except Exception:
                pass

    return removed_by_age, removed_by_count


def _load_self_heal_state() -> Dict:
    AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    if not SELF_HEAL_STATE_FILE.exists():
        return {}
    try:
        return json.loads(SELF_HEAL_STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_self_heal_state(state: Dict) -> None:
    AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    SELF_HEAL_STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _should_self_heal_gateway(results: Dict) -> bool:
    gateway = results.get("gateway")
    if not gateway or not isinstance(gateway, tuple):
        return False
    ok = gateway[0]
    return ok is False


async def handle_show_recovery_menu(query):
    """顯示系統還原中心選單。"""
    script_status = "✅ 已找到" if RECOVERY_SCRIPT.exists() else "❌ 找不到"
    keyboard = [
        [InlineKeyboardButton("🚑 故障一鍵還原（最新）", callback_data="recovery:panic")],
        [InlineKeyboardButton("🕒 選擇恢復時間點", callback_data="recovery:list")],
        [
            InlineKeyboardButton("✍️ 貼上一鍵還原指令", switch_inline_query_current_chat="還原最新"),
            InlineKeyboardButton("✍️ 貼上還原點清單指令", switch_inline_query_current_chat="查看還原點"),
        ],
        [InlineKeyboardButton("📖 還原介紹", callback_data="recovery:intro")],
        [InlineKeyboardButton("🆘 快速參考", callback_data="recovery:quick")],
        [InlineKeyboardButton("📦 最新備份資訊", callback_data="recovery:latest")],
        [InlineKeyboardButton("📍 檔案位置 / 啟動方式", callback_data="recovery:path")],
        [InlineKeyboardButton("🔙 返回", callback_data="show_status")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    msg = (
        "*🏥 OpenClaw 系統還原中心*\n\n"
        f"偵測恢復腳本: {script_status}\n"
        f"路徑: `{RECOVERY_SCRIPT}`\n\n"
        "可在此查看還原說明、快速流程與最新備份資訊。"
    )
    await query.edit_message_text(msg, reply_markup=reply_markup, parse_mode="Markdown")


async def handle_show_recovery_points(query):
    points = _list_recovery_points()
    if not points:
        keyboard = [[InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]]
        await query.edit_message_text("❌ 沒有找到可用備份時間點。", reply_markup=InlineKeyboardMarkup(keyboard))
        return
    keyboard = []
    for name in points[:12]:
        keyboard.append(
            [
                InlineKeyboardButton(f"📅 {name}", callback_data=f"recovery:sel:{name}"),
                InlineKeyboardButton("✍️ 貼上指令", switch_inline_query_current_chat=f"還原 {name}"),
            ]
        )
    keyboard.append([InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")])
    msg = "🕒 請選擇要恢復的時間點："
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_select_recovery_point(query, data: str):
    point_name = data.replace("recovery:sel:", "", 1).strip()
    summary = _point_manifest_summary(point_name)
    msg = (
        "⚠️ 還原確認\n\n"
        f"{summary}\n\n"
        "按下「確認還原」後會覆蓋目前 OpenClaw 設定，並自動重啟服務。"
    )
    keyboard = [
        [InlineKeyboardButton("✅ 確認還原", callback_data=f"recovery:run:{point_name}")],
        [InlineKeyboardButton("🔙 返回時間點列表", callback_data="recovery:list")],
    ]
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_run_recovery_point(query, data: str):
    point_name = data.replace("recovery:run:", "", 1).strip()
    operation_cooldown[f"recovery_run_{point_name}"] = datetime.now()
    await query.edit_message_text(f"⏳ 正在還原 {point_name}...\n請稍候（會自動重啟 OpenClaw）")
    ok, msg = _restore_backup_point(point_name)
    keyboard = [[InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]]
    prefix = "✅ 還原完成" if ok else "❌ 還原失敗"
    await query.edit_message_text(f"{prefix}\n\n{msg}", reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_run_recovery_latest(query):
    points = _list_recovery_points()
    if not points:
        keyboard = [[InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]]
        await query.edit_message_text("❌ 沒有找到可用備份時間點。", reply_markup=InlineKeyboardMarkup(keyboard))
        return
    latest = points[0]
    await query.edit_message_text(f"⏳ 正在執行一鍵還原（最新）: {latest}\n請稍候（會自動重啟 OpenClaw）")
    ok, msg = _restore_backup_point(latest)
    keyboard = [[InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]]
    prefix = "✅ 一鍵還原完成" if ok else "❌ 一鍵還原失敗"
    await query.edit_message_text(f"{prefix}\n\n{msg}", reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_show_recovery_intro(query):
    """顯示還原介紹（從操作手冊擷取）。"""
    manual = _read_text_safe(RECOVERY_MANUAL, max_chars=2200)
    if manual.startswith("（"):
        body = manual
    else:
        body = (
            "適用情境：OpenClaw 異常、設定跑掉、要回復到昨天或特定日期。\n\n"
            "建議流程：\n"
            "1. 先看健康檢查\n"
            "2. 異常就用一鍵恢復\n"
            "3. 視情況重啟 OpenClaw\n\n"
            "操作手冊節錄：\n"
            f"{manual[:1400]}"
        )
    keyboard = [
        [InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]
    ]
    await query.edit_message_text(body, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_show_recovery_quick_ref(query):
    """顯示快速參考。"""
    quick_ref = _read_text_safe(RECOVERY_QUICK_REF, max_chars=2600)
    keyboard = [
        [InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]
    ]
    await query.edit_message_text(quick_ref, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_show_recovery_latest(query):
    """顯示最新備份資訊。"""
    summary = _recovery_latest_summary()
    msg = f"📦 最新備份資訊\n\n{summary}"
    keyboard = [
        [InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]
    ]
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_show_recovery_path(query):
    """顯示本機檔案位置與啟動方式。"""
    msg = (
        "📍 本機還原檔案位置\n\n"
        f"資料夾: `{RECOVERY_DIR}`\n"
        f"啟動檔: `{RECOVERY_SCRIPT}`\n\n"
        "在 Mac 上雙擊 `🛠️系統恢復.command` 即可開啟還原介面。"
    )
    keyboard = [
        [InlineKeyboardButton("🔙 返回還原中心", callback_data="show_recovery_menu")]
    ]
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")


async def handle_model_switch(query, data: str):
    """處理模型切換"""
    new_model = data.replace("model:", "", 1)
    
    # 這裡應該要實際切換模型，但目前先模擬
    await query.edit_message_text(f"✅ 已切換模型為: {new_model}")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理一般文字訊息（保留原有對話功能）"""
    if not update.message or not update.message.text:
        return
    
    user = update.effective_user
    text = update.message.text.strip()
    if not text:
        return
    
    # 如果是系統指令，不進行 AI 對話
    if text.startswith('/'):
        return

    # 還原文字指令（搭配「貼上指令」按鈕）
    if update.effective_chat.id == AUTHORIZED_CHAT_ID:
        t = text.strip()
        if t in {"查看還原點", "列出還原點", "還原點清單"}:
            points = _list_recovery_points()
            if not points:
                await update.message.reply_text("❌ 目前沒有可用還原點。")
            else:
                msg = "🕒 可用還原點：\n" + "\n".join(f"- {p}" for p in points[:30])
                await update.message.reply_text(msg)
            return

        if t in {"還原最新", "一鍵還原最新"}:
            points = _list_recovery_points()
            if not points:
                await update.message.reply_text("❌ 沒有可用備份時間點。")
                return
            latest = points[0]
            status = await update.message.reply_text(f"⏳ 正在執行一鍵還原（最新）: {latest}")
            ok, msg = _restore_backup_point(latest)
            await status.edit_text(("✅ 一鍵還原完成\n\n" if ok else "❌ 一鍵還原失敗\n\n") + msg)
            return

        m = re.match(r"^還原\s+([0-9]{4}-[0-9]{2}-[0-9]{2})$", t)
        if m:
            point = m.group(1)
            status = await update.message.reply_text(f"⏳ 正在還原 {point}...")
            ok, msg = _restore_backup_point(point)
            await status.edit_text(("✅ 還原完成\n\n" if ok else "❌ 還原失敗\n\n") + msg)
            return
    
    model = context.user_data.get("ollama_model", "qwen3:8b")
    logger.info("收到訊息 from @%s, 模型=%s: %s...", user.username, model, text[:50])
    
    status = await update.message.reply_text("⏳ 本機 Ollama 處理中...")
    
    # 使用 monitoring 來檢查 Ollama 狀態
    ollama_ok, ollama_msg = monitoring.check_ollama()
    if not ollama_ok:
        await status.edit_text(f"❌ Ollama 服務異常: {ollama_msg}")
        return
    
    # 簡化的 AI 回應（這裡需要實際的 Ollama 客戶端）
    await status.edit_text("🤖 AI 功能暫時簡化，請使用 /model 切換模型或查看系統狀態。")


def main() -> None:
    if not _acquire_single_instance_lock():
        logger.warning("⚠️ 偵測到另一個 ollama_bot2 實例已在運行，跳過本次啟動。")
        return
    atexit.register(_release_single_instance_lock)

    if not TELEGRAM_BOT_TOKEN:
        print("請設定環境變數 TELEGRAM_BOT_TOKEN")
        print("例: export TELEGRAM_BOT_TOKEN='你的機器人 token'")
        return

    check_level, msg = _verify_telegram_token(TELEGRAM_BOT_TOKEN)
    if check_level == "fatal":
        logger.error("❌ Bot 啟動前檢查失敗：%s", msg)
        logger.error("請更新 token 後再啟動，避免 LaunchAgent 無限重啟。")
        return
    if check_level == "warn":
        logger.warning("⚠️ Bot 啟動前檢查警告：%s", msg)
        logger.warning("先嘗試啟動；若仍失敗請檢查網路或更新 token。")

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # 註冊處理器
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("model", cmd_model))
    app.add_handler(CallbackQueryHandler(callback_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)
    
    # === 自動監控排程（結果寫入中控台） ===
    import json

    DASHBOARD_FILE = Path.home() / ".openclaw" / "automation" / "monitor-health.json"
    DASHBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)

    async def auto_monitor_job(context: ContextTypes.DEFAULT_TYPE):
        """定時自動監控，結果寫入中控台 JSON"""
        try:
            results = monitoring.run_all_checks()
            problems = monitoring.get_problems(results)
            now = datetime.now()
            state = _load_self_heal_state()
            self_heal_note = "idle"

            if _should_self_heal_gateway(results):
                if not state.get("gateway_down_since"):
                    state["gateway_down_since"] = now.isoformat()
                down_since = _parse_iso_datetime(state.get("gateway_down_since")) or now
                down_minutes = max(int((now - down_since).total_seconds() // 60), 0)
                state["gateway_down_minutes"] = down_minutes

                last_heal_at = _parse_iso_datetime(state.get("last_heal_at"))
                cooldown_ok = (
                    last_heal_at is None
                    or (now - last_heal_at).total_seconds() >= SELF_HEAL_COOLDOWN_MINUTES * 60
                )

                if (
                    SELF_HEAL_ENABLED
                    and down_minutes >= SELF_HEAL_GATEWAY_DOWN_MINUTES
                    and cooldown_ok
                    and not state.get("healing")
                ):
                    points = _list_recovery_points()
                    if points:
                        point = points[0]
                        self_heal_note = f"triggered:{point}"
                        state["healing"] = True
                        _save_self_heal_state(state)
                        snap_ok, snap_msg = await asyncio.to_thread(_create_preheal_snapshot)
                        try:
                            await context.bot.send_message(
                                chat_id=AUTHORIZED_CHAT_ID,
                                text=(
                                    "🚑 自癒模式觸發\n"
                                    f"Gateway 持續異常 {down_minutes} 分鐘，開始自動還原：{point}\n"
                                    + (
                                        f"🧷 已建立還原前快照：{snap_msg}"
                                        if snap_ok
                                        else f"⚠️ 還原前快照建立失敗：{snap_msg}"
                                    )
                                ),
                            )
                        except Exception:
                            pass

                        ok, msg = await asyncio.to_thread(_restore_backup_point, point)
                        state["last_heal_at"] = datetime.now().isoformat()
                        state["last_heal_point"] = point
                        state["last_heal_ok"] = ok
                        state["last_heal_msg"] = msg
                        state["last_preheal_snapshot_ok"] = snap_ok
                        state["last_preheal_snapshot"] = snap_msg if snap_ok else None
                        state["last_preheal_snapshot_err"] = None if snap_ok else snap_msg
                        state["healing"] = False
                        state["gateway_down_since"] = datetime.now().isoformat()
                        _save_self_heal_state(state)

                        try:
                            await context.bot.send_message(
                                chat_id=AUTHORIZED_CHAT_ID,
                                text=(
                                    ("✅ 自癒還原完成\n" if ok else "❌ 自癒還原失敗\n")
                                    + f"時間點: {point}\n{msg}"
                                ),
                            )
                        except Exception:
                            pass
                    else:
                        self_heal_note = "no_backup"
            else:
                state["gateway_down_since"] = None
                state["gateway_down_minutes"] = 0

            _save_self_heal_state(state)

            # 寫入中控台 dashboard JSON
            health = {
                "lastCheck": now.strftime("%Y-%m-%d %H:%M:%S"),
                "services": {},
                "problemCount": len(problems),
                "allOk": len(problems) == 0,
                "selfHeal": {
                    "enabled": SELF_HEAL_ENABLED,
                    "gatewayDownMinutes": state.get("gateway_down_minutes", 0),
                    "downThresholdMinutes": SELF_HEAL_GATEWAY_DOWN_MINUTES,
                    "cooldownMinutes": SELF_HEAL_COOLDOWN_MINUTES,
                    "lastHealAt": state.get("last_heal_at"),
                    "lastHealOk": state.get("last_heal_ok"),
                    "lastHealPoint": state.get("last_heal_point"),
                    "status": self_heal_note,
                },
            }
            for svc, (ok, msg) in results.items():
                health["services"][svc] = {"ok": ok, "msg": msg}

            DASHBOARD_FILE.write_text(json.dumps(health, ensure_ascii=False, indent=2), encoding="utf-8")
            logger.info("🔍 自動監控完成: %d 個問題", len(problems))

            # 只有出問題時才發 Telegram 通知（不 tag 任何人）
            if problems:
                report = monitoring.format_report(results)
                try:
                    await context.bot.send_message(
                        chat_id=AUTHORIZED_CHAT_ID,
                        text=f"🚨 自動監控發現問題\n\n{report}",
                    )
                except Exception as e:
                    logger.error("發送告警失敗: %s", e)
        except Exception as e:
            logger.error("自動監控執行錯誤: %s", e)

    # 每 10 分鐘跑一次自動監控（用 telegram job_queue）
    app.job_queue.run_repeating(auto_monitor_job, interval=600, first=30, name="auto_monitor")

    logger.info("🤖 Ollama Bot 已啟動（含自動監控）")
    logger.info("🔄 自動監控: 每 10 分鐘，結果寫入中控台")
    logger.info("📝 日誌檔案: %s", LOG_FILE)
    logger.info("📊 中控台: %s", DASHBOARD_FILE)
    
    try:
        app.run_polling(allowed_updates=Update.ALL_TYPES)
    except TelegramInvalidToken:
        logger.error("❌ Telegram token 無效，請更新 token 後再啟動。")
    except Exception as exc:  # noqa: BLE001
        logger.error("❌ Bot 執行失敗：%s", exc)


if __name__ == "__main__":
    main()
