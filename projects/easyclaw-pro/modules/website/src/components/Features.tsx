"use client";

import { Cpu, MessageCircle, Wrench, Check } from "lucide-react";

const models = [
  {
    name: "Kimi K2.5",
    provider: "Moonshot AI",
    price: "$0.45/$2.50",
    badge: "推薦",
    description: "性價比之王，256K 上下文、Agent Swarm 技術，程式碼能力頂尖。",
  },
  {
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    price: "$3/$15",
    description: "最強推理與深度分析能力，200K 上下文。",
  },
  {
    name: "GPT-5",
    provider: "OpenAI",
    price: "$1.25/$10",
    description: "全球最廣泛使用的通用 AI 模型，生態系最完整。",
  },
  {
    name: "Gemini 3 Pro",
    provider: "Google",
    price: "$2/$12",
    description: "多模態能力與即時資訊的首選，搭配 Google 生態系。",
  },
];

const platforms = [
  "Telegram", "Discord", "WhatsApp", "Slack", 
  "Signal", "Microsoft Teams", "LINE"
];

const tasks = [
  "Email 摘要", "文件處理", "行程安排", 
  "記帳追蹤", "資料搜集", "社群貼文",
  "即時翻譯", "程式碼生成", "自訂任務"
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative bg-gradient-to-b from-slate-950/95 via-slate-900 to-slate-900 pt-32 -mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            一個助理，<span className="text-gradient">無限可能</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            連接你慣用的 AI 模型和通訊平台，讓 AI 成為你真正的戰友。
          </p>
        </div>

        {/* AI Models */}
        <div className="mb-20">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[hsl(243_84%_69%)]/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[hsl(243_84%_69%)]" />
            </div>
            <h3 className="text-2xl font-semibold text-white">選擇你偏好的 AI 模型</h3>
          </div>
          <p className="text-slate-400 mb-6">
            支援主流 AI 模型，依照需求自由切換。推薦 Kimi K2.5 — 相同任務的 API 費用僅為其他模型的 1/3 到 1/7。
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {models.map((model, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl border transition-all duration-300 ${
                  model.badge
                    ? "bg-[hsl(243_84%_69%)]/5 border-[hsl(243_84%_69%)]/30"
                    : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-white">{model.name}</h4>
                    <p className="text-sm text-slate-400">{model.provider}</p>
                  </div>
                  {model.badge && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-[hsl(243_84%_69%)]/20 text-[hsl(243_84%_69%)]">
                      {model.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-3">{model.description}</p>
                <div className="text-sm">
                  <span className="text-slate-500">per M tokens: </span>
                  <span className="text-[hsl(243_84%_69%)] font-mono">{model.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platforms & Tasks Grid */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Platforms */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-[hsl(243_84%_69%)]/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[hsl(243_84%_69%)]" />
              </div>
              <h3 className="text-2xl font-semibold text-white">連接你慣用的通訊平台</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform, index) => (
                <span
                  key={index}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    index < 4
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50"
                  }`}
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-[hsl(243_84%_69%)]/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[hsl(243_84%_69%)]" />
              </div>
              <h3 className="text-2xl font-semibold text-white">你可以讓它做什麼</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-slate-300"
                >
                  <Check className="w-4 h-4 text-[hsl(243_84%_69%)] flex-shrink-0" />
                  <span className="text-sm">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
