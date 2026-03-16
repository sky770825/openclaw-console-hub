# Gemini 2.5 Vision 核心能力分析 (v1.1 增強版 2026-02-16)

> Google | Gemini 2.5 Vision | Multimodal/Vision/UI王

## 📖 Overview
Gemini 2.5 Vision (2026), Google's multimodal powerhouse with 1M+ token context, excels in image/video analysis, UI generation, and long-context visual reasoning. Flash variant for cost-efficiency.

## 🎯 核心強項 (Strengths)
1. **Superior Vision Capabilities**
   - Image analysis/generation: Best for UI/design
   - VideoMME #1, long video understanding
   - Native visual thinking/reasoning

2. **Design & Creative Tools**
   - Figma-like UI prototyping
   - Charts, design systems from images
   - Multimodal long-context (1M-2M tokens)

3. **Performance/Cost**
   - Vertex AI low-cost multimodal
   - Flash: Speed + economy

4. **Benchmarks**
   - MMMU, Vibe-Eval high scores (assumed leader)

## 📊 Benchmarks
| Benchmark | Score | Rank |
|-----------|-------|------|
| VideoMME | #1 | Video understanding |
| Context | 1M-2M tokens | Leader |
| Multimodal | Top | vs Opus Vision |

Sources: Google Blog, Vertex docs (2026)

## ⚔️ 比較表 (Comparisons)
| Feature | Gemini 2.5V | Grok 4.1 | GPT-5.2 | Sonnet-4.5 | Auto-GPT | Einstein | Trivy |
|---------|-------------|----------|---------|------------|----------|----------|-------|
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | N/A | N/A | Fast |
| Vision/Multi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | N/A | Enterprise | N/A |
| Coding | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Auto | Low-code | N/A |
| Cost | Low | Low | High | Medium | Open | Sub | Free |
| OpenClaw Fit | Vision tools | Reasoning | Agents | Code | Autonomy | CRM | Security |

**Summary**: Unmatched in vision/UI; complements coding models.

## 🔌 OpenClaw 整合 (Integration)
- **Model**: `gemini-25-pro-free` / Flash via Google API
- **AGENTS.md**: L3 for vision tasks (free quota)
- **Tools Synergy**:
  - `image` tool primary
  - `canvas`, `browser` snapshot → Gemini analysis
  - `nodes` camera/screen for real-time vision
- **Usage Example**:
  ```
  image prompt=\"Analyze this UI screenshot...\"
  model=gemini-25-pro-free
  ```
- **Pro Tip**: Chain with Grok for reasoning post-vision

## 📂 Additional Content
- [strengths.md](./strengths.md)
- [comparisons.md](./comparisons.md)
- [integration.md](./integration.md)

**更新**: Expanded multimodal details, OpenClaw vision workflow. v1.1 by subagent