# NEUXA 星群與可視化 v2 技術架構沉澱

## 1. 核心概念
- **星群 (Constellation)**: 將任務、節點與知識點以圖論 (Graph Theory) 為基礎進行可視化呈現。
- **維度空間**: 從傳統列表轉向二維/三維拓撲布局，增強對複雜關係的直觀理解。

## 2. 技術棧總結 (基於源碼分析)
- **前端渲染**: React + Framer Motion (動態效能) + Tailwind CSS。
- **圖形邏輯**: 採用 Force-directed Graph (受力導向圖) 佈局算法。
- **數據結構**: 
  - Nodes: { id, label, type, weight, status }
  - Links: { source, target, relationship, strength }

## 3. 關鍵模式 (Key Patterns)
- **動態過濾器**: 支持按標籤 (Tag) 或優先級動態重繪星群。
- **節點下鑽 (Drill-down)**: 點擊星群節點觸發任務細節側邊欄。
- **狀態同步**: 前端 Zustand/Redux 狀態與後端 Node/Edge 數據映射。

## 4. 最佳實踐
- 大量節點時優先使用 Canvas 而非 SVG 以保證 60fps。
- 關係線條透明度應與權重掛鉤，避免視覺干擾。
