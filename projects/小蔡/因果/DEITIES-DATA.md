# 神明殿堂 — 大數據檔案說明

> 本目錄為「諸神」神明資料之單一來源（single source of truth）。**位階順序先依大數據（道教／民間權威資料）定序，再以維基百科校對名稱與條目**。

**建立日期**：2026-02-28  
**位階依據**：見 **`docs/DEITY-RANK-SOURCES.md`**（真靈位業圖、道教神系、民間祀典等）  
**名稱校對**：維基百科中文版（zh.wikipedia.org）  
**資料檔**：`data/deities.json`

---

## 一、檔案用途

- **名稱統一**：全站（首頁、神明殿堂頁、footer、內文）神明稱謂與 `deities.json` 對齊。
- **校對依據**：正式尊號、經典出處、聖號等可對照權威來源與大數據庫。
- **擴充**：新增神明時，在 JSON 補一筆，再依欄位更新頁面或由程式讀取渲染。
- **多語／SEO**：可依此延伸 `name_en`、`slug`、`og:description` 等。

---

## 二、欄位說明（deities.json）

| 欄位 | 說明 | 範例 |
|------|------|------|
| `id` | 唯一識別碼（英文） | `jade-emperor` |
| `name_zh` | 本站採用之正式中文名稱 | 玉皇大天尊 |
| `name_alt` | 別稱、俗稱（陣列） | ["玉皇大帝","天公"] |
| `title_full` | 完整尊號／全銜 | 太上開天執符御曆… |
| `title_short` | 本站副標（因果視角） | 因果總司 |
| `role` | 司職與因果關係描述 | 執掌萬神，分配善惡… |
| `domain` | 職掌範圍（關鍵字陣列） | ["天道","三界"] |
| `scripture` | 經典／出處 | 《高上玉皇本行集經》 |
| `quote` | 神明金句（本站引用） | 玄靈高上帝… |
| `karma_relation` | 與因果主題的關聯 | 宇宙因果律之最高主宰 |
| `source_verify` | 校對依據說明（含維基對照） | 已對照維基百科中文版「xxx」條目… |
| `wiki_zh` | 維基百科中文條目標題 | 玉皇上帝 |
| `wiki_url` | 維基百科條目 URL | https://zh.wikipedia.org/wiki/玉皇上帝 |
| `order` | 顯示順序 | 1 |

---

## 三、神明與維基百科對照

| 本站名稱 | 維基條目標題 | 維基 URL |
|----------|----------------|----------|
| 玉皇大天尊 | 玉皇上帝 | https://zh.wikipedia.org/wiki/玉皇上帝 |
| 城隍 | 城隍 | https://zh.wikipedia.org/wiki/城隍 |
| 閻羅王 | 閻羅王 | https://zh.wikipedia.org/wiki/閻羅王 |
| 地藏菩薩 | 地藏菩薩 | https://zh.wikipedia.org/wiki/地藏菩薩 |
| 鍾馗 | 鍾馗 | https://zh.wikipedia.org/wiki/鍾馗 |

名稱與別稱、全銜已依各維基條目內文核對；`data/deities.json` 內含 `wiki_zh`、`wiki_url`、`source_verify` 欄位。

---

## 四、與本站頁面對應

- **神明殿堂頁**（`pages/deities.html`）：標題、副標、內文、金句應與 `data/deities.json` 一致。
- **首頁**：入口名稱「神明殿堂」、導航「諸神」已與本資料一致。
- **SCRIPTURE-AND-NAMES-VERIFICATION.md**：神明名稱校對結果已與本檔案對齊。

---

## 五、擴充與維護

1. **新增神明**：在 `deities.json` 的 `deities` 陣列中新增一筆，補齊 `name_zh`、`title_full`、`scripture`、`source_verify`。
2. **大數據對接**：若有外部神明資料庫（如維基、宗教辭典 API），可依 `id` 或 `name_zh` 對應，並將差異寫入 `source_verify` 或另建「對照表」。
3. **名稱變更**：修改 JSON 後，請同步更新 `deities.html`、`SCRIPTURE-AND-NAMES-VERIFICATION.md` 及本說明檔。

---

## 六、資料檔路徑

- **JSON**：`data/deities.json`
- **本說明**：`DEITIES-DATA.md`
