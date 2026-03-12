# EasyClaw Pro 網站專案

## 專案概覽

建立一個具有技術美感的一鍵安裝 OpenClaw 服務網站，支援收費模式。

## 專案結構

```
projects/easyclaw-pro/modules/website/
├── src/
│   ├── app/
│   │   ├── globals.css       # 全域樣式（深色科技主題）
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 主頁面
│   └── components/
│       ├── Navbar.tsx        # 導航欄
│       ├── Hero.tsx          # 首屏英雄區
│       ├── PainPoints.tsx    # 痛點說明
│       ├── Features.tsx      # 功能特色
│       ├── HowItWorks.tsx    # 運作流程
│       ├── TechStack.tsx     # 技術堆疊
│       ├── Security.tsx      # 安全說明
│       ├── Pricing.tsx       # 定價方案
│       ├── FAQ.tsx           # 常見問題
│       ├── CTA.tsx           # 行動召換
│       └── Footer.tsx        # 頁腳
├── dist/                      # 構建輸出（靜態網站）
├── package.json
├── next.config.ts
└── ...
```

## 設計特色

### 視覺風格
- **深色科技主題**: #0a0a0f 背景 + 漸變強調色
- **終端機元素**: 程式碼字體、終端視窗設計
- **發光效果**: 霓虹藍紫色光暈
- **網格背景**: 科技感網格圖案

### 頁面結構
1. **Hero** - 品牌宣言 + 終端機預覽 + 統計數據
2. **PainPoints** - 三大部署痛點（紅色警示）
3. **Features** - AI 模型、通訊平台、任務類型
4. **HowItWorks** - 三步驟流程圖
5. **TechStack** - 技術架構展示（終端機風格）
6. **Security** - 四大安全承諾
7. **Pricing** - 兩種收費方案
8. **FAQ** - 折疊式問答
9. **CTA** - 最終行動召換
10. **Footer** - 連結與社交媒體

## 收費模式

| 方案 | 價格 | 內容 |
|------|------|------|
| 標準方案 | NT$899 | 基礎部署 + 電子郵件支援 |
| 進階方案 | NT$1,499 | 客製化 + 30天支援 + 1年更新 |

## 構建資訊

- **技術棧**: Next.js 16 + TypeScript + Tailwind CSS v4
- **構建大小**: ~1.4 MB
- **輸出**: 靜態 HTML (Static Export)
- **部署**: 可部署至 Vercel / Netlify / GitHub Pages

## 檔案位置

- 源碼: `projects/easyclaw-pro/modules/website/`
- 構建輸出: `projects/easyclaw-pro/modules/website/dist/`

## 後續建議

1. 整合支付系統（Stripe / 綠界）
2. 建立部署自動化 API
3. 加入使用者儀表板
4. 建立教學文件中心
