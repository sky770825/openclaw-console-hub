# Linear & Vercel 動畫實作技術指南

根據阿研的調研結果，本指南為「阿工」提供具體的實作參數與技術架構，旨在達成 Linear 與 Vercel 等級的高級感。

## 核心設計原則
- **Snappiness (明快感)**: 縮短反應時間，通常在 0.2s - 0.4s 之間。
- **Spring Physics (彈簧物理)**: 避免線性過渡，使用 stiffness 與 damping。
- **Layout Transitions**: 使用 Framer Motion 的 `layout` prop 處理元件位移。

## 推薦參數 (Framer Motion)
- **Transition**:
  - type: "spring"
  - stiffness: 300
  - damping: 30
  - mass: 1

## 實作建議
1. **進入動畫**: Opacity 從 0 到 1，伴隨 Y 軸小幅位移 (e.g., `y: 10 -> 0`)。
2. **Hover 效果**: 使用微小的 ScaleUp (1.02) 與背景色平滑過度。
3. **分層渲染**: 確保彈窗與側欄有足夠的 Z-index 與 Backdrop blur (10px+)。

