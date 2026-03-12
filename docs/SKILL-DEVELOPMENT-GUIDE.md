# OpenClaw 技能開發快速上手指南

> 從零開始開發、測試、發佈你的第一個技能

---

## 目錄
1. [什麼是技能？](#什麼是技能)
2. [SKILL.md 結構](#skillmd-結構)
3. [快速開始（6步法）](#快速開始6步法)
4. [測試技能](#測試技能)
5. [發佈技能](#發佈技能)
6. [最佳實踐](#最佳實踐)

---

## 什麼是技能？

技能（Skill）是 OpenClaw 的模組化擴展包，讓 AI 具備特定領域的專業能力。

### 技能能做什麼？
- **專業工作流程** - 多步驟任務的自動化
- **工具整合** - 特定 API 或檔案格式的處理
- **領域知識** - 公司內部規則、業務邏輯
- **資源 bundle** - 腳本、模板、參考文件

### 技能目錄結構

```
skill-name/                     # 技能資料夾（名稱 = 技能名）
├── SKILL.md                    # ✅ 必要：技能的核心定義
│   ├── YAML frontmatter        # 名稱與描述（觸發關鍵）
│   └── Markdown 內容           # 使用說明
├── scripts/                    # 可執行腳本（Python/Bash/JS）
├── references/                 # 參考文件（按需載入）
└── assets/                     # 資源檔（模板、圖片等）
```

---

## SKILL.md 結構

### 1. Frontmatter（必要）

```yaml
---
name: skill-name                      # 技能名稱（小寫、連字符）
description: |
  簡短描述技能功能。
  
  **使用時機**：
  1. 當用戶需要做 X 時
  2. 當用戶提到 Y 關鍵字時
  3. 當需要處理 Z 類型檔案時
---
```

> ⚠️ **關鍵提示**：`description` 決定技能何時被觸發！要寫清楚「什麼情況下使用這個技能」。

### 2. 內容結構建議

```markdown
# Skill 名稱

## 快速開始
簡短的使用範例（1-2 個最常見場景）

## 核心功能
- 功能 A：簡短說明
- 功能 B：簡短說明

## 詳細用法

### 場景一：XXX
\`\`\`bash
# 指令範例
\`\`\`

### 場景二：YYY
...

## 進階參考
- [forms.md](references/forms.md) - 表單處理詳情
- [api.md](references/api.md) - API 完整文件
```

---

## 快速開始（6步法）

### Step 0: 確保工具就緒

確認 `skill-creator` 工具存在：

```bash
ls ~/.openclaw/workspace/skills/skill-creator/scripts/
# 應該看到：init_skill.py, package_skill.py
```

如果沒有，安裝它：

```bash
clawhub install skill-creator
```

---

### Step 1: 理解需求

明確技能要解決什麼問題。問自己：

| 問題 | 範例 |
|------|------|
| 用戶會怎麼問？ | 「幫我處理 PDF」、「查天氣」 |
| 需要什麼工具？ | Python 腳本、API 呼叫、模板檔案 |
| 有重複代碼嗎？ | 每次都寫旋轉 PDF 的程式 → 做成腳本 |

**產出**：列出 2-3 個具體使用場景

---

### Step 2: 規劃資源

根據需求決定需要什麼：

```
需要重複執行的程式碼？ → scripts/
需要參考文件/文件？   → references/
需要模板檔案？        → assets/
```

**範例規劃**：

| 技能類型 | scripts/ | references/ | assets/ |
|---------|----------|-------------|---------|
| PDF 處理 | `rotate_pdf.py`, `merge_pdf.py` | - | - |
| 品牌規範 | - | `guidelines.md` | `logo.png`, `template.pptx` |
| 資料查詢 | `query_db.py` | `schema.md` | - |

---

### Step 3: 初始化技能骨架

使用工具自動建立：

```bash
cd ~/.openclaw/workspace
python3 skills/skill-creator/scripts/init_skill.py \
  my-skill \
  --path skills/ \
  --resources scripts,references,assets
```

參數說明：
- `my-skill`：技能名稱（會自動轉為 `my-skill`）
- `--path`：輸出目錄
- `--resources`：要建立哪些資源目錄（可選）

這會產生：

```
skills/my-skill/
├── SKILL.md              # 帶 TODO 的模板
├── scripts/              # 空目錄
├── references/           # 空目錄
└── assets/               # 空目錄
```

---

### Step 4: 實作內容

#### 4.1 編寫腳本（如果需要）

```python
# scripts/hello.py
#!/usr/bin/env python3
"""
簡短說明這個腳本做什麼
"""
import sys

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    print(f"Hello, {name}!")

if __name__ == "__main__":
    main()
```

**腳本最佳實踐**：
- ✅ 加上執行權限：`chmod +x scripts/hello.py`
- ✅ 使用 `#!/usr/bin/env python3` shebang
- ✅ 處理參數和錯誤情況
- ✅ 在 SKILL.md 中說明用法

#### 4.2 編寫 SKILL.md

```markdown
---
name: hello-world
description: |
  示範技能 - 輸出問候語。
  
  使用時機：
  1. 當用戶說「打招呼」或「問候」
  2. 當需要示範技能開發流程
---

# Hello World 技能

## 快速開始

打招呼給指定對象：

\`\`\`bash
python3 scripts/hello.py "Alice"
# 輸出：Hello, Alice!
\`\`\`

不指定時預設為 "World"：

\`\`\`bash
python3 scripts/hello.py
# 輸出：Hello, World!
\`\`\`

## 腳本說明

| 腳本 | 用途 |
|------|------|
| `hello.py` | 輸出問候語 |
```

**SKILL.md 寫作原則**：
- ✅ 簡潔為上（<500 行）
- ✅ 多用範例，少說明
- ✅ description 寫清楚觸發條件
- ✅ 複雜內容放到 references/

---

### Step 5: 打包技能

```bash
python3 skills/skill-creator/scripts/package_skill.py \
  skills/my-skill \
  ./dist
```

這會：
1. 驗證 SKILL.md 格式
2. 檢查必要欄位
3. 產生 `dist/my-skill.skill` 檔案

`.skill` 檔案本質是 ZIP，可以分享給他人使用。

---

### Step 6: 安裝與測試

#### 安裝技能

```bash
# 方式一：從檔案安裝
clawhub install ./dist/my-skill.skill

# 方式二：直接複製到 skills 目錄
cp -r skills/my-skill ~/.openclaw/workspace/skills/
```

#### 測試技能

安裝後，OpenClaw 會自動讀取。測試方式：

1. **直接對話測試**：
   - 「使用 my-skill 做 XXX」
   - 看 AI 是否正確觸發技能

2. **檢查技能列表**：
   ```bash
   ls ~/.openclaw/workspace/skills/
   # 確認 my-skill 在其中
   ```

---

## 測試技能

### 測試清單

| 測試項目 | 通過標準 |
|---------|---------|
| 技能觸發 | 說出關鍵字時正確載入技能 |
| 腳本執行 | `python3 scripts/xxx.py` 正常運行 |
| 參數傳遞 | 腳本能正確接收參數 |
| 錯誤處理 | 無效輸入時有適當錯誤訊息 |
| 文件載入 | references/ 檔案能被正確讀取 |

### 常見問題

**Q: 技能沒有被觸發？**  
A: 檢查 description 是否包含相關關鍵字

**Q: 腳本找不到？**  
A: 使用相對路徑：`python3 skills/my-skill/scripts/hello.py`

**Q: 權限 denied？**  
A: 加上執行權限：`chmod +x scripts/*.py`

---

## 發佈技能

### 本地分享

直接分享 `.skill` 檔案：

```bash
# 產生可分享檔案
python3 skills/skill-creator/scripts/package_skill.py \
  skills/my-skill \
  ~/Desktop

# ~/Desktop/my-skill.skill 可以分享給其他人
```

### 發佈到 ClawHub

（未來功能）將技能上傳到官方倉庫：

```bash
clawhub publish my-skill
```

### 版本管理建議

```
skills/my-skill/
├── SKILL.md
├── CHANGELOG.md          # 版本變更記錄（可選）
└── version.txt           # 版本號（可選）
```

---

## 最佳實踐

### ✅ 該做的

1. **簡潔優先**：SKILL.md < 500 行，詳細內容放 references/
2. **明確觸發**：description 要寫清楚「什麼情況下使用」
3. **腳本測試**：所有腳本都要實際跑過確認能用
4. **漸進揭露**：基本用法在 SKILL.md，進階用法在 references/
5. **範例導向**：多用代碼範例，少寫長篇說明

### ❌ 不該做的

1. **不要放 README.md**：SKILL.md 就是唯一入口
2. **不要重複內容**：同樣資訊不要同時存在 SKILL.md 和 references/
3. **不要過度設計**：簡單任務用 text 說明即可，不一定要腳本
4. **不要深層嵌套**：references/ 檔案直接連結，不要子目錄

### 設計模式

#### 模式 1: 核心 + 參考文件

```markdown
# PDF 處理

## 快速開始
提取文字：
\`\`\`python
import pdfplumber
...
\`\`\`

## 進階功能
- **表單填寫**：見 [FORMS.md](references/FORMS.md)
- **API 參考**：見 [API.md](references/API.md)
```

#### 模式 2: 多變體支援

```
cloud-deploy/
├── SKILL.md              # 選擇流程
└── references/
    ├── aws.md            # AWS 部署
    ├── gcp.md            # GCP 部署
    └── azure.md          # Azure 部署
```

---

## 快速參考卡

```bash
# 初始化新技能
python3 skills/skill-creator/scripts/init_skill.py \
  <name> --path skills/ --resources scripts,references,assets

# 打包技能
python3 skills/skill-creator/scripts/package_skill.py \
  <skill-path> [output-dir]

# 安裝技能
clawhub install <skill-file>

# 驗證技能（打包時自動執行）
python3 skills/skill-creator/scripts/package_skill.py <skill-path>
```

---

## 下一步

1. 🚀 現在就建立你的第一個技能！
2. 📚 參考現有技能：`ls ~/.openclaw/workspace/skills/`
3. 🔍 查看範例：研究 `skill-creator` 本身的結構

---

> 💡 **提示**：技能開發是迭代的。先做出 MVP（最小可用版本），再根據實際使用情況優化。

**需要幫助？** 查看 `skills/skill-creator/SKILL.md` 獲取完整規範。
