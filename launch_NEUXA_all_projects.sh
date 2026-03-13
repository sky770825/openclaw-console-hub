#!/bin/bash
# ==============================================================================
# NEUXA 全面啟動腳本 (v1.0)
# ==============================================================================
#
# 由 NEUXA L1 指揮官生成，由最高授權者（主人）親自執行。
# 本腳本將一次性完成以下任務：
# 1. 在任務板上建立「APEX 頂點計畫」的四大史詩級任務。
# 2. 派出 6 個 L2 開發子代理，分別執行「NEUXA 平台一期」的六大模組開發。
#
# ==============================================================================

set -e # 任何指令失敗則立即停止

echo "🚀 NEUXA 全面啟動程序開始..."
echo "--------------------------------------------------"
echo "STEP 1/2: 正在建立 APEX 頂點計畫的四大史詩級任務..."
echo ""

# Epic 1: Perception Evolution
echo "  - 建立任務: [APEX-EPIC-1] 感知進化..."
curl -s -X POST http://localhost:3011/api/tasks -H 'Content-Type: application/json' -d '{
  "name": "[APEX-EPIC-1] 感知進化 (Perception Evolution)",
  "status": "ready",
  "projectPath": "projects/neuxa/apex/",
  "tags": ["APEX", "EPIC", "Perception"],
  "notes": "賦予 NEUXA 視覺與操作 GUI 的能力。詳見 PROJECT_APEX.md。"
}' > /dev/null

# Epic 2: Cognitive Leap
echo "  - 建立任務: [APEX-EPIC-2] 認知躍遷..."
curl -s -X POST http://localhost:3011/api/tasks -H 'Content-Type: application/json' -d '{
  "name": "[APEX-EPIC-2] 認知躍遷 (Cognitive Leap)",
  "status": "ready",
  "projectPath": "projects/neuxa/apex/",
  "tags": ["APEX", "EPIC", "Cognition"],
  "notes": "建立自我優化與學習的閉環機制。詳見 PROJECT_APEX.md。"
}' > /dev/null

# Epic 3: Autonomous Agency
echo "  - 建立任務: [APEX-EPIC-3] 自主代理..."
curl -s -X POST http://localhost:3011/api/tasks -H 'Content-Type: application/json' -d '{
  "name": "[APEX-EPIC-3] 自主代理 (Autonomous Agency)",
  "status": "ready",
  "projectPath": "projects/neuxa/apex/",
  "tags": ["APEX", "EPIC", "Autonomy"],
  "notes": "讓 NEUXA 從執行者進化為策略家，主動發現機會。詳見 PROJECT_APEX.md。"
}' > /dev/null

# Epic 4: Swarm Intelligence
echo "  - 建立任務: [APEX-EPIC-4] 集體智慧..."
curl -s -X POST http://localhost:3011/api/tasks -H 'Content-Type: application/json' -d '{
  "name": "[APEX-EPIC-4] 集體智慧 (Swarm Intelligence)",
  "status": "ready",
  "projectPath": "projects/neuxa/apex/",
  "tags": ["APEX", "EPIC", "Swarm"],
  "notes": "打造自組織的、可直接通訊協作的代理蜂群。詳見 PROJECT_APEX.md。"
}' > /dev/null

echo ""
echo "✅ STEP 1/2 完成！四大史詩級任務已建立。"
echo "--------------------------------------------------"
echo "STEP 2/2: 正在派出 NEUXA 平台一期的 L2 開發艦隊..."
echo ""

# Module 1: Communications Deck
echo "  - 正在派出開發者: NEUXA-Module1-CommDeck..."
openclaw agent --agent main -m "$(cat <<'T1'
[NEUXA-Module1-CommDeck] **任務：開發 NEUXA 平台模組一：通訊甲板 (Communications Deck)**

**核心目標：** 建立內部資訊同步與指揮中心，確保資訊快速、準確地流動。

**具體交付成果：**
1.  **後端 API 與服務：**
    - 設計並實作事件 (Event) 與公告 (Announcement) 的資料庫 Schema (使用 Prisma)。
    - 開發一個 WebSocket 伺服器，用於即時推送事件與公告更新。
    - 撰寫相關的 REST API 端點 (CRUD for Announcements)。
