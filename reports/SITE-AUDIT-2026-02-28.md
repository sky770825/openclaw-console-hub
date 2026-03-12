# 因果真相網站 — 功能檢查報告

> 檢查日期：2026-02-28  
> 目的：確認功能齊全，並為「會員系統」建置做準備。

---

## 一、頁面清單與導航

| 頁面 | 路徑 | 首頁導航 | 子頁導航（回首頁） | 狀態 |
|------|------|----------|-------------------|------|
| 首頁 | index.html | — | — | ✅ |
| 神明殿堂 | pages/deities.html | ✅ | ✅ | ✅ |
| 十八地獄 | pages/hell.html | ✅ | ✅ | ✅ |
| 六道輪迴 | pages/realms.html | ✅ | ✅ | ✅ |
| 因果案例 | pages/cases.html | ✅ | ✅ | ✅ |
| 功過格 | pages/merit.html | ✅ | ✅ | ✅ |
| 生活導航 | pages/guide.html | ✅ | ✅ | ✅ |
| 疑難參悟 | pages/faq.html | ✅ | ✅ | ✅ |
| 討論區 | pages/forum.html | ✅ | ✅ | ✅ |
| 投稿詳情 | pages/post.html | 由討論區進入 | ✅ | ✅ |
| 經咒・禪樂 | pages/audio.html | ✅ | ✅ | ✅ |
| 懺悔祈福牆 | pages/wall.html | ✅ | ✅ | ✅ |
| 覺醒測驗 | pages/quiz.html | ✅ | ✅ | ✅ |
| 漣漪模擬器 | pages/simulator.html | ✅ | ✅ | ✅ |
| 宇宙監測 | pages/monitor.html | ✅ | ✅ | ✅ |
| 技術白皮書 | pages/whitepaper.html | Footer 連結 | ✅ | ✅ |

- **子頁統一**：各子頁均有「回首頁」與「因果真相」Logo 連結，且導航列項目一致。
- **討論區／投稿**：forum 列表點擊會正確跳轉 `post.html?id=1|2|3`，投稿詳情已依 id 顯示對應內容（已修復）。

---

## 二、核心功能檢查

### 2.1 首頁 (index.html)
- [x] 導航列（諸神、地獄、輪迴、功過格、參悟、導航、討論區、模擬、懺悔、經咒、測驗、監測）
- [x] Hero 區（因果真相、每日一悟隨機語錄、抽象背景）
- [x] 主要入口按鈕（神明殿堂、地獄、輪迴、案例、功過格、導航、參悟、經咒、監測）
- [x] LINE 官方帳號 CTA（連結與 ID）
- [x] 因果案例投稿表單（稱呼、標題、分類、內容）、送出後寫入 localStorage、成功訊息
- [x] Footer 快速導航、修行工具、白皮書連結、免責與隱私說明
- [x] 能量音場（背景音樂開關，AMBIENT OFF/ON）
- [x] 回到頂部按鈕、NEUXA 浮動助手
- [x] **已修正**：重複的簡短 footer 已移除，僅保留完整 footer

### 2.2 神明殿堂 (deities.html)
- [x] 12 位神明介紹（玉皇大天尊、玄天上帝、地藏菩薩、閻羅王、城隍、鍾馗、觀世音菩薩、媽祖、關聖帝君、土地公、文昌帝君、藥師佛）
- [x] 每位神明：維基連結、圖片、別稱、職掌、經典出處、與因果的關係、法語
- [x] 統一留言板表單（姓名、地址、祈求事項、留言內容），三欄排版（桌機）
- [x] 留言存 localStorage（`deity_board_<id>`），列表即時顯示

### 2.3 十八地獄 (hell.html)
- [x] 18 層地獄區塊、捲動進度條
- [x] 每層：名稱、簡述、對應業因

### 2.4 六道輪迴 (realms.html)
- [x] 六道卡片（天道、人道、阿修羅、畜生、餓鬼、地獄）
- [x] 「瀏覽內容」按鈕開啟模態，顯示特徵／因緣／苦樂／修行／警語／連結
- [x] Esc 關閉模態

### 2.5 功過格 (merit.html)
- [x] 善惡項目勾選、即時加總、淨值、長條圖
- [x] 歸宿預覽（依淨值顯示天道／人道等）
- [x] 誦經迴向補過建議（依過失分級與類型推薦經咒與遍數）
- [x] 資料存 localStorage（`merit_*`）

### 2.6 討論區 (forum.html)
- [x] 分類篩選（全部、口業之報、善行之報等）
- [x] 排序（最新、最熱、最多留言）
- [x] 投稿列表（目前為 mock 三筆）、點擊進入 post.html?id=
- [x] 「我要投稿」連至 index.html#submit

