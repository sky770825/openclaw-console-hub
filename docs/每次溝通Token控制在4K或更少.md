# 每次溝通 Token 控制在 4K 或更少

你看到的「每次溝通約 18K token」指的是 **單次請求送給模型的總 context**（系統提示 + 對話歷史 + 工具結果 + 本輪訊息）。要壓到約 **4K 或更少**，可以從「少帶歷史」與「提早壓縮」兩方面下手。

---

## 一、先釐清「18K」是什麼

- **Context** = 每次呼叫模型時，送進去的全部內容（system、歷史訊息、tool 結果、當前使用者輸入）。
- **18K** 多半是該次請求的 **input / context 總 token 數**（例如 `openclaw status` 裡 Sessions 的 Tokens 或日誌裡的 context 估計）。
- 要降到 4K，代表要 **大幅減少帶入的歷史與工具結果**，模型能「看到」的過往對話會變少，可能影響連續對話品質。

---

## 二、可用的設定（在 `~/.openclaw/openclaw.json`）

### 1. 開啟 context pruning（建議先做）

用 **contextPruning** 在每次呼叫前修剪「舊的 tool 結果」與可選的助理訊息數量，減少送進模型的 token。

在 `agents.defaults` 下加上：

```json
"contextPruning": {
  "mode": "cache-ttl",
  "ttl": "10m",
  "keepLastAssistants": 1,
  "softTrim": {
    "maxChars": 2000
  }
}
```

- **mode: "cache-ttl"**：依 TTL 把過期的 tool 結果從 context 拿掉（不刪磁碟上的 transcript）。
- **ttl**：超過這段時間的 tool 結果視為過期（例如 `"10m"`）。
- **keepLastAssistants**：只保留最近 N 則助理回覆在 context 裡（1 或 2 會很省 token）。
- **softTrim.maxChars**：單一 tool 結果最多保留字元數，可再壓低（例如 1000～2000）。

這樣可以明顯減少「每次請求」帶的歷史與工具輸出，有機會把 18K 壓到幾 K 以內（實際數字看對話長度與工具用量）。

---

### 2. 提早觸發 compaction（保留約 4K 給「新內容」）

Compaction 會把**舊對話壓成摘要**，只保留最近一段完整對話。觸發條件是：

`contextTokens > contextWindow - reserveTokens`

所以 **reserveTokens 設越大**，越早壓縮、留下來的「未壓縮歷史」越少。

你目前預設有 **reserveTokensFloor: 20000**（OpenClaw 會把 Pi 的 reserve 至少提到 2 萬）。若想讓「有效可用 context」約 4K，可把 **reserveTokensFloor** 設成 **模型 context 上限減 4096**：

- 若模型 context window = **1,049,000**（例如 gemini-2.5-flash）  
  → `reserveTokensFloor = 1_049_000 - 4096 = 1_044_904`
- 若模型 context window = **32,768**  
  → `reserveTokensFloor = 32_768 - 4096 = 28_672`

在 `agents.defaults.compaction` 裡設：

```json
"compaction": {
  "reserveTokensFloor": 1044904
}
```

（上面數字請依你實際用的模型的 context window 改；`openclaw status` 或模型文件可查。）

效果：context 一超過約 4K 就會觸發壓縮，之後每次請求多半只帶「壓縮摘要 + 最近約 4K 以內內容」，總 token 就會接近你要的 4K 或更少。

---

### 3. 可選：context 上限估計值（僅影響顯示與部分邏輯）

`agents.defaults.contextTokens` 在文件裡是「Optional context window cap (used for runtime estimates + status %)」。  
若你的版本會用它當成「有效 context 上限」來驅動 compaction，可以設成 4096 試試；若不會，就只影響狀態顯示的百分比。可先設：

```json
"contextTokens": 4096
```

放在 `agents.defaults` 下。若設了之後發現 compaction 變得很頻繁或行為異常，再改回或刪掉即可。

---

## 三、範例：同時用 pruning + 提早 compaction

目標：每次溝通盡量 ≤ 4K token。

```json
{
  "agents": {
    "defaults": {
      "contextTokens": 4096,
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "10m",
        "keepLastAssistants": 1,
        "softTrim": { "maxChars": 2000 }
      },
      "compaction": {
        "reserveTokensFloor": 1044904
      }
    }
  }
}
```

- **contextTokens**：先設 4096，觀察 status 與行為。
- **contextPruning**：只留最近 1 則助理、tool 結果 TTL 10 分鐘、單則最多 2000 字元。
- **reserveTokensFloor**：1,044,904 是依 1,049,000 context 算的；若你用的模型不是這個，改成 `你的 context window - 4096`。

修改後**重啟 Gateway** 才會生效：

```bash
openclaw gateway stop
openclaw gateway install
```

---

## 四、注意與取捨

- **4K 很緊**：歷史幾乎只剩 1～2 輪，模型容易「失憶」，不適合需要長上下文的任务。
- **折衷**：若希望省 token 又不要太失憶，可先試 **8K**：  
  - `reserveTokensFloor = contextWindow - 8192`  
  - `keepLastAssistants: 2`、`softTrim.maxChars` 略大一點（例如 3000～4000）。
- **觀察**：改完用 `openclaw status` 與 `openclaw logs --follow` 看 Sessions 的 token 數與 compaction 訊息，再微調數字。

---

## 五、對照官方說明

- Session / compaction：  
  https://docs.openclaw.ai/reference/session-management-compaction  
- Compaction 設定：  
  https://docs.openclaw.ai/concepts/compaction  
- Session pruning（cache-ttl）：  
  https://docs.openclaw.ai/concepts/session-pruning  

若你貼出目前 `agents.defaults` 的片段與使用的模型名稱，我可以幫你算一組更貼合你環境的數值（例如精準的 reserveTokensFloor）。

---

## 六、搭配 QMD 記憶（推薦）

若希望**長期資訊不丟、又省 token**，可改為：少帶 session 歷史，改從 **QMD 記憶按需提取**。這樣重要內容存在 MEMORY.md / memory/*.md，由 QMD 索引，每次溝通只把「搜尋到的相關片段」送進模型，總 token 會更少。詳見：

- **[用QMD記憶減少每次溝通的Token](./用QMD記憶減少每次溝通的Token.md)**
