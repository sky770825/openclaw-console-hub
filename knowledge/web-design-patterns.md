# 星艦航站 UI 設計模式 (Starship Terminal Design Patterns)

> 來源：從「星艦幻覺事件」中提取的高品質前端工藝。
> 目的：定義 OpenClaw 星艦航站的視覺語言與互動標準。
> 更新：2026-03-01

## 1. 玻璃擬態 (Glassmorphism)
- 核心概念：背景模糊、半透明層疊、邊框發光。打造「懸浮在太空中」的科技感。
- 用途：HUD (抬頭顯示器)、浮動面板、模態視窗。
- 代碼關鍵：backdrop-blur-xl, bg-black/40, border border-white/10, shadow-2xl。

## 2. 便當盒佈局 (Bento Grid)
- 核心概念：模組化、響應式網格、內容自適應。像便當盒一樣整齊，且能靈活伸縮。
- 用途：儀表板總覽 (Overview)、多維度監控 (Monitor)。
- 代碼關鍵：CSS Grid (grid-cols-1 md:grid-cols-4), gap-4, row-span-2, col-span-2。

## 3. 實時數據流 (Live Data Streams)
- 核心概念：動態刷新、趨勢線、狀態指示燈。讓數據「活」起來。
- 用途：系統心跳 (Heartbeat)、任務執行流 (Stream)、輿情監控 (TikTok Trends)。
- 技術棧：Recharts (折線圖/雷達圖), WebSocket/SSE, 脈衝動畫 (animate-pulse, ring-offset-2)。

## 4. 微互動與物理回饋 (Micro-interactions)
- 核心概念：操作有回應、進場有動畫、轉場不生硬。賦予介面「重量感」。
- 用途：按鈕點擊、卡片 Hover、列表載入、任務完成特效。
- 技術棧：Framer Motion (<motion.div initial={{opacity:0}} animate={{opacity:1}}>), transition-all, hover:scale-[1.02]。

## 5. 指揮官控制台 (Command Palette)
- 核心概念：鍵盤優先、快速指令、全域搜索。滑鼠太慢，指揮官用鍵盤。
- 用途：快速跳轉、執行 Action (如 create_task)、呼叫 Agent。
- 代碼關鍵：Cmd+K 觸發, 模糊搜尋 (Fuse.js), 快捷鍵綁定 (useHotkeys)。

## 6. 賽博霓虹 (Cyber Neon Accents)
- 核心概念：極致深色底 (Deep Dark)、高亮強調色、狀態語意化。
- 用途：區分優先級 (P0=Red, P1=Yellow, P2=Cyan)、強調關鍵數據、警報。
- 代碼關鍵：bg-slate-900, text-cyan-400, border-l-4, shadow-[0_0_15px_rgba(34,211,238,0.5)]。

---
結論：
這是 OpenClaw 星艦航站的視覺標準。未來的任何儀表板開發，都應遵循這 6 大模式，確保功能與美學兼具。