### 2.7 投稿詳情 (post.html)
- [x] 依 URL `?id=1|2|3` 顯示對應投稿（已修復：先前無論 id 皆顯示同一則）
- [x] 留言列表、發表留言表單（稱呼、內容）
- [x] 留言暫存於前端、按讚為前端更新
- [x] 無 id 或無對應 id 時顯示「找不到該投稿」與返回連結

### 2.8 經咒・禪樂 (audio.html)
- [x] 誦經須知警語
- [x] 佛教經咒：大悲咒、心經、地藏聖號、阿彌陀佛聖號、往生咒、地藏本願經、梁皇寶懺 — 皆可點擊播放（外連 namoamitabha / buda.idv.tw）
- [x] 道教：金光神咒（YouTube）、淨心／淨口／淨身／安土地／開經玄蘊為咒文展開＋提示
- [x] 禪樂：三首 Mixkit 環境音
- [x] 底部播放列、經文展開／收合

### 2.9 因果案例 (cases.html)
- [x] 案例展示、「我要投稿」與「前往討論區」按鈕

### 2.10 生活導航 (guide.html)
- [x] 五步驟靜態內容

### 2.11 懺悔祈福牆 (wall.html)
- [x] 祝福／懺悔輸入、視覺牆展示（依設計）

### 2.12 覺醒測驗 (quiz.html)
- [x] 題目與選項、進度條、結果頁

### 2.13 漣漪模擬器 (simulator.html)
- [x] Canvas 模擬、說明

### 2.14 宇宙監測 (monitor.html)
- [x] 監測介面、數據展示

### 2.15 疑難參悟 (faq.html)、技術白皮書 (whitepaper.html)
- [x] 內容與連結正常

---

## 三、資源與設定

- [x] **favicon**：favicon.svg 存在
- [x] **manifest**：manifest.json 存在
- [x] **styles.css**：全站共用
- [x] **particles.js**：首頁引用
- [x] **Tailwind**：CDN，各頁一致
- [x] **字型**：Noto Serif TC
- [x] **sitemap.xml**：已包含首頁、主要子頁；**已補上 forum.html**

---

## 四、資料與後端狀態

| 功能 | 目前儲存 | 未來會員系統需接 |
|------|----------|------------------|
| 首頁投稿 | localStorage `causelaw_submissions` | Supabase causelaw_posts + 審核狀態 |
| 討論區列表／詳情 | 前端 mock 資料 | Supabase causelaw_posts（status=approved） |
| 投稿留言 | 前端暫存 | Supabase causelaw_comments |
| 功過格 | localStorage `merit_*` | 可選：依會員累積善惡值 |
| 神明留言板 | localStorage `deity_board_*` | 可選：依會員或匿名 |
| 懺悔牆 | 依現有設計 | 可選：與會員或匿名綁定 |

- **FORUM-DESIGN.md**：已定義 causelaw_users、causelaw_posts、causelaw_comments 與流程。
- **SUPABASE-SETUP.md**：已含建表 SQL、RLS、前端連線範例。

---

## 五、本次修正項目

1. **post.html**：依 `?id=1|2|3` 顯示對應投稿與留言，無 id 時顯示「找不到該投稿」與返回連結。
2. **index.html**：移除重複的簡短 footer，僅保留完整 footer。
3. **sitemap.xml**：新增 forum.html。

---

## 六、會員系統建置準備

建議接下來建立會員系統時可依序銜接：

1. **認證**  
   - 簡單版：顯示名稱 + 可選 email，存 localStorage 或 Supabase causelaw_users。  
   - 進階：Supabase Auth（Email/OTP 或第三方）。

2. **討論區與投稿**  
   - 首頁投稿寫入 Supabase causelaw_posts（status=pending）。  
   - 討論區列表只讀 status=approved。  
   - post.html 由 Supabase 依 id 取單則投稿與留言。  
   - 審核通過時可對「會員」做福報加分（需與功過格或會員積分欄位連動）。

3. **功過格**  
   - 可選：登入後善惡值寫入會員資料或獨立表，支援歷史與統計。

4. **神明留言板／懺悔牆**  
   - 可選：與會員 id 或匿名並存，或維持純前端 localStorage。

5. **既有文件**  
   - `docs/FORUM-DESIGN.md`：表結構與流程。  
   - `docs/SUPABASE-SETUP.md`：資料庫與前端連線設定。

---

**結論**：全站頁面與導航完整，核心功能（投稿、討論區、功過格、經咒、神明留言等）均可正常使用；投稿詳情已依 id 正確顯示。資料面目前以 localStorage／mock 為主，設計與 Supabase 設定已就緒，可開始建立會員系統並接上討論區與投稿審核。
