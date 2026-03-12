# Chain of Thought Archive

思考路徑存檔目錄

## 目錄結構

```
memory/chain-of-thought/
├── 2026/
│   ├── 02/
│   │   └── 19/
│   │       └── cot-{timestamp}.json
├── index.json          # 索引檔案
└── README.md          # 本檔案
```

## 檔案格式

```json
{
  "id": "cot-1708316831-abc123",
  "timestamp": "2026-02-19T13:07:11.347Z",
  "intent": {
    "type": "create-task",
    "target": "task-management",
    "complexity": "high"
  },
  "reasoning": [
    {
      "step": 1,
      "thought": "識別到這是一個新任務創建請求",
      "action": "parse-request"
    },
    {
      "step": 2,
      "thought": "任務描述較長，可能需要拆分子任務",
      "action": "analyze-complexity"
    }
  ],
  "outcome": {
    "success": true,
    "toolsUsed": ["task-create", "notification-send"],
    "duration": 1250
  }
}
```

## 用途

1. **自我學習**：Agent 可以回顧過去的思考過程
2. **決策優化**：識別常見的決策模式
3. **錯誤分析**：找出導致失敗的思考盲點
4. **知識傳承**：新 Agent 可以學習舊 Agent 的經驗
