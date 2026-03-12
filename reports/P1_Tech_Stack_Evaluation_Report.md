# 美業網站技術棧與架構調研報告 (P1-任務1)
**負責人：** 阿研
**評估日期：** 2026-03-07

## 1. 調研背景
針對美業網站（重視視覺呈現、預約流程、SEO 及行動裝置體驗），評估主流前端框架與 OpenClaw 技術棧的整合度。

## 2. 框架對比分析

| 維度 | Nuxt.js (Vue 3) | Next.js (React) | SvelteKit |
| :--- | :--- | :--- | :--- |
| **FCP / LCP (效能)** | 極佳 (優秀的 SSR/SSG 支援) | 極佳 (React Server Components) | **最優** (無 Virtual DOM, 編譯時優化) |
| **TBT (互動延遲)** | 中高 (取決於 Hydration) | 中 (React 18 Concurrent Mode) | **極低** (Minimal Runtime) |
| **SEO 友善度** | 原生支援完備 | 原生支援完備 | 完備 |
| **開發效率** | 高 (約定大於配置) | 極高 (生態系最豐富) | 極高 (語法簡潔) |
| **數據追蹤整合** | 模組化整合容易 (Nuxt Modules) | 社群套件豐富 | 需較多手動配置 |
| **OpenClaw 相容性** | 高 (符合既有團隊技術偏好) | 中 | 中 |

## 3. 性能指標深度探討 (Core Web Vitals)
- **LCP (Largest Contentful Paint):** 美業網站多高品質圖資，需配合 Image Optimization (Next/Image 或 Nuxt Image)。
- **TBT (Total Blocking Time):** 預約插件若過重會影響 TBT。SvelteKit 在處理複雜互動時具備天然優勢。
- **CLS (Cumulative Layout Shift):** 需嚴格控管字體與圖片佔位。

## 4. 推薦方案：Nuxt.js (Vue 3 Stack)
**原因：**
1. **開發一致性：** 鑑於 OpenClaw 任務面版現有結構與團隊習慣，Nuxt.js 提供最平滑的遷移曲線。
2. **模組化生態：** `@nuxtjs/google-gtag` 與 `@nuxtjs/seo` 可快速完成數據追蹤與 SEO 需求。
3. **混合渲染：** 針對預約後台使用 CSR，針對服務介紹頁面使用 ISR (Incremental Static Regeneration)。

## 5. 擴展性建議
- **State Management:** Pinia (Vue) / Zustand (React)。
- **Tracking:** 整合 GTM (Google Tag Manager) 進行多點觸發分析。
- **Performance Tooling:** 導入 Lighthouse CI 進行自動化效能監控。

