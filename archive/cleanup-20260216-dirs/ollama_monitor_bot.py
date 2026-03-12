import telegram
from telegram import ReplyKeyboardMarkup, ReplyKeyboardRemove, KeyboardButton
from telegram.ext import Application, MessageHandler, CommandHandler, ConversationHandler, filters, ContextTypes
from telegram import Update
import asyncio
import requests
import json
import subprocess
import time
import threading
import logging
import os

# 配置日誌
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 配置參數 ---
TELEGRAM_BOT_TOKEN_BACKUP = os.environ.get('OLLAMA_BOT_TOKEN', '') # 從環境變數讀取
OLLAMA_API_URL = 'http://localhost:11434/api/chat'
OLLAMA_MODEL_BACKUP = 'llama3.2'
MAIN_GATEWAY_URL = 'http://localhost:18789/status' # OpenClaw Gateway 的狀態檢查點
TASK_BOARD_URL = 'http://localhost:3011/health' # 任務板健康檢查

# 全局狀態
main_gateway_online = True
last_restart_attempt = 0
RESTART_COOLDOWN = 60 # 重啟嘗試的冷卻時間 (秒)
last_action_result = "" # 最後操作結果

# 對話狀態
CHOOSING = 1

# --- 鍵盤佈局 ---
def get_main_keyboard():
    """取得主鍵盤佈局"""
    keyboard = [
        ['🟢 啟動 OpenClaw', '🔴 停止 OpenClaw'],
        ['🔄 重啟 Gateway', '📊 狀態檢查'],
        ['💬 對話模式', '❓ 說明']
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

# --- 輔助函數 ---
def check_gateway_status():
    """檢查 OpenClaw Gateway 狀態，返回 (狀態, 詳細訊息)"""
    try:
        # 檢查 Gateway
        response = requests.get(MAIN_GATEWAY_URL, timeout=5)
        gateway_ok = response.status_code == 200
    except:
        gateway_ok = False
    
    try:
        # 檢查任務板
        response = requests.get(TASK_BOARD_URL, timeout=5)
        taskboard_ok = response.status_code == 200
    except:
        taskboard_ok = False
    
    return gateway_ok, taskboard_ok

def ping_main_gateway():
    """定期檢查主 OpenClaw Gateway 的狀態"""
    global main_gateway_online
    try:
        response = requests.get(MAIN_GATEWAY_URL, timeout=5)
        if response.status_code == 200:
            if not main_gateway_online:
                logger.info("主 OpenClaw Gateway 已恢復連線！")
            main_gateway_online = True
        else:
            if main_gateway_online:
                logger.warning(f"主 OpenClaw Gateway 離線或返回錯誤狀態碼: {response.status_code}")
            main_gateway_online = False
    except requests.exceptions.ConnectionError:
        if main_gateway_online:
            logger.warning("無法連接到主 OpenClaw Gateway。")
        main_gateway_online = False
    except requests.exceptions.Timeout:
        if main_gateway_online:
            logger.warning("連接主 OpenClaw Gateway 超時。")
        main_gateway_online = False
    except Exception as e:
        logger.error(f"檢查主 Gateway 狀態時發生未知錯誤: {e}")
        main_gateway_online = False

def ollama_chat(message_text):
    """使用 Ollama 模型生成回應"""
    try:
        data = {
            "model": OLLAMA_MODEL_BACKUP,
            "messages": [{"role": "user", "content": message_text}],
            "stream": False # 不使用串流
        }
        headers = {'Content-Type': 'application/json'}
        response = requests.post(OLLAMA_API_URL, headers=headers, data=json.dumps(data), timeout=60)
        response.raise_for_status() # 檢查 HTTP 錯誤
        result = response.json()
        return result['message']['content']
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API 請求失敗: {e}")
        return f"抱歉，Ollama 服務目前無法回應: {e}"
    except Exception as e:
        logger.error(f"Ollama 回應處理失敗: {e}")
        return f"抱歉，處理 Ollama 回應時發生錯誤: {e}"

def start_openclaw_gateway():
    """啟動 OpenClaw Gateway - 開啟新終端機視窗並執行 openclaw gateway"""
    global last_restart_attempt
    current_time = time.time()
    if current_time - last_restart_attempt < RESTART_COOLDOWN:
        return False, f"⏱️ 正在冷卻中，請等待 {RESTART_COOLDOWN - (current_time - last_restart_attempt):.0f} 秒後再試"
    
    logger.info("嘗試啟動 OpenClaw Gateway...")
    
    # 先檢查是否已經在運行
    gateway_ok, _ = check_gateway_status()
    if gateway_ok:
        return True, "✅ OpenClaw Gateway 已經在運行中！"
    
    try:
        # 使用 AppleScript 開啟新終端機視窗並執行 openclaw gateway
        applescript = '''
        tell application "Terminal"
            activate
            do script "openclaw gateway"
        end tell
        '''
        result = subprocess.run(
            ["osascript", "-e", applescript],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"AppleScript 執行失敗: {result.stderr}")
            return False, f"❌ 無法開啟終端機: {result.stderr}"
        
        last_restart_attempt = current_time
        logger.info("已開啟新終端機視窗，執行 openclaw gateway")
        
        # 等待 Gateway 啟動
        logger.info("等待 Gateway 啟動 (15秒)...")
        time.sleep(15)
        
        # 檢查是否啟動成功
        gateway_ok, taskboard_ok = check_gateway_status()
        if gateway_ok:
            return True, f"✅ OpenClaw Gateway 啟動成功！\n🌐 Gateway: 🟢 運行中\n📋 任務板: {'🟢' if taskboard_ok else '🔴'} {'運行中' if taskboard_ok else '未就緒'}"
        else:
            # 再等一下
            time.sleep(10)
            gateway_ok, taskboard_ok = check_gateway_status()
            if gateway_ok:
                return True, f"✅ OpenClaw Gateway 啟動成功！\n🌐 Gateway: 🟢 運行中\n📋 任務板: {'🟢' if taskboard_ok else '🔴'} {'運行中' if taskboard_ok else '未就緒'}"
            else:
                return False, "⚠️ 終端機已開啟並執行命令，但 Gateway 可能還在啟動中。\n請稍等 10-20 秒後再點「📊 狀態檢查」確認。"
    
    except subprocess.TimeoutExpired:
        return False, "⏱️ 執行超時，請手動檢查終端機視窗。"
    except Exception as e:
        logger.error(f"啟動失敗: {e}")
        return False, f"❌ 啟動失敗: {str(e)}"

def stop_openclaw_gateway():
    """停止 OpenClaw Gateway - 強制關閉所有相關進程"""
    logger.info("嘗試停止 OpenClaw Gateway...")
    
    try:
        # Step 1: 找到所有 openclaw 相關進程並強制終止
        killed = []
        
        # 終止 openclaw-gateway 進程
        try:
            result = subprocess.run(["pgrep", "-f", "openclaw-gateway"], capture_output=True, text=True)
            if result.stdout.strip():
                for pid in result.stdout.strip().split('\n'):
                    subprocess.run(["kill", "-9", pid], capture_output=True, timeout=2)
                    killed.append(f"openclaw-gateway (PID {pid})")
        except:
            pass
        
        # 終止 openclaw (父進程)
        try:
            result = subprocess.run(["pgrep", "-x", "openclaw"], capture_output=True, text=True)
            if result.stdout.strip():
                for pid in result.stdout.strip().split('\n'):
                    subprocess.run(["kill", "-9", pid], capture_output=True, timeout=2)
                    killed.append(f"openclaw (PID {pid})")
        except:
            pass
        
        # 終止佔用 port 18789 的進程
        try:
            result = subprocess.run(["lsof", "-ti:18789"], capture_output=True, text=True)
            if result.stdout.strip():
                for pid in result.stdout.strip().split('\n'):
                    if pid:
                        subprocess.run(["kill", "-9", pid], capture_output=True, timeout=2)
                        killed.append(f"port:18789 (PID {pid})")
        except:
            pass
        
        # 等待進程完全終止
        time.sleep(3)
        
        # 檢查是否已停止
        gateway_ok, _ = check_gateway_status()
        if not gateway_ok:
            killed_str = ', '.join(killed) if killed else '無需終止'
            return True, f"✅ OpenClaw Gateway 已成功停止！\n🔪 已終止: {killed_str}"
        else:
            return False, "⚠️ 停止命令已執行，但 Gateway 仍在運行。請手動關閉終端機視窗。"
            
    except Exception as e:
        logger.error(f"停止 Gateway 時發生錯誤: {e}")
        return False, f"❌ 停止失敗: {str(e)}"

def restart_main_gateway():
    """嘗試重啟主 OpenClaw Gateway 進程 - 確保先停止再啟動"""
    global last_restart_attempt
    current_time = time.time()
    if current_time - last_restart_attempt < RESTART_COOLDOWN:
        return f"⏱️ 正在冷卻中，請等待 {RESTART_COOLDOWN - (current_time - last_restart_attempt):.0f} 秒後再試"
    
    logger.info("=== 開始重啟 OpenClaw Gateway ===")
    
    # Step 1: 先強制停止
    logger.info("Step 1: 停止當前 Gateway...")
    stop_success, stop_msg = stop_openclaw_gateway()
    logger.info(f"停止結果: {stop_msg}")
    
    # Step 2: 等待舊進程完全終止
    logger.info("Step 2: 等待 5 秒確保舊進程終止...")
    time.sleep(5)
    
    # Step 3: 再次確認已停止
    gateway_ok, _ = check_gateway_status()
    if gateway_ok:
        logger.warning("Gateway 仍在運行，嘗試強制終止...")
        try:
            subprocess.run(["pkill", "-9", "-f", "openclaw"], capture_output=True, timeout=3)
            time.sleep(3)
        except:
            pass
    
    # Step 4: 啟動新的 Gateway
    logger.info("Step 3: 啟動新 Gateway...")
    start_success, start_msg = start_openclaw_gateway()
    
    # 回報結果
    if start_success:
        return f"🔄 重啟成功！\n{start_msg}"
    else:
        return f"🔄 重啟結果:\n• 停止: {'✅' if stop_success else '⚠️'}\n• 啟動: ❌\n{start_msg}"

# --- Telegram Bot 處理函數 ---
async def start(update, context):
    """處理 /start 命令"""
    welcome_msg = f"""🤖 哈囉老蔡！我是 Ollama 監控機器人

✅ 已啟用功能鍵盤控制
使用下方按鈕可以快速：
• 啟動/停止 OpenClaw Gateway
• 重啟 Gateway
• 檢查系統狀態
• 切換對話模式

直接點擊按鈕即可操作！"""
    await update.message.reply_text(welcome_msg, reply_markup=get_main_keyboard())

async def help_command(update, context):
    """處理 /help 命令"""
    help_text = """📖 Ollama Bot 使用說明

🔘 功能按鈕：
• 🟢 啟動 OpenClaw - 啟動 Gateway 服務
• 🔴 停止 OpenClaw - 停止 Gateway 服務  
• 🔄 重啟 Gateway - 重新啟動 Gateway
• 📊 狀態檢查 - 檢查所有服務狀態
• 💬 對話模式 - 與 Ollama AI 對話
• ❓ 說明 - 顯示此說明

💡 提示：
- 點擊按鈕即可執行對應功能
- 對話模式下可以直接輸入文字與 AI 聊天
- 主機器人離線時我會自動接管"""
    await update.message.reply_text(help_text, reply_markup=get_main_keyboard())

async def status_check(update, context):
    """檢查系統狀態"""
    await update.message.reply_text("🔍 正在檢查系統狀態...")
    
    gateway_ok, taskboard_ok = check_gateway_status()
    
    # 檢查 Ollama
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        ollama_ok = response.status_code == 200
        ollama_models = response.json().get('models', []) if ollama_ok else []
        model_names = [m['name'] for m in ollama_models[:3]] if ollama_models else []
    except:
        ollama_ok = False
        model_names = []
    
    status_msg = f"""📊 系統狀態報告

🌐 OpenClaw Gateway: {'🟢 運行中' if gateway_ok else '🔴 離線'}
📋 任務板 (Port 3011): {'🟢 運行中' if taskboard_ok else '🔴 離線'}
🦙 Ollama 服務: {'🟢 運行中' if ollama_ok else '🔴 離線'}
"""
    if model_names:
        status_msg += f"🤖 可用模型: {', '.join(model_names)}\n"
    
    if gateway_ok and taskboard_ok:
        status_msg += "\n✅ 所有系統正常運作！"
    elif not gateway_ok and not taskboard_ok:
        status_msg += "\n⚠️ OpenClaw 未啟動，建議點擊「🟢 啟動 OpenClaw」"
    else:
        status_msg += "\n⚠️ 部分服務異常，建議檢查或重啟"
    
    await update.message.reply_text(status_msg, reply_markup=get_main_keyboard())

async def handle_button(update, context):
    """處理鍵盤按鈕點擊"""
    text = update.message.text
    user = update.message.from_user
    
    logger.info(f"用戶 {user.username or user.id} 點擊按鈕: {text}")
    
    if text == '🟢 啟動 OpenClaw':
        await update.message.reply_text("🚀 正在啟動 OpenClaw Gateway...")
        success, msg = start_openclaw_gateway()
        await update.message.reply_text(msg, reply_markup=get_main_keyboard())
        
    elif text == '🔴 停止 OpenClaw':
        await update.message.reply_text("🛑 正在停止 OpenClaw Gateway...")
        success, msg = stop_openclaw_gateway()
        await update.message.reply_text(msg, reply_markup=get_main_keyboard())
        
    elif text == '🔄 重啟 Gateway':
        await update.message.reply_text("🔄 正在重啟 OpenClaw Gateway...")
        msg = restart_main_gateway()
        await update.message.reply_text(msg, reply_markup=get_main_keyboard())
        
    elif text == '📊 狀態檢查':
        await status_check(update, context)
        
    elif text == '❓ 說明':
        await help_command(update, context)
        
    elif text == '💬 對話模式':
        await update.message.reply_text(
            "💬 已進入對話模式！\n\n"
            "現在可以直接輸入文字，我會使用 Ollama 模型回覆你。\n"
            "當主機器人 (OpenClaw Gateway) 離線時，我會自動接管回答。\n\n"
            "點擊其他功能按鈕可切換回控制模式。",
            reply_markup=get_main_keyboard()
        )
    else:
        # 其他文字訊息，交給 handle_message 處理
        await handle_message(update, context)

async def handle_message(update, context):
    """處理所有文字訊息（對話模式）"""
    global main_gateway_online
    user_message = update.message.text
    chat_id = update.message.chat_id
    
    # 檢查是否為按鈕指令（如果是，已經被 handle_button 處理）
    button_commands = ['🟢 啟動 OpenClaw', '🔴 停止 OpenClaw', '🔄 重啟 Gateway', 
                       '📊 狀態檢查', '💬 對話模式', '❓ 說明']
    if user_message in button_commands:
        return  # 已經由 handle_button 處理
    
    # 檢查主 Gateway 狀態
    gateway_ok, _ = check_gateway_status()
    
    if not gateway_ok:
        # 主 Gateway 離線，備用 Bot 接管
        logger.info(f"主 Gateway 離線，Ollama Bot 接管。收到訊息: {user_message}")
        await update.message.reply_text(
            f"⚠️ 主機器人目前離線，我正在使用 Ollama ({OLLAMA_MODEL_BACKUP}) 回應。",
            reply_markup=get_main_keyboard()
        )
        
        # 嘗試重啟主 Gateway
        restart_msg = restart_main_gateway()
        await update.message.reply_text(restart_msg, reply_markup=get_main_keyboard())

        # 使用 Ollama 回應
        ollama_response = ollama_chat(user_message)
        await update.message.reply_text(ollama_response, reply_markup=get_main_keyboard())
    else:
        # 主 Gateway 在線
        logger.info(f"主 Gateway 在線。收到訊息: {user_message}")
        await update.message.reply_text(
            "✅ 主機器人 (OpenClaw Gateway) 正在運行中！\n"
            "請直接在主機器人對話框中與小蔡對話。\n\n"
            "我會繼續監控系統狀態，如有異常會立即通知你。",
            reply_markup=get_main_keyboard()
        )

# --- 主函數 ---
import asyncio

async def run_scheduler():
    """背景執行緒：定期檢查 Gateway 狀態"""
    while True:
        ping_main_gateway()
        await asyncio.sleep(30)

def main():
    """啟動 Bot"""
    # 創建 Application（自動清除 webhook）
    application = Application.builder().token(TELEGRAM_BOT_TOKEN_BACKUP).build()

    # 註冊命令處理器
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("status", status_check))
    
    # 註冊訊息處理器
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_button))

    # 啟動背景排程（在事件循環中運行）
    async def start_scheduler():
        asyncio.create_task(run_scheduler())
    
    application.job_queue.run_once(lambda ctx: asyncio.create_task(run_scheduler()), when=0)

    # 啟動 Bot
    logger.info("Ollama 監控 Bot 開始運行...")
    print("🤖 Bot 已啟動！請在 Telegram 中查看功能鍵盤。")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
