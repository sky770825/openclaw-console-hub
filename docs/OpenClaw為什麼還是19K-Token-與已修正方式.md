# 為什麼傳輸還有 19K Token？與已修正方式

## 原因說明

OpenClaw **在程式層**會把 workspace 的幾個檔案**整份**讀進 system prompt，其中包含 **MEMORY.md**。也就是說：

- 我們雖然在 **AGENTS.md** 裡寫「只讀 MEMORY_INDEX，有關鍵字再搜長期記憶」，
- 但 **Gateway 組裝 context 時**是照固定名單讀檔（AGENTS、SOUL、TOOLS、USER、HEARTBEAT、**MEMORY.md** 等），
- 所以 **MEMORY.md 的完整內容**還是會被載入，導致 token 仍然很大（例如 19K）。

因此只改 AGENTS.md **不會**減少 token，必須讓 **MEMORY.md 本身變小**，Gateway 才會少帶。

---

## 已做的修正（已套用在 workspace）

1. **完整內容搬到 MEMORY_FULL.md**  
   長期記憶的完整版（關於我、老蔡、重要決定、待辦、教訓等）改放在 **`MEMORY_FULL.md`**。

2. **MEMORY.md 改成「關鍵字索引」**  
   - **MEMORY.md** 現在只放：關鍵字列表 + 大數據常見重點對照（精簡版）。
   - OpenClaw 每次載入的還是 **MEMORY.md**，但因為內容已換成小檔，**token 會明顯下降**。

3. **AGENTS 規則更新**  
   - 說明：完整內容在 MEMORY_FULL.md；出現關鍵字時用 `memory_search` 或讀 MEMORY_FULL.md 對應段落，只帶片段進回答。

4. **之後寫入方式**  
   - 新內容寫進 **MEMORY_FULL.md**，並在 **MEMORY.md**（索引）補上對應關鍵字，讓「關鍵字 → 按需調用」繼續有效。

---

## 是否已更新到 OpenClaw？

- **有。** 改動都在 **`~/.openclaw/workspace/`**（OpenClaw 使用的 workspace）：
  - `MEMORY.md` → 已換成索引小檔
  - `MEMORY_FULL.md` → 新增，放完整長期記憶
  - `AGENTS.md` → 已更新載入與寫入規則

- **下次對話**起，Gateway 讀到的 MEMORY.md 就是小檔，**無需重裝或改 OpenClaw 程式**。若 Gateway 已開著，新 session 會用新檔案；若要馬上生效，可重啟 Gateway 或開新對話。

---

## 若之後 token 仍偏高

可再檢查：

- **TOOLS.md**、**SOUL.md**、**USER.md** 是否過長，必要時精簡或拆成「索引 + 按需讀取」。
- **技能列表**：是否只帶 SKILLS_INDEX 的前端必帶，其餘按需（見 SKILLS_INDEX.md）。
- OpenClaw 的 **bootstrapMaxChars**（預設每檔 20000 字）：若在 `openclaw.json` 有設，可視需要調低。
