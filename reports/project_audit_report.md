# OpenClaw Project Audit Report
Generated on: Sun Mar  8 11:05:25 CST 2026
Target: /Users/caijunchang/openclaw任務面版設計

## 1. Project Overview
Determining project type based on configuration files...

### Root package.json Metadata
```json
{
  "name": "openclaw-starship-ui",
  "version": "2.5.28",
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@naari3/pixi-live2d-display": "^1.2.5",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@react-three/drei": "^9.122.0",
    "@react-three/fiber": "^8.18.0",
    "@tanstack/react-query": "^5.83.0",
    "@tsparticles/react": "^3.0.0",
    "@tsparticles/slim": "^3.9.1",
    "@types/three": "^0.183.1",
    "@xyflow/react": "^12.10.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "echarts": "^6.0.0",
    "echarts-for-react": "^3.0.6",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^12.34.3",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "pixi.js": "^8.16.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "react-resizable-panels": "^2.1.9",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "three": "^0.183.1",
    "vaul": "^0.9.9",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@tailwindcss/typography": "^0.5.16",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.16.5",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react-swc": "^3.11.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.32.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^15.15.0",
    "jsdom": "^20.0.3",
    "lovable-tagger": "^1.1.13",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.38.0",
    "vite": "^5.4.19",
    "vite-plugin-pwa": "^1.2.0",
    "vitest": "^3.2.4"
  }
}
```

### Server package.json Metadata
```json
{
  "name": "openclaw-server",
  "version": "2.5.28",
  "dependencies": {
    "@supabase/supabase-js": "^2.95.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "pino": "^10.3.1",
    "pino-pretty": "^13.1.3",
    "playwright": "^1.58.2",
    "ws": "^8.19.0",
    "zod": "^4.3.6"
  }
}
```

