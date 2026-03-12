"use client";

import { ArrowRight, Zap, Shield, Clock } from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "60", suffix: "秒", label: "完成部署" },
  { value: "12,000", suffix: "+", label: "全球部署" },
  { value: "99.9", suffix: "%", label: "正常運行" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center pt-16 overflow-hidden hero-bg text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(243_84%_69%)]/5 via-transparent to-transparent" />
      
      {/* Subtle Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[hsl(243_84%_69%)]/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass backdrop-blur-xl border-white/20 mb-8 shadow-glow text-white/95">
          <span className="flex h-2 w-2 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
          <span className="text-sm text-gray-600">OpenClaw 官方推薦部署方案</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent mb-6 leading-tight glow-text">
          一鍵部署你的
          <br />
          <span className="text-gradient">AI 戰友</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-slate-200/90 max-w-3xl mx-auto mb-12 leading-relaxed">
          無需技術背景，60 秒完成 OpenClaw 部署。
          <br className="hidden sm:block" />
          支援 Kimi、Claude、GPT-5，資料完全自主掌控。
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="#pricing"
            className="group flex items-center space-x-2 px-8 py-4 rounded-2xl bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-dark))] text-white font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 glow animate-glow duration-300"
          >
            <span>立即開始部署</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#how-it-works"
            className="px-8 py-4 rounded-2xl glass backdrop-blur-xl hover:bg-white/20 text-white hover:text-white font-semibold text-lg transition-all border border-white/20 shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            了解運作原理
          </Link>
        </div>

        {/* Features */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-16 text-slate-300">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span>極速部署</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span>資料自主</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span>24/7 運行</span>
          </div>
        </div>

        {/* Stats */}
        <div className="glass p-12 rounded-3xl grid grid-cols-3 gap-12 max-w-5xl mx-auto bg-white/5 border-white/20 backdrop-blur-xl shadow-2xl">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-1">
                {stat.value}
                <span className="text-gradient">{stat.suffix}</span>
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Terminal Preview */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl bg-slate-900/95 border border-slate-800/50">
            {/* Terminal Header */}
            <div className="flex items-center space-x-2 px-4 py-3 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="flex-1 text-center text-sm text-slate-400 font-mono">openclaw — zsh</div>
            </div>
            {/* Terminal Content */}
            <div className="p-6 bg-slate-950/90 font-mono text-sm text-left overflow-x-auto text-slate-200">
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="text-[hsl(243_84%_69%)]">➜</span> <span className="text-slate-400">~</span> <span className="text-slate-200">bash install-openclaw.sh</span>
                </p>
                <p className="text-slate-100 font-semibold">🚀 EasyClaw Pro 安裝腳本 v2.0</p>
                <p className="text-slate-300">[1/5] 檢查系統需求... <span className="text-[hsl(243_84%_69%)]">✓</span></p>
                <p className="text-slate-300">[2/5] 安裝 OpenClaw CLI... <span className="text-[hsl(243_84%_69%)]">✓</span></p>
                <p className="text-slate-300">[3/5] 解壓備份資料... <span className="text-[hsl(243_84%_69%)]">✓</span></p>
                <p className="text-slate-300">[4/5] 安裝技能依賴... <span className="text-[hsl(243_84%_69%)]">✓</span></p>
                <p className="text-slate-300">[5/5] 啟動 Gateway... <span className="text-[hsl(243_84%_69%)]">✓</span></p>
                <p className="text-[hsl(243_84%_69%)] font-semibold mt-4">✅ 部署完成！您的 AI 戰友已就緒</p>
                <p className="text-slate-400 mt-2">⏱️  總耗時: 58 秒</p>
                <p className="text-slate-300 animate-pulse">
                  <span className="text-[hsl(243_84%_69%)]">➜</span> <span className="text-slate-400">~</span> <span className="w-2 h-4 bg-slate-400 inline-block align-middle" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-gray-400" />
        </div>
      </div>
    </section>
  );
}
