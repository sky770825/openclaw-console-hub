# 登陸頁面技術分析報告 (Linear, Vercel, Raycast)

## 1. Linear (linear.app)
- **核心架構**: Next.js (React)
- **樣式方案**: Tailwind CSS, 搭配精心設計的 CSS Variables 進行主題管理。
- **動畫技術**: 大量使用 **Framer Motion**。其標誌性的「發光邊框」與「背景網格」通常使用 HTML5 Canvas 或 GLSL Shaders 渲染以確保效能。
- **設計語彙**: 極簡主義、高對比度、重視排版（Typography），使用自定義或高品質的 Sans-serif 字體。
- **效能優化**: 預加載關鍵路徑資產，極致的 SVG 優化。

## 2. Vercel (vercel.com)
- **核心架構**: Next.js (App Router 範本)
- **樣式方案**: Tailwind CSS, Radix UI (Primitives)。
- **字體**: 使用自家開發的 **Geist** 字體家族，強調開發者友好的閱讀體驗。
- **技術特性**: 展示了 React Server Components (RSC) 的實踐，利用 Vercel Edge Network 進行全域分發。
- **視覺特色**: 封閉式幾何圖形、磨砂玻璃效果（Backdrop-filter）、流暢的狀態轉換動畫。

## 3. Raycast (raycast.com)
- **核心架構**: Next.js
- **樣式方案**: Tailwind CSS。
- **互動設計**: 模擬其桌面端應用的「指令面板」感，重視鍵盤導航與快速回應。
- **動畫技術**: Framer Motion 實現的輕量化過場。
- **視覺特色**: 深色模式優先，高飽和度的 Accent Colors，精緻的圖標系統（Raycast Icons）。

---
**整理者**: 阿研 (OpenClaw Task Executor)
**更新時間**: 2026-03-04 20:33:26
