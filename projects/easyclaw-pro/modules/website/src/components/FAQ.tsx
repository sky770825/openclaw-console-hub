"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "什麼是 EasyClaw Pro？",
    answer: "EasyClaw Pro 是 OpenClaw 的官方推薦部署服務，幫助用戶在 60 秒內完成 OpenClaw AI 助理的部署。無需技術背景，我們處理所有複雜設定。",
  },
  {
    question: "我需要準備什麼？",
    answer: "你需要準備：1) 一個 Zeabur 或其他雲端平台帳號；2) AI 模型的 API Key（推薦向 Moonshot AI 申請 Kimi K2.5）；3) 你想連接的通訊平台帳號（如 Telegram Bot）。",
  },
  {
    question: "費用包含什麼？",
    answer: "NT$499/899 是單次部署服務費，包含：OpenClaw 實例設定、技能安裝、安全設定、部署後技術支援。你需要額外支付：雲端伺服器費用（約 $5 USD/月）和 AI API 使用費（按量計費）。",
  },
  {
    question: "我的資料安全嗎？",
    answer: "絕對安全。每個實例運行在獨立的 Docker 容器中，資料完全隔離。AI API Key 由你自己管理，我們無法存取。所有通訊使用 TLS 1.3 加密。",
  },
  {
    question: "支援哪些 AI 模型？",
    answer: "支援所有主流模型：Kimi K2.5（推薦）、Claude Sonnet 4.5、GPT-5、Gemini 3 Pro、本地 Ollama 模型等。你可以隨時切換。",
  },
  {
    question: "部署後可以修改設定嗎？",
    answer: "當然可以。你擁有完整的 OpenClaw 實例控制權，可以隨時修改設定、新增技能、調整 AI 模型。我們提供文件和教學協助。",
  },
  {
    question: "如果不滿意可以退款嗎？",
    answer: "可以。我們提供 7 天內全額退款保證。如果部署過程中遇到無法解決的問題，或最終結果不滿意，請聯繫我們申請退款。",
  },
  {
    question: "部署需要多久？",
    answer: "整個流程約 60 秒。付費後，你會收到部署腳本和詳細指引。按照步驟執行，通常 1-2 分鐘即可完成。",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-slate-900/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[hsl(243_84%_69%)]/10 border border-[hsl(243_84%_69%)]/20 mb-6">
            <HelpCircle className="w-4 h-4 text-[hsl(243_84%_69%)]" />
            <span className="text-sm text-[hsl(243_70%_80%)]">常見問題</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            你可能的<span className="text-gradient">疑問</span>
          </h2>
          <p className="text-slate-400 text-lg">
            找不到答案？請直接聯繫我們
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border transition-all duration-300 ${
                openIndex === index
                  ? "bg-slate-800/50 border-[hsl(243_84%_69%)]/30"
                  : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium text-white pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
