#!/bin/bash
set -e
# 🎯 任務板 API 中控台 - 瀏覽器版啟動器
# 啟動本地伺服器顯示任務板儀表板

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
DB_FILE="$OPENCLAW_HOME/automation/tasks.json"
PORT=3456

echo "🎯 啟動任務板 API 中控台..."
echo ""

# 確保資料庫存在
if [[ ! -f "$DB_FILE" ]]; then
    mkdir -p "$OPENCLAW_HOME/automation"
    echo '{"tasks":[],"runs":[],"nextTaskId":1,"nextRunId":1}' > "$DB_FILE"
fi

# 產生 HTML 儀表板
generate_dashboard() {
    cat > /tmp/taskboard-dashboard.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 任務板中控台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            text-align: center;
            padding: 40px 20px;
            color: white;
        }
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            transition: transform 0.3s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-number {
            font-size: 3em;
            font-weight: bold;
            color: #2a5298;
        }
        .stat-label {
            color: #666;
            margin-top: 8px;
        }
        .section {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .section h2 {
            color: #1e3c72;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #2a5298;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .task-list {
            list-style: none;
        }
        .task-item {
            display: flex;
            align-items: center;
            padding: 16px;
            margin-bottom: 12px;
            background: #f8f9fa;
            border-radius: 12px;
            border-left: 4px solid #ddd;
            transition: all 0.3s;
        }
        .task-item:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        .task-item.running {
            border-left-color: #ffc107;
            background: #fff8e1;
        }
        .task-item.pending {
            border-left-color: #6c757d;
        }
        .task-item.completed {
            border-left-color: #28a745;
            background: #e8f5e9;
        }
        .task-id {
            font-weight: bold;
            color: #2a5298;
            margin-right: 16px;
            min-width: 40px;
        }
        .task-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin-right: 16px;
            text-transform: uppercase;
        }
        .task-status.running {
            background: #ffc107;
            color: #856404;
        }
        .task-status.pending {
            background: #6c757d;
            color: white;
        }
        .task-status.completed {
            background: #28a745;
            color: white;
        }
        .task-name {
            flex: 1;
            font-weight: 500;
        }
        .task-actions {
            display: flex;
            gap: 8px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: #2a5298;
            color: white;
        }
        .btn-primary:hover {
            background: #1e3c72;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .refresh-bar {
            text-align: center;
            padding: 15px;
            color: rgba(255,255,255,0.8);
            font-size: 0.9em;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .empty-state-icon {
            font-size: 3em;
            margin-bottom: 10px;
        }
        @media (max-width: 768px) {
            header h1 {
                font-size: 1.8em;
            }
            .task-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .task-actions {
                width: 100%;
                justify-content: flex-end;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 任務板中控台</h1>
            <p>Task Board API Dashboard</p>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="total-tasks">-</div>
                <div class="stat-label">總任務</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="running-tasks">-</div>
                <div class="stat-label">進行中</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="pending-tasks">-</div>
                <div class="stat-label">待執行</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="completed-tasks">-</div>
                <div class="stat-label">已完成</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📋 任務列表</h2>
            <ul class="task-list" id="task-list">
                <li class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <p>載入中...</p>
                </li>
            </ul>
        </div>
        
        <div class="section">
            <h2>▶️ 執行記錄</h2>
            <ul class="task-list" id="run-list">
                <li class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>載入中...</p>
                </li>
            </ul>
        </div>
    </div>
    
    <div class="refresh-bar">
        自動重新整理：每 30 秒 | 最後更新：<span id="last-update">-</span>
    </div>
    
    <script>
        // 讀取任務資料
        async function loadData() {
            try {
                // 從 localStorage 讀取（由啟動腳本注入）
                const data = window.taskBoardData || { tasks: [], runs: [] };
                
                // 更新統計
                const totalTasks = data.tasks.length;
                const runningTasks = data.tasks.filter(t => t.status === 'running').length;
                const pendingTasks = data.tasks.filter(t => t.status === 'pending').length;
                const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
                
                document.getElementById('total-tasks').textContent = totalTasks;
                document.getElementById('running-tasks').textContent = runningTasks;
                document.getElementById('pending-tasks').textContent = pendingTasks;
                document.getElementById('completed-tasks').textContent = completedTasks;
                
                // 更新任務列表
                const taskList = document.getElementById('task-list');
                if (data.tasks.length === 0) {
                    taskList.innerHTML = `
                        <li class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <p>尚無任務</p>
                        </li>
                    `;
                } else {
                    taskList.innerHTML = data.tasks.map(task => `
                        <li class="task-item ${task.status}">
                            <span class="task-id">#${task.id}</span>
                            <span class="task-status ${task.status}">${task.status}</span>
                            <span class="task-name">${task.name}</span>
                            <div class="task-actions">
                                ${task.status === 'pending' ? 
                                    `<button class="btn btn-primary" onclick="runTask(${task.id})">開始</button>` : 
                                    task.status === 'running' ? 
                                    `<button class="btn btn-success" onclick="completeTask(${task.id})">完成</button>` : 
                                    ''}
                            </div>
                        </li>
                    `).join('');
                }
                
                // 更新執行記錄
                const runList = document.getElementById('run-list');
                if (data.runs.length === 0) {
                    runList.innerHTML = `
                        <li class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <p>尚無執行記錄</p>
                        </li>
                    `;
                } else {
                    runList.innerHTML = data.runs.slice().reverse().map(run => `
                        <li class="task-item ${run.status}">
                            <span class="task-id">Run #${run.id}</span>
                            <span class="task-status ${run.status}">${run.status}</span>
                            <span class="task-name">任務 #${run.taskId}</span>
                            <span style="color: #666; font-size: 0.9em;">
                                ${new Date(run.startedAt).toLocaleString()}
                            </span>
                        </li>
                    `).join('');
                }
                
                // 更新時間
                document.getElementById('last-update').textContent = new Date().toLocaleString();
                
            } catch (error) {
                console.error('載入資料失敗:', error);
            }
        }
        
        function runTask(taskId) {
            alert(`開始執行任務 #${taskId}`);
            // 這裡可以加入實際的 API 呼叫
        }
        
        function completeTask(taskId) {
            alert(`標記任務 #${taskId} 完成`);
            // 這裡可以加入實際的 API 呼叫
        }
        
        // 初始載入
        loadData();
        
        // 定期重新整理
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
HTML_EOF

    # 注入資料
    TASKS=$(cat "$DB_FILE" | jq -c '.')
    sed -i '' "s|window.taskBoardData = .*|window.taskBoardData = $TASKS;|" /tmp/taskboard-dashboard.html 2>/dev/null || true
}

# 產生儀表板
generate_dashboard

# 開啟瀏覽器
echo "開啟任務板儀表板..."
open /tmp/taskboard-dashboard.html

echo ""
echo "✅ 任務板中控台已啟動！"
echo ""
echo "📊 目前任務統計:"
~/.openclaw/workspace/scripts/task-board-api.sh status 2>/dev/null | jq -r '"  總任務: \(.tasks), 進行中: \(.running), 已完成: \(.runs)"' 2>/dev/null || echo "  無法讀取統計"
echo ""
echo "🌐 網址: file:///tmp/taskboard-dashboard.html"
echo "🔄 自動重新整理: 每 30 秒"
echo ""
echo "按 Enter 關閉..."
read -r
