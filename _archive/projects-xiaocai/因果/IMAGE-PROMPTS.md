# 全站區域圖片 — 生成 Prompt 清單

> **因果真相旗艦專案**：所有路徑皆以本專案根目錄為準（即 `因果/` 資料夾）。  
> 各區「全境」皆需有圖。請依下列 prompt 生成後，存到專案內對應路徑。  
> **統一風格**：深色、氛圍感、金色(#d4af37)／暗紅(#8b0000)點綴、東方／因果主題、**圖內勿含文字**。

---

## 自己製圖・參考圖片製圖 — 怎麼做

### 一、純文字自己製圖（只靠 Prompt）

1. **複製本文件**裡對應區塊的「意境指令」或「Prompt」欄位。
2. 貼到任一 AI 繪圖工具：
   - **DALL·E 3**（ChatGPT Plus / API）、**Midjourney**、**Stable Diffusion**（WebUI / 線上版）、**Ideogram**、**Leonardo.AI** 等。
3. 生成後**下載**，依本文件「路徑」欄位**重新命名並存到專案**對應資料夾（如 `images/hell/`、`images/deities/`）。
4. 地獄 18 層的 prompt 也可在**地獄頁**上每層的「意境指令」直接複製（由 `prompts.js` 注入）。

### 二、參考圖片製圖（圖 + 文一起用）

用「參考圖」可以讓風格、構圖、神像造型更穩定，適合神明與地獄場景。

| 類型 | 用途 | 參考圖怎麼用 |
|------|------|--------------|
| **神明** | 神像姿態、服飾、氛圍 | 在支援「圖 + 文」的工具裡：上傳參考圖當 **Image Prompt** 或 **Style Reference**，再輸入本文件的文字 prompt，生成「類似風格、同一尊神」的圖。 |
| **地獄** | 中國煉獄、十殿閻羅氛圍 | 用下面「地獄參考圖」當風格／構圖參考，搭配各層意境指令做 **img2img** 或 **Style Reference**。 |

**神明參考圖（維基共享，可下載後上傳到繪圖工具）：**

| 神明 | 參考圖直連（可右鍵另存） | 說明 |
|------|---------------------------|------|
| 玉皇上帝 | 專案本地 `images/deities/jade-emperor.png` 或 [維基：南鯤鯓玉皇上帝雕塑](https://upload.wikimedia.org/wikipedia/commons/e/ed/Nankunshen_Temple%2C_Roof_Sculpture_of_Jade_Emperor_Shrine_%28Taiwan%29.jpg) | 雕塑／神像造型可當參考 |
| 玄天上帝 | https://upload.wikimedia.org/wikipedia/commons/a/ae/Xuantian_Shangdi_%28Zhenwu%29%2C_god_of_the_North_%28cropped%29.jpg | 真武、北方神造型 |
| 地藏菩薩 | https://upload.wikimedia.org/wikipedia/commons/f/f8/Ksitigarbha_bodhisattva.jpg | 僧相、錫杖、蓮花 |
| 閻羅王 | https://upload.wikimedia.org/wikipedia/commons/6/6a/%E4%BA%94%E4%B8%83%E9%96%BB%E7%BE%85%E5%A4%A7%E7%8E%8B.jpg | 南宋十王圖風格 |
| 城隍 | https://upload.wikimedia.org/wikipedia/commons/2/21/PXL_%E5%A4%A7%E7%A8%BB%E5%9F%95%E9%9C%9E%E6%B5%B7%E5%9F%8E%E9%9A%8D%E7%88%BA%EF%BC%9A%E6%AD%A3%E6%AE%BF.jpg | 廟宇正殿氛圍 |
| 鍾馗 | https://upload.wikimedia.org/wikipedia/commons/9/93/Zhong_Kui_the_Demon_Queller_with_Five_Bats.jpg | 明代畫作風格 |
| 觀世音 | https://upload.wikimedia.org/wikipedia/commons/b/b1/Guanyin_Buddha.JPG | 菩薩造像 |
| 媽祖 | https://upload.wikimedia.org/wikipedia/commons/6/6e/Chaotian_Temple_Mazu_20130825.jpg | 朝天宮神像 |
| 關聖帝君 | https://upload.wikimedia.org/wikipedia/commons/5/5f/Guan_Yu_portrait.jpg | 關公肖像 |
| 土地公 | https://upload.wikimedia.org/wikipedia/commons/2/2b/Tudigong_Temple_Taiwan.jpg | 廟宇與神像 |
| 文昌帝君 | https://upload.wikimedia.org/wikipedia/commons/d/d9/Wenchang_Emperor_Temple_1.jpg | 廟宇氛圍 |
| 藥師佛 | https://upload.wikimedia.org/wikipedia/commons/d/d5/Bhaisajyaguru.jpg | 佛造像 |

**地獄參考圖（中國風・十殿閻羅，可當風格／構圖參考）：**

| 說明 | 參考圖直連 |
|------|------------|
| 虎豹別墅十殿地獄實景（雕塑場景） | https://upload.wikimedia.org/wikipedia/commons/d/db/Chinese_Court_of_Hell.jpg |
| 古代地府十王圖（絹本風格） | https://upload.wikimedia.org/wikipedia/commons/f/f6/%E5%9C%B0%E5%BA%9C%E5%8D%81%E7%8E%8B%E7%AD%89%E7%9C%BE%E5%9C%96%E6%AE%98%E5%8D%B7.jpg |
| 南宋陸信忠十王圖・閻羅王 | https://upload.wikimedia.org/wikipedia/commons/a/ae/Ten_Kings_of_Hell%2C_Yanluo_Wang_%28Enra_%C5%8C%29_by_Lu_Xinzhong.jpg |

**工具操作建議：**

- **Midjourney**：`/describe` 先解析參考圖，再用本文件 prompt 生成；或用 `--sref 參考圖URL`（風格參考）。
- **Stable Diffusion**：用 **img2img** 上傳參考圖，Denoising 調 0.4～0.6，搭配本文件 prompt。
- **DALL·E 3**：可先傳參考圖再輸入「請依這張圖的風格與構圖，畫出……」（需符合使用規範）。
- **Ideogram / Leonardo**：多數支援「上傳圖片 + 文字 prompt」，選「風格參考」或「內容參考」即可。

生成後記得存到本文件表裡的**路徑**與**檔名**，站點就會自動吃到自製圖。

---

## 要換成圖片的清單與尺寸一覽

| 優先 | 頁面／區塊 | 檔案路徑 | 尺寸（寬×高） | 說明 |
|------|------------|----------|----------------|------|
| **必備** | 地獄（4 張） | `images/hell/chains-closeup.jpg` | **800×320** | 拔舌區配圖，已接本地路徑，缺檔會破圖 |
| **必備** | 地獄 | `images/hell/stairs-down.jpg` | **800×320** | 鐵樹區配圖 |
| **必備** | 地獄 | `images/hell/crowd-shadows.jpg` | **800×320** | 牛坑區配圖 |
| **必備** | 地獄 | `images/hell/mirror-shards.jpg` | **800×320** | 刀鋸區配圖 |
| 建議 | 首頁 Hero | `images/hero-hall.jpg` | **1920×1080** | 目前用 CDN，可改成本地 |
| 建議 | 輪迴 | `images/realms/hero.jpg` | **1920×800** | 六道輪迴主視覺 |
| 建議 | 懺悔祈福牆 | `images/wall/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 因果導航 | `images/guide/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 真實案例 | `images/cases/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 佛音 | `images/audio/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 功過格 | `images/merit/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 覺醒測驗 | `images/quiz/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 漣漪模擬器 | `images/simulator/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 疑難參悟 | `images/faq/hero.jpg` | **1920×720** | 主視覺 |
| 建議 | 白皮書 | `images/whitepaper/hero.jpg` | **1920×720** | 主視覺 |
| 可選 | 神明殿堂（5 張） | `images/deities/jade-emperor.jpg` 等 | **1200×800** | 目前用 Unsplash，可改自建 |

**尺寸簡記**：地獄區塊圖 **800×320**；各頁 Hero / 主視覺 **1920×720**（首頁 **1920×1080**，輪迴 **1920×800**）；神明卡 **1200×800**。

---

## 一、首頁

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/hero-hall.jpg` | 1920×1080 | 首頁 Hero 背景（可選，目前用 CDN） | 莊嚴的東方廟宇大殿內部，深色石階與紅色樑柱，遠處有香爐與神龕輪廓，幽暗氛圍，僅有微弱金色燭光與煙霧，電影感構圖，無文字，16:9 橫幅。 |

---

## 二、地獄頁（hell）— 十八層・中國煉獄・靈體哀嚎・依文生成

**統一要求**：中國傳統煉獄場景、靈體哀嚎、痛苦、依各層「針對罪業」與「能量機制」文字生成。圖內勿含文字。尺寸建議 **800×320** 橫幅，或 1200×600。頁面意境指令由 `prompts.js` 注入，本表為完整生成用 prompt（可貼入 DALL·E / Midjourney / Stable Diffusion 等）。

| 路徑 | 層級 | 意境指令（英文 Prompt） |
|------|------|------------------------|
| `images/hell/tongue-removal.jpg` | 01 拔舌地獄 | Chinese traditional hell scene, ghostly spirits wailing in agony, iron pincers pulling tongues, dark underworld court, red and gold accents, volumetric smoke, photorealistic 8K, no text. |
| `images/hell/finger-cutting.jpg` | 02 剪指地獄 | Chinese hell scene, souls in extreme pain, cold steel blades cutting fingers, dark stone chamber, wailing spirits, ancient engravings, eerie blue light, photorealistic 8K, no text. |
| `images/hell/iron-tree.png` | 03 鐵樹地獄 | Chinese underworld, massive black iron tree with razor blades as branches, spirits impaled and wailing, lightning and dark sky, agony and despair, photorealistic 8K, no text. |
| `images/hell/mirror-karma.jpg` | 04 孽鏡地獄 | Ancient bronze karma mirror in Chinese hell, swirling spiritual energy, souls collapsing before their reflected sins, wailing and terror, mystical glow, dark court, photorealistic 8K, no text. |
| `images/hell/steamer-hell.jpg` | 05 蒸籠地獄 | Chinese hell, giant bamboo steamers, ghostly figures in scorching steam, wailing spirits, heat haze, dark mist, suffering and repentance, photorealistic 8K, no text. |
| `images/hell/copper-pillar.jpg` | 06 銅柱地獄 | Chinese hell, glowing red-hot copper pillar, souls clinging in agony, intense heat distortion, sparks and embers, wailing spirits, dark cave, photorealistic 8K, no text. |
| `images/hell/mountain-knives.jpg` | 07 刀山地獄 | Chinese hell, mountain of sharp blades, naked spirits climbing in agony, blood and despair, wailing souls, dark red clouds, cinematic wide shot, photorealistic 8K, no text. |
| `images/hell/ice-mountain.jpg` | 08 冰山地獄 | Chinese hell, frozen souls trapped in jagged blue ice, wailing in cold agony, freezing mist, translucent ice peaks, despair, photorealistic 8K, no text. |
| `images/hell/oil-cauldron.jpg` | 09 油鍋地獄 | Chinese hell, bubbling black cauldron, liquid gold ripples, spirits in boiling oil wailing in agony, intense heat haze, dramatic shadows, photorealistic fire, no text. |
| `images/hell/ox-pit.jpg` | 10 牛坑地獄 | Chinese hell, stampede of iron-horned bulls, souls trampled and wailing, dust and chaos, dark earth, spirits in extreme suffering, cinematic 8K, no text. |
| `images/hell/crushing-stone.jpg` | 11 石壓地獄 | Chinese hell, massive stone crushing souls, bones and agony, wailing spirits under weight, dark cavern, visceral despair, photorealistic 8K, no text. |
| `images/hell/mortar-hell.jpg` | 12 舂臼地獄 | Chinese hell, giant stone mortar pounding spirits, wailing and grinding, pestle and suffering, dark underworld, photorealistic 8K, no text. |
| `images/hell/blood-pool.jpg` | 13 血池地獄 | Chinese hell, infinite crimson blood pool, souls drowning and wailing, thick visceral texture, red fog, spirits in agony, dramatic low-key lighting, photorealistic 8K, no text. |
| `images/hell/wrongful-death.jpg` | 14 枉死地獄 | Chinese hell, spirits reliving death in loop, wailing in regret and terror, dark void, repeated dying moments, despair and remorse, photorealistic 8K, no text. |
| `images/hell/dismemberment.jpg` | 15 磔刑地獄 | Chinese hell, souls bound to frame, thousand cuts punishment, wailing in agony, blood and suffering, dark execution ground, photorealistic 8K, no text. |
| `images/hell/volcano-hell.jpg` | 16 火山地獄 | Chinese hell, souls falling into lava volcano, molten rock, wailing spirits burning, ash and fire, despair, photorealistic 8K, no text. |
| `images/hell/grinding-mill.jpg` | 17 石磨地獄 | Chinese hell, giant stone mill grinding souls, wailing spirits crushed, dark grinding chamber, visceral suffering, photorealistic 8K, no text. |
| `images/hell/saw-hell.jpg` | 18 刀鋸地獄 | Chinese hell, spirits sawn in half from groin, wailing in ultimate agony, blood and terror, dark execution platform, photorealistic 8K, no text. |

---

## 二之二、地獄頁其他配圖（可選）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/hell/chains-closeup.jpg` | 800×320 | 拔舌區輔助 | 近距離特寫：生鏽的鐵鏈與古代刑具，深褐色金屬、陰影強烈，暗紅背景，恐怖但莊嚴，無文字，橫幅。 |
| `images/hell/stairs-down.jpg` | 800×320 | 鐵樹區輔助 | 往下延伸的狹長石階與陰暗通道，兩側石牆，盡頭微光，地獄感，深灰與暗紅，無文字，橫幅。 |
| `images/hell/crowd-shadows.jpg` | 800×320 | 牛坑區輔助 | 遠處排隊的模糊人影剪影，在暗紅與黑霧中前行，審判等待的氛圍，無文字，橫幅。 |
| `images/hell/mirror-shards.jpg` | 800×320 | 刀鋸區輔助 | 破碎鏡面與裂紋反射出暗紅光與模糊人影，孽鏡意象，陰森但肅穆，無文字，橫幅。 |

---

## 三、輪迴頁（realms）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/realms/hero.jpg` | 1920×800 | 六道輪迴頁主視覺 | 六道輪迴概念圖：天道光明、人道中界、地獄深淵分層的抽象意境，深藍紫與金色光暈，漩渦或層疊圓環構圖，東方宗教感，無文字，橫幅。 |

---

## 四、懺悔祈福牆（wall）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/wall/hero.jpg` | 1920×720 | 懺悔與祈福牆主視覺 | 黑暗中漂浮的蓮花燈與沉下的石塊意象，金色燈火與暗紅石頭對比，懺悔與祈福的能量轉化場，靜謐莊嚴，無文字，橫幅。 |

---

## 五、因果導航（guide）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/guide/hero.jpg` | 1920×720 | 因果導航頁主視覺 | 一條發光的金色道路在黑暗中延伸，兩側有模糊的蓮花或石燈，修行之路、導航人生意象，東方禪意，無文字，橫幅。 |

---

## 六、真實案例（cases）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/cases/hero.jpg` | 1920×720 | 真實案例實錄主視覺 | 古代卷軸或案卷攤開在暗色桌面上，邊緣有紅色蠟封與金色紋樣，真實紀錄、因果見證的氛圍，無文字，橫幅。 |

---

## 七、佛音（audio）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/audio/hero.jpg` | 1920×720 | 能量音場／佛音頁主視覺 | 寺廟梵唄意境：蓮花、經卷與香爐的靜物，紫色與金色光暈，寧靜祥和，無文字，橫幅。 |

---

## 八、功過格（merit）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/merit/hero.jpg` | 1920×720 | 功過格頁主視覺 | 古代功過格簿冊與毛筆，深色木桌，金色與暗紅點綴，每日修持、善惡記録的意象，無文字，橫幅。 |

---

## 九、覺醒測驗（quiz）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/quiz/hero.jpg` | 1920×720 | 覺醒測驗頁主視覺 | 一盞心燈或蓮花在黑暗中發光，覺醒、智慧與選擇的意象，青藍與金色，無文字，橫幅。 |

---

## 十、漣漪模擬器（simulator）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/simulator/hero.jpg` | 1920×720 | 漣漪模擬器主視覺 | 水面漣漪擴散、一圈圈金色與深藍的波紋，因果擴散、一念影響的抽象圖，無文字，橫幅。 |

---

## 十一、疑難參悟（faq）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/faq/hero.jpg` | 1920×720 | 疑難參悟頁主視覺 | 一扇半開的門或燈塔在黑暗中，解惑、參悟、指引的意象，金色光芒從門縫溢出，無文字，橫幅。 |

---

## 十二、白皮書（whitepaper）

| 路徑 | 尺寸 | 用途 | Prompt |
|------|------|------|--------|
| `images/whitepaper/hero.jpg` | 1920×720 | 技術與增長白皮書主視覺 | 古典書卷與現代線條結合，深色底、金色與墨綠紋樣，知識與正式文獻感，無文字，橫幅。 |

---

## 十三、神明殿堂（deities）— 可選

目前使用 Unsplash，若改為自建圖可依下列 prompt 生成後替換：

| 路徑 | 尺寸 | 對應神明 | Prompt |
|------|------|----------|--------|
| `images/deities/jade-emperor.jpg` | 1200×800 | 玉皇大天尊 | 道教玉皇上帝神像或天宮意境，金袍、祥雲、莊嚴，深色背景，無文字。 |
| `images/deities/cheng-huang.jpg` | 1200×800 | 城隍 | 城隍爺神像或城隍廟堂意境，官服、案桌、肅穆，深色背景，無文字。 |
| `images/deities/yanluo.jpg` | 1200×800 | 閻羅王 | 閻羅王審判意境，孽鏡、生死簿、暗紅與金，莊嚴不恐怖，無文字。 |
| `images/deities/ksitigarbha.jpg` | 1200×800 | 地藏菩薩 | 地藏菩薩僧相，錫杖、蓮花、幽冥救度意境，深色背景，無文字。 |
| `images/deities/zhong-kui.jpg` | 1200×800 | 鍾馗 | 鍾馗驅邪像，劍、虯髯、正氣，深色背景，無文字。 |

---

## 放置與引用方式

1. **專案根目錄**：因果真相旗艦專案（`因果/`）資料夾。
2. **生成後**：將檔案存到上表「路徑」欄位（皆為專案根目錄下的相對路徑，例如 `images/hell/chains-closeup.jpg`）。
2. **地獄頁**：已有 `<img src="../images/hell/xxx">`，改回本地路徑即可（目前為 placehold.co，改為 `../images/hell/xxx.jpg`）。
3. **其餘頁**：需在對應 HTML 加上 Hero 或區塊背景圖（可依現有 hell 的 `visual-hell-compact` 或 index 的 `background-image` 方式引用）。

生成完成後跟我說，我可以幫你改 HTML 把各區圖片掛上。
