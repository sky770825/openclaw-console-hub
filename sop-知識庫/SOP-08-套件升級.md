# SOP-8: 套件升級

## metadata

```yaml
id: sop-08
name: 套件升級
category: 設定管理
tags: [npm, pip, brew, 套件, 升級, 安裝, dependency, breaking change]
version: 2.0
created: 2026-02-16
trigger: 需要安裝新套件或升級既有套件
priority: P1
燈號: 🟡 新套件安裝 / 🔴 既有套件升級
```

---

## 目的

套件升級可能引入 breaking changes 或安全漏洞。先看再裝。

---

## 操作分級

| 操作 | 燈號 | 規則 |
|------|------|------|
| 安裝新套件（npm install X） | 🟡 | 先跟主人說要裝什麼、為什麼 |
| 升級 patch 版本（1.0.0 → 1.0.1） | 🟡 | 先跟主人說 |
| 升級 minor 版本（1.0 → 1.1） | 🔴 | 必須看 changelog + 主人批准 |
| 升級 major 版本（1.x → 2.x） | 🔴🔴 | 必須看 changelog + breaking changes + 主人批准 |
| `npm update`（全部升級） | 🔴🔴 | 絕對禁止未經批准 |

---

## 安裝新套件流程

### Step 1: 回報要裝什麼

```
📦 套件安裝請求

套件：{名稱}@{版本}
用途：{為什麼需要}
週下載數：{X}（npm info {name} 確認）
替代方案：{有沒有其他選擇}
```

### Step 2: 主人批准後安裝

```bash
npm install {package}@{version}
```

### Step 3: 確認沒壞

```bash
npm test
npm run build
```

### Step 4: 回報結果

```
✅ 套件安裝完成
套件：{名稱}@{版本}
測試：{通過/失敗}
```

---

## 升級既有套件流程

### Step 1: 查看 changelog

```bash
npm info {package} changelog
# 或去 GitHub releases 頁面看
```

重點看：
- Breaking changes
- Deprecation warnings
- 安全修復

### Step 2: 回報升級計畫

```
📦 套件升級請求

套件：{名稱}
目前版本：{X.Y.Z}
目標版本：{A.B.C}
Breaking changes：{有/無}
  - {列出 breaking changes}
升級理由：{為什麼要升}
```

### Step 3: 主人批准後升級

```bash
npm install {package}@{version}
npm test
npm run build
```

### Step 4: 回報結果

---

## 絕對禁止

- ❌ `npm update` 不指定套件（全部升級）
- ❌ Major version 升級不看 changelog
- ❌ 刪除 package-lock.json 重新安裝
- ❌ 安裝週下載數 <1,000 的套件（可能有安全風險）
- ❌ 安裝時用 `--force` 或 `--legacy-peer-deps` 不跟主人說

---

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| 安裝後測試失敗 | 回滾：`git checkout package.json package-lock.json && npm install` |
| peer dependency 衝突 | 回報主人，不要用 --force |
| 套件有安全漏洞 | `npm audit` 回報結果，等主人決定 |
| build 失敗 | 回滾，回報錯誤訊息 |

---

## 回報格式

```
📦 套件操作完成

操作：{安裝/升級}
套件：{名稱}@{版本}
測試：{通過/失敗}
Build：{通過/失敗}
備註：{有的話寫}
```
