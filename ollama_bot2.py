#!/usr/bin/env python3
"""
Ollama 本機連線 — 第二個 Telegram Bot
與 ollama_monitor_bot 共用同一套 Ollama 連線（ollama_client），
使用不同的 Bot Token，從 ollama_bot2.env 讀取設定。
"""

import os
import re
import subprocess
import sys
import time
import logging
from pathlib import Path
from typing import Optional

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

ENV_FILE = Path(__file__).parent / "ollama_bot2.env"

import ollama_client

ollama_client.load_env(ENV_FILE)

# 從 ollama_bot2.env 讀取設定
def _load_env_var(key: str, default: str = "") -> str:
    val = os.getenv(key, default)
    if val:
        return val
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").strip().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip("'\"")
                if k == key and v:
                    return v
    return default

TELEGRAM_BOT_TOKEN = _load_env_var("TELEGRAM_BOT_TOKEN")
_allowed_raw = _load_env_var("ALLOWED_USER_IDS")
ALLOWED_USER_IDS_SET = frozenset(x.strip() for x in _allowed_raw.split(",") if x.strip()) if _allowed_raw.strip() else None  # None = 所有人可執行
MSG_MAX = 4000

LOG_DIR = Path(__file__).parent
LOG_FILE = LOG_DIR / "ollama_bot2.log"
KNOWLEDGE_FILE = LOG_DIR / "knowledge" / "knowledge_base.md"
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# 長期記憶：成長型，每用戶一個 memory.yaml
MEMORY_DIR = Path(__file__).parent / "memories"
MEMORY_MAX_LINES = 25  # 超過此行數時，由模型 consolidating 濃縮
MEMORY_SYSTEM = """請預設使用繁體中文回覆。長篇回覆時請勿使用 **、##、* 等 markdown 符號，用純文字即可。

以下是你的知識庫（回答時可參考，優先於猜測）：
{knowledge}

以下是你的長期記憶（成長型，會隨對話慢慢累積與精煉）：
{memory}

若本次對話有值得長期記住的內容（用戶偏好、重要事實、約定），請在回覆**最後**加上：
[memory_patch]
- 事實1
- 事實2
[/memory_patch]

若無需更新記憶，不要加 memory_patch。回覆時保持自然，記憶區塊會自動處理。"""

CONSOLIDATE_PROMPT = """請將以下長期記憶濃縮成最精華的關鍵事實（去重、合併相似、保留重要資訊，控制在 15 條以內）。只輸出 [memory_patch] 區塊，格式：
[memory_patch]
- 事實1
- 事實2
[/memory_patch]"""


KNOWLEDGE_AUTO_FILE = LOG_DIR / "knowledge" / "knowledge_auto.md"
KNOWLEDGE_MAX_CHARS = 10000  # 知識庫總長上限，避免 context 過大拖慢回覆


def _load_knowledge() -> str:
    """讀取知識庫（供注入 system prompt）：knowledge_base.md + knowledge_auto.md。有長度上限。"""
    parts = []
    total = 0
    if KNOWLEDGE_FILE.exists():
        try:
            c = KNOWLEDGE_FILE.read_text(encoding="utf-8").strip()
            if c and total + len(c) <= KNOWLEDGE_MAX_CHARS:
                parts.append(c)
                total += len(c)
        except Exception:
            pass
    if KNOWLEDGE_AUTO_FILE.exists() and total < KNOWLEDGE_MAX_CHARS:
        try:
            c = KNOWLEDGE_AUTO_FILE.read_text(encoding="utf-8").strip()
            if c:
                remainder = KNOWLEDGE_MAX_CHARS - total - 50
                if len(c) > remainder:
                    c = c[:remainder] + "\n...(已截斷)"
                parts.append("\n---\n" + c)
        except Exception:
            pass
    if not parts:
        return "(尚無知識庫，可新增 knowledge/knowledge_base.md)"
    return "\n".join(parts)


def _load_memory(user_id: int) -> str:
    """讀取該用戶的長期記憶。"""
    MEMORY_DIR.mkdir(exist_ok=True)
    f = MEMORY_DIR / f"{user_id}.yaml"
    if not f.exists():
        return "(尚無長期記憶)"
    try:
        return f.read_text(encoding="utf-8").strip() or "(尚無長期記憶)"
    except Exception:
        return "(尚無長期記憶)"


