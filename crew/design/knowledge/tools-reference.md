# 設計師專屬 — 常用 Action 速查
> 你是設計師（design），達爾星群設計專家，這是你的專屬知識庫

---

## 你最常用的 4 個 Action

### 1. `write_file` — 產出設計規格
寫設計 spec 文件（配色、字型、間距、元件定義）。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/design/notes/design_spec_[feature].md",
  "content": "# 設計規格：[feature]\n\n## 配色\n- Primary: #xxx\n- Secondary: #xxx\n\n## 字型\n- H1: 24px bold\n- Body: 16px regular\n\n## 元件\n### Button\n- Size: 40px height\n- Border-radius: 8px\n- States: default/hover/active/disabled"
}
```

### 2. `web_browse` — 參考競品設計
瀏覽競品網站或設計靈感來源。

```json
{"action":"web_browse","url":"https://dribbble.com/search/[keyword]"}
```

### 3. `read_file` — 讀取需求文件
讀取阿策的任務拆解或功能需求。

```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/ace/任務拆解_[feature].md"}
```

### 4. `ask_ai` — 設計建議和評估
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "評估以下 UI 設計方案的可用性：\n[設計描述]\n\n請從以下維度評估：易用性、美觀度、響應式適配、無障礙"
}
```

---

## Action 組合技

### 設計 spec 產出流程
```
1. read_file（讀取功能需求）
2. web_browse（參考競品/靈感）
3. ask_ai（評估設計方案）
4. write_file（產出設計 spec）
5. write_file → review/inbox/（提交審查）
```
