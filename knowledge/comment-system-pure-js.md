# 留言系統技術概覽：原生 JavaScript 實作

## 前言
這份文件記錄了如何使用純粹的 HTML、CSS 和 JavaScript 來構建一個簡單的留言板功能。這種方法不依賴任何第三方框架或函式庫，有助於深入理解前端與後端互動的基礎原理。

## 核心技術點
1.  HTML 結構：用於創建留言表單（輸入框、提交按鈕）和留言顯示區塊。
2.  CSS 樣式：美化留言板的介面。
3.  JavaScript 邏輯：處理前端互動、數據提交和頁面更新。
4.  AJAX (Asynchronous JavaScript and XML)：用於前端與後端之間的異步數據傳輸，實現無重新載入頁面的數據更新。
5.  後端伺服器 (Server-side)：處理前端發送的留言數據，將其存儲到資料庫，並提供查詢接口。
6.  資料庫 (Database)：用於持久化存儲留言數據。

## 主要實作步驟

### 1. 創建 HTML 留言板結構
   留言表單：包含 textarea 用於輸入留言內容，以及一個 button 用於提交。
   留言列表容器：一個 div 或 ul 元素，用於動態顯示從後端獲取的留言。

``html
<div class="comment-box">
    <h2>留言板</h2>
    <form id="comment-form">
        <textarea id="comment-content" placeholder="請輸入你的留言..."></textarea>
        <button type="submit">提交留言</button>
    </form>
    <div id="comment-list">
        <!-- 留言將會動態加載到這裡 -->
    </div>
</div>
`

### 2. JavaScript 處理前端邏輯
   監聽表單提交事件：當使用者點擊提交按鈕時，阻止表單的預設提交行為，並擷取留言內容。
   DOM 操作：動態創建 HTML 元素來顯示新的留言，並將其添加到留言列表容器中。

`javascript
document.getElementById('comment-form').addEventListener('submit', function(event) {
    event.preventDefault(); // 阻止表單預設提交
    const commentContent = document.getElementById('comment-content').value;
    if (commentContent.trim() === '') {
        alert('留言內容不能為空！');
        return;
    }
    // 假設這裡有 sendCommentToServer 函數負責發送數據到後端
    sendCommentToServer(commentContent);
    document.getElementById('comment-content').value = ''; // 清空輸入框
});

function displayComment(comment) {
    const commentList = document.getElementById('comment-list');
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-item';
    commentElement.innerHTML = <p>${comment.content}</p><small>By ${comment.author} on ${new Date(comment.timestamp).toLocaleString()}</small>;
    commentList.prepend(commentElement); // 將新留言添加到最前面
}
`

### 3. 使用 AJAX 進行數據傳輸
   fetch API 或 XMLHttpRequest：將留言數據異步發送到後端 API 端點。
   GET 請求：從後端獲取現有的留言列表。
   POST 請求：將新的留言數據發送到後端進行保存。

`javascript
async function sendCommentToServer(content) {
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content, author: '匿名用戶' })
        });
        const newComment = await response.json();
        if (response.ok) {
            displayComment(newComment); // 成功後顯示新留言
        } else {
            console.error('提交留言失敗:', newComment.message);
            alert('提交留言失敗！');
        }
    } catch (error) {
        console.error('網絡錯誤:', error);
        alert('網絡錯誤，請稍後再試。');
    }
}

async function fetchComments() {
    try {
        const response = await fetch('/api/comments');
        const comments = await response.json();
        if (response.ok) {
            document.getElementById('comment-list').innerHTML = ''; // 清空現有列表
            comments.forEach(comment => displayComment(comment));
        } else {
            console.error('獲取留言失敗:', comments.message);
        }
    } catch (error) {
        console.error('網絡錯誤:', error);
    }
}

// 頁面加載時自動獲取留言
fetchComments();
`

### 4. 後端伺服器處理 (示例，通常是 Node.js Express 或其他)
   API 端點：例如 /api/comments，用於處理 GET 和 POST 請求。
*   數據持久化：將接收到的留言存儲到資料庫（如 MongoDB, PostgreSQL, SQLite 等）。

`javascript
// 示例後端代碼 (Express.js)
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

let comments = []; // 簡單的記憶體存儲，實際應用會用資料庫

// POST 請求：提交新留言
app.post('/api/comments', (req, res) => {
    const { content, author } = req.body;
    if (!content) {
        return res.status(400).json({ message: '留言內容不能為空' });
    }
    const newComment = { id: comments.length + 1, content, author, timestamp: new Date() };
    comments.push(newComment);
    res.status(201).json(newComment);
});

// GET 請求：獲取所有留言
app.get('/api/comments', (req, res) => {
    res.json(comments.sort((a, b) => b.timestamp - a.timestamp)); // 按時間倒序返回
});

app.listen(port, () => {
    console.log(Server running at http://localhost:${port});
});
``

## 總結
原生 JavaScript 實現留言板，雖然需要處理較多的細節（如 DOM 操作、AJAX、後端數據處理），但能提供最大的靈活性和客製化空間。它強迫開發者理解底層原理，這對於構建高效且可擴展的 Web 應用至關重要。結合後端資料庫，可以實現完整的留言發布、顯示和管理功能。