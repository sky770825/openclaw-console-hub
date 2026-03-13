import os
import uvicorn
from fastapi import FastAPI, Request, HTTPException, Response
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# --- 組態設定 ---
# 請務必替換成您自己的 Bot Token 和 Bot ID
# Bot Token 可以從 BotFather 取得
# Bot ID 可以透過向 @userinfobot 發送訊息來取得您自己的 Bot ID
BOT_TOKEN = "8316840422:AAH3jcMMGB552XQEdlhyU2j0BPNXVAn57hE"  # 群組即時通知Bot @HOMEeeee168bot
LISTENER_BOT_ID = 8316840422             # @HOMEeeee168bot 的 Bot ID

# 固定的日誌檔案路徑，根據主人的要求
LOG_FILE_PATH = "/Users/sky770825/.openclaw/workspace/reports/group_chat_log.md"

# --- FastAPI 應用程式實例 ---
app = FastAPI()

# --- Pydantic 模型：用於驗證和解析 Telegram 的 JSON 數據 ---
# 這些模型結構對應 Telegram Bot API 的 Update 和 Message 物件
# 使用 Pydantic 可以確保我們收到的數據是符合預期格式的

class User(BaseModel):
    id: int
    is_bot: bool
    first_name: str
    username: Optional[str] = None

class Message(BaseModel):
    message_id: int
    from_user: Optional[User] = Field(None, alias='from') # 'from' 是 Python 關鍵字，所以用 alias
    date: int
    text: Optional[str] = None

class Update(BaseModel):
    update_id: int
    message: Optional[Message] = None

# --- 核心功能函數 ---

def write_log_to_file(formatted_message: str):
    """
    將格式化後的訊息追加寫入到指定的日誌檔案中。
    這個函數會自動檢查目錄是否存在，如果不存在則會創建。
    """
    try:
        # 確保日誌檔案所在的目錄存在
        log_directory = os.path.dirname(LOG_FILE_PATH)
        os.makedirs(log_directory, exist_ok=True)

        # 以追加模式（'a'）和 UTF-8 編碼打開檔案，並寫入日誌
        with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
            f.write(formatted_message + "\n")
        print(f"成功寫入日誌：{formatted_message}")
    except Exception as e:
        # 如果寫入失敗，在伺服器控制台打印錯誤，以便排查
        print(f"錯誤：無法寫入日誌檔案 {LOG_FILE_PATH}。原因：{e}")


# --- Webhook 路由處理器 ---

@app.post(f"/webhook/{BOT_TOKEN}")
async def process_telegram_update(update: Update, request: Request):
    # 驗證 Webhook 請求是否來自 Telegram (可選，但推薦)
    # Telegram 會從特定的 IP 範圍發送請求，可以進行驗證
    # 這裡簡化處理，直接信任來自 /webhook/{BOT_TOKEN} 路徑的請求

    # 檢查是否有訊息內容
    if not update.message or not update.message.text:
        return Response(status_code=200)

    message = update.message
    sender = message.from_user
    message_text = message.text
    timestamp = datetime.fromtimestamp(message.date).strftime('%Y-%m-%d %H:%M:%S')

    # 記錄所有訊息（人類 + Bot），排除自己
    if sender and sender.id != LISTENER_BOT_ID:
        name = sender.username or sender.first_name
        tag = "BOT" if sender.is_bot else "USER"
        formatted_log = f"[{timestamp}] [{tag}:{name} ({sender.id})]: {message_text}"
        write_log_to_file(formatted_log)

    # 無論如何，都返回 200 OK，告訴 Telegram 訊息已收到並處理
    return Response(status_code=200)

# --- 應用程式啟動入口點 ---
if __name__ == "__main__":
    # 在開發環境中，你可以這樣啟動服務
    # 注意：在生產環境中，應使用 gunicorn 等 WSGI 服務器來運行 FastAPI 應用
    # 例如：gunicorn -w 4 -k uvicorn.workers.UvicornWorker telegram_logger_webhook:app --bind 0.0.0.0:8000
    print(f"Telegram Webhook Logger 服務啟動中...")
    print(f"日誌將寫入：{LOG_FILE_PATH}")
    print(f"請將 Telegram Bot 的 Webhook 設定為：https://<YOUR_PUBLIC_URL>/webhook/{BOT_TOKEN}")
    print(f"伺服器正在監聽 http://0.0.0.0:8000")
    
    # 以下是修正的關鍵：實際啟動 Uvicorn 伺服器
    uvicorn.run(app, host="0.0.0.0", port=8000)
