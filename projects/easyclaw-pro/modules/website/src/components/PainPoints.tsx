"use client";

import { AlertTriangle, Server, MessageSquare, Lock } from "lucide-react";

const painPoints = [
  {
    icon: Server,
    number: "01",
    title: "照著文件做，還是失敗",
    description: "Docker、環境變數、Port 綁定、Token 設定⋯⋯每一步都可能出錯。你查了一堆 GitHub Issue，試了好幾天，還是 502。",
  },
  {
    icon: MessageSquare,
    number: "02",
    title: "好不容易跑起來，AI 卻不回應",
    description: "服務啟動了，但 Telegram Bot 沒反應。API Key 格式搞錯、模型名稱寫錯、國際版跟中國版搞混——這些坑你全踩過。",
  },
  {
    icon: Lock,
    number: "03",
    title: "安全設定不知道從何下手",
    description: "Bot 上線了，但誰都能用？DM 權限怎麼鎖？Token 怎麼保護？你只想要一個安全的私人助理，不想變成資安專家。",
  },
];

export default function PainPoints() {
  return (
    <section className="py-24 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[hsl(243_84%_69%)]/10 border border-[hsl(243_84%_69%)]/20 mb-6">
            <AlertTriangle className="w-4 h-4 text-[hsl(243_84%_69%)]" />
            <span className="text-sm text-[hsl(243_70%_80%)]">這些場景熟悉嗎？</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            你試過了，但就是<span className="text-[hsl(243_84%_69%)]">搞不定</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            我們聽過太多類似的故事。OpenClaw 很強，但部署這件事卡了你太久。
          </p>
        </div>

        {/* Pain Points Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-[hsl(243_84%_69%)]/30 transition-all duration-300"
            >
              {/* Number Badge */}
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-[hsl(243_84%_69%)]/10 border border-[hsl(243_84%_69%)]/20 flex items-center justify-center">
                <span className="text-lg font-bold text-[hsl(243_84%_69%)]">{point.number}</span>
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-[hsl(243_84%_69%)]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <point.icon className="w-7 h-7 text-[hsl(243_84%_69%)]" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-3">
                {point.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-4">不用再折騰了。我們幫你搞定。</p>
          <a
            href="#pricing"
            className="inline-flex items-center space-x-2 text-[hsl(243_84%_69%)] hover:text-[hsl(243_70%_80%)] font-medium"
          >
            <span>看看我們怎麼做 →</span>
          </a>
        </div>
      </div>
    </section>
  );
}
