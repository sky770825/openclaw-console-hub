"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          準備好擁有你的
          <br />
          <span className="text-gradient">AI 戰友</span> 了嗎？
        </h2>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          60 秒完成部署，讓 AI 成為你的得力助手。
          <br />
          告別繁瑣設定，專注於真正重要的事。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="#pricing"
            className="group flex items-center space-x-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-all hover:glow"
          >
            <span>立即開始部署</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="https://t.me/easyclaw"
            target="_blank"
            className="flex items-center space-x-2 px-8 py-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-lg transition-all border border-slate-700/50"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Telegram 諮詢</span>
          </Link>
        </div>

        <p className="mt-8 text-slate-500 text-sm">
          7 天內不滿意全額退費 · 無隱藏費用 · 立即啟用
        </p>
      </div>
    </section>
  );
}
