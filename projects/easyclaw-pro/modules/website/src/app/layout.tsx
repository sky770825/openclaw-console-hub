import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "EasyClaw Pro — 一鍵部署你的 AI 戰友",
  description: "快速部署 OpenClaw AI 助理。60 秒完成設定，支援多平台、多模型，資料完全自主掌控。",
  keywords: ["OpenClaw", "AI 助理", "AI Agent", "自動化", "Telegram Bot", "Claude", "GPT"],
  openGraph: {
    title: "EasyClaw Pro — 一鍵部署你的 AI 戰友",
    description: "60 秒完成 OpenClaw 部署，無需技術背景",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="scroll-smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