## 2. File System Structure
```text
/Users/caijunchang/openclaw任務面版設計
/Users/caijunchang/openclaw任務面版設計/monitoring_engine.py
/Users/caijunchang/openclaw任務面版設計/rag_update.err.log
/Users/caijunchang/openclaw任務面版設計/auto-executor-state.json
/Users/caijunchang/openclaw任務面版設計/runtime-checkpoints
/Users/caijunchang/openclaw任務面版設計/runtime-checkpoints/task-index
/Users/caijunchang/openclaw任務面版設計/runtime-checkpoints/task-index/TASK-INDEX.md
/Users/caijunchang/openclaw任務面版設計/runtime-checkpoints/task-index/task-index.jsonl
/Users/caijunchang/openclaw任務面版設計/ollama_monitor_bot.py
/Users/caijunchang/openclaw任務面版設計/tsconfig.node.json
/Users/caijunchang/openclaw任務面版設計/beauty-industry-website
/Users/caijunchang/openclaw任務面版設計/beauty-industry-website/package.json
/Users/caijunchang/openclaw任務面版設計/beauty-industry-website/tsconfig.json
/Users/caijunchang/openclaw任務面版設計/beauty-industry-website/src
/Users/caijunchang/openclaw任務面版設計/beauty-industry-website/src/index.ts
/Users/caijunchang/openclaw任務面版設計/subagents
/Users/caijunchang/openclaw任務面版設計/subagents/runs.json.design
/Users/caijunchang/openclaw任務面版設計/index.html
/Users/caijunchang/openclaw任務面版設計/RESULT.md
/Users/caijunchang/openclaw任務面版設計/ollama_client.py
/Users/caijunchang/openclaw任務面版設計/PROPOSAL-REPORT.md
/Users/caijunchang/openclaw任務面版設計/tsconfig.app.json
/Users/caijunchang/openclaw任務面版設計/monitoring_engine.py.bak
/Users/caijunchang/openclaw任務面版設計/bun.lockb
/Users/caijunchang/openclaw任務面版設計/armory
/Users/caijunchang/openclaw任務面版設計/armory/proxy-web-fetch
/Users/caijunchang/openclaw任務面版設計/armory/proxy-web-fetch/README.md
/Users/caijunchang/openclaw任務面版設計/armory/proxy-web-fetch/fetch.sh
/Users/caijunchang/openclaw任務面版設計/armory/proxy-web-fetch/SKILL.md
/Users/caijunchang/openclaw任務面版設計/armory/send-tg-notify.sh
/Users/caijunchang/openclaw任務面版設計/armory/universal-data-connector
/Users/caijunchang/openclaw任務面版設計/armory/universal-data-connector/README.md
/Users/caijunchang/openclaw任務面版設計/armory/universal-data-connector/db.sh
/Users/caijunchang/openclaw任務面版設計/armory/universal-data-connector/SKILL.md
/Users/caijunchang/openclaw任務面版設計/armory/universal-data-connector/modules
/Users/caijunchang/openclaw任務面版設計/armory/README.md
/Users/caijunchang/openclaw任務面版設計/armory/skills
/Users/caijunchang/openclaw任務面版設計/armory/skills/README.md
/Users/caijunchang/openclaw任務面版設計/armory/skills/health-check.sh
/Users/caijunchang/openclaw任務面版設計/armory/security-scanner
/Users/caijunchang/openclaw任務面版設計/armory/security-scanner/scan.sh
/Users/caijunchang/openclaw任務面版設計/armory/security-scanner/README.md
/Users/caijunchang/openclaw任務面版設計/armory/security-scanner/SKILL.md
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector/inspect.sh
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector/inspector.py
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector/README.md
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector/SKILL.md
/Users/caijunchang/openclaw任務面版設計/openclaw-v4.jsx
/Users/caijunchang/openclaw任務面版設計/openclaw-main
/Users/caijunchang/openclaw任務面版設計/openclaw-main/README-header.png
/Users/caijunchang/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/index.html
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/vitest.node.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/public
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/package.json
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/vite.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/vitest.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src
/Users/caijunchang/openclaw任務面版設計/openclaw-main/render.yaml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docker-setup.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/git-hooks
/Users/caijunchang/openclaw任務面版設計/openclaw-main/git-hooks/pre-commit
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.e2e.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/LICENSE
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.extensions.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/mocks
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/inbound-contract.providers.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/auto-reply.retry.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/test-env.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/setup.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/global-setup.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/provider-timeout.e2e.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/fixtures
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/gateway.multi.e2e.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/media-understanding.auto.e2e.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/test/helpers
/Users/caijunchang/openclaw任務面版設計/openclaw-main/CHANGELOG.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Dockerfile
/Users/caijunchang/openclaw任務面版設計/openclaw-main/patches
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/LICENSE
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/CHANGELOG.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/Tests
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/docs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/README.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/Package.resolved
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/scripts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/Package.swift
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Swabble/Sources
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Dockerfile.sandbox-browser
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.gateway.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs.acp.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.live.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/date-time.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/plugin.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/tui.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/environment.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/platforms
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/network.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/tools
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/install
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/broadcast-groups.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/prose.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/docs.json
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/vps.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/security
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/nodes
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/CNAME
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/images
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/bedrock.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/plugins
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/web
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/experiments
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/providers
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/start
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/scripts.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/cli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/testing.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/zh-CN
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/pi-dev.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/index.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/logging.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/token-use.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/hooks
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/concepts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/style.css
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/diagnostics
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/hooks.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/automation
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/tts.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/perplexity.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/pi.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/debugging.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/brave-search.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/assets
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/whatsapp-openclaw.jpg
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/multi-agent-sandbox-tools.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/reference
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/help
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/免費與便宜模型-openclaw.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/refactor
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/gateway
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/debug
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/whatsapp-openclaw-ai-zh.jpg
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docs/channels
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/memory-lancedb
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/zalouser
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/zalo
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/tlon
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/discord
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/open-prose
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/qwen-portal-auth
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/feishu
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/lobster
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/nextcloud-talk
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/msteams
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/llm-task
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/bluebubbles
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/google-gemini-cli-auth
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/diagnostics-otel
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/line
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/telegram
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/minimax-portal-auth
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/googlechat
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/slack
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/mattermost
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/imessage
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/twitch
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/copilot-proxy
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/google-antigravity-auth
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/matrix
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/signal
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/whatsapp
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/nostr
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/memory-core
/Users/caijunchang/openclaw任務面版設計/openclaw-main/extensions/voice-call
/Users/caijunchang/openclaw任務面版設計/openclaw-main/README.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/Dockerfile.sandbox
/Users/caijunchang/openclaw任務面版設計/openclaw-main/zizmor.yml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/openclaw.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/fly.private.toml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/package.json
/Users/caijunchang/openclaw任務面版設計/openclaw-main/CONTRIBUTING.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-cleanup-docker.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/watch-node.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-parallel.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-shell-completion.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/bench-model.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/termux-quick-auth.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-live-models-docker.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/ui.js
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/codesign-mac-app.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/docker
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/release-check.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/zai-fallback-repro.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/create-dmg.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/copy-hook-metadata.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/changelog-to-html.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/write-cli-compat.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sandbox-setup.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/check-ts-max-loc.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/systemd
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-install-sh-docker.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/protocol-gen.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sqlite-vec-smoke.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sync-labels.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sync-plugin-versions.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/run-node.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/update-clawtributors.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/package-mac-app.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/clawlog.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/docs-i18n
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/termux-sync-widget.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/mobile-reauth.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sandbox-browser-entrypoint.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/firecrawl-compare.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/debug-claude-usage.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/update-clawtributors.types.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/ios-team-id.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-live-gateway-models-docker.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/build-docs-list.mjs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/termux-auth-widget.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/committer
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/repro
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/build_icon.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/notarize-mac-artifact.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sandbox-browser-setup.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/auth-monitor.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/write-build-info.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/claude-auth-status.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/docs-list.js
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/clawtributors-map.json
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/bundle-a2ui.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sync-moonshot-docs.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/setup-auth-system.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/restart-mac.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/canvas-a2ui-copy.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/build-and-run-mac.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-force.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/e2e
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/readability-basic-compare.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/pre-commit
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/sandbox-common-setup.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/package-mac-dist.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/make_appcast.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/test-install-sh-e2e-docker.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-main/scripts/protocol-gen-swift.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/packages
/Users/caijunchang/openclaw任務面版設計/openclaw-main/packages/clawdbot
/Users/caijunchang/openclaw任務面版設計/openclaw-main/packages/moltbot
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.unit.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/appcast.xml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/fly.toml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/tsconfig.json
/Users/caijunchang/openclaw任務面版設計/openclaw-main/docker-compose.yml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/nano-pdf
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/himalaya
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/bear-notes
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/peekaboo
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/model-usage
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/blogwatcher
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/discord
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/coding-agent
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/openhue
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/gemini
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/gifgrep
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/session-logs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/ordercli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/openai-whisper
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/spotify-player
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/healthcheck
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/oracle
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/summarize
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/clawhub
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/bluebubbles
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/sherpa-onnx-tts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/video-frames
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/eightctl
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/gog
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/canvas
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/notion
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/goplaces
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/apple-reminders
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/imsg
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/skill-creator
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/camsnap
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/github
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/bird
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/food-order
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/things-mac
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/blucli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/sonoscli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/mcporter
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/tmux
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/openai-image-gen
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/sag
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/slack
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/weather
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/obsidian
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/trello
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/wacli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/songsee
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/apple-notes
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/openai-whisper-api
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/local-places
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/nano-banana-pro
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/1password
/Users/caijunchang/openclaw任務面版設計/openclaw-main/skills/voice-call
/Users/caijunchang/openclaw任務面版設計/openclaw-main/tsdown.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/AGENTS.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vitest.config.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/assets
/Users/caijunchang/openclaw任務面版設計/openclaw-main/assets/chrome-extension
/Users/caijunchang/openclaw任務面版設計/openclaw-main/assets/dmg-background.png
/Users/caijunchang/openclaw任務面版設計/openclaw-main/assets/dmg-background-small.png
/Users/caijunchang/openclaw任務面版設計/openclaw-main/assets/avatar-placeholder.svg
/Users/caijunchang/openclaw任務面版設計/openclaw-main/apps
/Users/caijunchang/openclaw任務面版設計/openclaw-main/apps/macos
/Users/caijunchang/openclaw任務面版設計/openclaw-main/apps/shared
/Users/caijunchang/openclaw任務面版設計/openclaw-main/apps/ios
/Users/caijunchang/openclaw任務面版設計/openclaw-main/apps/android
/Users/caijunchang/openclaw任務面版設計/openclaw-main/CLAUDE.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vendor
/Users/caijunchang/openclaw任務面版設計/openclaw-main/vendor/a2ui
/Users/caijunchang/openclaw任務面版設計/openclaw-main/SECURITY.md
/Users/caijunchang/openclaw任務面版設計/openclaw-main/pnpm-workspace.yaml
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/pairing
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/test-utils
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/utils.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/infra
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/compat
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/types
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/macos
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/discord
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/memory
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/index.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/polls.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/config
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/security
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/tui
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/plugins
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/web
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/markdown
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/node-host
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/providers
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/entry.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/media-understanding
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/wizard
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/utils.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/terminal
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/link-understanding
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/agents
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/plugin-sdk
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/utils
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/shared
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/docs
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/cli
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/docker-setup.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/runtime.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/logger.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/browser
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/version.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/extensionAPI.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/sessions
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/daemon
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/line
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/hooks
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/globals.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/telegram
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/tts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/scripts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/canvas-host
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/test-helpers
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/slack
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/commands
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/imessage
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/index.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/globals.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/routing
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/channel-web.barrel.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/version.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/acp
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/signal
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/logging
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/auto-reply
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/channel-web.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/whatsapp
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/logging.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/polls.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/logger.test.ts
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/gateway
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/cron
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/process
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/channels
/Users/caijunchang/openclaw任務面版設計/openclaw-main/src/media
/Users/caijunchang/openclaw任務面版設計/deploy
/Users/caijunchang/openclaw任務面版設計/deploy/security
/Users/caijunchang/openclaw任務面版設計/deploy/security/Caddyfile.example
/Users/caijunchang/openclaw任務面版設計/deploy/security/README.md
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/PROJECT_990_AEGIS_SCANNER_PROTOTYPE_v0.1.md
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/malicious_skill
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/malicious_skill/malicious_skill.py
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/skills_to_scan
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/skills_to_scan/malicious-skill-sample
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/sandbox
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/sandbox/Dockerfile
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/docker-compose.yml
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/repo_mapper.py
/Users/caijunchang/openclaw任務面版設計/aegis-scanner-v0.1/aegis_scanner.py
/Users/caijunchang/openclaw任務面版設計/projects
/Users/caijunchang/openclaw任務面版設計/projects/batcha-test
/Users/caijunchang/openclaw任務面版設計/projects/batcha-test/docs
/Users/caijunchang/openclaw任務面版設計/projects/batcha-test/README.md
/Users/caijunchang/openclaw任務面版設計/projects/batcha-test/modules
/Users/caijunchang/openclaw任務面版設計/projects/batcha-test/runs
/Users/caijunchang/openclaw任務面版設計/projects/openclaw
/Users/caijunchang/openclaw任務面版設計/projects/openclaw/docs
/Users/caijunchang/openclaw任務面版設計/projects/openclaw/README.md
/Users/caijunchang/openclaw任務面版設計/projects/openclaw/modules
/Users/caijunchang/openclaw任務面版設計/projects/openclaw/runs
/Users/caijunchang/openclaw任務面版設計/projects/business-poc
/Users/caijunchang/openclaw任務面版設計/projects/business-poc/docs
/Users/caijunchang/openclaw任務面版設計/projects/business-poc/README.md
/Users/caijunchang/openclaw任務面版設計/projects/business-poc/modules
/Users/caijunchang/openclaw任務面版設計/projects/real-estate-sentry-plan.md
/Users/caijunchang/openclaw任務面版設計/ollama_bot2.env.example
/Users/caijunchang/openclaw任務面版設計/ollama任務版.jsx
/Users/caijunchang/openclaw任務面版設計/server
/Users/caijunchang/openclaw任務面版設計/server/autopilot-state.json
/Users/caijunchang/openclaw任務面版設計/server/nixpacks.toml
/Users/caijunchang/openclaw任務面版設計/server/migrations
/Users/caijunchang/openclaw任務面版設計/server/migrations/20260227_firewall_logs.sql
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018743379-i1gg-1771018806964.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014843484-0k5n-1771014906804.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009867798-1771012206681.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038758437-1771038761026.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771039213585-1771039215427.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016343399-e1zx-1771016406859.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014543488-mmae-1771014606768.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038776890-1771038778932.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038811107-1771038813513.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038786264-1771038788353.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016943367-wvey-1771017007074.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009863891-1771012566725.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032512025-1771032887467.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009867166-1771012266689.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018143389-rq2j-1771018207200.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015743401-u533-1771015837286.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016643535-nfb0-1771016706779.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510223-1771033186609.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019343553-rx2q-1771019407036.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020618716-5uhd-1771020629811.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017543421-23j4-1771017606968.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003719025-1771021559714.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771012743271-idig-1771012806651.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013943314-ck7t-1771014006961.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013643277-ajw1-1771013707272.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031293531-1771031765456.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020941711-ph5v-1771021350202.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771032235540-j1a8-1771032245252.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032511680-1771032946750.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031302298-1771031315312.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003717602-1771021619776.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017243606-ue5c-1771017306864.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026630727-1771032005319.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020943479-3lze-1771020959880.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019043597-iekj-1771019106966.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020942416-syf3-1771021199834.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015443449-to0r-1771015506977.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016043264-d9bh-1771016106946.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019643357-s3c8-1771019707178.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026630297-1771032065318.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018443957-rauk-1771018507132.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009869054-1771012086621.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009869649-1771012027068.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013343326-vlah-1771013406591.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015143440-75ct-1771015206791.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017843885-ed42-1771017906980.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1770985229607-1771021499714.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003673047-1771021679608.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038806251-1771038808042.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014243350-3qjs-1771014306877.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510654-1771033126570.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013043509-d0au-1771013106685.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009865908-1771012386510.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026631093-1771031945909.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009864549-1771012506615.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009866541-1771012326913.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009868431-1771012146571.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009865218-1771012446813.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510995-1771033066707.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771032234456-mwpi-1771032335294.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/telegram-control.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020487601-y438-1771020749851.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019943355-hg3j-1771020076597.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031582482-1771031645336.json
/Users/caijunchang/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031121884-1771031255221.json
/Users/caijunchang/openclaw任務面版設計/server/Dockerfile
/Users/caijunchang/openclaw任務面版設計/server/projects
/Users/caijunchang/openclaw任務面版設計/server/projects/batcha-test
/Users/caijunchang/openclaw任務面版設計/server/tests
/Users/caijunchang/openclaw任務面版設計/server/tests/api-contract.test.ts
/Users/caijunchang/openclaw任務面版設計/server/utils
/Users/caijunchang/openclaw任務面版設計/server/utils/telegram.js
/Users/caijunchang/openclaw任務面版設計/server/utils/telegram.ts
/Users/caijunchang/openclaw任務面版設計/server/README.md
/Users/caijunchang/openclaw任務面版設計/server/package-lock.json
/Users/caijunchang/openclaw任務面版設計/server/package.json
/Users/caijunchang/openclaw任務面版設計/server/scripts
/Users/caijunchang/openclaw任務面版設計/server/scripts/batch-index-v2.sh
/Users/caijunchang/openclaw任務面版設計/server/scripts/run-batch-index.sh
/Users/caijunchang/openclaw任務面版設計/server/scripts/batch-index-oneshot.sh
/Users/caijunchang/openclaw任務面版設計/server/scripts/batch-index.py
/Users/caijunchang/openclaw任務面版設計/server/scripts/batch-index-lite.mjs
/Users/caijunchang/openclaw任務面版設計/server/scripts/start-server-with-path.sh
/Users/caijunchang/openclaw任務面版設計/server/scripts/index-one-file.mjs
/Users/caijunchang/openclaw任務面版設計/server/tsconfig.json
/Users/caijunchang/openclaw任務面版設計/server/auto-task-generator-state.json
/Users/caijunchang/openclaw任務面版設計/server/vitest.config.ts
/Users/caijunchang/openclaw任務面版設計/server/RAILWAY_DEPLOY.md
/Users/caijunchang/openclaw任務面版設計/server/data
/Users/caijunchang/openclaw任務面版設計/server/data/insights.json
/Users/caijunchang/openclaw任務面版設計/server/data/task-runs.json
/Users/caijunchang/openclaw任務面版設計/server/server.log
/Users/caijunchang/openclaw任務面版設計/server/railway.json
/Users/caijunchang/openclaw任務面版設計/server/src
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts
/Users/caijunchang/openclaw任務面版設計/server/src/index.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/riskClassifier.ts
/Users/caijunchang/openclaw任務面版設計/server/src/types
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/error-handler.ts
/Users/caijunchang/openclaw任務面版設計/server/src/anti-stuck.ts
/Users/caijunchang/openclaw任務面版設計/server/src/features
/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts
/Users/caijunchang/openclaw任務面版設計/server/src/middlewares
/Users/caijunchang/openclaw任務面版設計/server/src/seed.ts
/Users/caijunchang/openclaw任務面版設計/server/src/taskCompliance.ts
/Users/caijunchang/openclaw任務面版設計/server/src/utils
/Users/caijunchang/openclaw任務面版設計/server/src/models
/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts.bak
/Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts
/Users/caijunchang/openclaw任務面版設計/server/src/types.ts
/Users/caijunchang/openclaw任務面版設計/server/src/logger.ts
/Users/caijunchang/openclaw任務面版設計/server/src/features.ts
/Users/caijunchang/openclaw任務面版設計/server/src/preload-dotenv.ts
/Users/caijunchang/openclaw任務面版設計/server/src/domains.ts
/Users/caijunchang/openclaw任務面版設計/server/src/telegram
/Users/caijunchang/openclaw任務面版設計/server/src/emergency-stop.ts
/Users/caijunchang/openclaw任務面版設計/server/src/n8nClient.ts
/Users/caijunchang/openclaw任務面版設計/server/src/index.ts
/Users/caijunchang/openclaw任務面版設計/server/src/supabase.ts
/Users/caijunchang/openclaw任務面版設計/server/src/promptGuard.ts
/Users/caijunchang/openclaw任務面版設計/server/src/modules
/Users/caijunchang/openclaw任務面版設計/server/src/controllers
/Users/caijunchang/openclaw任務面版設計/server/src/workflow-engine.ts
/Users/caijunchang/openclaw任務面版設計/server/src/routes
/Users/caijunchang/openclaw任務面版設計/server/src/services
/Users/caijunchang/openclaw任務面版設計/server/src/validation
/Users/caijunchang/openclaw任務面版設計/server/src/store.ts
/Users/caijunchang/openclaw任務面版設計/backend
/Users/caijunchang/openclaw任務面版設計/backend/src
/Users/caijunchang/openclaw任務面版設計/backend/src/main.ts
/Users/caijunchang/openclaw任務面版設計/backend/src/product
/Users/caijunchang/openclaw任務面版設計/backend/src/app.module.ts
/Users/caijunchang/openclaw任務面版設計/cookbook
/Users/caijunchang/openclaw任務面版設計/cookbook/42-作品集與提案簡報.md
/Users/caijunchang/openclaw任務面版設計/cookbook/65-Dashboard儀表板設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/51-AI內容生成與SEO文案.md
/Users/caijunchang/openclaw任務面版設計/cookbook/25-SEO基礎與上線檢查表.md
/Users/caijunchang/openclaw任務面版設計/cookbook/04-自動化執行.md
/Users/caijunchang/openclaw任務面版設計/cookbook/69-Manus-AI設計理念與實踐.md
/Users/caijunchang/openclaw任務面版設計/cookbook/27-圖片素材優化指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/60-排隊叫號系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/26-響應式設計與跨瀏覽器測試.md
/Users/caijunchang/openclaw任務面版設計/cookbook/16-雙手能力邊界.md
/Users/caijunchang/openclaw任務面版設計/cookbook/45-電商網站完整指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/59-訂位點餐系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/22-LINE-OA設定指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/23-n8n-Workflow模板.md
/Users/caijunchang/openclaw任務面版設計/cookbook/63-ERP進銷存系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/54-廣告投放與數據追蹤.md
/Users/caijunchang/openclaw任務面版設計/cookbook/64-CRM客戶管理系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/19-小蔡協作指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/10-會話與權限.md
/Users/caijunchang/openclaw任務面版設計/cookbook/58-POS收銀系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/08-協作與通訊.md
/Users/caijunchang/openclaw任務面版設計/cookbook/18-連續行動與自主判斷.md
/Users/caijunchang/openclaw任務面版設計/cookbook/55-自動化行銷漏斗.md
/Users/caijunchang/openclaw任務面版設計/cookbook/版本歸總-v2.5.x.md
/Users/caijunchang/openclaw任務面版設計/cookbook/37-多語系i18n網站.md
/Users/caijunchang/openclaw任務面版設計/cookbook/03-資安與防護.md
/Users/caijunchang/openclaw任務面版設計/cookbook/62-餐飲管理系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/46-網站效能優化.md
/Users/caijunchang/openclaw任務面版設計/cookbook/24-通訊平台串接指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/41-客戶溝通與需求訪談.md
/Users/caijunchang/openclaw任務面版設計/cookbook/11-任務狀態機.md
/Users/caijunchang/openclaw任務面版設計/cookbook/61-外送外帶平台設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/README.md
/Users/caijunchang/openclaw任務面版設計/cookbook/52-AI圖片生成與處理.md
/Users/caijunchang/openclaw任務面版設計/cookbook/05-前端架構.md
/Users/caijunchang/openclaw任務面版設計/cookbook/33-DNS網域與SSL設定.md
/Users/caijunchang/openclaw任務面版設計/cookbook/47-WordPress深度指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/44-客戶FAQ大全.md
/Users/caijunchang/openclaw任務面版設計/cookbook/56-排程自動化與Cron任務.md
/Users/caijunchang/openclaw任務面版設計/cookbook/34-GA與Search-Console設定.md
/Users/caijunchang/openclaw任務面版設計/cookbook/14-路徑與檔案系統.md
/Users/caijunchang/openclaw任務面版設計/cookbook/06-除錯與救援.md
/Users/caijunchang/openclaw任務面版設計/cookbook/07-網站與部署.md
/Users/caijunchang/openclaw任務面版設計/cookbook/71-Lovable-AI美學生成設計理念.md
/Users/caijunchang/openclaw任務面版設計/cookbook/12-匯報與溝通協議.md
/Users/caijunchang/openclaw任務面版設計/cookbook/15-驗收對治法.md
/Users/caijunchang/openclaw任務面版設計/cookbook/43-專案管理與時程控制.md
/Users/caijunchang/openclaw任務面版設計/cookbook/48-Landing-Page高轉換設計.md
/Users/caijunchang/openclaw任務面版設計/cookbook/30-會員系統與金流串接.md
/Users/caijunchang/openclaw任務面版設計/cookbook/38-網站安全加固.md
/Users/caijunchang/openclaw任務面版設計/cookbook/02-資料庫.md
/Users/caijunchang/openclaw任務面版設計/cookbook/13-編碼品質.md
/Users/caijunchang/openclaw任務面版設計/cookbook/28-網站交付與客戶教學.md
/Users/caijunchang/openclaw任務面版設計/cookbook/01-API-端點.md
/Users/caijunchang/openclaw任務面版設計/cookbook/17-ask_ai協作指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/32-報價模板與合約範本.md
/Users/caijunchang/openclaw任務面版設計/cookbook/35-表單設計與驗證.md
/Users/caijunchang/openclaw任務面版設計/cookbook/49-網站備份與災難復原.md
/Users/caijunchang/openclaw任務面版設計/cookbook/70-Ready-AI即時應用生成設計理念.md
/Users/caijunchang/openclaw任務面版設計/cookbook/50-AI客服聊天機器人.md
/Users/caijunchang/openclaw任務面版設計/cookbook/68-預約排班系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/53-社群引流與自動化行銷.md
/Users/caijunchang/openclaw任務面版設計/cookbook/66-通知推播系統設計指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/21-接案SOP.md
/Users/caijunchang/openclaw任務面版設計/cookbook/36-Email系統串接.md
/Users/caijunchang/openclaw任務面版設計/cookbook/20-自救SOP.md
/Users/caijunchang/openclaw任務面版設計/cookbook/09-高階代碼模板.md
/Users/caijunchang/openclaw任務面版設計/cookbook/31-設計稿轉代碼指南.md
/Users/caijunchang/openclaw任務面版設計/cookbook/57-Webhook架構與事件驅動.md
/Users/caijunchang/openclaw任務面版設計/cookbook/39-資料庫選型與設計.md
/Users/caijunchang/openclaw任務面版設計/cookbook/29-CMS選型與快速建站.md
/Users/caijunchang/openclaw任務面版設計/cookbook/40-第三方API串接大全.md
/Users/caijunchang/openclaw任務面版設計/cookbook/67-LINE-Bot開發指南.md
/Users/caijunchang/openclaw任務面版設計/docs
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw為什麼終端一直在跑.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram與OpenClaw-穩定性建議.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-與任務板-是否一直執行.md
/Users/caijunchang/openclaw任務面版設計/docs/Token優化-更新紀錄.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw為什麼還是19K-Token-與已修正方式.md
/Users/caijunchang/openclaw任務面版設計/docs/新開視窗時-流程說明.md
/Users/caijunchang/openclaw任務面版設計/docs/EMERGENCY-MECHANISM.md
/Users/caijunchang/openclaw任務面版設計/docs/任務執行中斷與沒有回應-排查說明.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw必學技能-檢查結果.md
/Users/caijunchang/openclaw任務面版設計/docs/Ollama接另一個bot-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/同視窗上下文過長-處理方式.md
/Users/caijunchang/openclaw任務面版設計/docs/檢測Token與用Notion本機檢索降低輸入.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-模型測試報告-2026-02-12.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-瀏覽器自動化安全指令.md
/Users/caijunchang/openclaw任務面版設計/docs/LINE-BOT-SETUP.md
/Users/caijunchang/openclaw任務面版設計/docs/bot沒回應-檢查.md
/Users/caijunchang/openclaw任務面版設計/docs/analysis
/Users/caijunchang/openclaw任務面版設計/docs/analysis/auto-executor-trigger-investigation.md
/Users/caijunchang/openclaw任務面版設計/docs/analysis/auto-executor-ts-workflow.md
/Users/caijunchang/openclaw任務面版設計/docs/analysis/index-ts-architecture.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-INTEGRATION.md
/Users/caijunchang/openclaw任務面版設計/docs/記憶與對話-一般聊天輕量模式設計.md
/Users/caijunchang/openclaw任務面版設計/docs/SECURITY-RULES.md
/Users/caijunchang/openclaw任務面版設計/docs/保護措施與設定整理-2026-02-12.md
/Users/caijunchang/openclaw任務面版設計/docs/QMD記憶索引-連線與檢查.md
/Users/caijunchang/openclaw任務面版設計/docs/MCP-PLAYBOOK.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCODE-AGENT-DASHBOARD.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-CONFIG-CHECK.md
/Users/caijunchang/openclaw任務面版設計/docs/每次溝通Token控制在4K或更少.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-模型變更-僅Kimi與Ollama.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-MODELS-REFERENCE.md
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-taskboard-skill
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-taskboard-skill/references
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-taskboard-skill/AGENTS-SNIPPET.md
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-taskboard-skill/README.md
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-taskboard-skill/SKILL.md
/Users/caijunchang/openclaw任務面版設計/docs/API-CONNECTION.md
/Users/caijunchang/openclaw任務面版設計/docs/supabase-openclaw-migration.sql
/Users/caijunchang/openclaw任務面版設計/docs/SCRIPTS-BUTTONS-AUDIT.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-還原檔與備份位置.md
/Users/caijunchang/openclaw任務面版設計/docs/Ollama-Telegram回覆速度-實測與優化.md
/Users/caijunchang/openclaw任務面版設計/docs/AUTH-SETUP.md
/Users/caijunchang/openclaw任務面版設計/docs/drink-ordering-api-v1.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-CONCEPT.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-Telegram與模型傳輸-深度檢查-2026-02-12.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-ACTION-MAP.md
/Users/caijunchang/openclaw任務面版設計/docs/INCIDENT-2026-02-14-telegram-no-response.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-成本優化配置-Gemini主力.md
/Users/caijunchang/openclaw任務面版設計/docs/資料來源說明.md
/Users/caijunchang/openclaw任務面版設計/docs/QUICK-START.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw透過CLI執行-問題時轉給Cursor解決.md
/Users/caijunchang/openclaw任務面版設計/docs/用QMD記憶減少每次溝通的Token.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram與點擊延遲排查.md
/Users/caijunchang/openclaw任務面版設計/docs/執行延續性-主動恢復與完成流程.md
/Users/caijunchang/openclaw任務面版設計/docs/database-schema.md
/Users/caijunchang/openclaw任務面版設計/docs/目前每次溝通Token消耗-實測演示.md
/Users/caijunchang/openclaw任務面版設計/docs/MODULES.md
/Users/caijunchang/openclaw任務面版設計/docs/ollama與Claude-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/FEATURE-AUDIT-2026-02-15.md
/Users/caijunchang/openclaw任務面版設計/docs/ollama-launch-openclaw-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/SUBAGENT-GUARDRAILS.md
/Users/caijunchang/openclaw任務面版設計/docs/記憶寫入與索引-說明與實施方式.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw沒反應與Telegram排查.md
/Users/caijunchang/openclaw任務面版設計/docs/SUPABASE-SETUP.md
/Users/caijunchang/openclaw任務面版設計/docs/開機自動啟動Ollama.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-API-Key與模型切換-讀取來源.md
/Users/caijunchang/openclaw任務面版設計/docs/Gemini未知錯誤與英文回覆-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/Token優化與後續建議.md
/Users/caijunchang/openclaw任務面版設計/docs/SYSTEM-RESOURCES.md
/Users/caijunchang/openclaw任務面版設計/docs/PROJECT-NOTES.md
/Users/caijunchang/openclaw任務面版設計/docs/DEPLOY.md
/Users/caijunchang/openclaw任務面版設計/docs/n8n
/Users/caijunchang/openclaw任務面版設計/docs/n8n/README.md
/Users/caijunchang/openclaw任務面版設計/docs/n8n/My-workflow.no-llm.json
/Users/caijunchang/openclaw任務面版設計/docs/n8n/OpenClaw-Run-Index-Reporter-Telegram.json
/Users/caijunchang/openclaw任務面版設計/docs/n8n/OpenClaw-Run-Index-Reporter-Telegram.code-node.json
/Users/caijunchang/openclaw任務面版設計/docs/n8n/Daily-Wrap-up.no-llm.json
/Users/caijunchang/openclaw任務面版設計/docs/n8n/Daily-Wrap-up.no-llm.with-error-alert.json
/Users/caijunchang/openclaw任務面版設計/docs/n8n/My-workflow.fixed.json
/Users/caijunchang/openclaw任務面版設計/docs/Ollama-加速回覆.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw連上Notion-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/TELEGRAM-DIRECT-SETUP.md
/Users/caijunchang/openclaw任務面版設計/docs/動態載入與按需記憶-可行做法.md
/Users/caijunchang/openclaw任務面版設計/docs/記憶-自動化寫入設計.md
/Users/caijunchang/openclaw任務面版設計/docs/STATUS-MIGRATION-RUNBOOK.md
/Users/caijunchang/openclaw任務面版設計/docs/雲端備份與上傳清單.md
/Users/caijunchang/openclaw任務面版設計/docs/AGENT-GUIDE.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-17K-Token來源明細.md
/Users/caijunchang/openclaw任務面版設計/docs/模型不回話-排查步驟.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram-設定排查.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-Copilot-auth-token-optional-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/ROADMAP.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-NODE-VERSION-GUARD.md
/Users/caijunchang/openclaw任務面版設計/docs/記憶索引-比例分配與實作流程.md
/Users/caijunchang/openclaw任務面版設計/docs/AGENT_PROTOCOL.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw技能-自我進化與升級資源.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw接Ollama-檢查清單.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-排查報告-2026-02-12.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw透過Cursor-CLI編程.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram任務指令-parser與webhook驗簽規格.md
/Users/caijunchang/openclaw任務面版設計/docs/CLAUDE-MODEL-SETUP.md
/Users/caijunchang/openclaw任務面版設計/docs/Gateway-外部連線-bind設定說明.md
/Users/caijunchang/openclaw任務面版設計/docs/RAG-定時更新說明.md
/Users/caijunchang/openclaw任務面版設計/docs/回覆很慢與洩漏個人資訊-說明.md
/Users/caijunchang/openclaw任務面版設計/docs/TELEGRAM-SETUP-GUIDE.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-Copilot-顯示Not-Connected-排查.md
/Users/caijunchang/openclaw任務面版設計/docs/TASK-TEMPLATE.md
/Users/caijunchang/openclaw任務面版設計/docs/小蔡用網頁版AI省Token-子代理與瀏覽器控制.md
/Users/caijunchang/openclaw任務面版設計/docs/日誌與快取清理建議.md
/Users/caijunchang/openclaw任務面版設計/docs/GITHUB_PAGES.md
/Users/caijunchang/openclaw任務面版設計/docs/大家經常遇到的OpenClaw問題.md
/Users/caijunchang/openclaw任務面版設計/docs/VERIFICATION-REPORT.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-模型代碼檢查-2026-02-12.md
/Users/caijunchang/openclaw任務面版設計/docs/TASKBOARD-FULL-AUDIT-2026-02-16.md
/Users/caijunchang/openclaw任務面版設計/docs/Gemini-2.5-Pro-重複回覆後無反應-排查.md
/Users/caijunchang/openclaw任務面版設計/docs/改用改過的OpenClaw-讓輕量模式生效.md
/Users/caijunchang/openclaw任務面版設計/docs/瀏覽器控制經常失敗-排查說明.md
/Users/caijunchang/openclaw任務面版設計/docs/記憶索引-主題與命中率設計.md
/Users/caijunchang/openclaw任務面版設計/docs/N8N-WORKFLOW-DESIGN.md
/Users/caijunchang/openclaw任務面版設計/docs/不用API的本機模型-openclaw.md
/Users/caijunchang/openclaw任務面版設計/docs/WHERE-TO-LOOK.md
/Users/caijunchang/openclaw任務面版設計/docs/ENV-KEYS.md
/Users/caijunchang/openclaw任務面版設計/docs/看到同步任務板的方式.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram傳給OpenClaw沒有反應-排查.md
/Users/caijunchang/openclaw任務面版設計/docs/openclaw-json-ollama-fix.md
/Users/caijunchang/openclaw任務面版設計/docs/新視窗或新訊息維持之前記憶-實施方式.md
/Users/caijunchang/openclaw任務面版設計/docs/stop-指令實際生效的解決方案.md
/Users/caijunchang/openclaw任務面版設計/docs/N8N-INTEGRATION.md
/Users/caijunchang/openclaw任務面版設計/docs/ollama_bot2-開機自動啟動.md
/Users/caijunchang/openclaw任務面版設計/docs/網路與官方-常見問題與必學技能.md
/Users/caijunchang/openclaw任務面版設計/docs/測試結果-目前跑的是哪一個OpenClaw.md
/Users/caijunchang/openclaw任務面版設計/docs/需要注意而容易忽略的檢查清單.md
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫/SOP-05-維護巡檢.md
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫/SOP-01-標準任務流程.md
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫/README.md
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫/SOP-13-網站健康檢查.md
/Users/caijunchang/openclaw任務面版設計/docs/sop-知識庫/SOP-03-系統診斷.md
/Users/caijunchang/openclaw任務面版設計/docs/OPENCLAW-GUIDELINES.md
/Users/caijunchang/openclaw任務面版設計/docs/Telegram任務橋接-Express範例啟動說明.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw環境檢查與建議.md
/Users/caijunchang/openclaw任務面版設計/docs/TELEGRAM-NO-REPLY.md
/Users/caijunchang/openclaw任務面版設計/docs/Gemini-2.5-Flash-重複回覆與失敗-紀錄.md
/Users/caijunchang/openclaw任務面版設計/docs/API-INTEGRATION.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw無法使用瀏覽器-解決步驟.md
/Users/caijunchang/openclaw任務面版設計/docs/Rotate-Key-驗證清單.md
/Users/caijunchang/openclaw任務面版設計/docs/OpenClaw-修復紀錄報告.md
/Users/caijunchang/openclaw任務面版設計/docs/SOP-網站商家部署-OpenCart（小蔡指揮Codex+Cursor）.md
/Users/caijunchang/openclaw任務面版設計/docs/HANDOVER_CURSOR.md
/Users/caijunchang/openclaw任務面版設計/docs/任務板執行功能與Agent控制-透過瀏覽器使用AI省Token.md
/Users/caijunchang/openclaw任務面版設計/supabase
/Users/caijunchang/openclaw任務面版設計/supabase/migrations
/Users/caijunchang/openclaw任務面版設計/supabase/migrations/20260302_openclaw_tasks_status_expand_safe_down.sql
/Users/caijunchang/openclaw任務面版設計/supabase/migrations/20260302_create_embeddings.sql
/Users/caijunchang/openclaw任務面版設計/supabase/migrations/20260302_openclaw_tasks_status_expand_safe.sql
/Users/caijunchang/openclaw任務面版設計/supabase/migrations/20260303_embeddings_knowledge_classification.sql
/Users/caijunchang/openclaw任務面版設計/supabase/config.toml
/Users/caijunchang/openclaw任務面版設計/ollama_bot2.log
/Users/caijunchang/openclaw任務面版設計/ollama_monitor_bot.log
/Users/caijunchang/openclaw任務面版設計/README.md
/Users/caijunchang/openclaw任務面版設計/tailwind.config.ts
/Users/caijunchang/openclaw任務面版設計/rag_update.log
/Users/caijunchang/openclaw任務面版設計/create_xiaocai_ideas_table.sql
/Users/caijunchang/openclaw任務面版設計/public
/Users/caijunchang/openclaw任務面版設計/public/favicon.ico
/Users/caijunchang/openclaw任務面版設計/public/live2dcubismcore.min.js
/Users/caijunchang/openclaw任務面版設計/public/models
/Users/caijunchang/openclaw任務面版設計/public/models/haru
/Users/caijunchang/openclaw任務面版設計/public/icons
/Users/caijunchang/openclaw任務面版設計/public/icons/icon-maskable-192x192.svg
/Users/caijunchang/openclaw任務面版設計/public/icons/icon-192x192.svg
/Users/caijunchang/openclaw任務面版設計/public/icons/icon-512x512.svg
/Users/caijunchang/openclaw任務面版設計/public/icons/icon-maskable-512x512.svg
/Users/caijunchang/openclaw任務面版設計/public/robots.txt
/Users/caijunchang/openclaw任務面版設計/public/placeholder.svg
/Users/caijunchang/openclaw任務面版設計/logs
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-30-12.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-100000.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260218-220001.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-22-14.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-21-51.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-203012.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260220-060002.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260217-213856.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260219-060004.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-launchd-err.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-task-t1771302641975-20260218-202816.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-180000.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-202816.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-24-04.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260219-180000.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-21-35.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-210426.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-task-t1771302641975-20260218-203012.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260219-100004.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-28-16.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260219-140003.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260219-220000.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260217-213837.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260219-100004.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-launchd.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260217-220000.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260218-210426.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260219-180000.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260218-202816.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-16-42.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-060003.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260219-220000.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T13-04-26.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-27-59.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260219-140003.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-launchd.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-27-02.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-220002.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260218-140000.log
/Users/caijunchang/openclaw任務面版設計/logs/server.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-launchd-err.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260219-060004.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-24-57.log
/Users/caijunchang/openclaw任務面版設計/logs/deputy-20260218-203012.log
/Users/caijunchang/openclaw任務面版設計/logs/patrol-20260220-060003.log
/Users/caijunchang/openclaw任務面版設計/package-lock.json
/Users/caijunchang/openclaw任務面版設計/package.json
/Users/caijunchang/openclaw任務面版設計/knowledge
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai/RESULT.md
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai/INTEGRATION.md
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai/PROMPTS.md
/Users/caijunchang/openclaw任務面版設計/knowledge/cursor-ai/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/PROMPTS.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gpt-5.2/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/repos
/Users/caijunchang/openclaw任務面版設計/knowledge/repos/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/poll-tex
/Users/caijunchang/openclaw任務面版設計/knowledge/poll-tex/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/poll-tex/PRODUCT_KB.md
/Users/caijunchang/openclaw任務面版設計/knowledge/devin-ai
/Users/caijunchang/openclaw任務面版設計/knowledge/devin-ai/implementation.md
/Users/caijunchang/openclaw任務面版設計/knowledge/devin-ai/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/devin-ai/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/TEMPLATE.md
/Users/caijunchang/openclaw任務面版設計/knowledge/RESULT.md
/Users/caijunchang/openclaw任務面版設計/knowledge/QMD-本地搜尋引擎.md
/Users/caijunchang/openclaw任務面版設計/knowledge/decision-tree
/Users/caijunchang/openclaw任務面版設計/knowledge/decision-tree/RESULT.md
/Users/caijunchang/openclaw任務面版設計/knowledge/decision-tree/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/self-healing
/Users/caijunchang/openclaw任務面版設計/knowledge/self-healing/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/self-healing/runs
/Users/caijunchang/openclaw任務面版設計/knowledge/qwen3
/Users/caijunchang/openclaw任務面版設計/knowledge/qwen3/ollama-guide.md
/Users/caijunchang/openclaw任務面版設計/knowledge/qwen3/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/qwen3/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/系統架構總覽-20260216.md
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/salesforce-einstein/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/knowledge_base.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/gemini-vision/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/knowledge_auto.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/PROMPTS.md
/Users/caijunchang/openclaw任務面版設計/knowledge/sonnet-4.5/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/auto-gpt/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/CURSOR-AGENT-INSTRUCTIONS.md
/Users/caijunchang/openclaw任務面版設計/knowledge/research.sh
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/grok-4.1/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/MODEL-DECISION-MATRIX.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/official-release.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/code-example.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/prompt-best-practices.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/user-feedback.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/openclaw-guide.md
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/cost-calculator.sh
/Users/caijunchang/openclaw任務面版設計/knowledge/opus-4.6/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/knowledge/MULTI_AGENT_COMMUNICATION.md
/Users/caijunchang/openclaw任務面版設計/knowledge/CLI_TRUTH_MAP.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/implementation.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/strengths.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/sample-scan.sh
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/integration.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/README.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/comparisons.md
/Users/caijunchang/openclaw任務面版設計/knowledge/trivy/README-v1.1.md
/Users/caijunchang/openclaw任務面版設計/sandbox
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/PROJECT_990_AEGIS_SCANNER_PROTOTYPE_v0.1.md
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/malicious_skill
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/skills_to_scan
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/sandbox
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/rules.json
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/SKILL.md
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/docker-compose.yml
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/repo_mapper.py
/Users/caijunchang/openclaw任務面版設計/sandbox/aegis-scanner/aegis_scanner.py
/Users/caijunchang/openclaw任務面版設計/sandbox/output
/Users/caijunchang/openclaw任務面版設計/sandbox/output/bootstrap_modification_report.txt
/Users/caijunchang/openclaw任務面版設計/sandbox/BOOTSTRAP.md
/Users/caijunchang/openclaw任務面版設計/dev.log
/Users/caijunchang/openclaw任務面版設計/scripts
/Users/caijunchang/openclaw任務面版設計/scripts/task-board-api.sh
/Users/caijunchang/openclaw任務面版設計/scripts/generate-dashboard.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-gemini-lite.sh
/Users/caijunchang/openclaw任務面版設計/scripts/prompt-firewall.sh
/Users/caijunchang/openclaw任務面版設計/scripts/kb-snapshot-resources.sh
/Users/caijunchang/openclaw任務面版設計/scripts/telegram-rich-menu.sh
/Users/caijunchang/openclaw任務面版設計/scripts/find-start-script.sh
/Users/caijunchang/openclaw任務面版設計/scripts/neuxa-audit-pro.sh
/Users/caijunchang/openclaw任務面版設計/scripts/agent-status.sh
/Users/caijunchang/openclaw任務面版設計/scripts/boot-integration.sh
/Users/caijunchang/openclaw任務面版設計/scripts/google-api-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/log-rotate.sh
/Users/caijunchang/openclaw任務面版設計/scripts/risk-shield.sh
/Users/caijunchang/openclaw任務面版設計/scripts/memory_search.sh
/Users/caijunchang/openclaw任務面版設計/scripts/opus-task.sh
/Users/caijunchang/openclaw任務面版設計/scripts/wake-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/restore-skill.sh
/Users/caijunchang/openclaw任務面版設計/scripts/oc-auto.sh
/Users/caijunchang/openclaw任務面版設計/scripts/self-heal.sh
/Users/caijunchang/openclaw任務面版設計/scripts/setup-telegram-token.sh
/Users/caijunchang/openclaw任務面版設計/scripts/start-tunnel.sh
/Users/caijunchang/openclaw任務面版設計/scripts/refill-task-pool.sh
/Users/caijunchang/openclaw任務面版設計/scripts/openclaw-auto-patrol.sh
/Users/caijunchang/openclaw任務面版設計/scripts/switch-key.sh
/Users/caijunchang/openclaw任務面版設計/scripts/_wake_urgent_parse.py
/Users/caijunchang/openclaw任務面版設計/scripts/worktree-manager.sh
/Users/caijunchang/openclaw任務面版設計/scripts/n8n-run.sh
/Users/caijunchang/openclaw任務面版設計/scripts/fix-background.sh
/Users/caijunchang/openclaw任務面版設計/scripts/handoff-generator.sh
/Users/caijunchang/openclaw任務面版設計/scripts/memory-cleanup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/agent-xp-tracker.sh
/Users/caijunchang/openclaw任務面版設計/scripts/control-center-launch.sh
/Users/caijunchang/openclaw任務面版設計/scripts/health-check.py
/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-gemini.sh
/Users/caijunchang/openclaw任務面版設計/scripts/check-version.sh
/Users/caijunchang/openclaw任務面版設計/scripts/post-push-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-security
/Users/caijunchang/openclaw任務面版設計/scripts/auto-security/tests
/Users/caijunchang/openclaw任務面版設計/scripts/auto-security/verify_patch.py
/Users/caijunchang/openclaw任務面版設計/scripts/auto-project-backup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/safe-run.sh
/Users/caijunchang/openclaw任務面版設計/scripts/local-db-backup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/approve-idea.sh
/Users/caijunchang/openclaw任務面版設計/scripts/smart-read.sh
/Users/caijunchang/openclaw任務面版設計/scripts/mailbox-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/complete-current-task.sh
/Users/caijunchang/openclaw任務面版設計/scripts/async-dispatcher.sh
/Users/caijunchang/openclaw任務面版設計/scripts/sync-bridge.sh
/Users/caijunchang/openclaw任務面版設計/scripts/self-healing
/Users/caijunchang/openclaw任務面版設計/scripts/self-healing/proactive-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/self-healing/smart-notifier.sh
/Users/caijunchang/openclaw任務面版設計/scripts/agent-failover.sh
/Users/caijunchang/openclaw任務面版設計/scripts/export-crons.sh
/Users/caijunchang/openclaw任務面版設計/scripts/smart-model-picker.sh
/Users/caijunchang/openclaw任務面版設計/scripts/openclaw-recovery.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/recovery-desktop.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/backup-desktop.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/telegram-bridge.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/🛠️ 系統恢復.app
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/backup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/dashboard-panel.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/health-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/recovery.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/create-recovery-ui.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recovery/restore.command
/Users/caijunchang/openclaw任務面版設計/scripts/security-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/check_port.py
/Users/caijunchang/openclaw任務面版設計/scripts/oc-detect.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-core.sh
/Users/caijunchang/openclaw任務面版設計/scripts/daily-report-engine.sh
/Users/caijunchang/openclaw任務面版設計/scripts/agent-state.sh
/Users/caijunchang/openclaw任務面版設計/scripts/build_memory_index_v2.sh
/Users/caijunchang/openclaw任務面版設計/scripts/crew-workspace-cleanup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/task-card-writeback.sh
/Users/caijunchang/openclaw任務面版設計/scripts/honeypot-alert.sh
/Users/caijunchang/openclaw任務面版設計/scripts/openclaw-recover-no-response.sh
/Users/caijunchang/openclaw任務面版設計/scripts/dashboard-server.sh
/Users/caijunchang/openclaw任務面版設計/scripts/memory-dirty-autofix.sh
/Users/caijunchang/openclaw任務面版設計/scripts/oc-nli.py
/Users/caijunchang/openclaw任務面版設計/scripts/sanitize_subagent_text.py
/Users/caijunchang/openclaw任務面版設計/scripts/notify-laocai.sh
/Users/caijunchang/openclaw任務面版設計/scripts/notion-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/add-xiaocai-idea.sh
/Users/caijunchang/openclaw任務面版設計/scripts/neuxa-firewall-v2.sh
/Users/caijunchang/openclaw任務面版設計/scripts/oc.sh
/Users/caijunchang/openclaw任務面版設計/scripts/mq-wrapper.sh
/Users/caijunchang/openclaw任務面版設計/scripts/task-splitter.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-summary.sh
/Users/caijunchang/openclaw任務面版設計/scripts/README-recover-telegram-bots.md
/Users/caijunchang/openclaw任務面版設計/scripts/taskboard-dashboard-launch.sh
/Users/caijunchang/openclaw任務面版設計/scripts/docs
/Users/caijunchang/openclaw任務面版設計/scripts/docs/auto-executor-lean.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/recovery-backup.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/recovery-health-check.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/idle-watchdog.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/recovery-recovery.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/context-auto-compact.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/gateway-health-watchdog.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/unified-monitor.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/autopilot-checkpoint.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/cursor-task-launcher.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/execute-task.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/ollama-task-monitor.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/automation-ctl.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/checkpoint.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/openclaw-recovery.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/dashboard-server.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/INDEX.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/model-cost-tracker.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/memory_search.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/refill-task-pool.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/safe-run.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/docs/task-board-api.sh.md
/Users/caijunchang/openclaw任務面版設計/scripts/session-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-blacklist.sh
/Users/caijunchang/openclaw任務面版設計/scripts/sanitize-subagent-text.py
/Users/caijunchang/openclaw任務面版設計/scripts/execute-task.sh
/Users/caijunchang/openclaw任務面版設計/scripts/task-completion-handler.sh
/Users/caijunchang/openclaw任務面版設計/scripts/neuxa-patrol.sh
/Users/caijunchang/openclaw任務面版設計/scripts/seed-research-center.sh
/Users/caijunchang/openclaw任務面版設計/scripts/openclaw-deputy.sh
/Users/caijunchang/openclaw任務面版設計/scripts/redact-secrets-in-text-files.py
/Users/caijunchang/openclaw任務面版設計/scripts/task-gen-external.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recall
/Users/caijunchang/openclaw任務面版設計/scripts/README.md
/Users/caijunchang/openclaw任務面版設計/scripts/gemini-call.sh
/Users/caijunchang/openclaw任務面版設計/scripts/log-autopilot-task.sh
/Users/caijunchang/openclaw任務面版設計/scripts/n8n
/Users/caijunchang/openclaw任務面版設計/scripts/estimate-bootstrap-tokens.js
/Users/caijunchang/openclaw任務面版設計/scripts/now-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/cross-platform-intel-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-checkpoint.sh
/Users/caijunchang/openclaw任務面版設計/scripts/recover-telegram-bots.sh
/Users/caijunchang/openclaw任務面版設計/scripts/daily-budget-tracker.sh
/Users/caijunchang/openclaw任務面版設計/scripts/decision_tree.py
/Users/caijunchang/openclaw任務面版設計/scripts/brain-init
/Users/caijunchang/openclaw任務面版設計/scripts/make-no-llm-workflow.py
/Users/caijunchang/openclaw任務面版設計/scripts/auto-bump-version.sh
/Users/caijunchang/openclaw任務面版設計/scripts/SOP-10-跨Agent協作.md
/Users/caijunchang/openclaw任務面版設計/scripts/bulk-create-tasks.sh
/Users/caijunchang/openclaw任務面版設計/scripts/smart-ai-assistant.sh
/Users/caijunchang/openclaw任務面版設計/scripts/telegram-task-bridge-example.js
/Users/caijunchang/openclaw任務面版設計/scripts/emergency-stop.sh
/Users/caijunchang/openclaw任務面版設計/scripts/claude_openai_client_example.py
/Users/caijunchang/openclaw任務面版設計/scripts/license-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/run-with-timeout.sh
/Users/caijunchang/openclaw任務面版設計/scripts/oc-test.sh
/Users/caijunchang/openclaw任務面版設計/scripts/defense-toolkit.sh
/Users/caijunchang/openclaw任務面版設計/scripts/consolidate_knowledge.py
/Users/caijunchang/openclaw任務面版設計/scripts/lib
/Users/caijunchang/openclaw任務面版設計/scripts/lib/circuit-breaker.sh
/Users/caijunchang/openclaw任務面版設計/scripts/lib/common.sh
/Users/caijunchang/openclaw任務面版設計/scripts/fill-readmes.sh
/Users/caijunchang/openclaw任務面版設計/scripts/health-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/checkpoint.sh
/Users/caijunchang/openclaw任務面版設計/scripts/README_DECISION.md
/Users/caijunchang/openclaw任務面版設計/scripts/file-search.sh
/Users/caijunchang/openclaw任務面版設計/scripts/task-gen-business.sh
/Users/caijunchang/openclaw任務面版設計/scripts/memfw-scan.sh
/Users/caijunchang/openclaw任務面版設計/scripts/_wake_task_parse.py
/Users/caijunchang/openclaw任務面版設計/scripts/fix-noncompliant-tasks.sh
/Users/caijunchang/openclaw任務面版設計/scripts/daily-health-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/generate-security-report.sh
/Users/caijunchang/openclaw任務面版設計/scripts/AGENTS.md
/Users/caijunchang/openclaw任務面版設計/scripts/embedding_indexer.py
/Users/caijunchang/openclaw任務面版設計/scripts/compare-and-learn.sh
/Users/caijunchang/openclaw任務面版設計/scripts/idle-watchdog.sh
/Users/caijunchang/openclaw任務面版設計/scripts/fix-empty-tasks.js
/Users/caijunchang/openclaw任務面版設計/scripts/gemini-quota-check.sh
/Users/caijunchang/openclaw任務面版設計/scripts/unified-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/git-commit-helper.sh
/Users/caijunchang/openclaw任務面版設計/scripts/browser-control.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived
/Users/caijunchang/openclaw任務面版設計/scripts/archived/open-control-center.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-worktrees.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/task-gen-business.sh.bak-batchA-20260214-150824
/Users/caijunchang/openclaw任務面版設計/scripts/archived/dmz-sentry.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory_recall.js.backup
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-rescue-restartall.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/simple-update-test.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-watchdog.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-code-evaluator.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/n8n-final-setup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory-record-server.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/task-gen-business.sh.bak.20260214-093114
/Users/caijunchang/openclaw任務面版設計/scripts/archived/n8n-full-auto-deploy.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/ollama-reporter-host.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-monitoring.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/dashboard-env.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/cursor-task-launcher.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-oc-detect.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-ghost-protocol.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-browser.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/autopilot-cycle.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/use-gemini-pro.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/update-core-memory-with-versioning.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/n8n-auto-setup.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/apply-openclaw-security-fixes.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/send-to-cursor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/install-full-bridge.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/sub-agent-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/codex-connector.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory_recall.js
/Users/caijunchang/openclaw任務面版設計/scripts/archived/task-gen-internal.sh.bak-batchA-20260214-150824
/Users/caijunchang/openclaw任務面版設計/scripts/archived/get-cursor-chat-coordinates.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-finance.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-cursor-rescue.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory-vacuum.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-oc-nli.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/ask-cursor-cli.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-rescue-autofix.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-rescue.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-auto-update.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-referral.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/nightly-memory-sync.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-logger.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-key-factory.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test_decision_tree.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/agent-bus.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/install-openclaw-migration.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/neuxa-lite-v1.bin
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-n8n-bridge.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test_model_switch_with_retry.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/n8n-full-auto-v2.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/moltbook-broadcast.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-auto-summarizer.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/install-990.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/taskboard-listener.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/task-gen-external.sh.bak.20260214-093114
/Users/caijunchang/openclaw任務面版設計/scripts/archived/simple-version-compare.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/batch-add-xiaocai-ideas.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-manager.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-auto-compact.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/cursor-automation.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/setup-xiaocai-ideas.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/daily-gemini-tasks.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/dashboard-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/task-gen-external.sh.bak-batchA-20260214-150824
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test_decision_tree_v2.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/atomic-write.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/weekly-memory-checkpoint.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/use-gemini-flash.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory-record-ctl.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/openclaw-browser-openclaw-recover.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/agent-monitor-local.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/test-smart-recall-performance.py
/Users/caijunchang/openclaw任務面版設計/scripts/archived/context-audit.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/memory-vacuum.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/use-kimi.sh
/Users/caijunchang/openclaw任務面版設計/scripts/archived/cursor-connector.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-v2.sh
/Users/caijunchang/openclaw任務面版設計/scripts/log-sanitizer.sh
/Users/caijunchang/openclaw任務面版設計/scripts/README-UNIVERSAL-MEMORY.md
/Users/caijunchang/openclaw任務面版設計/scripts/model-cost-tracker.sh
/Users/caijunchang/openclaw任務面版設計/scripts/agent_decision_loop.sh
/Users/caijunchang/openclaw任務面版設計/scripts/telegram-panel.sh
/Users/caijunchang/openclaw任務面版設計/scripts/wrap-subagent-prompt.py
/Users/caijunchang/openclaw任務面版設計/scripts/collect-metrics.sh
/Users/caijunchang/openclaw任務面版設計/scripts/auto-skill-省錢模式.sh
/Users/caijunchang/openclaw任務面版設計/scripts/switch-model.sh
/Users/caijunchang/openclaw任務面版設計/scripts/free-ports.sh
/Users/caijunchang/openclaw任務面版設計/scripts/xiaocai-monitor.sh
/Users/caijunchang/openclaw任務面版設計/scripts/worktree-aggregator.sh
/Users/caijunchang/openclaw任務面版設計/scripts/submit-review.sh
/Users/caijunchang/openclaw任務面版設計/scripts/README-CONTEXT-TOOLS.md
/Users/caijunchang/openclaw任務面版設計/scripts/sync-boss-decisions.sh
/Users/caijunchang/openclaw任務面版設計/scripts/setup-openclaw-n8n-bridge.sh
/Users/caijunchang/openclaw任務面版設計/openclaw-不是正式.jsx
/Users/caijunchang/openclaw任務面版設計/health-report-google.com-20260227-053842.json
/Users/caijunchang/openclaw任務面版設計/ollama_bot2_launchd.log
/Users/caijunchang/openclaw任務面版設計/components.json
/Users/caijunchang/openclaw任務面版設計/tsconfig.json
/Users/caijunchang/openclaw任務面版設計/skills
/Users/caijunchang/openclaw任務面版設計/skills/git-commit-gen
/Users/caijunchang/openclaw任務面版設計/skills/git-commit-gen/references
/Users/caijunchang/openclaw任務面版設計/skills/git-commit-gen/scripts
/Users/caijunchang/openclaw任務面版設計/skills/git-commit-gen/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/neuxa-consciousness-sync
/Users/caijunchang/openclaw任務面版設計/skills/neuxa-consciousness-sync/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/WAZUH-DEPLOY.md
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/dashboard
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/configs
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/deploy.sh
/Users/caijunchang/openclaw任務面版設計/skills/guardian-arsenal/SKILL.json
/Users/caijunchang/openclaw任務面版設計/skills/bridge-cell-test.md
/Users/caijunchang/openclaw任務面版設計/skills/tavily-search
/Users/caijunchang/openclaw任務面版設計/skills/tavily-search/README.md
/Users/caijunchang/openclaw任務面版設計/skills/tavily-search/scripts
/Users/caijunchang/openclaw任務面版設計/skills/tavily-search/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/memory
/Users/caijunchang/openclaw任務面版設計/skills/memory/archival_memory.py
/Users/caijunchang/openclaw任務面版設計/skills/memory/memory_manager.py
/Users/caijunchang/openclaw任務面版設計/skills/memory/requirements.txt
/Users/caijunchang/openclaw任務面版設計/skills/memory/core_memory.py
/Users/caijunchang/openclaw任務面版設計/skills/memory/tests
/Users/caijunchang/openclaw任務面版設計/skills/memory/__init__.py
/Users/caijunchang/openclaw任務面版設計/skills/memory/docs
/Users/caijunchang/openclaw任務面版設計/skills/memory/auto_summarize.py
/Users/caijunchang/openclaw任務面版設計/skills/memory/README.md
/Users/caijunchang/openclaw任務面版設計/skills/memory/recall_memory.py
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/CHANGELOG.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/INSTALL.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/README.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/package-lock.json
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/package.json
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/CONTRIBUTING.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/examples
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/README_ZH.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/scripts
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/playwright-scraper-skill/test.sh
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/test
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/config
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/COMPLETION_REPORT.md
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/INSTALL.md
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/README.md
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/package-lock.json
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/package.json
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/examples
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/scripts
/Users/caijunchang/openclaw任務面版設計/skills/file-sync-skill/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/session-logs
/Users/caijunchang/openclaw任務面版設計/skills/session-logs/README.md
/Users/caijunchang/openclaw任務面版設計/skills/session-logs/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/screen-vision
/Users/caijunchang/openclaw任務面版設計/skills/screen-vision/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/screen-vision/README.md
/Users/caijunchang/openclaw任務面版設計/skills/screen-vision/scripts
/Users/caijunchang/openclaw任務面版設計/skills/screen-vision/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise/agents
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise/docs
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise/README.md
/Users/caijunchang/openclaw任務面版設計/skills/council-of-the-wise/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/SKILLS-CHECK-REPORT.md
/Users/caijunchang/openclaw任務面版設計/skills/web-fetch
/Users/caijunchang/openclaw任務面版設計/skills/web-fetch/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn/README.md
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn/data
/Users/caijunchang/openclaw任務面版設計/skills/reflect-learn/skill.json
/Users/caijunchang/openclaw任務面版設計/skills/test-studio-skill.md
/Users/caijunchang/openclaw任務面版設計/skills/healthcheck
/Users/caijunchang/openclaw任務面版設計/skills/healthcheck/README.md
/Users/caijunchang/openclaw任務面版設計/skills/healthcheck/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/clawhub
/Users/caijunchang/openclaw任務面版設計/skills/clawhub/README.md
/Users/caijunchang/openclaw任務面版設計/skills/clawhub/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/neural-memory
/Users/caijunchang/openclaw任務面版設計/skills/neural-memory/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/neural-memory/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/web-monitor
/Users/caijunchang/openclaw任務面版設計/skills/web-monitor/scripts
/Users/caijunchang/openclaw任務面版設計/skills/web-monitor/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/contextguard
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/PRICING.md
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/README.md
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/package-lock.json
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/package.json
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/scripts
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/tsconfig.json
/Users/caijunchang/openclaw任務面版設計/skills/contextguard/src
/Users/caijunchang/openclaw任務面版設計/skills/n8n
/Users/caijunchang/openclaw任務面版設計/skills/n8n/launcher.sh
/Users/caijunchang/openclaw任務面版設計/skills/n8n/webhook-telegram-forwarder.py
/Users/caijunchang/openclaw任務面版設計/skills/n8n/n8n-webhook-server.py
/Users/caijunchang/openclaw任務面版設計/skills/n8n/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/n8n/n8n-cli
/Users/caijunchang/openclaw任務面版設計/skills/n8n/n8n-webhook-receiver
/Users/caijunchang/openclaw任務面版設計/skills/skill-creator
/Users/caijunchang/openclaw任務面版設計/skills/skill-creator/scripts
/Users/caijunchang/openclaw任務面版設計/skills/skill-creator/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/skill-creator/license.txt
/Users/caijunchang/openclaw任務面版設計/skills/github
/Users/caijunchang/openclaw任務面版設計/skills/github/README.md
/Users/caijunchang/openclaw任務面版設計/skills/github/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/test
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/CHANGELOG.md
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/advisories
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/HEARTBEAT.md
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/hooks
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/scripts
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/clawsec-suite/skill.json
/Users/caijunchang/openclaw任務面版設計/skills/password-manager-skill
/Users/caijunchang/openclaw任務面版設計/skills/password-manager-skill/README.md
/Users/caijunchang/openclaw任務面版設計/skills/password-manager-skill/scripts
/Users/caijunchang/openclaw任務面版設計/skills/password-manager-skill/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill/config.json
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill/tests
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill/package.json
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill/scripts
/Users/caijunchang/openclaw任務面版設計/skills/log-analyzer-skill/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/anshumanbh-qmd
/Users/caijunchang/openclaw任務面版設計/skills/anshumanbh-qmd/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/anshumanbh-qmd/README.md
/Users/caijunchang/openclaw任務面版設計/skills/anshumanbh-qmd/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/git-notes-memory
/Users/caijunchang/openclaw任務面版設計/skills/git-notes-memory/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/git-notes-memory/memory.py
/Users/caijunchang/openclaw任務面版設計/skills/git-notes-memory/README.md
/Users/caijunchang/openclaw任務面版設計/skills/git-notes-memory/SKILL.md
/Users/caijunchang/openclaw任務面版設計/skills/triple-memory
/Users/caijunchang/openclaw任務面版設計/skills/triple-memory/_meta.json
/Users/caijunchang/openclaw任務面版設計/skills/triple-memory/references
/Users/caijunchang/openclaw任務面版設計/skills/triple-memory/scripts
/Users/caijunchang/openclaw任務面版設計/skills/triple-memory/SKILL.md
/Users/caijunchang/openclaw任務面版設計/eslint.config.js
/Users/caijunchang/openclaw任務面版設計/auto-task-generator-state.json
/Users/caijunchang/openclaw任務面版設計/openclaw-cursor.jsx
/Users/caijunchang/openclaw任務面版設計/n8n-workflows
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/4-telegram-approve-reject.json
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/5-telegram-status.json
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/README.md
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/1-run-next-schedule.json
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/3-openclaw-result-webhook.json
/Users/caijunchang/openclaw任務面版設計/n8n-workflows/2-run-next-webhook.json
/Users/caijunchang/openclaw任務面版設計/vite.config.ts
/Users/caijunchang/openclaw任務面版設計/vitest.config.ts
/Users/caijunchang/openclaw任務面版設計/postcss.config.js
/Users/caijunchang/openclaw任務面版設計/server.log
/Users/caijunchang/openclaw任務面版設計/backups
/Users/caijunchang/openclaw任務面版設計/backups/cleanup-20260214-143352
/Users/caijunchang/openclaw任務面版設計/backups/cleanup-20260214-143352/LaunchAgents
/Users/caijunchang/openclaw任務面版設計/backups/cleanup-20260214-143352/repo
/Users/caijunchang/openclaw任務面版設計/backups/openclaw-full-20260214-143125.tar.gz.sha256
/Users/caijunchang/openclaw任務面版設計/backups/pre-restore-20260214-120322
/Users/caijunchang/openclaw任務面版設計/backups/pre-restore-20260214-120322/git-status.txt
/Users/caijunchang/openclaw任務面版設計/backups/pre-restore-20260214-120322/git-diff.patch
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/repo.bundle
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/working-tree.diff
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/index.diff
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/untracked.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/working-tree.tar.gz
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/status.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/branch.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/SHA256SUMS.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/HEAD.txt
/Users/caijunchang/openclaw任務面版設計/backups/auto
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172954
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172939
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-173158
/Users/caijunchang/openclaw任務面版設計/backups/openclaw-full-20260214-143125.tar.gz
/Users/caijunchang/openclaw任務面版設計/backups/snapshot-20260214-120224
/Users/caijunchang/openclaw任務面版設計/backups/snapshot-20260214-120224/git-status.txt
/Users/caijunchang/openclaw任務面版設計/backups/snapshot-20260214-120224/git-diff.patch
/Users/caijunchang/openclaw任務面版設計/backups/snapshot-20260214-120224/files
/Users/caijunchang/openclaw任務面版設計/memories
/Users/caijunchang/openclaw任務面版設計/memories/5819565005.yaml
/Users/caijunchang/openclaw任務面版設計/CLAUDE.md
/Users/caijunchang/openclaw任務面版設計/ollama_bot2_launchd.err.log
/Users/caijunchang/openclaw任務面版設計/nohup.out
/Users/caijunchang/openclaw任務面版設計/control_scripts.py
/Users/caijunchang/openclaw任務面版設計/railway.json
/Users/caijunchang/openclaw任務面版設計/ollama_bot2.py
/Users/caijunchang/openclaw任務面版設計/control_scripts.py.bak
/Users/caijunchang/openclaw任務面版設計/src
/Users/caijunchang/openclaw任務面版設計/src/App.tsx
/Users/caijunchang/openclaw任務面版設計/src/main.tsx
/Users/caijunchang/openclaw任務面版設計/src/types
/Users/caijunchang/openclaw任務面版設計/src/types/alert.ts
/Users/caijunchang/openclaw任務面版設計/src/types/project.ts
/Users/caijunchang/openclaw任務面版設計/src/types/openclaw.ts
/Users/caijunchang/openclaw任務面版設計/src/types/systemSchedule.ts
/Users/caijunchang/openclaw任務面版設計/src/types/mdci.ts
/Users/caijunchang/openclaw任務面版設計/src/types/log.ts
/Users/caijunchang/openclaw任務面版設計/src/types/index.ts
/Users/caijunchang/openclaw任務面版設計/src/types/run.ts
/Users/caijunchang/openclaw任務面版設計/src/types/task.ts
/Users/caijunchang/openclaw任務面版設計/src/test
/Users/caijunchang/openclaw任務面版設計/src/test/example.test.ts
/Users/caijunchang/openclaw任務面版設計/src/test/setup.ts
/Users/caijunchang/openclaw任務面版設計/src/config
/Users/caijunchang/openclaw任務面版設計/src/config/coreAuth.ts
/Users/caijunchang/openclaw任務面版設計/src/config/communityLayers.ts
/Users/caijunchang/openclaw任務面版設計/src/config/trustPromotion.ts
/Users/caijunchang/openclaw任務面版設計/src/config/hubCenters.ts
/Users/caijunchang/openclaw任務面版設計/src/App.css
/Users/caijunchang/openclaw任務面版設計/src/index.css
/Users/caijunchang/openclaw任務面版設計/src/components
/Users/caijunchang/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx
/Users/caijunchang/openclaw任務面版設計/src/components/ui
/Users/caijunchang/openclaw任務面版設計/src/components/openclaw
/Users/caijunchang/openclaw任務面版設計/src/components/auth
/Users/caijunchang/openclaw任務面版設計/src/components/starship
/Users/caijunchang/openclaw任務面版設計/src/components/layout
/Users/caijunchang/openclaw任務面版設計/src/components/NavLink.tsx
/Users/caijunchang/openclaw任務面版設計/src/components/common
/Users/caijunchang/openclaw任務面版設計/src/components/federation
/Users/caijunchang/openclaw任務面版設計/src/vite-env.d.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks
/Users/caijunchang/openclaw任務面版設計/src/hooks/useFeatures.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/use-mobile.tsx
/Users/caijunchang/openclaw任務面版設計/src/hooks/useSpeculationRules.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useFederationPostMessageGuard.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useOpenClawBoard.js
/Users/caijunchang/openclaw任務面版設計/src/hooks/useTaskExecution.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/openclawBoardUtils.js
/Users/caijunchang/openclaw任務面版設計/src/hooks/use-toast.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useControlCenter.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/usePerformanceMonitoring.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useDebounce.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useKeyboardShortcuts.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useWebSocket.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useMDCI.ts
/Users/caijunchang/openclaw任務面版設計/src/hooks/useViewTransition.ts
/Users/caijunchang/openclaw任務面版設計/src/lib
/Users/caijunchang/openclaw任務面版設計/src/lib/pollRunStatus.ts
/Users/caijunchang/openclaw任務面版設計/src/lib/utils.ts
/Users/caijunchang/openclaw任務面版設計/src/i18n
/Users/caijunchang/openclaw任務面版設計/src/i18n/LocaleContext.tsx
/Users/caijunchang/openclaw任務面版設計/src/i18n/translations.ts
/Users/caijunchang/openclaw任務面版設計/src/data
/Users/caijunchang/openclaw任務面版設計/src/data/mock.ts
/Users/caijunchang/openclaw任務面版設計/src/data/seedTasks.ts
/Users/caijunchang/openclaw任務面版設計/src/data/runs.ts
/Users/caijunchang/openclaw任務面版設計/src/data/seedRunsAlerts.ts
/Users/caijunchang/openclaw任務面版設計/src/data/stats.ts
/Users/caijunchang/openclaw任務面版設計/src/data/logs.ts
/Users/caijunchang/openclaw任務面版設計/src/data/openclawBoardFallback.ts
/Users/caijunchang/openclaw任務面版設計/src/data/domains.ts
/Users/caijunchang/openclaw任務面版設計/src/data/mdci.ts
/Users/caijunchang/openclaw任務面版設計/src/data/index.ts
/Users/caijunchang/openclaw任務面版設計/src/data/audit.ts
/Users/caijunchang/openclaw任務面版設計/src/data/tasks.ts
/Users/caijunchang/openclaw任務面版設計/src/data/user.ts
/Users/caijunchang/openclaw任務面版設計/src/data/alerts.ts
/Users/caijunchang/openclaw任務面版設計/src/pages
/Users/caijunchang/openclaw任務面版設計/src/pages/Settings.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Projects.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Dashboard.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/ReviewCenter.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Domains.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/starship
/Users/caijunchang/openclaw任務面版設計/src/pages/EngineDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Alerts.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/TaskList.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/CaseStudies.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Logs.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/ProtectionCenter.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/CommunicationDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/ControlCenter.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/AutomationDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/HubCenters.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/CommunityFrame.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/DefenseCenter.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Live2DShowcase.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/InfraDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/TaskBoard.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/LogisticsDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/Runs.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/AIDeck.tsx
/Users/caijunchang/openclaw任務面版設計/src/pages/NotFound.tsx
/Users/caijunchang/openclaw任務面版設計/src/services
/Users/caijunchang/openclaw任務面版設計/src/services/runs.ts
/Users/caijunchang/openclaw任務面版設計/src/services/stats.ts
/Users/caijunchang/openclaw任務面版設計/src/services/reviewService.ts
/Users/caijunchang/openclaw任務面版設計/src/services/logs.ts
/Users/caijunchang/openclaw任務面版設計/src/services/seed.ts
/Users/caijunchang/openclaw任務面版設計/src/services/api.ts
/Users/caijunchang/openclaw任務面版設計/src/services/openclawBoardApi.ts
/Users/caijunchang/openclaw任務面版設計/src/services/features.ts
/Users/caijunchang/openclaw任務面版設計/src/services/aiMemoryStore.js
/Users/caijunchang/openclaw任務面版設計/src/services/federationApi.ts
/Users/caijunchang/openclaw任務面版設計/src/services/apiClient.ts
/Users/caijunchang/openclaw任務面版設計/src/services/index.ts
/Users/caijunchang/openclaw任務面版設計/src/services/config.ts
/Users/caijunchang/openclaw任務面版設計/src/services/audit.ts
/Users/caijunchang/openclaw任務面版設計/src/services/tasks.ts
/Users/caijunchang/openclaw任務面版設計/src/services/user.ts
/Users/caijunchang/openclaw任務面版設計/src/services/alerts.ts
```

