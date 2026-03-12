# SkillForge 機器綁定授權系統

## 🔒 安全機制

### 機器指紋
每個 License 會綁定到特定電腦的「機器指紋」，包含：
- 主機名稱
- 作業系統
- CPU 架構
- CPU 型號
- MAC 位址
- 使用者名稱

### 授權規則

| 版本 | 最大綁定數 | 年度更新費 |
|------|-----------|-----------|
| Lite | 1 台 | 無 |
| Pro | 1 台 | $10/年 |
| Enterprise | 5 台 | $50/年 |

## 💻 用戶使用流程

### 首次啟用
```typescript
const skill = createGitHubSkill();

// 第一次使用時，會自動產生機器指紋並綁定
await skill.initialize({
  githubToken: 'ghp_xxx',
  licenseKey: 'SF-PR-XXXX-XXXX-XXXX'
});

// 輸出：
// 📱 機器指紋: A1B2C3D4E5F67890
// ✅ 授權啟用成功，已綁定此設備
```

### 換電腦（轉移授權）
```typescript
// 在舊電腦上解除綁定
await skill.transferLicense();
// ✅ 解除綁定成功！您現在可以在新設備上啟用此授權。

// 在新電腦上重新啟用
await skill.initialize(config);
```

## 🛡️ 防護效果

### 防止的情況
- ❌ 一個 License 被多台電腦同時使用
- ❌ License 被分享給他人
- ❌ 非法複製散佈

### 允許的情況
- ✅ 用戶換電腦（可轉移）
- ✅ Enterprise 多台設備（5台內）
- ✅ 重灌系統後重新啟用（同一台機器）

## 🔧 管理員操作

### 產生 License
```bash
cd scripts
python3 admin-license.py generate <tier> [user_id] [email]

# 範例
python3 admin-license.py generate pro "user123" "user@example.com"
# 輸出：SF-PR-XXXXXXXX-XXXXXXXX-XXXXXXXX
```

### 查詢授權
```bash
python3 admin-license.py info <license_key>
```

### 解除綁定（客服協助）
```bash
python3 admin-license.py unbind <license_key>
```

### 列出所有授權
```bash
python3 admin-license.py list
```

## 📦 檔案結構

```
skill-github-automation/
├── src/
│   ├── license/
│   │   ├── machine.js          # 機器指紋產生
│   │   ├── cloud-verify.js     # 雲端驗證
│   │   └── verify.js           # License 驗證
│   └── ...
├── scripts/
│   └── admin-license.py        # 管理員工具
├── licenses.json               # 授權資料庫
└── skillforge-github-automation-1.0.0.tgz  # 混淆打包產品
```

## 🔐 混淆保護

產品套件使用 **javascript-obfuscator** 進行混淆：
- 控制流扁平化
- 死代碼注入
- 字串加密（RC4）
- 防除錯保護
- 自我防禦機制

## 📞 客服處理流程

### 用戶換電腦
1. 用戶提供 License Key
2. 驗證身份（購買時的 Email/Telegram ID）
3. 執行解除綁定
4. 通知用戶可在新設備啟用

### 用戶反應無法啟用
1. 查詢授權狀態 `admin-license.py info <key>`
2. 確認是否已綁定其他設備
3. 協助解除綁定或查詢原因

## 📝 注意事項

1. **Lite/Pro 僅限 1 台設備**，換電腦需先解除綁定
2. **Enterprise 最多 5 台**，適合團隊使用
3. **年度更新費可選**，不付仍可永久使用現有版本
4. **轉移次數無限制**，但需客服協助解除綁定

---

**系統版本**: v1.0.0  
**更新時間**: 2026-02-12
