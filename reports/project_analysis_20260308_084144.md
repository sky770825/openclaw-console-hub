# OpenClaw Project Analysis Report
Task Context: [Claude Code] 老蔡授權任務
Analysis Timestamp: Sun Mar  8 08:41:44 CST 2026
---
## Core Structure
```bash
aegis-scanner-v0.1/
armory/
auto-executor-state.json
auto-task-generator-state.json
backups/
beauty-industry-website/
bun.lockb*
CLAUDE.md
components.json
control_scripts.py
control_scripts.py.bak
cookbook/
create_xiaocai_ideas_table.sql
deploy/
dev.log
dist/
docs/
eslint.config.js
health-report-google.com-20260227-053842.json
index.html
knowledge/
logs/
memories/
monitoring_engine.py
monitoring_engine.py.bak
n8n-workflows/
node_modules/
nohup.out
ollama_bot2_launchd.err.log
ollama_bot2_launchd.log
ollama_bot2.env.example
ollama_bot2.log
ollama_bot2.py
ollama_client.py
ollama_monitor_bot.log
ollama_monitor_bot.py
ollama任務版.jsx
openclaw-不是正式.jsx
openclaw-cursor.jsx
openclaw-main/
openclaw-v4.jsx
package-lock.json
package.json
postcss.config.js
projects/
PROPOSAL-REPORT.md
public/
rag_update.err.log
rag_update.log
railway.json
README.md
RESULT.md
runtime-checkpoints/
sandbox/
scripts/
server/
server.log
skills/
src/
subagents/
supabase/
tailwind.config.ts
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
vitest.config.ts
```

