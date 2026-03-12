# OpenClaw 官網功能特色頁面 - 技術分析報告
**日期**: Wed Mar  4 19:52:46 CST 2026
**分析目標**: 提取 OpenClaw 官網功能特色頁面的技術實現細節。

## 1. 專案結構掃描
經掃描 `/Users/caijunchang/openclaw任務面版設計`，以下檔案與「功能特色」或「登陸頁」高度相關：

### 關鍵檔案路徑
- openclaw-main/apps/macos/Sources/OpenClaw/AboutSettings.swift
- src/hooks/useFeatures.ts

## 2. 代碼特徵分析 (Grep Results)
以下檔案包含「特色」或 "Feature" 關鍵字，可能是功能描述的來源：
- runtime-checkpoints/task-index/TASK-INDEX.md
- runtime-checkpoints/task-index/task-index.jsonl
- PROPOSAL-REPORT.md
- dist/assets/index-BvFYjfem.js
- dist/assets/openclawBoardApi-Cl-j4ooY.js
- dist/assets/Projects-0BXL64nZ.js
- dist/assets/Alerts-C_AOOZey.js
- dist/assets/index-d_KSUQ-Z.css
- dist/assets/Settings-CXVh-k5o.js
- dist/assets/TaskBoard-B6Lg8pMm.js
- dist/assets/vendor-motion-pe4K7qrU.js
- dist/assets/vendor-three-DSYxx76s.js
- dist/assets/vendor-charts-B3bQJ7zN.js
- dist/assets/index-BByuM4gQ.js
- dist/assets/vendor-echarts-CSMkd9SU.js
- dist/assets/openclaw-cursor-BqvUWFz1.js
- openclaw-v4.jsx
- openclaw-main/ui/src/ui/views/usage.ts
- openclaw-main/ui/src/ui/gateway.ts
- openclaw-main/CHANGELOG.md

## 3. 技術棧推測 (基於檔案分析)
- **前端框架**: React.js
- **樣式方案**: Tailwind CSS
- **路由導向**: node_modules/tunnel-rat/src/index.tsx
node_modules/its-fine/src/index.tsx
node_modules/echarts-for-react/src/.umi-production/core/routes.ts

## 4. 核心功能模組 (摘要)
### File: AboutSettings.swift
```tsx
                    .font(.title3.bold())
                    title: "GitHub",
                AboutLinkRow(icon: "globe", title: "Website", url: "https://openclaw.ai")
                AboutLinkRow(icon: "bird", title: "Twitter", url: "https://twitter.com/steipete")
                AboutLinkRow(icon: "envelope", title: "Email", url: "mailto:peter@steipete.me")
    let title: String
                Text(self.title)
...
```
### File: useFeatures.ts
```tsx
import { getFeatures, type FeatureFlags } from '@/services/features';
const DEFAULTS: FeatureFlags = {
export function useFeatures() {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
        const res = await getFeatures();
          setFeatures({ ...DEFAULTS, ...res.features });
...
```
