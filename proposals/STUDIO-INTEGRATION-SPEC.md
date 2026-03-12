# Studio 整合實作規範

## 1. 建立核心編譯器
路徑：server/src/studio/compiler.ts
內容：導出 SkillCompiler 類別，負責將 JSON Graph 轉換為 Markdown。

## 2. 建立 API 路由
路徑：server/src/routes/studio.ts
內容：實作 POST /compile 接口，呼叫編譯器。

## 3. 掛載主路由
檔案：server/src/index.ts
動作：
- 引入 studioRouter
- 在 app.use('/api/federation', ...) 之後掛載 app.use('/api/studio', studioRouter)