## Sub-Module Discovery
### Server Architecture
```
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
/Users/caijunchang/openclaw任務面版設計/server/dist
/Users/caijunchang/openclaw任務面版設計/server/dist/domains.js
/Users/caijunchang/openclaw任務面版設計/server/dist/featuresRouter.js
/Users/caijunchang/openclaw任務面版設計/server/dist/types
/Users/caijunchang/openclaw任務面版設計/server/dist/openclawSupabase.js
/Users/caijunchang/openclaw任務面版設計/server/dist/types.js
/Users/caijunchang/openclaw任務面版設計/server/dist/logger.js
/Users/caijunchang/openclaw任務面版設計/server/dist/features.js
/Users/caijunchang/openclaw任務面版設計/server/dist/strategy.js
/Users/caijunchang/openclaw任務面版設計/server/dist/preload-dotenv.js
/Users/caijunchang/openclaw任務面版設計/server/dist/commercial_data.js
/Users/caijunchang/openclaw任務面版設計/server/dist/astro_landing_plan.js
/Users/caijunchang/openclaw任務面版設計/server/dist/workflow-engine.js
/Users/caijunchang/openclaw任務面版設計/server/dist/store.js
/Users/caijunchang/openclaw任務面版設計/server/dist/middlewares
/Users/caijunchang/openclaw任務面版設計/server/dist/research.js
/Users/caijunchang/openclaw任務面版設計/server/dist/n8nClient.js
/Users/caijunchang/openclaw任務面版設計/server/dist/emergency-stop.js
/Users/caijunchang/openclaw任務面版設計/server/dist/index.js
/Users/caijunchang/openclaw任務面版設計/server/dist/trackingConfig.js
/Users/caijunchang/openclaw任務面版設計/server/dist/utils
/Users/caijunchang/openclaw任務面版設計/server/dist/supabase.js
/Users/caijunchang/openclaw任務面版設計/server/dist/models
/Users/caijunchang/openclaw任務面版設計/server/dist/promptGuard.js
/Users/caijunchang/openclaw任務面版設計/server/dist/riskClassifier.js
/Users/caijunchang/openclaw任務面版設計/server/dist/tracking.js
/Users/caijunchang/openclaw任務面版設計/server/dist/openclawMapper.js
/Users/caijunchang/openclaw任務面版設計/server/dist/businessStrategy.js
/Users/caijunchang/openclaw任務面版設計/server/dist/executor-agents.js
/Users/caijunchang/openclaw任務面版設計/server/dist/error-handler.js
/Users/caijunchang/openclaw任務面版設計/server/dist/analytics.controller.js
/Users/caijunchang/openclaw任務面版設計/server/dist/anti-stuck.js
/Users/caijunchang/openclaw任務面版設計/server/dist/researchData.js
/Users/caijunchang/openclaw任務面版設計/server/dist/analytics.js
/Users/caijunchang/openclaw任務面版設計/server/dist/astroPlanning.js
/Users/caijunchang/openclaw任務面版設計/server/dist/websocket.js
/Users/caijunchang/openclaw任務面版設計/server/dist/telegram
/Users/caijunchang/openclaw任務面版設計/server/dist/projectPlan.js
/Users/caijunchang/openclaw任務面版設計/server/dist/planningService.js
/Users/caijunchang/openclaw任務面版設計/server/dist/seed.js
/Users/caijunchang/openclaw任務面版設計/server/dist/taskCompliance.js
/Users/caijunchang/openclaw任務面版設計/server/dist/astroProjectPlan.js
/Users/caijunchang/openclaw任務面版設計/server/dist/controllers
/Users/caijunchang/openclaw任務面版設計/server/dist/routes
/Users/caijunchang/openclaw任務面版設計/server/dist/services
/Users/caijunchang/openclaw任務面版設計/server/dist/validation
/Users/caijunchang/openclaw任務面版設計/server/dist/governanceEngine.js
/Users/caijunchang/openclaw任務面版設計/server/Dockerfile
/Users/caijunchang/openclaw任務面版設計/server/projects
/Users/caijunchang/openclaw任務面版設計/server/projects/batcha-test
/Users/caijunchang/openclaw任務面版設計/server/node_modules
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tinyglobby
/Users/caijunchang/openclaw任務面版設計/server/node_modules/helmet
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@paralleldrive
/Users/caijunchang/openclaw任務面版設計/server/node_modules/fast-safe-stringify
/Users/caijunchang/openclaw任務面版設計/server/node_modules/formidable
/Users/caijunchang/openclaw任務面版設計/server/node_modules/zod
/Users/caijunchang/openclaw任務面版設計/server/node_modules/obug
/Users/caijunchang/openclaw任務面版設計/server/node_modules/destroy
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@types
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pino-std-serializers
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pino
/Users/caijunchang/openclaw任務面版設計/server/node_modules/asap
/Users/caijunchang/openclaw任務面版設計/server/node_modules/toidentifier
/Users/caijunchang/openclaw任務面版設計/server/node_modules/content-type
/Users/caijunchang/openclaw任務面版設計/server/node_modules/es-errors
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@noble
/Users/caijunchang/openclaw任務面版設計/server/node_modules/ms
/Users/caijunchang/openclaw任務面版設計/server/node_modules/content-disposition
/Users/caijunchang/openclaw任務面版設計/server/node_modules/math-intrinsics
/Users/caijunchang/openclaw任務面版設計/server/node_modules/methods
/Users/caijunchang/openclaw任務面版設計/server/node_modules/playwright-core
/Users/caijunchang/openclaw任務面版設計/server/node_modules/dotenv
/Users/caijunchang/openclaw任務面版設計/server/node_modules/std-env
/Users/caijunchang/openclaw任務面版設計/server/node_modules/has-tostringtag
/Users/caijunchang/openclaw任務面版設計/server/node_modules/strip-json-comments
/Users/caijunchang/openclaw任務面版設計/server/node_modules/help-me
/Users/caijunchang/openclaw任務面版設計/server/node_modules/proxy-addr
/Users/caijunchang/openclaw任務面版設計/server/node_modules/depd
/Users/caijunchang/openclaw任務面版設計/server/node_modules/estree-walker
/Users/caijunchang/openclaw任務面版設計/server/node_modules/chai
/Users/caijunchang/openclaw任務面版設計/server/node_modules/range-parser
/Users/caijunchang/openclaw任務面版設計/server/node_modules/side-channel-list
/Users/caijunchang/openclaw任務面版設計/server/node_modules/bytes
/Users/caijunchang/openclaw任務面版設計/server/node_modules/call-bind-apply-helpers
/Users/caijunchang/openclaw任務面版設計/server/node_modules/nanoid
/Users/caijunchang/openclaw任務面版設計/server/node_modules/supertest
/Users/caijunchang/openclaw任務面版設計/server/node_modules/express
/Users/caijunchang/openclaw任務面版設計/server/node_modules/encodeurl
/Users/caijunchang/openclaw任務面版設計/server/node_modules/real-require
/Users/caijunchang/openclaw任務面版設計/server/node_modules/once
/Users/caijunchang/openclaw任務面版設計/server/node_modules/vitest
/Users/caijunchang/openclaw任務面版設計/server/node_modules/assertion-error
/Users/caijunchang/openclaw任務面版設計/server/node_modules/merge-descriptors
/Users/caijunchang/openclaw任務面版設計/server/node_modules/sonic-boom
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tslib
/Users/caijunchang/openclaw任務面版設計/server/node_modules/magic-string
/Users/caijunchang/openclaw任務面版設計/server/node_modules/array-flatten
/Users/caijunchang/openclaw任務面版設計/server/node_modules/picomatch
/Users/caijunchang/openclaw任務面版設計/server/node_modules/safe-buffer
/Users/caijunchang/openclaw任務面版設計/server/node_modules/function-bind
/Users/caijunchang/openclaw任務面版設計/server/node_modules/ee-first
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tsx
/Users/caijunchang/openclaw任務面版設計/server/node_modules/typescript
/Users/caijunchang/openclaw任務面版設計/server/node_modules/inherits
/Users/caijunchang/openclaw任務面版設計/server/node_modules/iconv-lite
/Users/caijunchang/openclaw任務面版設計/server/node_modules/es-define-property
/Users/caijunchang/openclaw任務面版設計/server/node_modules/postcss
/Users/caijunchang/openclaw任務面版設計/server/node_modules/fresh
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@rollup
/Users/caijunchang/openclaw任務面版設計/server/node_modules/get-intrinsic
/Users/caijunchang/openclaw任務面版設計/server/node_modules/qs
/Users/caijunchang/openclaw任務面版設計/server/node_modules/call-bound
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pino-pretty
/Users/caijunchang/openclaw任務面版設計/server/node_modules/combined-stream
/Users/caijunchang/openclaw任務面版設計/server/node_modules/dunder-proto
/Users/caijunchang/openclaw任務面版設計/server/node_modules/path-to-regexp
/Users/caijunchang/openclaw任務面版設計/server/node_modules/hasown
/Users/caijunchang/openclaw任務面版設計/server/node_modules/safer-buffer
/Users/caijunchang/openclaw任務面版設計/server/node_modules/side-channel-weakmap
/Users/caijunchang/openclaw任務面版設計/server/node_modules/mime-types
/Users/caijunchang/openclaw任務面版設計/server/node_modules/undici-types
/Users/caijunchang/openclaw任務面版設計/server/node_modules/end-of-stream
/Users/caijunchang/openclaw任務面版設計/server/node_modules/superagent
/Users/caijunchang/openclaw任務面版設計/server/node_modules/type-is
/Users/caijunchang/openclaw任務面版設計/server/node_modules/minimist
/Users/caijunchang/openclaw任務面版設計/server/node_modules/on-exit-leak-free
/Users/caijunchang/openclaw任務面版設計/server/node_modules/playwright
/Users/caijunchang/openclaw任務面版設計/server/node_modules/split2
/Users/caijunchang/openclaw任務面版設計/server/node_modules/siginfo
/Users/caijunchang/openclaw任務面版設計/server/node_modules/fdir
/Users/caijunchang/openclaw任務面版設計/server/node_modules/vary
/Users/caijunchang/openclaw任務面版設計/server/node_modules/quick-format-unescaped
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tinybench
/Users/caijunchang/openclaw任務面版設計/server/node_modules/unpipe
/Users/caijunchang/openclaw任務面版設計/server/node_modules/has-symbols
/Users/caijunchang/openclaw任務面版設計/server/node_modules/picocolors
/Users/caijunchang/openclaw任務面版設計/server/node_modules/raw-body
/Users/caijunchang/openclaw任務面版設計/server/node_modules/http-errors
/Users/caijunchang/openclaw任務面版設計/server/node_modules/vite
/Users/caijunchang/openclaw任務面版設計/server/node_modules/accepts
/Users/caijunchang/openclaw任務面版設計/server/node_modules/safe-stable-stringify
/Users/caijunchang/openclaw任務面版設計/server/node_modules/cookie-signature
/Users/caijunchang/openclaw任務面版設計/server/node_modules/forwarded
/Users/caijunchang/openclaw任務面版設計/server/node_modules/negotiator
/Users/caijunchang/openclaw任務面版設計/server/node_modules/body-parser
/Users/caijunchang/openclaw任務面版設計/server/node_modules/atomic-sleep
/Users/caijunchang/openclaw任務面版設計/server/node_modules/process-warning
/Users/caijunchang/openclaw任務面版設計/server/node_modules/express-rate-limit
/Users/caijunchang/openclaw任務面版設計/server/node_modules/dezalgo
/Users/caijunchang/openclaw任務面版設計/server/node_modules/utils-merge
/Users/caijunchang/openclaw任務面版設計/server/node_modules/rollup
/Users/caijunchang/openclaw任務面版設計/server/node_modules/joycon
/Users/caijunchang/openclaw任務面版設計/server/node_modules/side-channel
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pump
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@supabase
/Users/caijunchang/openclaw任務面版設計/server/node_modules/cors
/Users/caijunchang/openclaw任務面版設計/server/node_modules/expect-type
/Users/caijunchang/openclaw任務面版設計/server/node_modules/es-module-lexer
/Users/caijunchang/openclaw任務面版設計/server/node_modules/cookiejar
/Users/caijunchang/openclaw任務面版設計/server/node_modules/serve-static
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@standard-schema
/Users/caijunchang/openclaw任務面版設計/server/node_modules/iceberg-js
/Users/caijunchang/openclaw任務面版設計/server/node_modules/object-assign
/Users/caijunchang/openclaw任務面版設計/server/node_modules/get-proto
/Users/caijunchang/openclaw任務面版設計/server/node_modules/form-data
/Users/caijunchang/openclaw任務面版設計/server/node_modules/delayed-stream
/Users/caijunchang/openclaw任務面版設計/server/node_modules/thread-stream
/Users/caijunchang/openclaw任務面版設計/server/node_modules/mime
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@vitest
/Users/caijunchang/openclaw任務面版設計/server/node_modules/asynckit
/Users/caijunchang/openclaw任務面版設計/server/node_modules/ipaddr.js
/Users/caijunchang/openclaw任務面版設計/server/node_modules/cookie
/Users/caijunchang/openclaw任務面版設計/server/node_modules/gopd
/Users/caijunchang/openclaw任務面版設計/server/node_modules/escape-html
/Users/caijunchang/openclaw任務面版設計/server/node_modules/dateformat
/Users/caijunchang/openclaw任務面版設計/server/node_modules/why-is-node-running
/Users/caijunchang/openclaw任務面版設計/server/node_modules/statuses
/Users/caijunchang/openclaw任務面版設計/server/node_modules/esbuild
/Users/caijunchang/openclaw任務面版設計/server/node_modules/stackback
/Users/caijunchang/openclaw任務面版設計/server/node_modules/parseurl
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@jridgewell
/Users/caijunchang/openclaw任務面版設計/server/node_modules/etag
/Users/caijunchang/openclaw任務面版設計/server/node_modules/component-emitter
/Users/caijunchang/openclaw任務面版設計/server/node_modules/wrappy
/Users/caijunchang/openclaw任務面版設計/server/node_modules/fast-copy
/Users/caijunchang/openclaw任務面版設計/server/node_modules/send
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tinyexec
/Users/caijunchang/openclaw任務面版設計/server/node_modules/finalhandler
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pathe
/Users/caijunchang/openclaw任務面版設計/server/node_modules/pino-abstract-transport
/Users/caijunchang/openclaw任務面版設計/server/node_modules/es-set-tostringtag
/Users/caijunchang/openclaw任務面版設計/server/node_modules/colorette
/Users/caijunchang/openclaw任務面版設計/server/node_modules/side-channel-map
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@pinojs
/Users/caijunchang/openclaw任務面版設計/server/node_modules/object-inspect
/Users/caijunchang/openclaw任務面版設計/server/node_modules/tinyrainbow
/Users/caijunchang/openclaw任務面版設計/server/node_modules/resolve-pkg-maps
/Users/caijunchang/openclaw任務面版設計/server/node_modules/on-finished
/Users/caijunchang/openclaw任務面版設計/server/node_modules/fsevents
/Users/caijunchang/openclaw任務面版設計/server/node_modules/ws
/Users/caijunchang/openclaw任務面版設計/server/node_modules/secure-json-parse
/Users/caijunchang/openclaw任務面版設計/server/node_modules/debug
/Users/caijunchang/openclaw任務面版設計/server/node_modules/source-map-js
/Users/caijunchang/openclaw任務面版設計/server/node_modules/media-typer
/Users/caijunchang/openclaw任務面版設計/server/node_modules/mime-db
/Users/caijunchang/openclaw任務面版設計/server/node_modules/es-object-atoms
/Users/caijunchang/openclaw任務面版設計/server/node_modules/get-tsconfig
/Users/caijunchang/openclaw任務面版設計/server/node_modules/@esbuild
/Users/caijunchang/openclaw任務面版設計/server/node_modules/setprototypeof
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
```
### Frontend Architecture (React/Vue/Static)
```
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
## Technical Stack
```json
{
  "name": "openclaw-starship-ui",
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
