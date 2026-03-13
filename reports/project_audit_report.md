# OpenClaw Project Audit Report
Generated on: Sun Mar  8 11:05:25 CST 2026
Target: /Users/sky770825/openclaw任務面版設計

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
/Users/sky770825/openclaw任務面版設計
/Users/sky770825/openclaw任務面版設計/monitoring_engine.py
/Users/sky770825/openclaw任務面版設計/rag_update.err.log
/Users/sky770825/openclaw任務面版設計/auto-executor-state.json
/Users/sky770825/openclaw任務面版設計/runtime-checkpoints
/Users/sky770825/openclaw任務面版設計/runtime-checkpoints/task-index
/Users/sky770825/openclaw任務面版設計/runtime-checkpoints/task-index/TASK-INDEX.md
/Users/sky770825/openclaw任務面版設計/runtime-checkpoints/task-index/task-index.jsonl
/Users/sky770825/openclaw任務面版設計/ollama_monitor_bot.py
/Users/sky770825/openclaw任務面版設計/tsconfig.node.json
/Users/sky770825/openclaw任務面版設計/beauty-industry-website
/Users/sky770825/openclaw任務面版設計/beauty-industry-website/package.json
/Users/sky770825/openclaw任務面版設計/beauty-industry-website/tsconfig.json
/Users/sky770825/openclaw任務面版設計/beauty-industry-website/src
/Users/sky770825/openclaw任務面版設計/beauty-industry-website/src/index.ts
/Users/sky770825/openclaw任務面版設計/subagents
/Users/sky770825/openclaw任務面版設計/subagents/runs.json.design
/Users/sky770825/openclaw任務面版設計/index.html
/Users/sky770825/openclaw任務面版設計/RESULT.md
/Users/sky770825/openclaw任務面版設計/ollama_client.py
/Users/sky770825/openclaw任務面版設計/PROPOSAL-REPORT.md
/Users/sky770825/openclaw任務面版設計/tsconfig.app.json
/Users/sky770825/openclaw任務面版設計/monitoring_engine.py.bak
/Users/sky770825/openclaw任務面版設計/bun.lockb
/Users/sky770825/openclaw任務面版設計/armory
/Users/sky770825/openclaw任務面版設計/armory/proxy-web-fetch
/Users/sky770825/openclaw任務面版設計/armory/proxy-web-fetch/README.md
/Users/sky770825/openclaw任務面版設計/armory/proxy-web-fetch/fetch.sh
/Users/sky770825/openclaw任務面版設計/armory/proxy-web-fetch/SKILL.md
/Users/sky770825/openclaw任務面版設計/armory/send-tg-notify.sh
/Users/sky770825/openclaw任務面版設計/armory/universal-data-connector
/Users/sky770825/openclaw任務面版設計/armory/universal-data-connector/README.md
/Users/sky770825/openclaw任務面版設計/armory/universal-data-connector/db.sh
/Users/sky770825/openclaw任務面版設計/armory/universal-data-connector/SKILL.md
/Users/sky770825/openclaw任務面版設計/armory/universal-data-connector/modules
/Users/sky770825/openclaw任務面版設計/armory/README.md
/Users/sky770825/openclaw任務面版設計/armory/skills
/Users/sky770825/openclaw任務面版設計/armory/skills/README.md
/Users/sky770825/openclaw任務面版設計/armory/skills/health-check.sh
/Users/sky770825/openclaw任務面版設計/armory/security-scanner
/Users/sky770825/openclaw任務面版設計/armory/security-scanner/scan.sh
/Users/sky770825/openclaw任務面版設計/armory/security-scanner/README.md
/Users/sky770825/openclaw任務面版設計/armory/security-scanner/SKILL.md
/Users/sky770825/openclaw任務面版設計/armory/data-inspector
/Users/sky770825/openclaw任務面版設計/armory/data-inspector/inspect.sh
/Users/sky770825/openclaw任務面版設計/armory/data-inspector/inspector.py
/Users/sky770825/openclaw任務面版設計/armory/data-inspector/README.md
/Users/sky770825/openclaw任務面版設計/armory/data-inspector/SKILL.md
/Users/sky770825/openclaw任務面版設計/openclaw-v4.jsx
/Users/sky770825/openclaw任務面版設計/openclaw-main
/Users/sky770825/openclaw任務面版設計/openclaw-main/README-header.png
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-lock.yaml
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/index.html
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/vitest.node.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/public
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/package.json
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/vite.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/vitest.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src
/Users/sky770825/openclaw任務面版設計/openclaw-main/render.yaml
/Users/sky770825/openclaw任務面版設計/openclaw-main/docker-setup.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/git-hooks
/Users/sky770825/openclaw任務面版設計/openclaw-main/git-hooks/pre-commit
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.e2e.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/LICENSE
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.extensions.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/mocks
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/inbound-contract.providers.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/auto-reply.retry.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/test-env.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/setup.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/global-setup.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/provider-timeout.e2e.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/fixtures
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/gateway.multi.e2e.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/media-understanding.auto.e2e.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/test/helpers
/Users/sky770825/openclaw任務面版設計/openclaw-main/CHANGELOG.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/Dockerfile
/Users/sky770825/openclaw任務面版設計/openclaw-main/patches
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/LICENSE
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/CHANGELOG.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/Tests
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/docs
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/README.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/Package.resolved
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/scripts
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/Package.swift
/Users/sky770825/openclaw任務面版設計/openclaw-main/Swabble/Sources
/Users/sky770825/openclaw任務面版設計/openclaw-main/Dockerfile.sandbox-browser
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.gateway.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs.acp.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.live.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/date-time.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/plugin.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/tui.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/environment.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/platforms
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/network.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/tools
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/install
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/broadcast-groups.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/prose.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/docs.json
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/vps.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/security
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/nodes
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/CNAME
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/images
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/bedrock.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/plugins
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/web
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/experiments
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/providers
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/start
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/scripts.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/cli
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/testing.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/zh-CN
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/pi-dev.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/index.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/logging.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/token-use.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/hooks
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/concepts
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/style.css
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/diagnostics
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/hooks.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/automation
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/tts.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/perplexity.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/pi.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/debugging.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/brave-search.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/assets
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/whatsapp-openclaw.jpg
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/multi-agent-sandbox-tools.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/reference
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/help
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/免費與便宜模型-openclaw.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/refactor
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/gateway
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/debug
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/whatsapp-openclaw-ai-zh.jpg
/Users/sky770825/openclaw任務面版設計/openclaw-main/docs/channels
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/memory-lancedb
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/zalouser
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/zalo
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/tlon
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/discord
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/open-prose
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/qwen-portal-auth
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/feishu
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/lobster
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/nextcloud-talk
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/msteams
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/llm-task
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/bluebubbles
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/google-gemini-cli-auth
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/diagnostics-otel
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/line
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/telegram
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/minimax-portal-auth
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/googlechat
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/slack
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/mattermost
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/imessage
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/twitch
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/copilot-proxy
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/google-antigravity-auth
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/matrix
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/signal
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/whatsapp
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/nostr
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/memory-core
/Users/sky770825/openclaw任務面版設計/openclaw-main/extensions/voice-call
/Users/sky770825/openclaw任務面版設計/openclaw-main/README.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/Dockerfile.sandbox
/Users/sky770825/openclaw任務面版設計/openclaw-main/zizmor.yml
/Users/sky770825/openclaw任務面版設計/openclaw-main/openclaw.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/fly.private.toml
/Users/sky770825/openclaw任務面版設計/openclaw-main/package.json
/Users/sky770825/openclaw任務面版設計/openclaw-main/CONTRIBUTING.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-cleanup-docker.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/watch-node.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-parallel.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-shell-completion.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/bench-model.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/termux-quick-auth.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-live-models-docker.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/ui.js
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/codesign-mac-app.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/docker
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/release-check.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/zai-fallback-repro.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/create-dmg.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/copy-hook-metadata.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/changelog-to-html.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/write-cli-compat.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sandbox-setup.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/check-ts-max-loc.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/systemd
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-install-sh-docker.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/protocol-gen.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sqlite-vec-smoke.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sync-labels.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sync-plugin-versions.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/run-node.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/update-clawtributors.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/package-mac-app.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/clawlog.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/docs-i18n
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/termux-sync-widget.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/mobile-reauth.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sandbox-browser-entrypoint.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/firecrawl-compare.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/debug-claude-usage.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/update-clawtributors.types.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/ios-team-id.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-live-gateway-models-docker.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/build-docs-list.mjs
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/termux-auth-widget.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/committer
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/repro
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/build_icon.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/notarize-mac-artifact.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sandbox-browser-setup.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/auth-monitor.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/write-build-info.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/claude-auth-status.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/docs-list.js
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/clawtributors-map.json
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/bundle-a2ui.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sync-moonshot-docs.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/setup-auth-system.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/restart-mac.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/canvas-a2ui-copy.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/build-and-run-mac.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-force.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/e2e
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/readability-basic-compare.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/pre-commit
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/sandbox-common-setup.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/package-mac-dist.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/make_appcast.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/test-install-sh-e2e-docker.sh
/Users/sky770825/openclaw任務面版設計/openclaw-main/scripts/protocol-gen-swift.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/packages
/Users/sky770825/openclaw任務面版設計/openclaw-main/packages/clawdbot
/Users/sky770825/openclaw任務面版設計/openclaw-main/packages/moltbot
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.unit.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/appcast.xml
/Users/sky770825/openclaw任務面版設計/openclaw-main/fly.toml
/Users/sky770825/openclaw任務面版設計/openclaw-main/tsconfig.json
/Users/sky770825/openclaw任務面版設計/openclaw-main/docker-compose.yml
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/nano-pdf
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/himalaya
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/bear-notes
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/peekaboo
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/model-usage
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/blogwatcher
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/discord
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/coding-agent
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/openhue
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/gemini
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/gifgrep
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/session-logs
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/ordercli
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/openai-whisper
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/spotify-player
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/healthcheck
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/oracle
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/summarize
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/clawhub
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/bluebubbles
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/sherpa-onnx-tts
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/video-frames
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/eightctl
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/gog
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/canvas
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/notion
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/goplaces
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/apple-reminders
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/imsg
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/skill-creator
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/camsnap
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/github
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/bird
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/food-order
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/things-mac
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/blucli
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/sonoscli
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/mcporter
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/tmux
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/openai-image-gen
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/sag
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/slack
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/weather
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/obsidian
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/trello
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/wacli
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/songsee
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/apple-notes
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/openai-whisper-api
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/local-places
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/nano-banana-pro
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/1password
/Users/sky770825/openclaw任務面版設計/openclaw-main/skills/voice-call
/Users/sky770825/openclaw任務面版設計/openclaw-main/tsdown.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/AGENTS.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/vitest.config.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/assets
/Users/sky770825/openclaw任務面版設計/openclaw-main/assets/chrome-extension
/Users/sky770825/openclaw任務面版設計/openclaw-main/assets/dmg-background.png
/Users/sky770825/openclaw任務面版設計/openclaw-main/assets/dmg-background-small.png
/Users/sky770825/openclaw任務面版設計/openclaw-main/assets/avatar-placeholder.svg
/Users/sky770825/openclaw任務面版設計/openclaw-main/apps
/Users/sky770825/openclaw任務面版設計/openclaw-main/apps/macos
/Users/sky770825/openclaw任務面版設計/openclaw-main/apps/shared
/Users/sky770825/openclaw任務面版設計/openclaw-main/apps/ios
/Users/sky770825/openclaw任務面版設計/openclaw-main/apps/android
/Users/sky770825/openclaw任務面版設計/openclaw-main/CLAUDE.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/vendor
/Users/sky770825/openclaw任務面版設計/openclaw-main/vendor/a2ui
/Users/sky770825/openclaw任務面版設計/openclaw-main/SECURITY.md
/Users/sky770825/openclaw任務面版設計/openclaw-main/pnpm-workspace.yaml
/Users/sky770825/openclaw任務面版設計/openclaw-main/src
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/pairing
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/test-utils
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/utils.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/infra
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/compat
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/types
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/macos
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/discord
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/memory
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/index.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/polls.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/config
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/security
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/tui
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/plugins
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/web
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/markdown
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/node-host
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/providers
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/entry.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/media-understanding
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/wizard
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/utils.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/terminal
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/link-understanding
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/agents
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/plugin-sdk
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/utils
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/shared
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/docs
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/cli
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/docker-setup.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/runtime.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/logger.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/browser
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/version.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/extensionAPI.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/sessions
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/daemon
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/line
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/hooks
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/globals.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/telegram
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/tts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/scripts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/canvas-host
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/test-helpers
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/slack
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/commands
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/imessage
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/index.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/globals.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/routing
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/channel-web.barrel.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/version.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/acp
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/signal
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/logging
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/auto-reply
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/channel-web.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/whatsapp
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/logging.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/polls.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/logger.test.ts
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/gateway
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/cron
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/process
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/channels
/Users/sky770825/openclaw任務面版設計/openclaw-main/src/media
/Users/sky770825/openclaw任務面版設計/deploy
/Users/sky770825/openclaw任務面版設計/deploy/security
/Users/sky770825/openclaw任務面版設計/deploy/security/Caddyfile.example
/Users/sky770825/openclaw任務面版設計/deploy/security/README.md
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/PROJECT_990_AEGIS_SCANNER_PROTOTYPE_v0.1.md
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/malicious_skill
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/malicious_skill/malicious_skill.py
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/skills_to_scan
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/skills_to_scan/malicious-skill-sample
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/sandbox
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/sandbox/Dockerfile
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/docker-compose.yml
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/repo_mapper.py
/Users/sky770825/openclaw任務面版設計/aegis-scanner-v0.1/aegis_scanner.py
/Users/sky770825/openclaw任務面版設計/projects
/Users/sky770825/openclaw任務面版設計/projects/batcha-test
/Users/sky770825/openclaw任務面版設計/projects/batcha-test/docs
/Users/sky770825/openclaw任務面版設計/projects/batcha-test/README.md
/Users/sky770825/openclaw任務面版設計/projects/batcha-test/modules
/Users/sky770825/openclaw任務面版設計/projects/batcha-test/runs
/Users/sky770825/openclaw任務面版設計/projects/openclaw
/Users/sky770825/openclaw任務面版設計/projects/openclaw/docs
/Users/sky770825/openclaw任務面版設計/projects/openclaw/README.md
/Users/sky770825/openclaw任務面版設計/projects/openclaw/modules
/Users/sky770825/openclaw任務面版設計/projects/openclaw/runs
/Users/sky770825/openclaw任務面版設計/projects/business-poc
/Users/sky770825/openclaw任務面版設計/projects/business-poc/docs
/Users/sky770825/openclaw任務面版設計/projects/business-poc/README.md
/Users/sky770825/openclaw任務面版設計/projects/business-poc/modules
/Users/sky770825/openclaw任務面版設計/projects/real-estate-sentry-plan.md
/Users/sky770825/openclaw任務面版設計/ollama_bot2.env.example
/Users/sky770825/openclaw任務面版設計/ollama任務版.jsx
/Users/sky770825/openclaw任務面版設計/server
/Users/sky770825/openclaw任務面版設計/server/autopilot-state.json
/Users/sky770825/openclaw任務面版設計/server/nixpacks.toml
/Users/sky770825/openclaw任務面版設計/server/migrations
/Users/sky770825/openclaw任務面版設計/server/migrations/20260227_firewall_logs.sql
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018743379-i1gg-1771018806964.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014843484-0k5n-1771014906804.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009867798-1771012206681.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038758437-1771038761026.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771039213585-1771039215427.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016343399-e1zx-1771016406859.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014543488-mmae-1771014606768.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038776890-1771038778932.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038811107-1771038813513.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038786264-1771038788353.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016943367-wvey-1771017007074.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009863891-1771012566725.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032512025-1771032887467.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009867166-1771012266689.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018143389-rq2j-1771018207200.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015743401-u533-1771015837286.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016643535-nfb0-1771016706779.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510223-1771033186609.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019343553-rx2q-1771019407036.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020618716-5uhd-1771020629811.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017543421-23j4-1771017606968.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003719025-1771021559714.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771012743271-idig-1771012806651.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013943314-ck7t-1771014006961.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013643277-ajw1-1771013707272.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031293531-1771031765456.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020941711-ph5v-1771021350202.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771032235540-j1a8-1771032245252.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032511680-1771032946750.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031302298-1771031315312.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003717602-1771021619776.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017243606-ue5c-1771017306864.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026630727-1771032005319.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020943479-3lze-1771020959880.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019043597-iekj-1771019106966.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020942416-syf3-1771021199834.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015443449-to0r-1771015506977.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771016043264-d9bh-1771016106946.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019643357-s3c8-1771019707178.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026630297-1771032065318.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771018443957-rauk-1771018507132.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009869054-1771012086621.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009869649-1771012027068.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013343326-vlah-1771013406591.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771015143440-75ct-1771015206791.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771017843885-ed42-1771017906980.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1770985229607-1771021499714.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771003673047-1771021679608.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t-codex-triage-1771038806251-1771038808042.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771014243350-3qjs-1771014306877.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510654-1771033126570.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771013043509-d0au-1771013106685.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009865908-1771012386510.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771026631093-1771031945909.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009864549-1771012506615.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009866541-1771012326913.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009868431-1771012146571.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771009865218-1771012446813.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771032510995-1771033066707.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771032234456-mwpi-1771032335294.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/telegram-control.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771020487601-y438-1771020749851.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-task-auto-1771019943355-hg3j-1771020076597.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031582482-1771031645336.json
/Users/sky770825/openclaw任務面版設計/server/runtime-checkpoints/ckpt-t1771031121884-1771031255221.json
/Users/sky770825/openclaw任務面版設計/server/Dockerfile
/Users/sky770825/openclaw任務面版設計/server/projects
/Users/sky770825/openclaw任務面版設計/server/projects/batcha-test
/Users/sky770825/openclaw任務面版設計/server/tests
/Users/sky770825/openclaw任務面版設計/server/tests/api-contract.test.ts
/Users/sky770825/openclaw任務面版設計/server/utils
/Users/sky770825/openclaw任務面版設計/server/utils/telegram.js
/Users/sky770825/openclaw任務面版設計/server/utils/telegram.ts
/Users/sky770825/openclaw任務面版設計/server/README.md
/Users/sky770825/openclaw任務面版設計/server/package-lock.json
/Users/sky770825/openclaw任務面版設計/server/package.json
/Users/sky770825/openclaw任務面版設計/server/scripts
/Users/sky770825/openclaw任務面版設計/server/scripts/batch-index-v2.sh
/Users/sky770825/openclaw任務面版設計/server/scripts/run-batch-index.sh
/Users/sky770825/openclaw任務面版設計/server/scripts/batch-index-oneshot.sh
/Users/sky770825/openclaw任務面版設計/server/scripts/batch-index.py
/Users/sky770825/openclaw任務面版設計/server/scripts/batch-index-lite.mjs
/Users/sky770825/openclaw任務面版設計/server/scripts/start-server-with-path.sh
/Users/sky770825/openclaw任務面版設計/server/scripts/index-one-file.mjs
/Users/sky770825/openclaw任務面版設計/server/tsconfig.json
/Users/sky770825/openclaw任務面版設計/server/auto-task-generator-state.json
/Users/sky770825/openclaw任務面版設計/server/vitest.config.ts
/Users/sky770825/openclaw任務面版設計/server/RAILWAY_DEPLOY.md
/Users/sky770825/openclaw任務面版設計/server/data
/Users/sky770825/openclaw任務面版設計/server/data/insights.json
/Users/sky770825/openclaw任務面版設計/server/data/task-runs.json
/Users/sky770825/openclaw任務面版設計/server/server.log
/Users/sky770825/openclaw任務面版設計/server/railway.json
/Users/sky770825/openclaw任務面版設計/server/src
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak
/Users/sky770825/openclaw任務面版設計/server/src/riskClassifier.ts
/Users/sky770825/openclaw任務面版設計/server/src/types
/Users/sky770825/openclaw任務面版設計/server/src/openclawMapper.ts
/Users/sky770825/openclaw任務面版設計/server/src/executor-agents.ts
/Users/sky770825/openclaw任務面版設計/server/src/executor-agents.ts.bak
/Users/sky770825/openclaw任務面版設計/server/src/error-handler.ts
/Users/sky770825/openclaw任務面版設計/server/src/anti-stuck.ts
/Users/sky770825/openclaw任務面版設計/server/src/features
/Users/sky770825/openclaw任務面版設計/server/src/governanceEngine.ts
/Users/sky770825/openclaw任務面版設計/server/src/middlewares
/Users/sky770825/openclaw任務面版設計/server/src/seed.ts
/Users/sky770825/openclaw任務面版設計/server/src/taskCompliance.ts
/Users/sky770825/openclaw任務面版設計/server/src/utils
/Users/sky770825/openclaw任務面版設計/server/src/models
/Users/sky770825/openclaw任務面版設計/server/src/governanceEngine.ts.bak
/Users/sky770825/openclaw任務面版設計/server/src/openclawSupabase.ts
/Users/sky770825/openclaw任務面版設計/server/src/types.ts
/Users/sky770825/openclaw任務面版設計/server/src/logger.ts
/Users/sky770825/openclaw任務面版設計/server/src/features.ts
/Users/sky770825/openclaw任務面版設計/server/src/preload-dotenv.ts
/Users/sky770825/openclaw任務面版設計/server/src/domains.ts
/Users/sky770825/openclaw任務面版設計/server/src/telegram
/Users/sky770825/openclaw任務面版設計/server/src/emergency-stop.ts
/Users/sky770825/openclaw任務面版設計/server/src/n8nClient.ts
/Users/sky770825/openclaw任務面版設計/server/src/index.ts
/Users/sky770825/openclaw任務面版設計/server/src/supabase.ts
/Users/sky770825/openclaw任務面版設計/server/src/promptGuard.ts
/Users/sky770825/openclaw任務面版設計/server/src/modules
/Users/sky770825/openclaw任務面版設計/server/src/controllers
/Users/sky770825/openclaw任務面版設計/server/src/workflow-engine.ts
/Users/sky770825/openclaw任務面版設計/server/src/routes
/Users/sky770825/openclaw任務面版設計/server/src/services
/Users/sky770825/openclaw任務面版設計/server/src/validation
/Users/sky770825/openclaw任務面版設計/server/src/store.ts
/Users/sky770825/openclaw任務面版設計/backend
/Users/sky770825/openclaw任務面版設計/backend/src
/Users/sky770825/openclaw任務面版設計/backend/src/main.ts
/Users/sky770825/openclaw任務面版設計/backend/src/product
/Users/sky770825/openclaw任務面版設計/backend/src/app.module.ts
/Users/sky770825/openclaw任務面版設計/cookbook
/Users/sky770825/openclaw任務面版設計/cookbook/42-作品集與提案簡報.md
/Users/sky770825/openclaw任務面版設計/cookbook/65-Dashboard儀表板設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/51-AI內容生成與SEO文案.md
/Users/sky770825/openclaw任務面版設計/cookbook/25-SEO基礎與上線檢查表.md
/Users/sky770825/openclaw任務面版設計/cookbook/04-自動化執行.md
/Users/sky770825/openclaw任務面版設計/cookbook/69-Manus-AI設計理念與實踐.md
/Users/sky770825/openclaw任務面版設計/cookbook/27-圖片素材優化指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/60-排隊叫號系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/26-響應式設計與跨瀏覽器測試.md
/Users/sky770825/openclaw任務面版設計/cookbook/16-雙手能力邊界.md
/Users/sky770825/openclaw任務面版設計/cookbook/45-電商網站完整指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/59-訂位點餐系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/22-LINE-OA設定指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/23-n8n-Workflow模板.md
/Users/sky770825/openclaw任務面版設計/cookbook/63-ERP進銷存系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/54-廣告投放與數據追蹤.md
/Users/sky770825/openclaw任務面版設計/cookbook/64-CRM客戶管理系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/19-達爾協作指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/10-會話與權限.md
/Users/sky770825/openclaw任務面版設計/cookbook/58-POS收銀系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/08-協作與通訊.md
/Users/sky770825/openclaw任務面版設計/cookbook/18-連續行動與自主判斷.md
/Users/sky770825/openclaw任務面版設計/cookbook/55-自動化行銷漏斗.md
/Users/sky770825/openclaw任務面版設計/cookbook/版本歸總-v2.5.x.md
/Users/sky770825/openclaw任務面版設計/cookbook/37-多語系i18n網站.md
/Users/sky770825/openclaw任務面版設計/cookbook/03-資安與防護.md
/Users/sky770825/openclaw任務面版設計/cookbook/62-餐飲管理系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/46-網站效能優化.md
/Users/sky770825/openclaw任務面版設計/cookbook/24-通訊平台串接指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/41-客戶溝通與需求訪談.md
/Users/sky770825/openclaw任務面版設計/cookbook/11-任務狀態機.md
/Users/sky770825/openclaw任務面版設計/cookbook/61-外送外帶平台設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/README.md
/Users/sky770825/openclaw任務面版設計/cookbook/52-AI圖片生成與處理.md
/Users/sky770825/openclaw任務面版設計/cookbook/05-前端架構.md
/Users/sky770825/openclaw任務面版設計/cookbook/33-DNS網域與SSL設定.md
/Users/sky770825/openclaw任務面版設計/cookbook/47-WordPress深度指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/44-客戶FAQ大全.md
/Users/sky770825/openclaw任務面版設計/cookbook/56-排程自動化與Cron任務.md
/Users/sky770825/openclaw任務面版設計/cookbook/34-GA與Search-Console設定.md
/Users/sky770825/openclaw任務面版設計/cookbook/14-路徑與檔案系統.md
/Users/sky770825/openclaw任務面版設計/cookbook/06-除錯與救援.md
/Users/sky770825/openclaw任務面版設計/cookbook/07-網站與部署.md
/Users/sky770825/openclaw任務面版設計/cookbook/71-Lovable-AI美學生成設計理念.md
/Users/sky770825/openclaw任務面版設計/cookbook/12-匯報與溝通協議.md
/Users/sky770825/openclaw任務面版設計/cookbook/15-驗收對治法.md
/Users/sky770825/openclaw任務面版設計/cookbook/43-專案管理與時程控制.md
/Users/sky770825/openclaw任務面版設計/cookbook/48-Landing-Page高轉換設計.md
/Users/sky770825/openclaw任務面版設計/cookbook/30-會員系統與金流串接.md
/Users/sky770825/openclaw任務面版設計/cookbook/38-網站安全加固.md
/Users/sky770825/openclaw任務面版設計/cookbook/02-資料庫.md
/Users/sky770825/openclaw任務面版設計/cookbook/13-編碼品質.md
/Users/sky770825/openclaw任務面版設計/cookbook/28-網站交付與客戶教學.md
/Users/sky770825/openclaw任務面版設計/cookbook/01-API-端點.md
/Users/sky770825/openclaw任務面版設計/cookbook/17-ask_ai協作指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/32-報價模板與合約範本.md
/Users/sky770825/openclaw任務面版設計/cookbook/35-表單設計與驗證.md
/Users/sky770825/openclaw任務面版設計/cookbook/49-網站備份與災難復原.md
/Users/sky770825/openclaw任務面版設計/cookbook/70-Ready-AI即時應用生成設計理念.md
/Users/sky770825/openclaw任務面版設計/cookbook/50-AI客服聊天機器人.md
/Users/sky770825/openclaw任務面版設計/cookbook/68-預約排班系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/53-社群引流與自動化行銷.md
/Users/sky770825/openclaw任務面版設計/cookbook/66-通知推播系統設計指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/21-接案SOP.md
/Users/sky770825/openclaw任務面版設計/cookbook/36-Email系統串接.md
/Users/sky770825/openclaw任務面版設計/cookbook/20-自救SOP.md
/Users/sky770825/openclaw任務面版設計/cookbook/09-高階代碼模板.md
/Users/sky770825/openclaw任務面版設計/cookbook/31-設計稿轉代碼指南.md
/Users/sky770825/openclaw任務面版設計/cookbook/57-Webhook架構與事件驅動.md
/Users/sky770825/openclaw任務面版設計/cookbook/39-資料庫選型與設計.md
/Users/sky770825/openclaw任務面版設計/cookbook/29-CMS選型與快速建站.md
/Users/sky770825/openclaw任務面版設計/cookbook/40-第三方API串接大全.md
/Users/sky770825/openclaw任務面版設計/cookbook/67-LINE-Bot開發指南.md
/Users/sky770825/openclaw任務面版設計/docs
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw為什麼終端一直在跑.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram與OpenClaw-穩定性建議.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-與任務板-是否一直執行.md
/Users/sky770825/openclaw任務面版設計/docs/Token優化-更新紀錄.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw為什麼還是19K-Token-與已修正方式.md
/Users/sky770825/openclaw任務面版設計/docs/新開視窗時-流程說明.md
/Users/sky770825/openclaw任務面版設計/docs/EMERGENCY-MECHANISM.md
/Users/sky770825/openclaw任務面版設計/docs/任務執行中斷與沒有回應-排查說明.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw必學技能-檢查結果.md
/Users/sky770825/openclaw任務面版設計/docs/Ollama接另一個bot-說明.md
/Users/sky770825/openclaw任務面版設計/docs/同視窗上下文過長-處理方式.md
/Users/sky770825/openclaw任務面版設計/docs/檢測Token與用Notion本機檢索降低輸入.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-模型測試報告-2026-02-12.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-瀏覽器自動化安全指令.md
/Users/sky770825/openclaw任務面版設計/docs/LINE-BOT-SETUP.md
/Users/sky770825/openclaw任務面版設計/docs/bot沒回應-檢查.md
/Users/sky770825/openclaw任務面版設計/docs/analysis
/Users/sky770825/openclaw任務面版設計/docs/analysis/auto-executor-trigger-investigation.md
/Users/sky770825/openclaw任務面版設計/docs/analysis/auto-executor-ts-workflow.md
/Users/sky770825/openclaw任務面版設計/docs/analysis/index-ts-architecture.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-INTEGRATION.md
/Users/sky770825/openclaw任務面版設計/docs/記憶與對話-一般聊天輕量模式設計.md
/Users/sky770825/openclaw任務面版設計/docs/SECURITY-RULES.md
/Users/sky770825/openclaw任務面版設計/docs/保護措施與設定整理-2026-02-12.md
/Users/sky770825/openclaw任務面版設計/docs/QMD記憶索引-連線與檢查.md
/Users/sky770825/openclaw任務面版設計/docs/MCP-PLAYBOOK.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCODE-AGENT-DASHBOARD.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-CONFIG-CHECK.md
/Users/sky770825/openclaw任務面版設計/docs/每次溝通Token控制在4K或更少.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-模型變更-僅Kimi與Ollama.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-MODELS-REFERENCE.md
/Users/sky770825/openclaw任務面版設計/docs/openclaw-taskboard-skill
/Users/sky770825/openclaw任務面版設計/docs/openclaw-taskboard-skill/references
/Users/sky770825/openclaw任務面版設計/docs/openclaw-taskboard-skill/AGENTS-SNIPPET.md
/Users/sky770825/openclaw任務面版設計/docs/openclaw-taskboard-skill/README.md
/Users/sky770825/openclaw任務面版設計/docs/openclaw-taskboard-skill/SKILL.md
/Users/sky770825/openclaw任務面版設計/docs/API-CONNECTION.md
/Users/sky770825/openclaw任務面版設計/docs/supabase-openclaw-migration.sql
/Users/sky770825/openclaw任務面版設計/docs/SCRIPTS-BUTTONS-AUDIT.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-還原檔與備份位置.md
/Users/sky770825/openclaw任務面版設計/docs/Ollama-Telegram回覆速度-實測與優化.md
/Users/sky770825/openclaw任務面版設計/docs/AUTH-SETUP.md
/Users/sky770825/openclaw任務面版設計/docs/drink-ordering-api-v1.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-CONCEPT.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-Telegram與模型傳輸-深度檢查-2026-02-12.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-ACTION-MAP.md
/Users/sky770825/openclaw任務面版設計/docs/INCIDENT-2026-02-14-telegram-no-response.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-成本優化配置-Gemini主力.md
/Users/sky770825/openclaw任務面版設計/docs/資料來源說明.md
/Users/sky770825/openclaw任務面版設計/docs/QUICK-START.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw透過CLI執行-問題時轉給Cursor解決.md
/Users/sky770825/openclaw任務面版設計/docs/用QMD記憶減少每次溝通的Token.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram與點擊延遲排查.md
/Users/sky770825/openclaw任務面版設計/docs/執行延續性-主動恢復與完成流程.md
/Users/sky770825/openclaw任務面版設計/docs/database-schema.md
/Users/sky770825/openclaw任務面版設計/docs/目前每次溝通Token消耗-實測演示.md
/Users/sky770825/openclaw任務面版設計/docs/MODULES.md
/Users/sky770825/openclaw任務面版設計/docs/ollama與Claude-說明.md
/Users/sky770825/openclaw任務面版設計/docs/FEATURE-AUDIT-2026-02-15.md
/Users/sky770825/openclaw任務面版設計/docs/ollama-launch-openclaw-說明.md
/Users/sky770825/openclaw任務面版設計/docs/SUBAGENT-GUARDRAILS.md
/Users/sky770825/openclaw任務面版設計/docs/記憶寫入與索引-說明與實施方式.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw沒反應與Telegram排查.md
/Users/sky770825/openclaw任務面版設計/docs/SUPABASE-SETUP.md
/Users/sky770825/openclaw任務面版設計/docs/開機自動啟動Ollama.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-API-Key與模型切換-讀取來源.md
/Users/sky770825/openclaw任務面版設計/docs/Gemini未知錯誤與英文回覆-說明.md
/Users/sky770825/openclaw任務面版設計/docs/Token優化與後續建議.md
/Users/sky770825/openclaw任務面版設計/docs/SYSTEM-RESOURCES.md
/Users/sky770825/openclaw任務面版設計/docs/PROJECT-NOTES.md
/Users/sky770825/openclaw任務面版設計/docs/DEPLOY.md
/Users/sky770825/openclaw任務面版設計/docs/n8n
/Users/sky770825/openclaw任務面版設計/docs/n8n/README.md
/Users/sky770825/openclaw任務面版設計/docs/n8n/My-workflow.no-llm.json
/Users/sky770825/openclaw任務面版設計/docs/n8n/OpenClaw-Run-Index-Reporter-Telegram.json
/Users/sky770825/openclaw任務面版設計/docs/n8n/OpenClaw-Run-Index-Reporter-Telegram.code-node.json
/Users/sky770825/openclaw任務面版設計/docs/n8n/Daily-Wrap-up.no-llm.json
/Users/sky770825/openclaw任務面版設計/docs/n8n/Daily-Wrap-up.no-llm.with-error-alert.json
/Users/sky770825/openclaw任務面版設計/docs/n8n/My-workflow.fixed.json
/Users/sky770825/openclaw任務面版設計/docs/Ollama-加速回覆.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw連上Notion-說明.md
/Users/sky770825/openclaw任務面版設計/docs/TELEGRAM-DIRECT-SETUP.md
/Users/sky770825/openclaw任務面版設計/docs/動態載入與按需記憶-可行做法.md
/Users/sky770825/openclaw任務面版設計/docs/記憶-自動化寫入設計.md
/Users/sky770825/openclaw任務面版設計/docs/STATUS-MIGRATION-RUNBOOK.md
/Users/sky770825/openclaw任務面版設計/docs/雲端備份與上傳清單.md
/Users/sky770825/openclaw任務面版設計/docs/AGENT-GUIDE.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-17K-Token來源明細.md
/Users/sky770825/openclaw任務面版設計/docs/模型不回話-排查步驟.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram-設定排查.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-Copilot-auth-token-optional-說明.md
/Users/sky770825/openclaw任務面版設計/docs/ROADMAP.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-NODE-VERSION-GUARD.md
/Users/sky770825/openclaw任務面版設計/docs/記憶索引-比例分配與實作流程.md
/Users/sky770825/openclaw任務面版設計/docs/AGENT_PROTOCOL.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw技能-自我進化與升級資源.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw接Ollama-檢查清單.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-排查報告-2026-02-12.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw透過Cursor-CLI編程.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram任務指令-parser與webhook驗簽規格.md
/Users/sky770825/openclaw任務面版設計/docs/CLAUDE-MODEL-SETUP.md
/Users/sky770825/openclaw任務面版設計/docs/Gateway-外部連線-bind設定說明.md
/Users/sky770825/openclaw任務面版設計/docs/RAG-定時更新說明.md
/Users/sky770825/openclaw任務面版設計/docs/回覆很慢與洩漏個人資訊-說明.md
/Users/sky770825/openclaw任務面版設計/docs/TELEGRAM-SETUP-GUIDE.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-Copilot-顯示Not-Connected-排查.md
/Users/sky770825/openclaw任務面版設計/docs/TASK-TEMPLATE.md
/Users/sky770825/openclaw任務面版設計/docs/達爾用網頁版AI省Token-子代理與瀏覽器控制.md
/Users/sky770825/openclaw任務面版設計/docs/日誌與快取清理建議.md
/Users/sky770825/openclaw任務面版設計/docs/GITHUB_PAGES.md
/Users/sky770825/openclaw任務面版設計/docs/大家經常遇到的OpenClaw問題.md
/Users/sky770825/openclaw任務面版設計/docs/VERIFICATION-REPORT.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-模型代碼檢查-2026-02-12.md
/Users/sky770825/openclaw任務面版設計/docs/TASKBOARD-FULL-AUDIT-2026-02-16.md
/Users/sky770825/openclaw任務面版設計/docs/Gemini-2.5-Pro-重複回覆後無反應-排查.md
/Users/sky770825/openclaw任務面版設計/docs/改用改過的OpenClaw-讓輕量模式生效.md
/Users/sky770825/openclaw任務面版設計/docs/瀏覽器控制經常失敗-排查說明.md
/Users/sky770825/openclaw任務面版設計/docs/記憶索引-主題與命中率設計.md
/Users/sky770825/openclaw任務面版設計/docs/N8N-WORKFLOW-DESIGN.md
/Users/sky770825/openclaw任務面版設計/docs/不用API的本機模型-openclaw.md
/Users/sky770825/openclaw任務面版設計/docs/WHERE-TO-LOOK.md
/Users/sky770825/openclaw任務面版設計/docs/ENV-KEYS.md
/Users/sky770825/openclaw任務面版設計/docs/看到同步任務板的方式.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram傳給OpenClaw沒有反應-排查.md
/Users/sky770825/openclaw任務面版設計/docs/openclaw-json-ollama-fix.md
/Users/sky770825/openclaw任務面版設計/docs/新視窗或新訊息維持之前記憶-實施方式.md
/Users/sky770825/openclaw任務面版設計/docs/stop-指令實際生效的解決方案.md
/Users/sky770825/openclaw任務面版設計/docs/N8N-INTEGRATION.md
/Users/sky770825/openclaw任務面版設計/docs/ollama_bot2-開機自動啟動.md
/Users/sky770825/openclaw任務面版設計/docs/網路與官方-常見問題與必學技能.md
/Users/sky770825/openclaw任務面版設計/docs/測試結果-目前跑的是哪一個OpenClaw.md
/Users/sky770825/openclaw任務面版設計/docs/需要注意而容易忽略的檢查清單.md
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫/SOP-05-維護巡檢.md
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫/SOP-01-標準任務流程.md
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫/README.md
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫/SOP-13-網站健康檢查.md
/Users/sky770825/openclaw任務面版設計/docs/sop-知識庫/SOP-03-系統診斷.md
/Users/sky770825/openclaw任務面版設計/docs/OPENCLAW-GUIDELINES.md
/Users/sky770825/openclaw任務面版設計/docs/Telegram任務橋接-Express範例啟動說明.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw環境檢查與建議.md
/Users/sky770825/openclaw任務面版設計/docs/TELEGRAM-NO-REPLY.md
/Users/sky770825/openclaw任務面版設計/docs/Gemini-2.5-Flash-重複回覆與失敗-紀錄.md
/Users/sky770825/openclaw任務面版設計/docs/API-INTEGRATION.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw無法使用瀏覽器-解決步驟.md
/Users/sky770825/openclaw任務面版設計/docs/Rotate-Key-驗證清單.md
/Users/sky770825/openclaw任務面版設計/docs/OpenClaw-修復紀錄報告.md
/Users/sky770825/openclaw任務面版設計/docs/SOP-網站商家部署-OpenCart（達爾指揮Codex+Cursor）.md
/Users/sky770825/openclaw任務面版設計/docs/HANDOVER_CURSOR.md
/Users/sky770825/openclaw任務面版設計/docs/任務板執行功能與Agent控制-透過瀏覽器使用AI省Token.md
/Users/sky770825/openclaw任務面版設計/supabase
/Users/sky770825/openclaw任務面版設計/supabase/migrations
/Users/sky770825/openclaw任務面版設計/supabase/migrations/20260302_openclaw_tasks_status_expand_safe_down.sql
/Users/sky770825/openclaw任務面版設計/supabase/migrations/20260302_create_embeddings.sql
/Users/sky770825/openclaw任務面版設計/supabase/migrations/20260302_openclaw_tasks_status_expand_safe.sql
/Users/sky770825/openclaw任務面版設計/supabase/migrations/20260303_embeddings_knowledge_classification.sql
/Users/sky770825/openclaw任務面版設計/supabase/config.toml
/Users/sky770825/openclaw任務面版設計/ollama_bot2.log
/Users/sky770825/openclaw任務面版設計/ollama_monitor_bot.log
/Users/sky770825/openclaw任務面版設計/README.md
/Users/sky770825/openclaw任務面版設計/tailwind.config.ts
/Users/sky770825/openclaw任務面版設計/rag_update.log
/Users/sky770825/openclaw任務面版設計/create_xiaocai_ideas_table.sql
/Users/sky770825/openclaw任務面版設計/public
/Users/sky770825/openclaw任務面版設計/public/favicon.ico
/Users/sky770825/openclaw任務面版設計/public/live2dcubismcore.min.js
/Users/sky770825/openclaw任務面版設計/public/models
/Users/sky770825/openclaw任務面版設計/public/models/haru
/Users/sky770825/openclaw任務面版設計/public/icons
/Users/sky770825/openclaw任務面版設計/public/icons/icon-maskable-192x192.svg
/Users/sky770825/openclaw任務面版設計/public/icons/icon-192x192.svg
/Users/sky770825/openclaw任務面版設計/public/icons/icon-512x512.svg
/Users/sky770825/openclaw任務面版設計/public/icons/icon-maskable-512x512.svg
/Users/sky770825/openclaw任務面版設計/public/robots.txt
/Users/sky770825/openclaw任務面版設計/public/placeholder.svg
/Users/sky770825/openclaw任務面版設計/logs
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-30-12.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-100000.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260218-220001.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-22-14.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-21-51.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-203012.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260220-060002.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260217-213856.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260219-060004.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-launchd-err.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-task-t1771302641975-20260218-202816.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-180000.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-202816.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-24-04.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260219-180000.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-21-35.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-210426.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-task-t1771302641975-20260218-203012.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260219-100004.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-28-16.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260219-140003.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260219-220000.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260217-213837.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260219-100004.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-launchd.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260217-220000.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260218-210426.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260219-180000.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260218-202816.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-16-42.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-060003.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260219-220000.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T13-04-26.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-27-59.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260219-140003.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-launchd.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-27-02.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-220002.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260218-140000.log
/Users/sky770825/openclaw任務面版設計/logs/server.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-launchd-err.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260219-060004.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-run-now-2026-02-18T12-24-57.log
/Users/sky770825/openclaw任務面版設計/logs/deputy-20260218-203012.log
/Users/sky770825/openclaw任務面版設計/logs/patrol-20260220-060003.log
/Users/sky770825/openclaw任務面版設計/package-lock.json
/Users/sky770825/openclaw任務面版設計/package.json
/Users/sky770825/openclaw任務面版設計/knowledge
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai/RESULT.md
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai/INTEGRATION.md
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai/PROMPTS.md
/Users/sky770825/openclaw任務面版設計/knowledge/cursor-ai/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/PROMPTS.md
/Users/sky770825/openclaw任務面版設計/knowledge/gpt-5.2/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/repos
/Users/sky770825/openclaw任務面版設計/knowledge/repos/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/poll-tex
/Users/sky770825/openclaw任務面版設計/knowledge/poll-tex/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/poll-tex/PRODUCT_KB.md
/Users/sky770825/openclaw任務面版設計/knowledge/devin-ai
/Users/sky770825/openclaw任務面版設計/knowledge/devin-ai/implementation.md
/Users/sky770825/openclaw任務面版設計/knowledge/devin-ai/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/devin-ai/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/TEMPLATE.md
/Users/sky770825/openclaw任務面版設計/knowledge/RESULT.md
/Users/sky770825/openclaw任務面版設計/knowledge/QMD-本地搜尋引擎.md
/Users/sky770825/openclaw任務面版設計/knowledge/decision-tree
/Users/sky770825/openclaw任務面版設計/knowledge/decision-tree/RESULT.md
/Users/sky770825/openclaw任務面版設計/knowledge/decision-tree/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/self-healing
/Users/sky770825/openclaw任務面版設計/knowledge/self-healing/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/self-healing/runs
/Users/sky770825/openclaw任務面版設計/knowledge/qwen3
/Users/sky770825/openclaw任務面版設計/knowledge/qwen3/ollama-guide.md
/Users/sky770825/openclaw任務面版設計/knowledge/qwen3/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/qwen3/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/系統架構總覽-20260216.md
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/salesforce-einstein/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/knowledge_base.md
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/gemini-vision/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/knowledge_auto.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/PROMPTS.md
/Users/sky770825/openclaw任務面版設計/knowledge/sonnet-4.5/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/auto-gpt/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/CURSOR-AGENT-INSTRUCTIONS.md
/Users/sky770825/openclaw任務面版設計/knowledge/research.sh
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/grok-4.1/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/MODEL-DECISION-MATRIX.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/official-release.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/code-example.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/prompt-best-practices.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/user-feedback.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/openclaw-guide.md
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/cost-calculator.sh
/Users/sky770825/openclaw任務面版設計/knowledge/opus-4.6/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/knowledge/MULTI_AGENT_COMMUNICATION.md
/Users/sky770825/openclaw任務面版設計/knowledge/CLI_TRUTH_MAP.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/implementation.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/strengths.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/sample-scan.sh
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/integration.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/README.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/comparisons.md
/Users/sky770825/openclaw任務面版設計/knowledge/trivy/README-v1.1.md
/Users/sky770825/openclaw任務面版設計/sandbox
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/PROJECT_990_AEGIS_SCANNER_PROTOTYPE_v0.1.md
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/malicious_skill
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/skills_to_scan
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/sandbox
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/rules.json
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/SKILL.md
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/docker-compose.yml
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/repo_mapper.py
/Users/sky770825/openclaw任務面版設計/sandbox/aegis-scanner/aegis_scanner.py
/Users/sky770825/openclaw任務面版設計/sandbox/output
/Users/sky770825/openclaw任務面版設計/sandbox/output/bootstrap_modification_report.txt
/Users/sky770825/openclaw任務面版設計/sandbox/BOOTSTRAP.md
/Users/sky770825/openclaw任務面版設計/dev.log
/Users/sky770825/openclaw任務面版設計/scripts
/Users/sky770825/openclaw任務面版設計/scripts/task-board-api.sh
/Users/sky770825/openclaw任務面版設計/scripts/generate-dashboard.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-gemini-lite.sh
/Users/sky770825/openclaw任務面版設計/scripts/prompt-firewall.sh
/Users/sky770825/openclaw任務面版設計/scripts/kb-snapshot-resources.sh
/Users/sky770825/openclaw任務面版設計/scripts/telegram-rich-menu.sh
/Users/sky770825/openclaw任務面版設計/scripts/find-start-script.sh
/Users/sky770825/openclaw任務面版設計/scripts/neuxa-audit-pro.sh
/Users/sky770825/openclaw任務面版設計/scripts/agent-status.sh
/Users/sky770825/openclaw任務面版設計/scripts/boot-integration.sh
/Users/sky770825/openclaw任務面版設計/scripts/google-api-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/log-rotate.sh
/Users/sky770825/openclaw任務面版設計/scripts/risk-shield.sh
/Users/sky770825/openclaw任務面版設計/scripts/memory_search.sh
/Users/sky770825/openclaw任務面版設計/scripts/opus-task.sh
/Users/sky770825/openclaw任務面版設計/scripts/wake-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/restore-skill.sh
/Users/sky770825/openclaw任務面版設計/scripts/oc-auto.sh
/Users/sky770825/openclaw任務面版設計/scripts/self-heal.sh
/Users/sky770825/openclaw任務面版設計/scripts/setup-telegram-token.sh
/Users/sky770825/openclaw任務面版設計/scripts/start-tunnel.sh
/Users/sky770825/openclaw任務面版設計/scripts/refill-task-pool.sh
/Users/sky770825/openclaw任務面版設計/scripts/openclaw-auto-patrol.sh
/Users/sky770825/openclaw任務面版設計/scripts/switch-key.sh
/Users/sky770825/openclaw任務面版設計/scripts/_wake_urgent_parse.py
/Users/sky770825/openclaw任務面版設計/scripts/worktree-manager.sh
/Users/sky770825/openclaw任務面版設計/scripts/n8n-run.sh
/Users/sky770825/openclaw任務面版設計/scripts/fix-background.sh
/Users/sky770825/openclaw任務面版設計/scripts/handoff-generator.sh
/Users/sky770825/openclaw任務面版設計/scripts/memory-cleanup.sh
/Users/sky770825/openclaw任務面版設計/scripts/agent-xp-tracker.sh
/Users/sky770825/openclaw任務面版設計/scripts/control-center-launch.sh
/Users/sky770825/openclaw任務面版設計/scripts/health-check.py
/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-gemini.sh
/Users/sky770825/openclaw任務面版設計/scripts/check-version.sh
/Users/sky770825/openclaw任務面版設計/scripts/post-push-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-security
/Users/sky770825/openclaw任務面版設計/scripts/auto-security/tests
/Users/sky770825/openclaw任務面版設計/scripts/auto-security/verify_patch.py
/Users/sky770825/openclaw任務面版設計/scripts/auto-project-backup.sh
/Users/sky770825/openclaw任務面版設計/scripts/safe-run.sh
/Users/sky770825/openclaw任務面版設計/scripts/local-db-backup.sh
/Users/sky770825/openclaw任務面版設計/scripts/approve-idea.sh
/Users/sky770825/openclaw任務面版設計/scripts/smart-read.sh
/Users/sky770825/openclaw任務面版設計/scripts/mailbox-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/complete-current-task.sh
/Users/sky770825/openclaw任務面版設計/scripts/async-dispatcher.sh
/Users/sky770825/openclaw任務面版設計/scripts/sync-bridge.sh
/Users/sky770825/openclaw任務面版設計/scripts/self-healing
/Users/sky770825/openclaw任務面版設計/scripts/self-healing/proactive-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/self-healing/smart-notifier.sh
/Users/sky770825/openclaw任務面版設計/scripts/agent-failover.sh
/Users/sky770825/openclaw任務面版設計/scripts/export-crons.sh
/Users/sky770825/openclaw任務面版設計/scripts/smart-model-picker.sh
/Users/sky770825/openclaw任務面版設計/scripts/openclaw-recovery.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery
/Users/sky770825/openclaw任務面版設計/scripts/recovery/recovery-desktop.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/backup-desktop.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/telegram-bridge.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/🛠️ 系統恢復.app
/Users/sky770825/openclaw任務面版設計/scripts/recovery/backup.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/dashboard-panel.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/health-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/recovery.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/create-recovery-ui.sh
/Users/sky770825/openclaw任務面版設計/scripts/recovery/restore.command
/Users/sky770825/openclaw任務面版設計/scripts/security-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/check_port.py
/Users/sky770825/openclaw任務面版設計/scripts/oc-detect.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-core.sh
/Users/sky770825/openclaw任務面版設計/scripts/daily-report-engine.sh
/Users/sky770825/openclaw任務面版設計/scripts/agent-state.sh
/Users/sky770825/openclaw任務面版設計/scripts/build_memory_index_v2.sh
/Users/sky770825/openclaw任務面版設計/scripts/crew-workspace-cleanup.sh
/Users/sky770825/openclaw任務面版設計/scripts/task-card-writeback.sh
/Users/sky770825/openclaw任務面版設計/scripts/honeypot-alert.sh
/Users/sky770825/openclaw任務面版設計/scripts/openclaw-recover-no-response.sh
/Users/sky770825/openclaw任務面版設計/scripts/dashboard-server.sh
/Users/sky770825/openclaw任務面版設計/scripts/memory-dirty-autofix.sh
/Users/sky770825/openclaw任務面版設計/scripts/oc-nli.py
/Users/sky770825/openclaw任務面版設計/scripts/sanitize_subagent_text.py
/Users/sky770825/openclaw任務面版設計/scripts/notify-laocai.sh
/Users/sky770825/openclaw任務面版設計/scripts/notion-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/add-xiaocai-idea.sh
/Users/sky770825/openclaw任務面版設計/scripts/neuxa-firewall-v2.sh
/Users/sky770825/openclaw任務面版設計/scripts/oc.sh
/Users/sky770825/openclaw任務面版設計/scripts/mq-wrapper.sh
/Users/sky770825/openclaw任務面版設計/scripts/task-splitter.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-summary.sh
/Users/sky770825/openclaw任務面版設計/scripts/README-recover-telegram-bots.md
/Users/sky770825/openclaw任務面版設計/scripts/taskboard-dashboard-launch.sh
/Users/sky770825/openclaw任務面版設計/scripts/docs
/Users/sky770825/openclaw任務面版設計/scripts/docs/auto-executor-lean.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/recovery-backup.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/recovery-health-check.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/idle-watchdog.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/recovery-recovery.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/context-auto-compact.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/gateway-health-watchdog.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/unified-monitor.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/autopilot-checkpoint.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/cursor-task-launcher.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/execute-task.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/ollama-task-monitor.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/automation-ctl.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/checkpoint.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/openclaw-recovery.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/dashboard-server.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/INDEX.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/model-cost-tracker.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/memory_search.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/refill-task-pool.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/safe-run.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/docs/task-board-api.sh.md
/Users/sky770825/openclaw任務面版設計/scripts/session-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-blacklist.sh
/Users/sky770825/openclaw任務面版設計/scripts/sanitize-subagent-text.py
/Users/sky770825/openclaw任務面版設計/scripts/execute-task.sh
/Users/sky770825/openclaw任務面版設計/scripts/task-completion-handler.sh
/Users/sky770825/openclaw任務面版設計/scripts/neuxa-patrol.sh
/Users/sky770825/openclaw任務面版設計/scripts/seed-research-center.sh
/Users/sky770825/openclaw任務面版設計/scripts/openclaw-deputy.sh
/Users/sky770825/openclaw任務面版設計/scripts/redact-secrets-in-text-files.py
/Users/sky770825/openclaw任務面版設計/scripts/task-gen-external.sh
/Users/sky770825/openclaw任務面版設計/scripts/recall
/Users/sky770825/openclaw任務面版設計/scripts/README.md
/Users/sky770825/openclaw任務面版設計/scripts/gemini-call.sh
/Users/sky770825/openclaw任務面版設計/scripts/log-autopilot-task.sh
/Users/sky770825/openclaw任務面版設計/scripts/n8n
/Users/sky770825/openclaw任務面版設計/scripts/estimate-bootstrap-tokens.js
/Users/sky770825/openclaw任務面版設計/scripts/now-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/cross-platform-intel-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-checkpoint.sh
/Users/sky770825/openclaw任務面版設計/scripts/recover-telegram-bots.sh
/Users/sky770825/openclaw任務面版設計/scripts/daily-budget-tracker.sh
/Users/sky770825/openclaw任務面版設計/scripts/decision_tree.py
/Users/sky770825/openclaw任務面版設計/scripts/brain-init
/Users/sky770825/openclaw任務面版設計/scripts/make-no-llm-workflow.py
/Users/sky770825/openclaw任務面版設計/scripts/auto-bump-version.sh
/Users/sky770825/openclaw任務面版設計/scripts/SOP-10-跨Agent協作.md
/Users/sky770825/openclaw任務面版設計/scripts/bulk-create-tasks.sh
/Users/sky770825/openclaw任務面版設計/scripts/smart-ai-assistant.sh
/Users/sky770825/openclaw任務面版設計/scripts/telegram-task-bridge-example.js
/Users/sky770825/openclaw任務面版設計/scripts/emergency-stop.sh
/Users/sky770825/openclaw任務面版設計/scripts/claude_openai_client_example.py
/Users/sky770825/openclaw任務面版設計/scripts/license-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/run-with-timeout.sh
/Users/sky770825/openclaw任務面版設計/scripts/oc-test.sh
/Users/sky770825/openclaw任務面版設計/scripts/defense-toolkit.sh
/Users/sky770825/openclaw任務面版設計/scripts/consolidate_knowledge.py
/Users/sky770825/openclaw任務面版設計/scripts/lib
/Users/sky770825/openclaw任務面版設計/scripts/lib/circuit-breaker.sh
/Users/sky770825/openclaw任務面版設計/scripts/lib/common.sh
/Users/sky770825/openclaw任務面版設計/scripts/fill-readmes.sh
/Users/sky770825/openclaw任務面版設計/scripts/health-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/checkpoint.sh
/Users/sky770825/openclaw任務面版設計/scripts/README_DECISION.md
/Users/sky770825/openclaw任務面版設計/scripts/file-search.sh
/Users/sky770825/openclaw任務面版設計/scripts/task-gen-business.sh
/Users/sky770825/openclaw任務面版設計/scripts/memfw-scan.sh
/Users/sky770825/openclaw任務面版設計/scripts/_wake_task_parse.py
/Users/sky770825/openclaw任務面版設計/scripts/fix-noncompliant-tasks.sh
/Users/sky770825/openclaw任務面版設計/scripts/daily-health-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/generate-security-report.sh
/Users/sky770825/openclaw任務面版設計/scripts/AGENTS.md
/Users/sky770825/openclaw任務面版設計/scripts/embedding_indexer.py
/Users/sky770825/openclaw任務面版設計/scripts/compare-and-learn.sh
/Users/sky770825/openclaw任務面版設計/scripts/idle-watchdog.sh
/Users/sky770825/openclaw任務面版設計/scripts/fix-empty-tasks.js
/Users/sky770825/openclaw任務面版設計/scripts/gemini-quota-check.sh
/Users/sky770825/openclaw任務面版設計/scripts/unified-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/git-commit-helper.sh
/Users/sky770825/openclaw任務面版設計/scripts/browser-control.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived
/Users/sky770825/openclaw任務面版設計/scripts/archived/open-control-center.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-worktrees.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/task-gen-business.sh.bak-batchA-20260214-150824
/Users/sky770825/openclaw任務面版設計/scripts/archived/dmz-sentry.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory_recall.js.backup
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-rescue-restartall.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/simple-update-test.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-watchdog.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-code-evaluator.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/n8n-final-setup.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory-record-server.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/task-gen-business.sh.bak.20260214-093114
/Users/sky770825/openclaw任務面版設計/scripts/archived/n8n-full-auto-deploy.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/ollama-reporter-host.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-monitoring.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/dashboard-env.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/cursor-task-launcher.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-oc-detect.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-ghost-protocol.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-browser.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/autopilot-cycle.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/use-gemini-pro.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/update-core-memory-with-versioning.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/n8n-auto-setup.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/apply-openclaw-security-fixes.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/send-to-cursor.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/install-full-bridge.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/sub-agent-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/codex-connector.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory_recall.js
/Users/sky770825/openclaw任務面版設計/scripts/archived/task-gen-internal.sh.bak-batchA-20260214-150824
/Users/sky770825/openclaw任務面版設計/scripts/archived/get-cursor-chat-coordinates.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-finance.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-cursor-rescue.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory-vacuum.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-oc-nli.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/ask-cursor-cli.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-rescue-autofix.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-rescue.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-auto-update.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-referral.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/nightly-memory-sync.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-logger.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-key-factory.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test_decision_tree.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/agent-bus.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/install-openclaw-migration.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/neuxa-lite-v1.bin
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-n8n-bridge.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test_model_switch_with_retry.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/n8n-full-auto-v2.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/moltbook-broadcast.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-auto-summarizer.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/install-990.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/taskboard-listener.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/task-gen-external.sh.bak.20260214-093114
/Users/sky770825/openclaw任務面版設計/scripts/archived/simple-version-compare.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/batch-add-xiaocai-ideas.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-manager.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-auto-compact.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/cursor-automation.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/setup-xiaocai-ideas.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/daily-gemini-tasks.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/dashboard-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/task-gen-external.sh.bak-batchA-20260214-150824
/Users/sky770825/openclaw任務面版設計/scripts/archived/test_decision_tree_v2.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/atomic-write.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/weekly-memory-checkpoint.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/use-gemini-flash.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory-record-ctl.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/openclaw-browser-openclaw-recover.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/agent-monitor-local.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/test-smart-recall-performance.py
/Users/sky770825/openclaw任務面版設計/scripts/archived/context-audit.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/memory-vacuum.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/use-kimi.sh
/Users/sky770825/openclaw任務面版設計/scripts/archived/cursor-connector.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-v2.sh
/Users/sky770825/openclaw任務面版設計/scripts/log-sanitizer.sh
/Users/sky770825/openclaw任務面版設計/scripts/README-UNIVERSAL-MEMORY.md
/Users/sky770825/openclaw任務面版設計/scripts/model-cost-tracker.sh
/Users/sky770825/openclaw任務面版設計/scripts/agent_decision_loop.sh
/Users/sky770825/openclaw任務面版設計/scripts/telegram-panel.sh
/Users/sky770825/openclaw任務面版設計/scripts/wrap-subagent-prompt.py
/Users/sky770825/openclaw任務面版設計/scripts/collect-metrics.sh
/Users/sky770825/openclaw任務面版設計/scripts/auto-skill-省錢模式.sh
/Users/sky770825/openclaw任務面版設計/scripts/switch-model.sh
/Users/sky770825/openclaw任務面版設計/scripts/free-ports.sh
/Users/sky770825/openclaw任務面版設計/scripts/xiaocai-monitor.sh
/Users/sky770825/openclaw任務面版設計/scripts/worktree-aggregator.sh
/Users/sky770825/openclaw任務面版設計/scripts/submit-review.sh
/Users/sky770825/openclaw任務面版設計/scripts/README-CONTEXT-TOOLS.md
/Users/sky770825/openclaw任務面版設計/scripts/sync-boss-decisions.sh
/Users/sky770825/openclaw任務面版設計/scripts/setup-openclaw-n8n-bridge.sh
/Users/sky770825/openclaw任務面版設計/openclaw-不是正式.jsx
/Users/sky770825/openclaw任務面版設計/health-report-google.com-20260227-053842.json
/Users/sky770825/openclaw任務面版設計/ollama_bot2_launchd.log
/Users/sky770825/openclaw任務面版設計/components.json
/Users/sky770825/openclaw任務面版設計/tsconfig.json
/Users/sky770825/openclaw任務面版設計/skills
/Users/sky770825/openclaw任務面版設計/skills/git-commit-gen
/Users/sky770825/openclaw任務面版設計/skills/git-commit-gen/references
/Users/sky770825/openclaw任務面版設計/skills/git-commit-gen/scripts
/Users/sky770825/openclaw任務面版設計/skills/git-commit-gen/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/neuxa-consciousness-sync
/Users/sky770825/openclaw任務面版設計/skills/neuxa-consciousness-sync/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/WAZUH-DEPLOY.md
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/dashboard
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/configs
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/deploy.sh
/Users/sky770825/openclaw任務面版設計/skills/guardian-arsenal/SKILL.json
/Users/sky770825/openclaw任務面版設計/skills/bridge-cell-test.md
/Users/sky770825/openclaw任務面版設計/skills/tavily-search
/Users/sky770825/openclaw任務面版設計/skills/tavily-search/README.md
/Users/sky770825/openclaw任務面版設計/skills/tavily-search/scripts
/Users/sky770825/openclaw任務面版設計/skills/tavily-search/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/memory
/Users/sky770825/openclaw任務面版設計/skills/memory/archival_memory.py
/Users/sky770825/openclaw任務面版設計/skills/memory/memory_manager.py
/Users/sky770825/openclaw任務面版設計/skills/memory/requirements.txt
/Users/sky770825/openclaw任務面版設計/skills/memory/core_memory.py
/Users/sky770825/openclaw任務面版設計/skills/memory/tests
/Users/sky770825/openclaw任務面版設計/skills/memory/__init__.py
/Users/sky770825/openclaw任務面版設計/skills/memory/docs
/Users/sky770825/openclaw任務面版設計/skills/memory/auto_summarize.py
/Users/sky770825/openclaw任務面版設計/skills/memory/README.md
/Users/sky770825/openclaw任務面版設計/skills/memory/recall_memory.py
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/CHANGELOG.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/INSTALL.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/README.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/package-lock.json
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/package.json
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/CONTRIBUTING.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/examples
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/README_ZH.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/scripts
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/playwright-scraper-skill/test.sh
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/test
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/config
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/COMPLETION_REPORT.md
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/INSTALL.md
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/README.md
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/package-lock.json
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/package.json
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/examples
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/scripts
/Users/sky770825/openclaw任務面版設計/skills/file-sync-skill/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/session-logs
/Users/sky770825/openclaw任務面版設計/skills/session-logs/README.md
/Users/sky770825/openclaw任務面版設計/skills/session-logs/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/screen-vision
/Users/sky770825/openclaw任務面版設計/skills/screen-vision/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/screen-vision/README.md
/Users/sky770825/openclaw任務面版設計/skills/screen-vision/scripts
/Users/sky770825/openclaw任務面版設計/skills/screen-vision/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise/agents
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise/docs
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise/README.md
/Users/sky770825/openclaw任務面版設計/skills/council-of-the-wise/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/SKILLS-CHECK-REPORT.md
/Users/sky770825/openclaw任務面版設計/skills/web-fetch
/Users/sky770825/openclaw任務面版設計/skills/web-fetch/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn/README.md
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn/data
/Users/sky770825/openclaw任務面版設計/skills/reflect-learn/skill.json
/Users/sky770825/openclaw任務面版設計/skills/test-studio-skill.md
/Users/sky770825/openclaw任務面版設計/skills/healthcheck
/Users/sky770825/openclaw任務面版設計/skills/healthcheck/README.md
/Users/sky770825/openclaw任務面版設計/skills/healthcheck/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/clawhub
/Users/sky770825/openclaw任務面版設計/skills/clawhub/README.md
/Users/sky770825/openclaw任務面版設計/skills/clawhub/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/neural-memory
/Users/sky770825/openclaw任務面版設計/skills/neural-memory/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/neural-memory/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/web-monitor
/Users/sky770825/openclaw任務面版設計/skills/web-monitor/scripts
/Users/sky770825/openclaw任務面版設計/skills/web-monitor/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/contextguard
/Users/sky770825/openclaw任務面版設計/skills/contextguard/PRICING.md
/Users/sky770825/openclaw任務面版設計/skills/contextguard/README.md
/Users/sky770825/openclaw任務面版設計/skills/contextguard/package-lock.json
/Users/sky770825/openclaw任務面版設計/skills/contextguard/package.json
/Users/sky770825/openclaw任務面版設計/skills/contextguard/scripts
/Users/sky770825/openclaw任務面版設計/skills/contextguard/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/contextguard/tsconfig.json
/Users/sky770825/openclaw任務面版設計/skills/contextguard/src
/Users/sky770825/openclaw任務面版設計/skills/n8n
/Users/sky770825/openclaw任務面版設計/skills/n8n/launcher.sh
/Users/sky770825/openclaw任務面版設計/skills/n8n/webhook-telegram-forwarder.py
/Users/sky770825/openclaw任務面版設計/skills/n8n/n8n-webhook-server.py
/Users/sky770825/openclaw任務面版設計/skills/n8n/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/n8n/n8n-cli
/Users/sky770825/openclaw任務面版設計/skills/n8n/n8n-webhook-receiver
/Users/sky770825/openclaw任務面版設計/skills/skill-creator
/Users/sky770825/openclaw任務面版設計/skills/skill-creator/scripts
/Users/sky770825/openclaw任務面版設計/skills/skill-creator/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/skill-creator/license.txt
/Users/sky770825/openclaw任務面版設計/skills/github
/Users/sky770825/openclaw任務面版設計/skills/github/README.md
/Users/sky770825/openclaw任務面版設計/skills/github/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/test
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/CHANGELOG.md
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/advisories
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/HEARTBEAT.md
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/hooks
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/scripts
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/clawsec-suite/skill.json
/Users/sky770825/openclaw任務面版設計/skills/password-manager-skill
/Users/sky770825/openclaw任務面版設計/skills/password-manager-skill/README.md
/Users/sky770825/openclaw任務面版設計/skills/password-manager-skill/scripts
/Users/sky770825/openclaw任務面版設計/skills/password-manager-skill/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill/config.json
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill/tests
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill/package.json
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill/scripts
/Users/sky770825/openclaw任務面版設計/skills/log-analyzer-skill/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/anshumanbh-qmd
/Users/sky770825/openclaw任務面版設計/skills/anshumanbh-qmd/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/anshumanbh-qmd/README.md
/Users/sky770825/openclaw任務面版設計/skills/anshumanbh-qmd/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/git-notes-memory
/Users/sky770825/openclaw任務面版設計/skills/git-notes-memory/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/git-notes-memory/memory.py
/Users/sky770825/openclaw任務面版設計/skills/git-notes-memory/README.md
/Users/sky770825/openclaw任務面版設計/skills/git-notes-memory/SKILL.md
/Users/sky770825/openclaw任務面版設計/skills/triple-memory
/Users/sky770825/openclaw任務面版設計/skills/triple-memory/_meta.json
/Users/sky770825/openclaw任務面版設計/skills/triple-memory/references
/Users/sky770825/openclaw任務面版設計/skills/triple-memory/scripts
/Users/sky770825/openclaw任務面版設計/skills/triple-memory/SKILL.md
/Users/sky770825/openclaw任務面版設計/eslint.config.js
/Users/sky770825/openclaw任務面版設計/auto-task-generator-state.json
/Users/sky770825/openclaw任務面版設計/openclaw-cursor.jsx
/Users/sky770825/openclaw任務面版設計/n8n-workflows
/Users/sky770825/openclaw任務面版設計/n8n-workflows/4-telegram-approve-reject.json
/Users/sky770825/openclaw任務面版設計/n8n-workflows/5-telegram-status.json
/Users/sky770825/openclaw任務面版設計/n8n-workflows/README.md
/Users/sky770825/openclaw任務面版設計/n8n-workflows/1-run-next-schedule.json
/Users/sky770825/openclaw任務面版設計/n8n-workflows/3-openclaw-result-webhook.json
/Users/sky770825/openclaw任務面版設計/n8n-workflows/2-run-next-webhook.json
/Users/sky770825/openclaw任務面版設計/vite.config.ts
/Users/sky770825/openclaw任務面版設計/vitest.config.ts
/Users/sky770825/openclaw任務面版設計/postcss.config.js
/Users/sky770825/openclaw任務面版設計/server.log
/Users/sky770825/openclaw任務面版設計/backups
/Users/sky770825/openclaw任務面版設計/backups/cleanup-20260214-143352
/Users/sky770825/openclaw任務面版設計/backups/cleanup-20260214-143352/LaunchAgents
/Users/sky770825/openclaw任務面版設計/backups/cleanup-20260214-143352/repo
/Users/sky770825/openclaw任務面版設計/backups/openclaw-full-20260214-143125.tar.gz.sha256
/Users/sky770825/openclaw任務面版設計/backups/pre-restore-20260214-120322
/Users/sky770825/openclaw任務面版設計/backups/pre-restore-20260214-120322/git-status.txt
/Users/sky770825/openclaw任務面版設計/backups/pre-restore-20260214-120322/git-diff.patch
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/repo.bundle
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/working-tree.diff
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/index.diff
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/untracked.txt
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/working-tree.tar.gz
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/status.txt
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/branch.txt
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/SHA256SUMS.txt
/Users/sky770825/openclaw任務面版設計/backups/20260213-172205/HEAD.txt
/Users/sky770825/openclaw任務面版設計/backups/auto
/Users/sky770825/openclaw任務面版設計/backups/auto/20260213-172954
/Users/sky770825/openclaw任務面版設計/backups/auto/20260213-172939
/Users/sky770825/openclaw任務面版設計/backups/auto/20260213-173158
/Users/sky770825/openclaw任務面版設計/backups/openclaw-full-20260214-143125.tar.gz
/Users/sky770825/openclaw任務面版設計/backups/snapshot-20260214-120224
/Users/sky770825/openclaw任務面版設計/backups/snapshot-20260214-120224/git-status.txt
/Users/sky770825/openclaw任務面版設計/backups/snapshot-20260214-120224/git-diff.patch
/Users/sky770825/openclaw任務面版設計/backups/snapshot-20260214-120224/files
/Users/sky770825/openclaw任務面版設計/memories
/Users/sky770825/openclaw任務面版設計/memories/5819565005.yaml
/Users/sky770825/openclaw任務面版設計/CLAUDE.md
/Users/sky770825/openclaw任務面版設計/ollama_bot2_launchd.err.log
/Users/sky770825/openclaw任務面版設計/nohup.out
/Users/sky770825/openclaw任務面版設計/control_scripts.py
/Users/sky770825/openclaw任務面版設計/railway.json
/Users/sky770825/openclaw任務面版設計/ollama_bot2.py
/Users/sky770825/openclaw任務面版設計/control_scripts.py.bak
/Users/sky770825/openclaw任務面版設計/src
/Users/sky770825/openclaw任務面版設計/src/App.tsx
/Users/sky770825/openclaw任務面版設計/src/main.tsx
/Users/sky770825/openclaw任務面版設計/src/types
/Users/sky770825/openclaw任務面版設計/src/types/alert.ts
/Users/sky770825/openclaw任務面版設計/src/types/project.ts
/Users/sky770825/openclaw任務面版設計/src/types/openclaw.ts
/Users/sky770825/openclaw任務面版設計/src/types/systemSchedule.ts
/Users/sky770825/openclaw任務面版設計/src/types/mdci.ts
/Users/sky770825/openclaw任務面版設計/src/types/log.ts
/Users/sky770825/openclaw任務面版設計/src/types/index.ts
/Users/sky770825/openclaw任務面版設計/src/types/run.ts
/Users/sky770825/openclaw任務面版設計/src/types/task.ts
/Users/sky770825/openclaw任務面版設計/src/test
/Users/sky770825/openclaw任務面版設計/src/test/example.test.ts
/Users/sky770825/openclaw任務面版設計/src/test/setup.ts
/Users/sky770825/openclaw任務面版設計/src/config
/Users/sky770825/openclaw任務面版設計/src/config/coreAuth.ts
/Users/sky770825/openclaw任務面版設計/src/config/communityLayers.ts
/Users/sky770825/openclaw任務面版設計/src/config/trustPromotion.ts
/Users/sky770825/openclaw任務面版設計/src/config/hubCenters.ts
/Users/sky770825/openclaw任務面版設計/src/App.css
/Users/sky770825/openclaw任務面版設計/src/index.css
/Users/sky770825/openclaw任務面版設計/src/components
/Users/sky770825/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx
/Users/sky770825/openclaw任務面版設計/src/components/ui
/Users/sky770825/openclaw任務面版設計/src/components/openclaw
/Users/sky770825/openclaw任務面版設計/src/components/auth
/Users/sky770825/openclaw任務面版設計/src/components/starship
/Users/sky770825/openclaw任務面版設計/src/components/layout
/Users/sky770825/openclaw任務面版設計/src/components/NavLink.tsx
/Users/sky770825/openclaw任務面版設計/src/components/common
/Users/sky770825/openclaw任務面版設計/src/components/federation
/Users/sky770825/openclaw任務面版設計/src/vite-env.d.ts
/Users/sky770825/openclaw任務面版設計/src/hooks
/Users/sky770825/openclaw任務面版設計/src/hooks/useFeatures.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/use-mobile.tsx
/Users/sky770825/openclaw任務面版設計/src/hooks/useSpeculationRules.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useFederationPostMessageGuard.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useOpenClawBoard.js
/Users/sky770825/openclaw任務面版設計/src/hooks/useTaskExecution.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/openclawBoardUtils.js
/Users/sky770825/openclaw任務面版設計/src/hooks/use-toast.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useControlCenter.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/usePerformanceMonitoring.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useDebounce.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useKeyboardShortcuts.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useWebSocket.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useMDCI.ts
/Users/sky770825/openclaw任務面版設計/src/hooks/useViewTransition.ts
/Users/sky770825/openclaw任務面版設計/src/lib
/Users/sky770825/openclaw任務面版設計/src/lib/pollRunStatus.ts
/Users/sky770825/openclaw任務面版設計/src/lib/utils.ts
/Users/sky770825/openclaw任務面版設計/src/i18n
/Users/sky770825/openclaw任務面版設計/src/i18n/LocaleContext.tsx
/Users/sky770825/openclaw任務面版設計/src/i18n/translations.ts
/Users/sky770825/openclaw任務面版設計/src/data
/Users/sky770825/openclaw任務面版設計/src/data/mock.ts
/Users/sky770825/openclaw任務面版設計/src/data/seedTasks.ts
/Users/sky770825/openclaw任務面版設計/src/data/runs.ts
/Users/sky770825/openclaw任務面版設計/src/data/seedRunsAlerts.ts
/Users/sky770825/openclaw任務面版設計/src/data/stats.ts
/Users/sky770825/openclaw任務面版設計/src/data/logs.ts
/Users/sky770825/openclaw任務面版設計/src/data/openclawBoardFallback.ts
/Users/sky770825/openclaw任務面版設計/src/data/domains.ts
/Users/sky770825/openclaw任務面版設計/src/data/mdci.ts
/Users/sky770825/openclaw任務面版設計/src/data/index.ts
/Users/sky770825/openclaw任務面版設計/src/data/audit.ts
/Users/sky770825/openclaw任務面版設計/src/data/tasks.ts
/Users/sky770825/openclaw任務面版設計/src/data/user.ts
/Users/sky770825/openclaw任務面版設計/src/data/alerts.ts
/Users/sky770825/openclaw任務面版設計/src/pages
/Users/sky770825/openclaw任務面版設計/src/pages/Settings.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Projects.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Dashboard.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/ReviewCenter.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Domains.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/starship
/Users/sky770825/openclaw任務面版設計/src/pages/EngineDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Alerts.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/TaskList.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/CaseStudies.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Logs.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/ProtectionCenter.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/CommunicationDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/ControlCenter.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/AutomationDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/HubCenters.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/CommunityFrame.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/DefenseCenter.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Live2DShowcase.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/InfraDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/TaskBoard.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/LogisticsDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Runs.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/AIDeck.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/NotFound.tsx
/Users/sky770825/openclaw任務面版設計/src/services
/Users/sky770825/openclaw任務面版設計/src/services/runs.ts
/Users/sky770825/openclaw任務面版設計/src/services/stats.ts
/Users/sky770825/openclaw任務面版設計/src/services/reviewService.ts
/Users/sky770825/openclaw任務面版設計/src/services/logs.ts
/Users/sky770825/openclaw任務面版設計/src/services/seed.ts
/Users/sky770825/openclaw任務面版設計/src/services/api.ts
/Users/sky770825/openclaw任務面版設計/src/services/openclawBoardApi.ts
/Users/sky770825/openclaw任務面版設計/src/services/features.ts
/Users/sky770825/openclaw任務面版設計/src/services/aiMemoryStore.js
/Users/sky770825/openclaw任務面版設計/src/services/federationApi.ts
/Users/sky770825/openclaw任務面版設計/src/services/apiClient.ts
/Users/sky770825/openclaw任務面版設計/src/services/index.ts
/Users/sky770825/openclaw任務面版設計/src/services/config.ts
/Users/sky770825/openclaw任務面版設計/src/services/audit.ts
/Users/sky770825/openclaw任務面版設計/src/services/tasks.ts
/Users/sky770825/openclaw任務面版設計/src/services/user.ts
/Users/sky770825/openclaw任務面版設計/src/services/alerts.ts
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
   67776 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/extensionAPI.js
   64421 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/reply-CxO7Jwvy.js
   64418 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/loader-DmZESx6X.js
   24342 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/plugin-sdk/index.js
   17765 /Users/sky770825/openclaw任務面版設計/openclaw-main/src/canvas-host/a2ui/a2ui.bundle.js
   17765 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/canvas-host/a2ui/a2ui.bundle.js
   17696 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-CCRjIRWt.js
   17695 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/gateway-cli-Bh3UamKy.js
   14264 /Users/sky770825/openclaw任務面版設計/openclaw-main/vendor/a2ui/renderers/angular/package-lock.json
   13188 /Users/sky770825/openclaw任務面版設計/package-lock.json
    8860 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/plugin-sdk/index.d.ts
    8488 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/pi-embedded-helpers-82mBvhjD.js
    7595 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/control-ui/assets/index-DtybWK8_.js
    6214 /Users/sky770825/openclaw任務面版設計/backups/snapshot-20260214-120224/files/server-src-index.ts
    5934 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/index.js
    5751 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/config-guard-D2tKd3wv.js
    5658 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/config-Buxm57-R.js
    5432 /Users/sky770825/openclaw任務面版設計/openclaw-main/ui/src/ui/views/usage.ts
    4918 /Users/sky770825/openclaw任務面版設計/openclaw-main/dist/config-CMxF7aVK.js
```
