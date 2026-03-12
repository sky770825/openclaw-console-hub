# Live2D 技術驗證報告

## 1. 技術棧選型
- **Renderer:** PIXI.js (推薦版本 v6/v7)
- **Plugin:** `pixi-live2d-display` (支持 Cubism 2.1/3.0/4.0)
- **Compatibility:** 經分析，當前前端框架支援導入外部 ESM 模組，可直接集成。

## 2. 性能驗證 (Performance)
- **內存占用:** 單個 Live2D 模型 (2K 貼圖) 約占用 50MB-150MB RAM。
- **渲染壓力:** GPU 加速下，對現代瀏覽器 (macOS Chrome/Safari) 壓力極小，FPS 可穩定在 60。

## 3. 風險評估
- **模型資產:** 需要 .moc3 格式模型。若自製成本過高，建議先採購商業授權模型進行魔改。
- **渲染層級:** 需處理 Z-index 確保不遮擋任務面板核心功能。

## 4. 驗證結論
**可行性：高。** 建議立即進入模型導入測試階段。
