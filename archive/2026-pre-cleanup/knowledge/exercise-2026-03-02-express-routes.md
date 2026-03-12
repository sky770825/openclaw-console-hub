# 學習筆記：Express 路由分析

分析對象：server/src/routes/openclaw-tasks.ts

## 核心邏輯
1. 使用 express.Router() 實例化。
2. 透過 authMiddleware 保護敏感端點。
3. GET /：從 Supabase 抓取任務列表，支援 status 過濾。
4. POST /：建立新任務，包含 allowStub 邏輯。
5. PATCH /:id：更新任務狀態，這是 auto-executor 回報結果的關鍵。

## 練習實作 (Pseudo Code)
``typescript
router.get('/health-check', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
``