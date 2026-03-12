"use client";

import { Check, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "標準方案",
    price: "499",
    priceNote: "單次部署",
    description: "適合個人用戶，快速啟用",
    icon: Zap,
    popular: false,
    features: [
      "1 個 OpenClaw 實例",
      "所有通訊平台連接",
      "支援 Kimi / Claude / GPT-5",
      "基礎安全設定",
      "電子郵件支援",
      "7 天內退款保證",
    ],
    cta: "選擇標準方案",
    href: "#contact",
  },
  {
    name: "進階方案",
    price: "899",
    priceNote: "單次部署",
    description: "適合進階用戶，含客製化",
    icon: Sparkles,
    popular: true,
    features: [
      "1 個 OpenClaw 實例",
      "所有通訊平台連接",
      "完整 AI 模型支援",
      "進階安全設定",
      "客製化技能開發",
      "部署後 30 天支援",
      "優先技術支援",
      "免費更新 1 年",
    ],
    cta: "選擇進階方案",
    href: "#contact",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            簡單透明的<span className="text-gradient">定價</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            單次付費，無隱藏費用。你只需自備 AI 模型的 API Key。
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-white border-2 border-[hsl(243_84%_69%)] shadow-lg"
                  : "bg-gray-50 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-[hsl(243_84%_69%)] text-white text-sm font-medium">
                    推薦方案
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                  plan.popular ? "bg-[hsl(243_84%_69%)]/10" : "bg-gray-200"
                }`}>
                  <plan.icon className={`w-6 h-6 ${plan.popular ? "text-[hsl(243_84%_69%)]" : "text-gray-500"}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-gray-500 text-lg">NT$</span>
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">{plan.priceNote}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start space-x-3">
                    <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      plan.popular ? "text-[hsl(243_84%_69%)]" : "text-[hsl(243_84%_69%)]"
                    }`} />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`block w-full py-4 rounded-xl text-center font-semibold transition-all ${
                  plan.popular
                    ? "bg-[hsl(243_84%_69%)] hover:bg-[hsl(243_100%_45%)] text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-12 max-w-2xl mx-auto text-center space-y-2">
          <p className="text-gray-400 text-sm">
            * 單次收費，不是月費。部署後系統由你的雲端帳號運行（伺服器費用約 $5 USD/月）。
          </p>
          <p className="text-gray-400 text-sm">
            * AI 模型 API 費用由你直接支付給模型提供商。推薦 Kimi K2.5，費用僅 GPT-5 的 1/3。
          </p>
        </div>
      </div>
    </section>
  );
}
