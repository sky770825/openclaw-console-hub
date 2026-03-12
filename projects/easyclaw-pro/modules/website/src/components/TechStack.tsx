"use client";

import { Code2, Terminal, Database, Shield, Cpu, Globe } from "lucide-react";

const technologies = [
  {
    category: "核心框架",
    icon: Code2,
    items: [
      { name: "OpenClaw", desc: "145K+ Stars 開源框架" },
      { name: "Node.js", desc: "v18+ LTS" },
      { name: "TypeScript", desc: "型別安全" },
    ],
  },
  {
    category: "部署環境",
    icon: Terminal,
    items: [
      { name: "Docker", desc: "容器化隔離" },
      { name: "Zeabur", desc: "雲端部署" },
      { name: "Nginx", desc: "反向代理" },
    ],
  },
  {
    category: "資料存儲",
    icon: Database,
    items: [
      { name: "SQLite", desc: "本機資料庫" },
      { name: "LanceDB", desc: "向量記憶" },
      { name: "Git Notes", desc: "結構化記憶" },
    ],
  },
  {
    category: "安全防護",
    icon: Shield,
    items: [
      { name: "TLS 1.3", desc: "端到端加密" },
      { name: "API Key", desc: "自主管理" },
      { name: "Sandbox", desc: "安全隔離" },
    ],
  },
  {
    category: "AI 模型",
    icon: Cpu,
    items: [
      { name: "Kimi K2.5", desc: "Moonshot AI" },
      { name: "Claude 4.5", desc: "Anthropic" },
      { name: "GPT-5", desc: "OpenAI" },
    ],
  },
  {
    category: "通訊整合",
    icon: Globe,
    items: [
      { name: "Telegram", desc: "Bot API" },
      { name: "Discord", desc: "Webhook" },
      { name: "WhatsApp", desc: "Business API" },
    ],
  },
];

export default function TechStack() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[hsl(243_84%_69%)]/10 border border-[hsl(243_84%_69%)]/20 mb-6">
            <Code2 className="w-4 h-4 text-[hsl(243_84%_69%)]" />
            <span className="text-sm text-[hsl(243_70%_80%)]">技術架構</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            企業級<span className="text-gradient">技術堆疊</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            採用業界標準技術，確保穩定、安全、可擴展
          </p>
        </div>

        {/* Terminal Window */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="terminal-border rounded-xl overflow-hidden">
            <div className="flex items-center space-x-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 text-center text-sm text-slate-500 font-mono">tech-stack.json</div>
            </div>
            <div className="p-6 bg-slate-900/90 font-mono text-sm">
              <pre className="text-slate-300">
{`{
  "architecture": "microservices",
  "container": "docker",
  "deployment": {
    "platform": "zeabur",
    "ssl": "letsencrypt",
    "cdn": "cloudflare"
  },
  "ai_models": ["kimi-k2.5", "claude-sonnet-4.5", "gpt-5"],
  "memory_systems": ["lancedb", "git-notes", "sqlite"],
  "security": {
    "encryption": "TLS_1.3",
    "isolation": "container",
    "api_keys": "client_managed"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Tech Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-[hsl(243_84%_69%)]/30 transition-all duration-300"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(243_84%_69%)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <tech.icon className="w-5 h-5 text-[hsl(243_84%_69%)]" />
                </div>
                <h3 className="text-lg font-semibold text-white">{tech.category}</h3>
              </div>
              <div className="space-y-3">
                {tech.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono text-sm">{item.name}</span>
                    <span className="text-slate-500 text-xs">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
