"use client";

import { Terminal, Github, Twitter, MessageCircle, Mail } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "功能特色", href: "#features" },
    { label: "定價方案", href: "#pricing" },
    { label: "常見問題", href: "#faq" },
  ],
  resources: [
    { label: "文件中心", href: "#" },
    { label: "教學影片", href: "#" },
    { label: "部落格", href: "#" },
  ],
  company: [
    { label: "關於我們", href: "#" },
    { label: "聯絡我們", href: "#" },
    { label: "隱私政策", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/easyclaw", label: "Twitter" },
  { icon: Github, href: "https://github.com/openclaw", label: "GitHub" },
  { icon: MessageCircle, href: "https://t.me/easyclaw", label: "Telegram" },
  { icon: Mail, href: "mailto:hello@easyclaw.pro", label: "Email" },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900/50 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                EasyClaw<span className="text-indigo-400">.Pro</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              OpenClaw 官方推薦部署方案。60 秒完成部署，讓 AI 成為你的戰友。
            </p>
            <div className="flex items-center space-x-4">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">產品</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">資源</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">公司</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 EasyClaw Pro. OpenClaw 官方推薦部署方案。
          </p>
          <div className="flex items-center space-x-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-slate-300 transition-colors">
              服務條款
            </Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">
              隱私政策
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
