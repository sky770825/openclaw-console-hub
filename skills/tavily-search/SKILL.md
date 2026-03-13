---
name: tavily-search
description: 使用 Tavily API 執行即時網路搜尋，並提供摘要、連結和相關資訊。適用於需要快速獲取最新網路資訊、研究特定主題或驗證事實的任務。
---

# Tavily Search

## 總覽

這個技能讓達爾能夠利用 Tavily API 進行即時且精準的網路搜尋，快速獲取最新的資訊、新聞和研究結果。

## 如何使用

### 執行搜尋

要執行 Tavily 搜尋，請使用以下命令並提供你的搜尋查詢：

```bash
# 從 workspace 根目錄執行（預設 ~/.openclaw/workspace）
python3 skills/tavily-search/scripts/tavily_search.py --query "你的搜尋內容"
# 或使用絕對路徑
python3 ~/.openclaw/workspace/skills/tavily-search/scripts/tavily_search.py --query "你的搜尋內容"
```
**注意：** `--api-key` 可選；未提供時腳本會從環境變數 `TAVILY_API_KEY` 讀取。建議設定環境變數以保安全。

### 參數

- `--query <string>`: 必填。你的搜尋查詢內容。
- `--api-key <string>`: 可選。你的 Tavily API Key。

## 結果

搜尋結果會以 JSON 格式返回，包含：
- **`query`**: 實際執行的搜尋查詢。
- **`response_type`**: Tavily 回應的類型 (例如 `search_results`)。
- **`results`**: 搜尋結果的列表，每個結果包含：
    - **`title`**: 頁面標題。
    - **`url`**: 頁面連結。
    - **`content`**: 頁面內容摘要。

## Resources (optional)

Create only the resource directories this skill actually needs. Delete this section if no resources are required.

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Codex for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Codex's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Codex should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Codex produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Not every skill requires all three types of resources.**
