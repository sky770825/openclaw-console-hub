# 星艦忙活主題 (Starship Busy Theme) 技術規範

## 視覺風格
- 配色: 深藍、電光紫、金屬灰。
- 角色動作: 
  - 閒置 (Idle): 浮空操作全息投影。
  - 忙碌 (Busy): 快速打字，身邊出現多個任務視窗。
  - 警報 (Alert): 任務逾期時，背景閃爍紅光。

## 技術參數
- 模型格式: Live2D Cubism 4.2
- 核心參數 (Parameters):
  - `ParamWorkIntensity`: 0.0 to 1.0 (控制忙碌程度)
  - `ParamStarshipAlert`: 0.0 / 1.0 (開關警報特效)
