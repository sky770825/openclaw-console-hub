# SkillForge GitHub Automation Skill

> 專業級 OpenClaw Skill，讓 GitHub 管理全自動化

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Price](https://img.shields.io/badge/price-USDT%2020%2F50%2F200-orange.svg)](./PRICING.md)

---

## 🚀 快速開始

```bash
# 安裝
npm install @skillforge/github-automation

# 使用
import { createGitHubSkill, SkillConfigBuilder } from '@skillforge/github-automation';

const skill = createGitHubSkill();
await skill.initialize(config);
```

---

## ✨ 功能特色

| 功能 | Lite | Pro | Enterprise |
|------|:----:|:---:|:----------:|
| Issue 自動化 | ✅ | ✅ | ✅ |
| PR 審查輔助 | 基礎 | 完整 | 完整 |
| Release 自動化 | ❌ | ✅ | ✅ |
| Repo 分析 | 基礎 | 完整 | 完整 |
| Webhook 觸發 | ❌ | ✅ | ✅ |
| 多 Repo 支援 | ❌ | ❌ | ✅ |
| 自定義規則 | ❌ | ❌ | ✅ |

---

## 💰 價格方案

| 版本 | 價格 | 適合對象 |
|------|------|----------|
| **Lite** | USDT 20 | 個人開發者 |
| **Pro** | USDT 50 | 小團隊 |
| **Enterprise** | USDT 200 | 企業 |

---

## 📦 安裝教學

### 1. 購買 License

1. 選擇版本（Lite / Pro / Enterprise）
2. 轉帳 USDT (TRC-20) 至：`TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD`
3. 截圖付款記錄，發送至 Telegram: [@gousmaaa](https://t.me/gousmaaa)
4. 24 小時內收到 License Key

### 2. 安裝

```bash
npm install @skillforge/github-automation
```

### 3. 設定

```typescript
import { createGitHubSkill, SkillConfigBuilder } from '@skillforge/github-automation';

const config = new SkillConfigBuilder()
  .setGitHubToken('ghp_你的_token')
  .setLicenseKey('SF-GH-XXXX-XXXX-XXXX')  // 購買後提供
  .setDefaultOwner('your-org')
  .setDefaultRepo('your-repo')
  .enableAllFeatures()
  .build();

const skill = createGitHubSkill();
await skill.initialize(config);
```

---

## 🎯 使用範例

### 建立 Issue

```typescript
const result = await skill.execute({
  action: 'issue.create',
  params: {
    title: '[BUG] 登入失敗',
    body: '## 問題描述\n無法使用 GitHub 登入',
    labels: ['bug', 'auth'],
    assignees: ['developer'],
  },
});

console.log(`Issue created: ${result.data.url}`);
```

### 分析 PR

```typescript
const analysis = await skill.execute({
  action: 'pr.analyze',
  params: {
    pullNumber: 42,
  },
});

console.log(`變更檔案: ${analysis.data.changedFiles}`);
console.log(`新增行數: ${analysis.data.additions}`);
console.log(`刪除行數: ${analysis.data.deletions}`);
```

### 建立 Release

```typescript
await skill.execute({
  action: 'release.create',
  params: {
    tagName: 'v1.0.0',
    name: 'Version 1.0.0',
    generateReleaseNotes: true,
  },
});
```

---

## 🎁 推薦分潤計畫

推薦朋友購買，**雙方各得 USDT 5**！

- 推薦 4 人 = 免費獲得 Lite 版
- 推薦 10 人 = 免費獲得 Pro 版
- 推薦 40 人 = 免費獲得 Enterprise 版

👉 [取得你的專屬分享連結](https://t.me/WhiDan66bot)

---

## 📞 支援

- 💬 Telegram: [@gousmaaa](https://t.me/gousmaaa)
- 📧 Email: support@skillforge.dev
- 🤖 AI 客服: [@WhiDan66bot](https://t.me/WhiDan66bot)

---

## 📝 授權

MIT License - 詳見 [LICENSE](./LICENSE)

**注意**：核心程式碼已混淆處理，僅授權使用，禁止反編譯。

---

Made with ❤️ by SkillForge