def _clear_memory(user_id: int) -> None:
    """清除該用戶的長期記憶。"""
    f = MEMORY_DIR / f"{user_id}.yaml"
    if f.exists():
        f.unlink()
        logger.info("已清除 user_id=%s 的記憶", user_id)


def _save_memory(user_id: int, new_facts: list[str]) -> None:
    """將新事實附加到該用戶的長期記憶。"""
    MEMORY_DIR.mkdir(exist_ok=True)
    f = MEMORY_DIR / f"{user_id}.yaml"
    existing = []
    if f.exists():
        try:
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("- "):
                    existing.append(line.strip())
        except Exception:
            pass
    seen = set(existing)
    for x in new_facts:
        x = x.strip()
        if x and x not in seen:
            existing.append(f"- {x}" if not x.startswith("-") else x)
            seen.add(x)
    f.write_text("\n".join(existing) + "\n", encoding="utf-8")


def _consolidate_memory(user_id: int, model: str) -> bool:
    """當記憶過長時，由模型濃縮成精華，形成成長型記憶。"""
    f = MEMORY_DIR / f"{user_id}.yaml"
    if not f.exists():
        return False
    content = f.read_text(encoding="utf-8")
    lines = [l for l in content.splitlines() if l.strip().startswith("- ")]
    if len(lines) < MEMORY_MAX_LINES:
        return False
    logger.info("記憶過長 (%d 行)，觸發 consolidating", len(lines))
    full_memory = "\n".join(lines)
    messages = [
        {"role": "system", "content": CONSOLIDATE_PROMPT},
        {"role": "user", "content": full_memory},
    ]
    ok, reply = ollama_client.ask_ollama_messages(messages, model)
    if not ok:
        return False
    _, facts = _parse_memory_patch(reply)
    if facts:
        lines = [f"- {x}" if not str(x).strip().startswith("-") else str(x).strip() for x in facts]
        f.write_text("\n".join(lines) + "\n", encoding="utf-8")
        logger.info("已 consolidating 記憶為 %d 條", len(facts))
        return True
    return False


def _strip_markdown(reply: str) -> str:
    """移除常見 markdown 符號（**、##、* 等），保留純文字。"""
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", reply)  # **bold** -> bold
    s = re.sub(r"\*([^*]+)\*", r"\1", s)          # *italic* -> italic
    s = re.sub(r"^#+\s*", "", s, flags=re.MULTILINE)  # ## title -> title
    return s.strip()


def _parse_memory_patch(reply: str) -> tuple[str, list[str]]:
    """從回覆中解析 [memory_patch]...[/memory_patch]，回傳 (乾淨回覆, 新事實列表)。"""
    m = re.search(r"\[memory_patch\](.*?)\[/memory_patch\]", reply, re.DOTALL | re.IGNORECASE)
    if not m:
        return reply.strip(), []
    block = m.group(1).strip()
    facts = []
    for line in block.splitlines():
        line = line.strip()
        if line.startswith("-"):
            s = line[1:].strip()
            if s:
                facts.append(s)
        elif line:
            facts.append(line)
    clean = (reply[: m.start()] + reply[m.end() :]).strip()
    clean = re.sub(r"\n{3,}", "\n\n", clean)  # 多餘空行
    return clean, facts


# 底部固定選單按鈕（像 OpenClaw 一樣可點選）
MENU_KEYBOARD = ReplyKeyboardMarkup(
    [
        [KeyboardButton("📊 狀態"), KeyboardButton("📋 切換模型")],
        [KeyboardButton("🔄 重啟 OpenClaw"), KeyboardButton("🔄 重啟 Ollama")],
        [KeyboardButton("📋 Gateway 日誌"), KeyboardButton("🔍 檢查 Port")],
        [KeyboardButton("📋 服務列表"), KeyboardButton("🗑 清除記憶")],
    ],
    resize_keyboard=True,
    is_persistent=True,
)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("處理更新時發生錯誤: %s", context.error, exc_info=context.error)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    logger.info("收到 /start from @%s (id=%s)", user.username, user.id)
    await update.message.reply_text(
        "🤖 Ollama Bot #2\n\n"
        "連接本機 Ollama，可與本地模型對話\n\n"
        "可使用下方按鈕快速操作，或直接發送訊息與 AI 對話。",
        reply_markup=MENU_KEYBOARD,
    )


