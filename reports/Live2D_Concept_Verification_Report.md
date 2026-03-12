# Live2D 概念與技術驗證報告 (星艦與忙活)

## 1. 核心概念定義

### 1.1 星艦 (Starship) - 環境與容器
- **視覺定義**: 「星艦」代表整個 OpenClaw 任務面板的「操作環境」。它不只是一個背景，而是一個動態的、具有科幻感的邊框與 UI 系統。
- **互動特性**: 
    - 邊框發光呼吸效果與系統負載連動。
    - 切換分頁時，模擬星艦艙門切換或曲速跳躍的轉場視覺。
    - 底層 UI 使用半透明毛玻璃質感，模擬控制艙顯示器。

### 1.2 忙活 (Busywork) - 角色與狀態
- **視覺定義**: 「忙活」是以 Live2D 技術呈現的虛擬助理或工作進度實體化角色（Mascot）。
- **互動特性**:
    - **閒置 (Idle)**: 當任務面板無操作時，角色進行打瞌睡或檢查儀表板的動畫。
    - **執行中 (Busy)**: 當背景任務（如 Script 執行）進行時，角色進入「忙碌模式」（如敲擊鍵盤、焊接、查閱檔案）。
    - **滑鼠跟隨**: 角色視線跟隨使用者游標，增加存在感。
    - **反饋觸發**: 任務成功時點頭/慶祝，任務失敗時流汗/沮喪。

## 2. 技術可行性驗證

### 2.1 技術棧建議
- **渲染引擎**: [PixiJS](https://pixijs.com/) (高效能 2D WebGL 渲染)。
- **Live2D SDK**: [cubism-web-sdk](https://www.live2d.com/sdk/download/web/) 搭配 [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)。
- **整合方式**: 封裝為 React Component，透過 Prop 驅動 Motion 與 Expression。

### 2.2 效能評估
- **記憶體**: 每個 Live2D 模型約佔 20MB - 80MB VRAM。
- **渲染**: 在主流 macOS (Darwin) 設備上，1080p 解析度下可維持 60 FPS。

## 3. 實作路徑
1. 導入 `pixi.js` 與 `pixi-live2d-display`。
2. 建立 `Live2DStage` 組件。
3. 定義 `Busywork` 狀態機 (Idle, Working, Success, Error)。
