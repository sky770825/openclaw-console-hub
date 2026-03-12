document.addEventListener('DOMContentLoaded', () => {
    const live2dCanvas = document.getElementById('live2d-canvas');
    const messageBox = document.getElementById('message-box');

    // 顯示訊息的函數
    function showMessage(message, duration = 3000) {
        messageBox.textContent = message;
        messageBox.classList.add('show');
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, duration);
    }

    // Live2D 模型點擊事件監聽
    if (live2dCanvas) {
        live2dCanvas.addEventListener('click', async () => {
            try {
                // 呼叫 Live2D Server 的互動 API
                const response = await fetch('http://localhost:3001/api/interact/hit');
                const data = await response.json();
                if (data && data.message) {
                    showMessage(data.message);
                } else {
                    showMessage('好像聽不懂你在說什麼呢...');
                }
            } catch (error) {
                console.error('Error fetching interaction response:', error);
                showMessage('通訊失敗，請檢查伺服器。');
            }
        });
    }

    // 初始歡迎訊息
    showMessage('指揮官，歡迎回來！', 5000);
});