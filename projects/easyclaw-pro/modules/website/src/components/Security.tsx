"use client";

import { Shield, Lock, Server, Eye } from "lucide-react";

const securityFeatures = [
  {
    icon: Server,
    title: "獨立隔離環境",
    description: "每位用戶的 OpenClaw 實例運行在獨立的 Docker 容器中，資料與運算資源完全隔離，不與其他用戶共享。",
  },
  {
    icon: Lock,
    title: "端對端加密傳輸",
    description: "所有 API 通訊皆透過 TLS 1.3 加密。你的 AI API Key 僅存儲在你的專屬實例內，我們無法存取。",
  },
  {
    icon: Eye,
    title: "你持有所有金鑰",
    description: "AI 模型的 API Key 由你直接向提供商申請，完全由你控制用量與權限。我們不儲存、不接觸。",
  },
  {
    icon: Shield,
    title: "開源可稽核",
    description: "基於 OpenClaw 開源框架（GitHub 145K+ Stars），程式碼完全公開透明，接受全球社群審查。",
  },
];

export default function Security() {
  return (
    <section className="py-24 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[hsl(243_84%_69%)]/10 border border-[hsl(243_84%_69%)]/20 mb-6">
            <Shield className="w-4 h-4 text-[hsl(243_84%_69%)]" />
            <span className="text-sm text-[hsl(243_70%_80%)]">安全承諾</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            你的資料，<span className="text-[hsl(243_84%_69%)]">由你掌控</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            我們採用業界標準的安全措施，確保你的資料安全。隱私不是選項，而是基礎。
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-[hsl(243_84%_69%)]/30 transition-all duration-300"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-[hsl(243_84%_69%)]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[hsl(243_84%_69%)]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span className="text-sm">SSL 加密</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Lock className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span className="text-sm">TLS 1.3</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Server className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span className="text-sm">Docker 隔離</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Eye className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            <span className="text-sm">開源稽核</span>
          </div>
        </div>
      </div>
    </section>
  );
}
