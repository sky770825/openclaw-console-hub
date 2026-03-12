# Live2D x OpenClaw 系統整合與優化提案

## 1. 核心整合策略 (阿工負責)
- **架構設計**: 採用 Live2D Cubism SDK for Web 4.x。
- **渲染容器**: 在前端介面右下角建立獨立的 <canvas> 渲染區塊，避免與任務面版 DOM 渲染衝突。
- **狀態連動**: 將 OpenClaw 的任務狀態 (Task Status) 映射至 Live2D 動作 (Motions)。
    - 任務完成 -> "Happy" 動作
    - 任務逾期 -> "Sad" 動作
    - 閒置中 -> "Idle" 隨機呼吸與視線追蹤。

## 2. 效能優化方案 (阿研負責)
- **WebGL 資源釋放**: 切換頁面時強制執行 `renderer.release()`，防止記憶體洩漏。
- **降幀處理 (FPS Throttling)**: 當視窗不處於活動狀態時，將 Live2D 更新率降至 15 FPS。
- **Texture 壓縮**: 建議將模型貼圖轉換為 WebP 格式以減少載入時間。

## 3. 測試計劃
- **壓力測試**: 同時加載 3 個 Live2D 模型，監測 CPU 占用率。
- **相容性測試**: 驗證 macOS Safari 與 Chrome 的 WebGL 渲染表現。

## 4. 時程安排
- Week 1: SDK 環境搭建與模型導入。
- Week 2: 動作邏輯串接與效能壓力測試。
