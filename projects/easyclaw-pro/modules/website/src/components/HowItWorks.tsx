"use client";

import { CreditCard, Settings, MessageSquare } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    step: "01",
    title: "付費啟用",
    description: "選擇適合你的方案，完成付款後立即啟用部署流程。",
    details: ["單次付費，無隱藏費用", "SSL 安全加密交易", "7 天內不滿意全額退費"],
  },
  {
    icon: Settings,
    step: "02",
    title: "設定連接",
    description: "透過簡單的 Web 介面，輸入你的 AI API Key 並連接通訊平台。",
    details: ["視覺化設定引導", "自動驗證連接狀態", "一鍵生成設定檔"],
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "開始對話",
    description: "在你的通訊軟體上直接使用 AI 助理，全天候運行不中斷。",
    details: ["60 秒內完成部署", "自動健康檢查", "Telegram 即時通知"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            三個步驟，<span className="text-gradient">開始使用</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            無需技術背景，我們幫你處理所有複雜設定
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-transparent via-[hsl(243_84%_69%)]/30 to-transparent" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative">
                <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-[hsl(243_84%_69%)]/30 transition-all duration-300 h-full">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8 px-3 py-1 rounded-full bg-[hsl(243_84%_69%)] text-white text-sm font-bold">
                    Step {item.step}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(243_84%_69%)]/10 flex items-center justify-center mb-6 mt-2">
                    <item.icon className="w-8 h-8 text-[hsl(243_84%_69%)]" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 mb-6 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Details */}
                  <ul className="space-y-2">
                    {item.details.map((detail, i) => (
                      <li key={i} className="flex items-center space-x-2 text-sm text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(243_84%_69%)]" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
