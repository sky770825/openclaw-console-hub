# MEMORY_FULL.md - 完整記憶（已轉移至 Notion）

**⚠️ 此檔案已轉移至 Notion 雲端記憶庫，以節省本地 Token。**

---

## 🌐 Notion 雲端記憶庫

**完整記憶頁面：** https://www.notion.so/MEMORY_FULL-302ae7b8d6188120ab2bf7ee40cdc6c0

**包含內容：**
- 重要決定／原則
  - ClawHub 技能安裝
  - Moltbook 認證方式
- 教訓與經驗
- API 配置與設定
- 詳細操作指南

---

## 📖 使用方式

### 方法 1：透過 MEMORY.md 索引
1. 查看 `MEMORY.md` 的關鍵字索引
2. 確定需要詳細資訊後，前往 Notion 連結

### 方法 2：Notion API 直接讀取
```bash
export NOTION_API_KEY="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"
curl -X GET 'https://api.notion.com/v1/blocks/302ae7b8-d618-8120-ab2b-f7ee40cdc6c0/children' \
  -H 'Notion-Version: 2022-06-28' \
  -H "Authorization: Bearer $NOTION_API_KEY"
```

### 方法 3：notion-cli
```bash
npx notion-cli page get 302ae7b8-d618-8120-ab2b-f7ee40cdc6c0
```

---

## ✍️ 寫入新內容

**請直接寫入 Notion 頁面，而非此檔案。**

使用 Notion API 或 notion-cli 新增內容：
```bash
curl -X PATCH 'https://api.notion.com/v1/blocks/302ae7b8-d618-8120-ab2b-f7ee40cdc6c0/children' \
  -H 'Notion-Version: 2022-06-28' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  --data '{"children": [...]}'
```

寫入後，記得更新 `MEMORY.md` 的「最近摘要」和關鍵字索引。

---

_如需緊急本地備份，可從 Notion 匯出 Markdown 格式。_
