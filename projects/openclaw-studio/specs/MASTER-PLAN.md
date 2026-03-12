# OpenClaw Studio Master Plan v1.0

## 🎯 專案目標
開發一個可視化的 AI 技能編譯器，讓用戶透過拖拉節點 (No-Code) 即可生成 OpenClaw Skills。

## 🏗️ 系統架構 (Cellular Structure)
1. **Core Cell (引擎)**: 負責 JSON 轉 Markdown (SKILL.md) 與執行邏輯。
2. **UI Cell (介面)**: 基於 React/Canvas 的可視化工作區。
3. **Bridge Cell (通訊)**: 負責 UI 與 OpenClaw Gateway 之間的 API 對接。

## 🖇️ 核心通訊規格 (Interlink Spec)
- **Schema**: 所有 Cell 必須遵循 `specs/node-schema.json` 定義的節點格式。
- **Communication**: 透過 `http://localhost:3011/api/studio` 進行狀態交換。

## 📅 里程碑 (Milestones)
- Phase 1: 各 Cell 獨立原型開發 (分裂開發)。
- Phase 2: 細胞組裝與交叉驗證。
- Phase 3: 正式集成至 OpenClaw 儀表板。
