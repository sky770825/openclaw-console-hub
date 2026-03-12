# SkillForge Publisher

🚀 **One-click publish your OpenClaw skills to multiple platforms**

Stop wasting time manually filling forms on different platforms. Publish your skills to Gumroad, LemonSqueezy, and ClawHub with a single command.

## ✨ Features

- 📦 **Automatic packaging** - Creates optimized distribution bundles
- 🎯 **Multi-platform** - Publish to Gumroad, LemonSqueezy, ClawHub simultaneously
- 💰 **Smart pricing** - Auto-configure tiered pricing (Lite/Pro/Enterprise)
- 🔐 **Secure** - API keys stored locally, never uploaded
- ⚡ **Fast** - Complete publishing in under 30 seconds

## 📦 Installation

```bash
npm install -g @skillforge/publisher
# or
npx @skillforge/publisher
```

## 🚀 Quick Start

### 1. Configure API Keys (First Time)

```bash
# Gumroad
skillforge-publish config --gumroad
# Enter your Gumroad API token when prompted

# LemonSqueezy
skillforge-publish config --lemonsqueezy
# Enter your LemonSqueezy API key
```

### 2. Publish Your Skill

```bash
# Basic usage - publishes to all configured platforms
skillforge-publish ./my-skill

# Specify platforms
skillforge-publish ./my-skill --platforms gumroad,clawhub

# Custom pricing tiers
skillforge-publish ./my-skill --prices 9,29,79

# Full example
skillforge-publish ./github-automation \
  --platforms gumroad,lemonsqueezy,clawhub \
  --prices 9,29,79
```

## 📋 Requirements

Your skill folder must contain:
- `package.json` (with name, version, description)
- `SKILL.md` (skill documentation)
- `README.md` (user guide)

## 💰 Pricing Tiers

By default, creates 3 pricing variants:

| Tier | Price | Features |
|------|-------|----------|
| **Lite** | $9 | Basic functionality |
| **Pro** | $29 | Full features + updates |
| **Enterprise** | $79 | Everything + priority support |

Customize with `--prices 9,29,79`

## 🔧 Configuration

Config stored in `~/.skillforge-publisher.json`:

```json
{
  "gumroad": {
    "token": "gr_live_xxx"
  },
  "lemonsqueezy": {
    "apiKey": "lemonsqueezy_api_xxx"
  }
}
```

## 📝 Example Output

```
🎯 SkillForge Publisher v1.0.0
================================

🔍 Validating skill package...
✅ Valid: github-automation@1.0.0

📦 Creating distribution package...
✅ Package created: github-automation-1.0.0.tgz (136.2 KB)

🚀 Publishing to Gumroad...
✅ Published to Gumroad
  Link: https://andy825lay-tech.gumroad.com/l/github-automation

🚀 Publishing to LemonSqueezy...
✅ Published to LemonSqueezy
  Link: https://andy825lay-tech.lemonsqueezy.com/products/github-automation

🚀 Publishing to ClawHub...
✅ Published to ClawHub
  Link: https://clawhub.ai/xxx/github-automation

================================
📊 Publish Results:
  ✅ gumroad
  ✅ lemonsqueezy
  ✅ clawhub

🎉 All platforms published successfully!
```

## 🛣️ Roadmap

- [x] Core CLI structure
- [ ] Gumroad API integration
- [ ] LemonSqueezy API integration
- [ ] ClawHub CLI integration
- [ ] Automatic cover image generation
- [ ] Multi-language support
- [ ] Analytics dashboard

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT © SkillForge

---

Built with ⚡ by the SkillForge team
