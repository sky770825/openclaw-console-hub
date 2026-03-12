# 星艦 UI 元件庫技術規範 (Starship UI Components Specs)

> 用途：OpenClaw 前端開發的標準積木。禁止手寫重複樣式，一律使用此規範。
> 技術棧：React + Tailwind CSS + Framer Motion + Lucide React
> 更新：2026-03-01

## 1. 核心容器：<GlassCard />

用於所有儀表板的卡片容器，具備玻璃擬態與懸浮效果。

`tsx
// Props: className, children, hoverEffect (boolean)
<motion.div
  className={
    relative overflow-hidden rounded-xl 
    backdrop-blur-xl bg-slate-900/60 
    border border-white/10 
    shadow-2xl shadow-black/50
    ${hoverEffect ? 'hover:bg-slate-800/60 hover:border-cyan-500/30 hover:scale-[1.01] transition-all duration-300' : ''}
    ${className}
  }
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
  {children}
  {/ 光澤遮罩 /}
  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
</motion.div>
`

## 2. 佈局網格：<BentoGrid />

響應式便當盒佈局，自動適應螢幕寬度。

`tsx
// Props: children, cols (default: 4)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 auto-rows-[minmax(180px,auto)]">
  {children}
</div>
`

## 3. 狀態指示燈：<StatusBadge />

帶有呼吸燈效果的狀態標籤。

`tsx
// Props: status ('running' | 'failed' | 'done' | 'warning')
const colors = {
  running: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.3)]',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_10px_rgba(248,113,113,0.3)]',
  done: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
};

<span className={px-3 py-1 rounded-full text-xs font-mono border flex items-center gap-2 ${colors[status]}}>
  <span className="relative flex h-2 w-2">
    {status === 'running' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>}
    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
  </span>
  {status.toUpperCase()}
</span>
`

## 4. 霓虹按鈕：<NeonButton />

高強調操作按鈕，帶光暈。

`tsx
// Props: onClick, children, variant ('primary' | 'danger')
<button 
  className={
    px-4 py-2 rounded-lg font-bold tracking-wider uppercase text-sm
    transition-all duration-200
    ${variant === 'primary' 
      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]' 
      : 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(248,113,113,0.4)]'}
  }
>
  {children}
</button>
`

## 5. 數據標題：<DataHeader />

儀表板數字顯示，帶有掃光動畫。

`tsx
// Props: title, value, unit
<div className="flex flex-col">
  <span className="text-slate-400 text-xs uppercase tracking-widest">{title}</span>
  <div className="text-3xl font-black text-white mt-1 font-mono tracking-tight flex items-baseline gap-1">
    {value}
    <span className="text-sm text-slate-500 font-normal">{unit}</span>
  </div>
</div>
`

## 6. 指揮官輸入框：<CommandInput />

類似 Alfred/Spotlight 的搜尋框樣式。

`tsx
<div className="relative">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
  <input 
    type="text" 
    placeholder="Type a command or search..."
    className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
  />
  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
    <kbd className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400">⌘</kbd>
    <kbd className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400">K</kbd>
  </div>
</div>
`