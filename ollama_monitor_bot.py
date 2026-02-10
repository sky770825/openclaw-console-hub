#!/usr/bin/env python3
"""
Ollama 本機連線 Telegram Bot (ollama168bot)
連接本機 Ollama，可查詢狀態並與本地模型對話
"""

import os
import sys
import logging
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

import ollama_client

_env_path = Path(__file__).parent / "ollama_monitor_bot.env"
ollama_client.load_env(_env_path)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN and _env_path.exists():
    for line in _env_path.read_text(encoding="utf-8").strip().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip("'\"")
            if k == "TELEGRAM_BOT_TOKEN" and v:
                TELEGRAM_BOT_TOKEN = v
                break

# 日誌：同時輸出到檔案與終端
LOG_DIR = Path(__file__).parent
LOG_FILE = LOG_DIR / "ollama_monitor_bot.log"
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """錯誤處理"""
    logger.error("處理更新時發生錯誤: %s", context.error, exc_info=context.error)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /start"""
    user = update.effective_user
    logger.info("收到 /start from @%s (id=%s)", user.username, user.id)
    await update.message.reply_text(
        "🤖 本機 Ollama Bot (ollama168bot)\n\n"
        "連接本機 Ollama，可與本地模型對話\n\n"
        "指令：\n"
        "/start - 說明\n"
        "/status - 查詢 Ollama 狀態與模型\n"
        "/model - 點按鈕切換模型（或 /model <名稱>）\n\n"
        "或直接發送訊息，AI 會回覆"
    )


async def cmd_model(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /model - 切換 Ollama 模型"""
    user = update.effective_user
    if context.args:
        new_model = context.args[0].strip()
        context.user_data["ollama_model"] = new_model
        logger.info("用戶 @%s 切換模型為 %s", user.username, new_model)
        await update.message.reply_text(f"✅ 已切換模型為: {new_model}")
    else:
        ok, names = ollama_client.list_models()
        current = context.user_data.get("ollama_model", ollama_client.OLLAMA_MODEL)
        if ok and names:
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


async def cb_model(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 inline 按鈕：切換模型"""
    query = update.callback_query
    await query.answer()
    if not query.data or not query.data.startswith("model:"):
        return
    new_model = query.data.replace("model:", "", 1)
    context.user_data["ollama_model"] = new_model
    logger.info("用戶點擊切換模型為 %s", new_model)
    await query.edit_message_text(f"✅ 已切換模型為: {new_model}")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理一般文字訊息，轉發給本機 Ollama"""
    if not update.message or not update.message.text:
        return
    user = update.effective_user
    text = update.message.text.strip()
    if not text:
        return
    model = context.user_data.get("ollama_model", ollama_client.OLLAMA_MODEL)
    logger.info("收到訊息 from @%s, 模型=%s: %s...", user.username, model, text[:50])
    status = await update.message.reply_text("⏳ 本機 Ollama 處理中...")
    ok, reply = ollama_client.ask_ollama(text, model)
    if ok:
        # Telegram 單則上限 4096 字
        if len(reply) > 4000:
            reply = reply[:4000] + "\n\n...(已截斷)"
        await status.edit_text(reply)
    else:
        await status.edit_text(f"❌ {reply}")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """處理 /status - 查詢 Ollama 狀態"""
    user = update.effective_user
    logger.info("收到 /status from @%s (id=%s)", user.username, user.id)
    ok, msg = ollama_client.check_ollama_status()
    await update.message.reply_text(msg)


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("請設定環境變數 TELEGRAM_BOT_TOKEN")
        print("例: export TELEGRAM_BOT_TOKEN='你的機器人 token'")
        return

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("model", cmd_model))
    app.add_handler(CallbackQueryHandler(cb_model, pattern=r"^model:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)

    logger.info(
        "ollama168bot 啟動 (本機 Ollama: %s, 預設模型: %s) 日誌: %s",
        ollama_client.OLLAMA_URL,
        ollama_client.OLLAMA_MODEL,
        LOG_FILE,
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
