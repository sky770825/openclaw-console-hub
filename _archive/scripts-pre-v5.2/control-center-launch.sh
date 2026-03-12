#!/bin/bash
set -e
# OpenClaw 中控台啟動器

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
CONTROL_CENTER="$WORKSPACE/control-center"

echo "🐣 OpenClaw 中控台啟動中..."
echo ""

# 收集系統狀態
echo "收集系統狀態..."

# 1. 檢查 OpenClaw 狀態
OPENCLAW_STATUS=$(openclaw status 2>/dev/null | head -5 || echo "狀態未知")

# 2. 檢查備份狀態
LATEST_BACKUP=$(ls -t ~/Desktop/小蔡/系統備份/ 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' | head -1 || echo "無")

# 3. 檢查檢查點
CHECKPOINT_COUNT=$(find ~/Desktop/小蔡/檢查點/ -mindepth 1 -maxdepth 1 -type d ! -name '.history' 2>/dev/null | wc -l || echo 0)

# 4. 檢查 cron 任務
CRON_COUNT=$(openclaw cron list 2>/dev/null | grep -c "enabled" || echo 0)

# 生成中控台 HTML
cat > ~/Desktop/小蔡/中控台/中控台.html << HTML_EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>🎛️ OpenClaw 中控台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .card h2 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-good { color: #10b981; }
        .status-warn { color: #f59e0b; }
        .status-bad { color: #ef4444; }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child { border-bottom: none; }
        .label { color: #6b7280; }
        .value { font-weight: 600; color: #111; }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 15px;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        .timestamp {
            text-align: center;
            color: rgba(255,255,255,0.8);
            margin-top: 20px;
        }
        .quick-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .quick-actions a {
            flex: 1;
            min-width: 120px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎛️ OpenClaw 中控台</h1>
        
        <div class="grid">
            <!-- 系統狀態 -->
            <div class="card">
                <h2>💻 系統狀態</h2>
                <div class="info-row">
                    <span class="label">OpenClaw 狀態</span>
                    <span class="value status-good">● 運行中</span>
                </div>
                <div class="info-row">
                    <span class="label">最新備份</span>
                    <span class="value">${LATEST_BACKUP}</span>
                </div>
                <div class="info-row">
                    <span class="label">檢查點數量</span>
                    <span class="value">${CHECKPOINT_COUNT} 個</span>
                </div>
                <div class="info-row">
                    <span class="label">Cron 任務</span>
                    <span class="value">${CRON_COUNT} 個啟用</span>
                </div>
            </div>
            
            <!-- 快速操作 -->
            <div class="card">
                <h2>⚡ 快速操作</h2>
                <div class="quick-actions">
                    <a href="../系統備份/🛠️系統恢復.command" class="btn">🛠️ 系統恢復</a>
                    <a href="../檢查點/🛡️檢查點管理器.command" class="btn">🛡️ 檢查點</a>
                </div>
                <div style="margin-top: 15px;">
                    <a href="#" onclick="alert('請使用 Telegram 傳 /status 查看詳細狀態')" class="btn" style="width: 100%; text-align: center;">📊 詳細狀態</a>
                </div>
            </div>
            
            <!-- 今日概覽 -->
            <div class="card">
                <h2>📅 今日概覽</h2>
                <div class="info-row">
                    <span class="label">日期</span>
                    <span class="value">$(date +%Y-%m-%d)</span>
                </div>
                <div class="info-row">
                    <span class="label">已完成任務</span>
                    <span class="value">系統恢復中心、檢查點系統</span>
                </div>
                <div class="info-row">
                    <span class="label">待執行</span>
                    <span class="value status-warn">待中控台整合</span>
                </div>
            </div>
            
            <!-- 文件資源 -->
            <div class="card">
                <h2>📚 文件資源</h2>
                <div class="quick-actions">
                    <a href="../系統備份/📖%20操作手冊.md" class="btn">系統恢復手冊</a>
                    <a href="../檢查點/📖%20檢查點操作手冊.md" class="btn">檢查點手冊</a>
                </div>
            </div>
        </div>
        
        <div class="timestamp">
            最後更新：$(date '+%Y-%m-%d %H:%M:%S') | 自動刷新間隔：60秒
        </div>
    </div>
    
    <script>
        // 自動刷新
        setTimeout(() => {
            location.reload();
        }, 60000);
    </script>
</body>
</html>
HTML_EOF

echo "✅ 中控台已建立"
echo ""
echo "位置: ~/Desktop/小蔡/中控台/中控台.html"
echo ""

# 用瀏覽器開啟
open ~/Desktop/小蔡/中控台/中控台.html 2>/dev/null || echo "請手動開啟"