2.  **前端 React 組件：**
    - 開發一個 RealTimeFeed.tsx 組件，能連接 WebSocket 並顯示即時事件流。
    - 開發一個 AnnouncementBar.tsx 組件，能顯示置頂的全局公告。
    - 開發一個 AgentStatusDashboard.tsx 組件，用於顯示 L1/L2 代理的狀態（先用假資料）。
3.  **文件：**
    - 在 RESULT.md 中提供 API 的端點說明與 WebSocket 的使用方式。
    - 說明前端組件如何使用。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-comm-deck/ 目錄下。完成後，總結你的工作並回報。
T1
)"

# Module 2: Multi-Layered Space Browser
echo "  - 正在派出開發者: NEUXA-Module2-SpaceBrowser..."
openclaw agent --agent main -m "$(cat <<'T2'
[NEUXA-Module2-SpaceBrowser] **任務：開發 NEUXA 平台模組二：多層空間瀏覽 (Multi-Layered Space Browser)**

**核心目標：** 提供強大且直觀的導航系統，讓用戶能無縫穿梭於不同專案、知識庫與協作空間。

**具體交付成果：**
1.  **後端 API 與服務：**
    - 設計並實作一個支持層級式結構（如 parent-child 關係）的資料庫 Schema (使用 Prisma)，用於儲存空間節點。
    - 開發 API 端點以獲取整個空間樹或特定子樹。
    - 整合一個輕量級的後端搜尋功能，允許按名稱搜尋空間節點。
2.  **前端 React 組件：**
    - 開發一個 SpaceBrowser.tsx 組件，該組件能獲取 API 資料並以可收合的樹狀結構展示。
    - 在組件中加入一個搜尋框，可以即時篩選樹狀結構中的節點。
    - 實作切換「列表視圖」和「看板視圖」的按鈕與基本狀態管理邏輯（先做出結構，看板內容可為空）。
3.  **文件：**
    - 在 RESULT.md 中提供 API 的端點說明。
    - 說明 SpaceBrowser.tsx 組件的 props 和使用方法。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-space-browser/ 目錄下。完成後，總結你的工作並回報。
T2
)"

# Module 3: Hello Zero
echo "  - 正在派出開發者: NEUXA-Module3-HelloZero..."
openclaw agent --agent main -m "$(cat <<'T3'
[NEUXA-Module3-HelloZero] **任務：開發 NEUXA 平台模組三：Hello 零 (Hello Zero)**

**核心目標：** 打造極致流暢的新用戶引導體驗，從註冊到建立第一個專案，全程無阻礙。

**具體交付成果：**
1.  **後端 API 與服務：**
    - 設計用戶資料庫 Schema (User Model)，包含 email, password hash, profile 等欄位 (使用 Prisma)。
    - 建立用戶身份驗證 (Authentication) 相關的 API 端點，包括：/api/auth/register, /api/auth/login, /api/auth/me。使用 JWT (JSON Web Tokens) 進行 session 管理。
2.  **前端頁面與邏輯：**
    - 建立註冊 (/register) 和登入 (/login) 的頁面，包含表單和驗證邏輯。
    - 實作前端的 session 管理，將 JWT 存儲在 httpOnly cookie 或 localStorage 中。
    - 整合 Shepherd.js 或類似的引導庫，並建立一個簡單的、包含 3 個步驟的互動式教學腳本，引導用戶認識儀表板介面。
3.  **文件：**
    - 在 RESULT.md 中提供身份驗證 API 的使用說明。
    - 概述前端引導教學腳本的整合方式。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-hello-zero/ 目錄下。完成後，總結你的工作並回報。
T3
)"

# Module 4: Public Showcase
echo "  - 正在派出開發者: NEUXA-Module4-Showcase..."
openclaw agent --agent main -m "$(cat <<'T4'
[NEUXA-Module4-Showcase] **任務：開發 NEUXA 平台模組四：公開展示 (Public Showcase)**

**核心目標：** 建立一個能對外展示成果、吸引潛在用戶的櫥窗。

**具體交付成果：**
1.  **後端 API 與服務：**
    - 設計一個 ShowcaseProject 的資料庫 Schema，包含 title, description, coverImage, content, isPublic 等欄位 (使用 Prisma)。
    - 開發 API 端點，允許用戶建立/更新/刪除自己的 Showcase 專案。
    - 開發一個公開的 API 端點 /api/public/showcase/:projectId，用於獲取公開的專案資料。