## 3. Composition Stats Summary
```text
--- Project Composition Analysis ---
Timestamp: Sun Mar  8 11:05:26 CST 2026

Count of files by extension:
3504 ts
1191 md
 577 js
 440 swift
 268 sh
 264 json
 115 tsx
 111 map
  66 py
  64 prose
  63 kt
  61 png
  54 log
  32 txt
  27 mjs
  25 jsx
  17 svg
  17 css
  13 go
  12 jpg
  10 xml
   9 yaml
   9 html
   8 diff
   8 bak
   7 sql
   6 mdx
   5 yml
   5 toml
   5 gz
   4 plist
   4 ico
   4 bundle
   3 kts
   3 jpeg
   3 bak-batchA-20260214-150824
   2 sample
   2 resolved
   2 properties
   2 patch
   2 moc3
   2 jsonl
   2 example
   2 20260214-093114
   1 xcfilelist
   1 webmanifest
   1 timer
   1 sum
   1 sha256
   1 service
   1 sandbox-browser
   1 sandbox
   1 qr-import
   1 out
   1 mod
   1 lockb
   1 jar
   1 icns
   1 design
   1 command
   1 bin
   1 bat
   1 backup
   1 app/Contents/MacOS/啟動
   1 1/sandbox/Dockerfile

Line counts for source files (Top 20):
 1306054 total
   67776 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/extensionAPI.js
   64421 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/reply-CxO7Jwvy.js
   64418 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/loader-DmZESx6X.js
   24342 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/plugin-sdk/index.js
   17765 /Users/caijunchang/openclaw任務面版設計/openclaw-main/src/canvas-host/a2ui/a2ui.bundle.js
   17765 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/canvas-host/a2ui/a2ui.bundle.js
   17696 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/gateway-cli-CCRjIRWt.js
   17695 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/gateway-cli-Bh3UamKy.js
   14264 /Users/caijunchang/openclaw任務面版設計/openclaw-main/vendor/a2ui/renderers/angular/package-lock.json
   13188 /Users/caijunchang/openclaw任務面版設計/package-lock.json
    8860 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/plugin-sdk/index.d.ts
    8488 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/pi-embedded-helpers-82mBvhjD.js
    7595 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/control-ui/assets/index-DtybWK8_.js
    6214 /Users/caijunchang/openclaw任務面版設計/backups/snapshot-20260214-120224/files/server-src-index.ts
    5934 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/index.js
    5751 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/config-guard-D2tKd3wv.js
    5658 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/config-Buxm57-R.js
    5432 /Users/caijunchang/openclaw任務面版設計/openclaw-main/ui/src/ui/views/usage.ts
    4918 /Users/caijunchang/openclaw任務面版設計/openclaw-main/dist/config-CMxF7aVK.js
```
