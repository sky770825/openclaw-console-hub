# Linear/Vercel Animation Implementation Research

## 1. Dependency Analysis
The following animation-related libraries were detected in the project:
```
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
    "framer-motion": "^12.34.3",
    "lucide-react": "^0.462.0",
```

## 2. Implementation Patterns Found
### Framer Motion Usage
Framer motion is often used for "Linear-like" smooth layout transitions.
Key files using framer-motion:
```
/Users/sky770825/openclaw任務面版設計/node_modules/motion-dom/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/framer-motion/dist/types/index.d.ts
/Users/sky770825/openclaw任務面版設計/vite.config.ts
/Users/sky770825/openclaw任務面版設計/src/components/starship/fx/MotionPanel.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Dashboard.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/starship/ManufacturingRoadmap.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/starship/FrameworksOverview.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/CaseStudies.tsx
```

### Tailwind CSS Animations
Standard Vercel-style hover effects and transitions:
```
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/@types+aws-lambda@8.10.160/node_modules/@types/aws-lambda/trigger/codebuild-cloudwatch-state.d.ts:            "duration-in-seconds"?: number | undefined; // Not available for COMPLETED phase-type
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/postcss@8.5.6/node_modules/postcss/lib/list.d.ts:     * Safely splits comma-separated values (such as those for `transition-*`
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-behavior) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-delay) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-duration) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-property) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-timing-function) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/view-transition-class) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:    /** [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/view-transition-name) */
/Users/sky770825/openclaw任務面版設計/openclaw-main/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.dom.d.ts:     * [MDN Reference](https://developer.mozilla.org/docs/Web/CSS/transition-delay)
```

### Radix UI (Primitives)
Often used for accessible, animated dialogs and menus:
```
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-menubar/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-tabs/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-progress/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-popper/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-focus-scope/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-portal/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-tooltip/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-radio-group/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-alert-dialog/dist/index.d.ts
/Users/sky770825/openclaw任務面版設計/node_modules/@radix-ui/react-alert-dialog/src/alert-dialog.tsx
```

## 3. Recommended Implementation Strategy (Linear/Vercel Style)
To achieve the requested "Linear/Vercel" aesthetic:
1. **Spring Physics**: Use `type: "spring"` in Framer Motion instead of linear durations.
2. **Layout Transfers**: Use `layoutId` for shared element transitions (e.g., a highliter moving between menu items).
3. **Micro-interactions**: Use scale effects (e.g., `whileTap={{ scale: 0.98 }}`).
4. **Border Gradients**: Use CSS variables and masks for the "Vercel card" glow effect.
