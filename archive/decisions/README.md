# 決策歸檔規範 v1.0

> 統一決策記錄格式，確保 Agent 間一致性

---

## 📁 檔案命名規則

```
archive/decisions/YYYY-MM-DD-<decision-name>.md
```

範例：
- `2026-02-15-database-architecture.md`
- `2026-02-15-n8n-integration-architecture.md`

---

## 📋 標準格式模板

```markdown
# [決策標題]

**日期**: YYYY-MM-DD
**決策者**: [誰做的決定]
**狀態**: ✅ 已完成 / 🟡 進行中 / ⏳ 待實施

---

## 決策背景
[為什麼要做這個決定]

## 決策內容
[具體決定了什麼]

## 實施細節
[怎麼執行]

## 影響與風險
[改了之後會怎樣]

## 下一步
[待辦事項]

---
**記錄者**: [Agent 名稱]
**記錄時間**: YYYY-MM-DD HH:MM
```

---

## 📊 決策索引

| 日期 | 檔案 | 狀態 | 記錄者 |
|------|------|------|--------|
| 2026-02-15 | [tech-security-update](2026-02-15-tech-security-update.md) | ✅ | 小蔡 |
| 2026-02-15 | [database-architecture](2026-02-15-database-architecture.md) | ✅ | Claude |
| 2026-02-15 | [n8n-integration](2026-02-15-n8n-integration-architecture.md) | ✅ | Claude |
| 2026-02-15 | [portable-backup](2026-02-15-portable-backup-system.md) | ✅ | Claude |
| 2026-02-15 | [agent-config](2026-02-15-agent-config.md) | ✅ | Claude |

---

## 🔍 查詢方式

```bash
# 查看最新決策
ls -lt archive/decisions/*.md | head -5

# 搜尋關鍵詞
grep -r "關鍵詞" archive/decisions/
```

---
**版本**: v1.0 | **建立時間**: 2026-02-15 | **維護者**: 小蔡
