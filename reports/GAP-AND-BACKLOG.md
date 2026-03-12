# 因果真相 — 尚未完成／缺漏清單

> 更新：2026-02-28（已補齊：地獄圖、禪樂、導航快捷、會員顯示名稱、淨心神咒、config 範例、全頁導航含測驗/懺悔、討論區真實資訊說明、模擬器場域+照片+光線打照片）  
> 用途：檢視目前還有哪些沒做、待補、或規劃中未實作的部分。

---

## 一、資料與後端（尚未接上）

| 項目 | 現狀 | 缺漏／待辦 |
|------|------|------------|
| **首頁投稿** | 寫入 localStorage `causelaw_submissions` | 尚未接 Supabase，投稿未進資料庫 |
| **討論區列表** | 讀 mock 三筆 + localStorage 審核通過 | 尚未從 Supabase 讀 `causelaw_posts`（status=approved） |
| **投稿詳情** | 讀 mock / 審核通過的 localStorage | 尚未從 Supabase 讀單則 + 留言 |
| **投稿留言** | 審核通過的投稿留言存 localStorage | 尚未寫入 Supabase `causelaw_comments` |
| **會員系統** | 無登入／註冊 | 未實作；設計在 FORUM-DESIGN.md，表結構在 SUPABASE-SETUP.md |
| **福報加分** | 設計有「審核通過可獲功德・福報」 | 未與會員或功過格連動，僅文案提示 |

**程式內標註**：index.html（TODO: 連接 Supabase）、forum.html / post.html（之後會從 Supabase 載入）、post.html 留言（TODO: 提交到 Supabase）。

---

## 二、圖片資源（已處理／待替換）

### 神明殿堂（deities.html）
| 路徑 | 說明 |
|------|------|
| `images/deities/jade-emperor.png` | 玉皇大天尊：已加 `onerror`  fallback 至維基圖，本地無檔時不破圖。 |

### 十八地獄（hell.html）— 共 18 張
**現狀**：使用本地 `images/hell/xxx.jpg`，並於 IMAGE-PROMPTS.md 提供中國風煉獄・靈體哀嚎之生成指令；若無圖則破圖，可依 prompt 自製後放入。

---

## 三、經咒・禪樂（audio.html）— 已補齊

| 項目 | 現狀 |
|------|------|
| 梵唄鐘磬 | ✅ Mixkit 鐘聲外連，點擊播放 |
| 古琴心韻 | ✅ Mixkit 禪樂外連 |
| 喜馬拉雅缽音 | ✅ Mixkit 鐘／缽音效外連 |

---

## 四、道教神咒（audio.html）

淨心神咒：**已補** YouTube 早晚課影片連結（CSzhIvYD_d4），點擊可播放。  
淨口、淨身、安土地、開經玄蘊：仍為「展開咒文跟誦」+ 提示音檔可至道觀請購。

---

## 五、導航頁（guide.html）— 已部分實作

**已補齊**：
- 「我現在要…」快捷區塊：懺悔祈福、記功過、靜心誦經、了解地獄、看案例、覺醒測驗，皆連結至對應頁面。
- 與功過格 localStorage 連動：若尚未有任一功過記錄，顯示「建議先完成今日功過格」。

**尚未實作**（可選）：情境導航、今日一導、五道可點選圖、羅盤／地圖節點。

---

## 六、其他文件／Backlog 提及

| 來源 | 內容 | 狀態 |
|------|------|------|
| MISSION-HANDOFF.md | 技術審計（file:// 下外連穩定性） | 未做 |
| MISSION-HANDOFF.md | 影像校準（prompts.js、8K 寫實提示詞） | 未做 |
| MISSION-HANDOFF.md | 字級加壓（4K 螢幕文字大小） | 未做 |
| MISSION-HANDOFF.md | 神明卡片「金光脈衝」CSS | 未做 |
| MISSION-HANDOFF.md | 地獄垂直維度模擬地圖 | 未做 |
| IMAGE-PROMPTS.md | 各頁 Hero / 主視覺圖（hero-hall、realms、wall、guide、cases、audio、merit、quiz、simulator、faq、whitepaper） | 路徑與 prompt 已列，圖檔未建 |
| FORUM-DESIGN.md | 提交後顯示「已提交，待審核中」 | 首頁目前為 alert，可改為頁內提示 |
| FORUM-DESIGN.md | 留言按讚 localStorage 防重複 | post.html 按讚為前端累加，未防重複 |

---

## 七、後台與設定

| 項目 | 狀態 |
|------|------|
| 後台 admin.html | ✅ 已建，Supabase 審核 + OTP 角色門禁（moderator/admin/superadmin） |
| 後台連結 | 刻意不放在首頁導航，僅站方知悉路徑 |
| 管理員啟用 | 需先執行 `2026-03-01-bootstrap-admin-members.sql` 建立管理角色 |
| **會員顯示名稱** | ✅ 首頁可「設定顯示名稱」存 localStorage；投稿與討論區留言會預填；導航列顯示「會員：xxx」 |
| **Supabase 設定範例** | ✅ 已新增 `causelaw-config.js.example`，複製為 `causelaw-config.js` 填入 URL/KEY 即可使用前端連線 |

---

## 八、近期已補強（無需再做）

- **全站導航**：測驗、懺悔祈福牆、參悟、討論區、模擬等入口已出現在所有子頁 nav。
- **討論區・真實資訊**：討論區與投稿內頁已標示「所有投稿與留言公開可見，請僅分享真實經歷與善意回應」；首頁投稿區亦註明「所有人皆可看見，故資訊須為真實」。
- **模擬器**：對方照片置於場域中央、身體部位疊在照片上點擊投射；漣漪改為畫在 canvas 上並覆蓋照片，光線可「彈到」照片上。
- **懺悔祈福牆**：訊息可持久化、可點擊查看、堆疊排版、表單含對象／署名／內容。

---

## 九、小結：優先順序建議

1. ~~**必補（避免破圖）**~~：✅ 玉皇圖已加 fallback；地獄為本地路徑 + IMAGE-PROMPTS 自製指引。
2. **功能完整**：接 Supabase（投稿、討論區、留言、審核狀態）；會員顯示名稱已做（localStorage），正式登入／福報連動待後端。
3. ~~**體驗升級**~~：✅ 梵唄／古琴／缽音、導航「我現在要…」+ 功過格提示、淨心神咒 YouTube、討論區真實資訊說明、模擬器場域一體已補。
4. **視覺與內容**：地獄圖依 IMAGE-PROMPTS 自製；各頁 Hero 圖依 IMAGE-PROMPTS；神明金光脈衝、字級與地獄地圖等依 MISSION-HANDOFF 擇項實作。
