# 達爾 Live2D Web 界面

## 架構
``
Telegram → openclaw server → WebSocket → 瀏覽器 Live2D
`

## 啟動方式
`bash
# 直接用 Python 起靜態伺服器（測試用）
cd /Users/sky770825/.openclaw/workspace/projects/live2d-web
python3 -m http.server 8080
# 開瀏覽器訪問 http://localhost:8080
``

## 功能
- Live2D 角色（Haru，官方免費模型）
- 點擊角色觸發動作
- WebSocket 即時收 openclaw 訊息
- 情緒對應動作（happy/sad/excited）

## 下一步
- [ ] 接入 openclaw server WebSocket 端點
- [ ] Telegram 指令 /live2d 回傳網頁連結
- [ ] 支援更多免費模型切換
- [ ] TTS 語音輸出
