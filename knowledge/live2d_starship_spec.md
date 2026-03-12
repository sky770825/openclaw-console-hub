# Live2D「星艦/忙碌」主題技術規範

## 1. 核心視覺語義 (Starship Theme)
- **色彩規範**: 基於「星艦控制台」風格，主色調採用 #00F0FF (電漿藍) 與 #FF0055 (警示紅)。
- **特效疊加**: 模型需整合 WebGL Overlay，在 Live2D Canvas 上層疊加「全息掃描線」與「浮動數據粒子」。
- **材質感**: 運用 Live2D Cubism 4.0+ 的「多重著色器」模擬金屬反射與發光零件。

## 2. 狀態映射 (Busy Situation)
當系統處於「忙碌」或「高負載」情境時，Live2D 模型需透過 API 動態切換 Expression 與 Motion：
- **CPU 負載映射**: 
    - 低負載: Idling (緩慢呼吸，眼神巡視)
    - 中負載: Working (鍵盤敲擊動作，專注表情)
    - 高負載: Overload (流汗特效，紅光警示燈閃爍，動作頻率加快)
- **API 接入點**: 監控 `performance.now()` 與系統 `loadavg`。

## 3. 技術框架建議
- **SDK**: Live2D Cubism SDK for Web (Core 4.2+)
- **Renderer**: PixiJS v7 + pixi-live2d-display (用於高效能紋理管理)
- **Interaction**: 
    - Pointer Tracking: 鼠標追蹤模擬星艦雷達跟隨。
    - Hit Area: 點擊肩膀觸發「系統報告」語音。

## 4. 資源目錄規範
- `/assets/live2d/starship_pilot/`
    - `pilot.model3.json` (主配置文件)
    - `expressions/busy_state.exp3.json`
    - `motions/overload_emergency.motion3.json`
