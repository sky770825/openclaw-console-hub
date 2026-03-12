const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001; // Live2D Server 預設 Port

// 允許所有來源的跨域請求
app.use(cors());

// 靜態檔案服務：提供 Live2D 模型檔案
const modelsDir = path.join(__dirname, 'models');
app.use('/models', express.static(modelsDir));

// API 端點：獲取可用的模型列表
app.get('/api/models', (req, res) => {
    fs.readdir(modelsDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error('Error reading models directory:', err);
            return res.status(500).json({ error: 'Failed to read models directory' });
        }
        const modelNames = files
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        res.json({ models: modelNames });
    });
});

// API 端點：模擬互動回覆
app.get('/api/interact/hit', (req, res) => {
    const responses = [
        "你好，指揮官！",
        "很高興為您服務。",
        "有什麼需要我幫忙的嗎？",
        "今天天氣真好呢。",
        "期待下一次的任務！"
    ];
    const randomIndex = Math.floor(Math.random() * responses.length);
    res.json({ message: responses[randomIndex] });
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`Live2D Server 啟動成功，正在監聽 http://localhost:${port}`);
    console.log(`模型靜態檔案路徑: http://localhost:${port}/models/`);
    console.log(`獲取模型列表: http://localhost:${port}/api/models`);
    console.log(`互動測試: http://localhost:${port}/api/interact/hit`);
});