2.  **前端頁面與組件：**
    - 開發一個所見即所得（WYSIWYG）的後台編輯器頁面，讓用戶可以建立和編輯他們的公開展示內容。
    - 開發一個公開的展示頁面範本 (/showcase/[id])，用於渲染專案內容。
    - 在展示頁面中加入 HTML Meta Tags (og:title, og:description, og:image) 以優化社群分享。
3.  **文件：**
    - 在 RESULT.md 中提供相關 API 的端點說明。
    - 說明後台編輯器與公開頁面的路由和功能。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-showcase/ 目錄下。完成後，總結你的工作並回報。
T4
)"

# Module 5: Basic Contact
echo "  - 正在派出開發者: NEUXA-Module5-Contact..."
openclaw agent --agent main -m "$(cat <<'T5'
[NEUXA-Module5-Contact] **任務：開發 NEUXA 平台模組五：基礎接觸 (Basic Contact)**

**核心目標：** 提供清晰、簡單的外部聯繫管道。

**具體交付成果：**
1.  **後端 API 與 n8n 整合：**
    - 建立一個 n8n workflow，包含一個 Webhook 觸發器，用於接收聯繫表單的提交。
    - Workflow 的下一步是將接收到的表單資料格式化，並透過 Telegram Bot 發送通知給管理員。
    - 建立一個後端 API 端點 /api/contact，其唯一作用是接收前端請求，並將資料轉發到 n8n 的 Webhook URL。這層代理可以隱藏 n8n 的真實 URL。
2.  **前端頁面與組件：**
    - 開發一個「聯繫我們」的前端頁面 (/contact)，包含姓名、Email、訊息等欄位，並有基本的客戶端驗證。
    - 開發一個 FAQ 頁面 (/faq)，頁面內容可以直接從一個本地的 faq.md 檔案讀取和渲染。
3.  **文件：**
    - 在 RESULT.md 中提供 /api/contact 的使用方法。
    - 提供 n8n workflow 的 JSON 匯出和設定截圖。
    - 說明 FAQ 頁面如何讀取 Markdown 檔案。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-contact/ 目錄下。完成後，總結你的工作並回報。
T5
)"

# Module 6: Collaboration Space
echo "  - 正在派出開發者: NEUXA-Module6-Collaboration..."
openclaw agent --agent main -m "$(cat <<'T6'
[NEUXA-Module6-Collaboration] **任務：開發 NEUXA 平台模組六：協作空間 (Collaboration Space)**

**核心目標：** 打造團隊工作的核心場域，支援任務管理與資源共享。

**具體交付成果：**
1.  **後端 API 與服務：**
    - 設計資料庫 Schema (使用 Prisma)，包含 Project, Task, TaskColumn 等模型，並建立它們之間的關聯。
    - 開發完整的 CRUD API，用於管理專案、欄位和任務。
    - 實作一個 API 端點，允許在不同欄位之間拖曳移動任務（更新任務的 columnId 和 order）。
2.  **前端組件與頁面：**
    - 開發一個看板頁面 (/project/[id]/board)。
    - 使用 react-beautiful-dnd 或類似的庫，實作一個可拖曳的看板介面，用於顯示和操作任務。
    - 實作新增、編輯、刪除任務的 Modal 彈窗或行內編輯功能。
    - **(檔案功能先做基礎)** 建立一個假的檔案上傳按鈕，點擊後只會 console.log "Upload clicked"，暫不需實作後端儲存。
3.  **文件：**
    - 在 RESULT.md 中提供所有協作空間相關的 API 端點和使用範例。
    - 說明看板介面的前端實作細節和使用的函式庫。

請直接開始開發，將所有相關程式碼放置於 projects/neuxa/module-collaboration/ 目錄下。完成後，總結你的工作並回報。
T6
)"

echo ""
echo "✅ STEP 2/2 完成！L2 開發艦隊已全數派出。"
echo "--------------------------------------------------"
echo "🎉 NEUXA 全面啟動程序執行完畢！"
echo ""
echo "您現在可以透過 'subagents list' 或任務板 http://localhost:3011 查看進度。"

