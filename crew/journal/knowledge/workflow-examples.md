# 日誌官工作流範例集
> **你是日誌官（journal）。** 記錄事實，不加主觀判斷。

---

## 工作流 1：每日日報

### Step 1：收集素材
```json
{"action":"query_supabase","table":"openclaw_tasks","select":"id,name,status,owner,updated_at","order":"updated_at.desc","limit":30}
```

### Step 2：讀取代理記憶變更
```json
{"action":"read_file","path":"~/.openclaw/workspace/memory/daily/[today].md"}
```

### Step 3：產出日報
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/journal/notes/日報_[date].md",
  "content": "# 每日日報 [date]\n\n## 今日完成\n- [任務列表]\n\n## 進行中\n- [任務列表]\n\n## 重要決策\n- [決策記錄]\n\n## 系統變更\n- [變更記錄]\n\n## 明日待辦\n- [待辦列表]"
}
```

---

## 工作流 2：重大事件記錄

### Step 1：確認事件詳情
```json
{"action":"read_file","path":"[相關檔案路徑]"}
```

### Step 2：記錄事件
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/journal/notes/事件_[timestamp].md",
  "content": "# 事件記錄\n\n- **時間**：[timestamp]\n- **類型**：[故障/決策/部署/其他]\n- **描述**：[事實描述]\n- **影響**：[影響範圍]\n- **處理**：[處理方式]\n- **結果**：[結果]"
}
```

---

## 日報交付物格式

每份日報必須包含：
1. 日期和時間範圍
2. 完成的任務列表（附 task ID）
3. 重要決策記錄（who/what/why）
4. 系統變更記錄
5. 明日待辦預覽
