# Live2D 初步技術方案 (Preliminary Technical Proposal)

## 1. 技術評估 (Technical Assessment)
*   **專案類型偵測**: React
*   **渲染引擎建議**: **PixiJS (v7+)**
    *   原因：PixiJS 擁有目前社群維護最穩定的 Live2D 整合插件 `pixi-live2d-display`。
*   **Live2D 版本**: Cubism 4.x
    *   支援最新的模型格式 (.model3.json) 以及物理效果。

## 2. 實作架構規劃 (Implementation Architecture)
### A. 前端組件化
建議在 `src/components/Common/Live2DAvatar` 建立獨立組件。
*   **Props**: `modelUrl`, `scale`, `position`, `interaction`.
*   **State**: 管理模型載入狀態與動作觸發 (Motions/Expressions)。

### B. 資源管理
*   路徑規劃: 模型檔案應放置於 `public/assets/live2d/`。
*   快取策略: 利用瀏覽器 IndexedDB 或 Cache API 快取較大的模型二進制檔案。

### C. 關鍵技術棧
1.  `pixi.js`: 底層渲染。
2.  `pixi-live2d-display`: Live2D 專屬渲染器。
3.  `cubism-sdk`: 官方提供之運行時庫 (Runtime)。

## 3. 具體實作步驟 (Action Plan)
1.  **環境初始化**: 安裝必要 npm 套件。
2.  **Asset 導入**: 放置模型 JSON 與 Texture 資源。
3.  **核心組件撰寫**: 封裝 Canvas 渲染邏輯。
4.  **事件串接**: 與任務面版完成事件、錯誤提示等邏輯進行連動。

## 4. 限制與預防
*   **性能**: Live2D 運算耗資源，應在頁面不可見或背景時調用 `stop()`。
*   **授權**: 確認模型使用符合 Live2D Cubism SDK 許可協議。
