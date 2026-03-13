# Skills 目錄檢查報告

檢查時間：依執行日為準  
目錄：`~/.openclaw/workspace/skills/`

---

## 總覽

| 項目 | 結果 |
|------|------|
| 技能總數 | **55** |
| 缺少 SKILL.md | **0**（全部皆有） |
| 缺少 name/標題 | **0**（皆有 frontmatter 或 `# 標題`） |
| 有 scripts/ 的技能 | 見下表 |

---

## 有腳本的技能與檔案對應

以下技能含 `scripts/`，且 SKILL.md 內提到的腳本皆存在：

| 技能 | 腳本 | 備註 |
|------|------|------|
| ceo-delegation | monitor.py | ✓ |
| model-usage | model_usage.py | ✓ |
| nano-banana-pro | generate_image.py | ✓ |
| openai-image-gen | gen.py | ✓ |
| openai-whisper-api | transcribe.sh | ✓ |
| playwright-scraper-skill | playwright-simple.js, playwright-stealth.js | 需先 `npm install` + `npx playwright install chromium` |
| screen-vision | vision_ocr.swift, click.swift | macOS，需螢幕錄製與輔助使用權限 |
| skill-creator | init_skill.py, package_skill.py, quick_validate.py | ✓ |
| tavily-search | tavily_search.py | 需 TAVILY_API_KEY |
| tmux | find-sessions.sh, wait-for-text.sh | ✓ |
| video-frames | frame.sh | ✓ |

---

## 注意事項（非錯誤）

1. **ec-session-cleaner**  
   - 資料夾名：`ec-session-cleaner`  
   - frontmatter `name`: `session-cleaner`  
   - 屬顯示名稱與目錄不同，不影響載入。

2. **local-places**  
   - SKILL.md 內有 `cd {baseDir}`，需由執行環境替換為實際技能根目錄（例如 `skills/local-places`）。

3. **playwright-scraper-skill**  
   - 安裝說明為 `cd playwright-scraper-skill`；若從 workspace 根目錄執行，應為 `cd skills/playwright-scraper-skill`。

4. **caldav-calendar**  
   - metadata 標註 `"os": ["linux"]`，依賴 vdirsyncer + khal；macOS 需自行確認安裝方式。

5. **sherpa-onnx-tts**  
   - 需設定 `SHERPA_ONNX_RUNTIME_DIR`、`SHERPA_ONNX_MODEL_DIR`，並依 SKILL.md 下載 runtime 與模型。

---

## 技能一覽（依名稱）

```
1password, adaptive-reasoning, apple-notes, apple-reminders, bear-notes,
blogwatcher, blucli, bluebubbles, caldav-calendar, camsnap, canvas,
ceo-delegation, clawhub, coding-agent, daily-evolution, discord,
ec-session-cleaner, eightctl, food-order, gemini, gifgrep, github, gog,
goplaces, healthcheck, himalaya, imsg, llm-supervisor, local-places,
mcporter, model-usage, nano-banana-pro, nano-pdf, notion, obsidian,
openai-image-gen, openai-whisper, openai-whisper-api, openhue, oracle,
ordercli, peekaboo, playwright-scraper-skill, sag, screen-vision,
session-logs, sherpa-onnx-tts, skill-creator, slack, songsee, sonoscli,
spotify-player, summarize, tavily-search, things-mac, tmux, trello,
video-frames, voice-call, wacli, weather
```

---

## 結論

- 所有技能目錄皆具備 **SKILL.md**，且具 name 或標題。
- 有 `scripts/` 的技能，其 SKILL.md 提及的腳本皆存在於對應目錄。
- 未發現缺少檔案或路徑錯誤；僅有上述注意事項供後續使用或文件更新時參考。