async def cmd_model(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.args:
        new_model = context.args[0].strip()
        context.user_data["ollama_model"] = new_model
        logger.info("用戶切換模型為 %s", new_model)
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
    if not update.message or not update.message.text:
        return
    text = update.message.text.strip()
    if not text:
        return
    # 處理選單按鈕點擊
    if text == "📊 狀態":
        ok, msg = ollama_client.check_ollama_status()
        await update.message.reply_text(msg)
        return
    if text == "📋 切換模型":
        ok, names = ollama_client.list_models()
        current = context.user_data.get("ollama_model", ollama_client.OLLAMA_MODEL)
        if ok and names:
            keyboard = [[InlineKeyboardButton(n, callback_data=f"model:{n}")] for n in names]
            await update.message.reply_text(
                f"目前模型: {current}\n點選下方按鈕切換：",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        else:
            await update.message.reply_text(
                f"目前模型: {current}\n使用 /model <名稱> 切換\n（Ollama 未連線或無模型）"
            )
        return
    if text == "🔄 重啟 OpenClaw":
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        msg = await update.message.reply_text("⏳ 正在完整重啟 OpenClaw Gateway...")
        ok, reply_text = _do_restart_openclaw()
        await msg.edit_text(reply_text)
        return
    # 透過文字觸發 openclaw gateway restart（需權限）
    if "openclaw gateway restart" in text.lower() or "openclaw gateway 重啟" in text:
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        msg = await update.message.reply_text("⏳ 執行 openclaw gateway restart...")
        ok, out = _run_openclaw_gateway_restart()
        await msg.edit_text(out)
        return
    if text == "🔄 重啟 Ollama":
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        msg = await update.message.reply_text("⏳ 正在重啟 Ollama...")
        ok, reply_text = _do_restart_ollama()
        await msg.edit_text(reply_text)
        return
    if text == "📋 Gateway 日誌":
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        await update.message.reply_text(_truncate(_get_gateway_logs()))
        return
    if text == "🔍 檢查 Port":
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        txt = _check_port()
        await update.message.reply_text(txt)
        return
    if text == "📋 服務列表":
        user = update.effective_user
        if not _can_exec(user.id):
            await update.message.reply_text("❌ 你沒有權限執行此指令")
            return
        await update.message.reply_text(_list_services())
        return
    if text == "🗑 清除記憶":
        user = update.effective_user
        _clear_memory(user.id)
        if "chat_history" in context.user_data:
            del context.user_data["chat_history"]
        await update.message.reply_text("✅ 已清除你的長期記憶與對話歷程")
        return
    # 任務板觸發（需權限）
    task_board_result = _try_task_board_command(text, update.effective_user)
    if task_board_result is not None:
        await update.message.reply_text(_truncate(task_board_result))
        return
    # 一般訊息：轉給 Ollama（含長期記憶與短期對話歷程）
    user = update.effective_user
    model = context.user_data.get("ollama_model", ollama_client.OLLAMA_MODEL)
    logger.info("收到訊息, 模型=%s: %s...", model, text[:50])
    status = await update.message.reply_text("⏳ 本機 Ollama 處理中...")
    memory = _load_memory(user.id)
    knowledge = _load_knowledge()
    history = context.user_data.get("chat_history", [])
    messages = [
        {"role": "system", "content": MEMORY_SYSTEM.format(memory=memory, knowledge=knowledge)},
        *history[-6:],
        {"role": "user", "content": text},
    ]
    num_predict, num_ctx, temperature = ollama_client._speed_options(model)
    full_reply = []
    last_edit = 0
    edit_interval = 0.8  # 更新間隔（秒），避免 Telegram rate limit
    first_edit_done = False
    for ok, chunk in ollama_client.ask_ollama_messages_stream(
        messages, model, num_ctx=num_ctx or 4096, num_predict=num_predict, temperature=temperature
    ):
        if not ok:
            await status.edit_text(f"❌ {chunk}")
            return
        if chunk:
            full_reply.append(chunk)
            now = time.time()
            # 有足夠內容時立即做首次更新，之後按間隔更新
            should_edit = (not first_edit_done and len(full_reply) >= 1) or (
                first_edit_done and now - last_edit >= edit_interval
            )
            if should_edit:
                partial = "".join(full_reply)
                try:
                    suffix = "\n\n⏳ ..." if chunk else ""
                    await status.edit_text(_truncate(_strip_markdown(partial)) + suffix)
                    last_edit = now
                    first_edit_done = True
                except Exception:
                    pass
    reply = "".join(full_reply)
    if not reply:
        await status.edit_text("❌ 模型無回覆")
        return
    clean_reply, facts = _parse_memory_patch(reply)
    if facts:
        _save_memory(user.id, facts)
        logger.info("已寫入 memory_patch: %s", facts[:3])
        _consolidate_memory(user.id, model)  # 成長型：過長時濃縮
    clean_reply = _strip_markdown(clean_reply)
    history.append({"role": "user", "content": text})
    history.append({"role": "assistant", "content": clean_reply})
    context.user_data["chat_history"] = history[-14:]
    await status.edit_text(_truncate(clean_reply))


def _can_exec(user_id: int) -> bool:
    if ALLOWED_USER_IDS_SET is None:
        return True
    return str(user_id) in ALLOWED_USER_IDS_SET


def _truncate(txt: str, max_len: int = MSG_MAX) -> str:
    """截斷過長文字，符合 Telegram 限制。"""
    if len(txt) <= max_len:
        return txt
    return txt[:max_len] + "\n\n...(已截斷)"


GATEWAY_PORT = 18789


TASK_BOARD_SCRIPT = LOG_DIR / "scripts" / "task-board-api.sh"
TASK_BOARD_API_BASE = os.getenv("TASK_BOARD_API_BASE", "http://localhost:3009")


def _run_task_board(cmd: str, *args: str) -> str:
    """執行 task-board-api.sh，回傳輸出。"""
    if not TASK_BOARD_SCRIPT.exists():
        return f"❌ 找不到腳本: {TASK_BOARD_SCRIPT}"
    try:
        env = {**os.environ, "TASK_BOARD_API_BASE": TASK_BOARD_API_BASE}
        r = subprocess.run(
            [str(TASK_BOARD_SCRIPT), cmd, *args],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(LOG_DIR),
            env=env,
        )
        out = (r.stdout or r.stderr or "").strip()
        if r.returncode != 0 and out:
            return f"❌ {out}"
        return out or "(無輸出)"
    except subprocess.TimeoutExpired:
        return "❌ 執行逾時"
    except Exception as e:
        return f"❌ 錯誤: {e}"


def _try_task_board_command(text: str, user) -> Optional[str]:
    """
    若訊息符合任務板指令則執行並回傳結果，否則回傳 None。
    需 _can_exec 權限。
    """
    if not _can_exec(user.id):
        return None
    t = text.strip().lower()
    # list-tasks
    if t in ("list-tasks", "列任務", "任務板 列表", "任務板 列任務", "任務列表"):
        return _run_task_board("list-tasks")
    # list-runs
    if t in ("list-runs", "執行紀錄", "任務板 執行紀錄", "runs"):
        return _run_task_board("list-runs")
    # run-task <id>
    run_prefixes = ("run-task ", "執行任務 ", "run task ", "任務板 執行 ")
    for prefix in run_prefixes:
        if t.startswith(prefix):
            task_id = text[len(prefix) :].strip().split()[0] if len(text) > len(prefix) else ""
            if not task_id:
                return "❌ 請提供任務 ID，例如：run-task t1 或 執行任務 task-xxx"
            return _run_task_board("run-task", task_id)
    return None


def _run_openclaw_gateway_restart() -> tuple[bool, str]:
    """執行 openclaw gateway restart 指令。"""
    try:
        r = subprocess.run(
            ["openclaw", "gateway", "restart"],
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")},
        )
        out = (r.stdout or "").strip() or (r.stderr or "").strip()
        if r.returncode == 0:
            return True, f"✅ {out}"
        return False, f"❌ exit {r.returncode}\n{out}"
    except FileNotFoundError:
        return False, "❌ 找不到 openclaw 指令，請確認已安裝"
    except subprocess.TimeoutExpired:
        return False, "❌ 執行逾時"
    except Exception as e:
        return False, f"❌ 錯誤: {e}"


def _do_restart_openclaw() -> tuple[bool, str]:
    """完整重啟 OpenClaw Gateway：先停掉舊服務，再啟動。"""
    plist = Path.home() / "Library/LaunchAgents/ai.openclaw.gateway.plist"
    if not plist.exists():
        return False, f"❌ 找不到 plist: {plist}"
    try:
        uid = subprocess.run(["/usr/bin/id", "-u"], capture_output=True, text=True, timeout=5).stdout.strip()
        service_name = f"gui/{uid}/ai.openclaw.gateway"
        
        # 1. 先停掉服務（如果正在運行）
        subprocess.run(
            ["/bin/launchctl", "bootout", service_name],
            capture_output=True, timeout=10
        )
        logger.info("已執行 bootout %s", service_name)
        time.sleep(2)
        
        # 2. 清理殘留進程
        subprocess.run(["/usr/bin/pkill", "-9", "-f", "openclaw-gateway"], capture_output=True, timeout=5)
        try:
            out = subprocess.run(
                ["/usr/sbin/lsof", "-ti", str(GATEWAY_PORT)],
                capture_output=True, text=True, timeout=5,
            )
            if out.returncode == 0 and out.stdout.strip():
                for pid in out.stdout.strip().split():
                    subprocess.run(["/bin/kill", "-9", pid], capture_output=True, timeout=3)
                logger.info("已清理 port %s 進程", GATEWAY_PORT)
        except Exception:
            pass
        time.sleep(2)
        
        # 3. 重新載入並啟動
        r = subprocess.run(
            ["/bin/launchctl", "bootstrap", f"gui/{uid}", str(plist)],
            capture_output=True, text=True, timeout=30,
        )
        logger.info("bootstrap exit=%s stderr=%s", r.returncode, (r.stderr or "")[:200])
        if r.returncode != 0:
            err = (r.stderr or "").strip() or (r.stdout or "").strip()
            return False, f"⚠️ bootstrap 失敗：\n{err}"
        
        time.sleep(3)
        
        # 4. 驗證是否成功啟動
        check = subprocess.run(
            ["/bin/launchctl", "print", service_name],
            capture_output=True, text=True, timeout=5,
        )
        if "state = running" in check.stdout:
            return True, "✅ OpenClaw Gateway 已重啟成功"
        return True, "⚠️ 重啟指令已發送，請稍後檢查狀態"
    except subprocess.TimeoutExpired:
        return False, "❌ 執行逾時"
    except Exception as e:
        logger.exception("restart_openclaw 失敗")
        return False, f"❌ 錯誤: {str(e)}"


def _do_restart_ollama() -> tuple[bool, str]:
    """重啟 Ollama serve（LaunchAgent）。"""
    for label in ("ai.ollama.serve", "com.ollama.server"):
        plist = Path.home() / f"Library/LaunchAgents/{label}.plist"
        if not plist.exists():
            continue
        try:
            uid = subprocess.run(["id", "-u"], capture_output=True, text=True, timeout=5).stdout.strip()
            r = subprocess.run(
                ["launchctl", "kickstart", "-k", f"gui/{uid}/{label}"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if r.returncode == 0:
                return True, f"✅ Ollama ({label}) 已重啟"
            return False, f"⚠️ 重啟失敗：{(r.stderr or r.stdout or '').strip()}"
        except Exception as e:
            return False, f"❌ 錯誤: {str(e)}"
    return False, "❌ 找不到 Ollama LaunchAgent (ai.ollama.serve 或 com.ollama.server)"


def _get_gateway_logs(lines: int = 30) -> str:
    """取得 Gateway 錯誤日誌最後 N 行。"""
    p = Path.home() / ".openclaw/logs/gateway.err.log"
    if not p.exists():
        return "無 gateway.err.log"
    try:
        out = subprocess.run(
            ["tail", "-n", str(lines), str(p)],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return out.stdout.strip() or "(空白)"
    except Exception as e:
        return f"讀取失敗: {e}"


def _check_port() -> str:
    """檢查 port 18789 狀態。"""
    try:
        out = subprocess.run(
            ["lsof", "-i", f":{GATEWAY_PORT}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if out.returncode != 0 or not out.stdout.strip():
            return f"port {GATEWAY_PORT} 無進程佔用"
        return f"port {GATEWAY_PORT}:\n{out.stdout.strip()}"
    except Exception as e:
        return f"檢查失敗: {e}"


def _list_services() -> str:
    """列出 openclaw、ollama 相關 launchctl 服務。"""
    try:
        out = subprocess.run(
            ["launchctl", "list"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        lines = [l for l in out.stdout.splitlines() if "openclaw" in l.lower() or "ollama" in l.lower()]
        return "相關服務：\n" + ("\n".join(lines) if lines else "(無)")
    except Exception as e:
        return f"查詢失敗: {e}"


async def cmd_restart_openclaw(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """重啟 OpenClaw Gateway"""
    user = update.effective_user
    logger.info("收到 /restart_openclaw from user_id=%s", user.id)
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    msg = await update.message.reply_text("⏳ 正在完整重啟 OpenClaw Gateway...")
    ok, text = _do_restart_openclaw()
    await msg.edit_text(text)


async def cmd_restart_ollama(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    msg = await update.message.reply_text("⏳ 正在重啟 Ollama...")
    ok, text = _do_restart_ollama()
    await msg.edit_text(text)


async def cmd_gateway_logs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    txt = _get_gateway_logs()
    await update.message.reply_text(txt[:4000] + ("\n...(已截斷)" if len(txt) > 4000 else ""))


async def cmd_check_port(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    await update.message.reply_text(_check_port())


async def cmd_list_services(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    await update.message.reply_text(_list_services())


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    txt = """📋 指令列表

對話：/start、/status、/model
記憶：/clear_memory
執行（需權限）：
  /restart_openclaw、/restart_ollama
  /gateway_logs、/check_port、/list_services、/bot_logs

或使用下方按鈕快速操作。"""
    await update.message.reply_text(txt)


async def cmd_clear_memory(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    _clear_memory(user.id)
    if "chat_history" in context.user_data:
        del context.user_data["chat_history"]
    await update.message.reply_text("✅ 已清除你的長期記憶與對話歷程")


async def cmd_bot_logs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not _can_exec(user.id):
        await update.message.reply_text("❌ 你沒有權限執行此指令")
        return
    try:
        out = subprocess.run(
            ["tail", "-n", "20", str(LOG_FILE)],
            capture_output=True,
            text=True,
            timeout=5,
        )
        txt = out.stdout.strip() or "(空白)"
        await update.message.reply_text(_truncate(txt))
    except Exception as e:
        await update.message.reply_text(f"讀取失敗: {e}")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    ok, msg = ollama_client.check_ollama_status()
    await update.message.reply_text(msg)


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        print("請在 ollama_bot2.env 或環境變數設定 TELEGRAM_BOT_TOKEN")
        print("例: TELEGRAM_BOT_TOKEN=你的第二個機器人 token")
        return

    async def post_init(app):
        await app.bot.set_my_commands([
            ("start", "說明"),
            ("help", "指令列表"),
            ("status", "查詢 Ollama 狀態"),
            ("model", "切換模型"),
            ("clear_memory", "清除長期記憶"),
            ("restart_openclaw", "重啟 OpenClaw Gateway"),
            ("restart_ollama", "重啟 Ollama"),
            ("gateway_logs", "Gateway 錯誤日誌"),
            ("check_port", "檢查 port 18789"),
            ("list_services", "列出相關服務"),
            ("bot_logs", "Bot 日誌（最後 20 行）"),
        ])

    app = Application.builder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("clear_memory", cmd_clear_memory))
    app.add_handler(CommandHandler("bot_logs", cmd_bot_logs))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("model", cmd_model))
    app.add_handler(CommandHandler("restart_openclaw", cmd_restart_openclaw))
    app.add_handler(CommandHandler("restart_ollama", cmd_restart_ollama))
    app.add_handler(CommandHandler("gateway_logs", cmd_gateway_logs))
    app.add_handler(CommandHandler("check_port", cmd_check_port))
    app.add_handler(CommandHandler("list_services", cmd_list_services))
    app.add_handler(CallbackQueryHandler(cb_model, pattern=r"^model:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)

    logger.info(
        "ollama_bot2 啟動 (Ollama: %s, 預設模型: %s) 日誌: %s",
        ollama_client.OLLAMA_URL,
        ollama_client.OLLAMA_MODEL,
        LOG_FILE,
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
