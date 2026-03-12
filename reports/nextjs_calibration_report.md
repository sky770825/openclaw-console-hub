# Next.js Calibration Report: Dual Nature (Server vs Client)
**Generated on:** Wed Mar  4 20:04:03 CST 2026
**Project Root:** /Users/caijunchang/openclaw任務面版設計

## Executive Summary
This report calibrates our understanding of the Next.js architecture used in this project. By identifying the distribution of Server and Client components, we ensure alignment with Next.js 13/14 App Router patterns.

## Technical Analysis
- **Total Components (.tsx):** 115
- **Client Components ('use client'):** 3
- **Estimated Server Components:** 112
- **Explicit Async Components Found:** 0

### Key Findings
1. **Hybrid Architecture:** The project utilizes both Server and Client components. 
2. **Boundary Identification:** Client components are identified by the "use client" directive at the top of the file.
3. **Data Fetching:** Most data fetching should ideally reside in the Server components to reduce client-side bundle size.

## Action Items for Calibration
- Ensure heavy logic and sensitive API calls stay in Server Components.
- Use Client Components only when interactivity (hooks, event listeners) is required.
- Maintain a clear directory structure to distinguish between shared UI and route-specific logic.

