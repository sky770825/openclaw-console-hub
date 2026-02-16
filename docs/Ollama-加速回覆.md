# 讓 Ollama 回覆速度加快

## 1. Bot 已做的調整

- **對話歷程**：只送最近 6 則訊息（約 3 回合），減少 token、加快推理。
- **num_ctx=4096**：請求時限制 context 長度，較不易爆 VRAM、掉到 CPU（掉到 CPU 會變很慢）。

---

## 2. 換成較小／較快的模型

| 模型 | 特點 |
|------|------|
| **mistral:7b**、**phi3:mini** | 體積小、回覆快 |
| **qwen2.5:7b**、**llama3.2:3b** | 可兼顧速度與品質 |
| **deepseek-r1:8b** | 推理強但較吃資源，若覺得慢可改試 **qwen2.5:7b** |

用 bot 的「📋 切換模型」或 `/model <名稱>` 即可切換。  
終端可先拉模型：`ollama pull qwen2.5:7b`

---

## 3. Ollama 服務端環境變數（本機）

在 **啟動 Ollama 的環境**（終端或 LaunchAgent）設定：

| 變數 | 說明 | 建議 |
|------|------|------|
| **OLLAMA_KEEP_ALIVE** | 模型在記憶體保留時間 | 設 `24h` 或更長，避免常用模型一直被卸載 |
| **OLLAMA_NUM_PARALLEL** | 並行請求數 | 預設 1；若只你一個人用可維持 1 |
| **OLLAMA_NUM_CTX** | 預設 context 長度 | 可設 `4096`，與 bot 的 num_ctx 一致 |

例如用 LaunchAgent 跑 `ollama serve` 時，在 plist 的 `EnvironmentVariables` 裡加：

```xml
<key>OLLAMA_KEEP_ALIVE</key>
<string>24h</string>
<key>OLLAMA_NUM_CTX</key>
<string>4096</string>
```

---

## 4. 硬體與用量

- **Mac**：Ollama 會用 Metal（GPU），保持系統不要過熱、其它大程式關掉有助穩定速度。
- **記憶體**：模型常駐時會吃較多 RAM；若常爆記憶體，可改用較小模型或較小 num_ctx。

---

## 5. 體感加速：串流（streaming）

Bot 已支援 **邊收邊顯示**（streaming）：使用 `stream: true` 呼叫 Ollama，每約 1 秒更新一次 Telegram 訊息，**第一段字會更快出現**，體感變快。

## 5.1 Qwen 3 / Qwen 2.5 速度優化

Bot 已對 qwen3、qwen2.5 自動套用：
- **num_predict=2048**：限制單次回覆長度，加速生成

---

---

## 6. DeepSeek-R1-8B 專用優化

R1 是**推理模型**，會先產出思考再給答案，本身就會比一般聊天模型慢。Bot 已對名稱含 `r1` / `deepseek-r1` 的模型做：

| 參數 | 設定 | 效果 |
|------|------|------|
| **num_ctx** | 4096 | 控制輸入長度，有利讀取與推理速度 |
| **num_predict** | 2048 | 限制單次回覆最長 token，避免一次生成過長 |
| **temperature** | 0.7 | 略降隨機性，採樣稍快、回覆較穩定 |

**讀取／載入速度**  
- 讓 R1 常駐記憶體：在跑 `ollama serve` 的環境設 `OLLAMA_KEEP_ALIVE=24h`（或更長），可避免反覆載入。  
- 使用 **Q4 量化**：若有 `deepseek-r1:8b-q4_0` 等較小版本，載入與推理都會比完整版快，可先執行 `ollama list` 看本機是否有該類別名稱。

**回覆速度**  
- 已用較短對話歷程（6 則）+ num_ctx 4096 + num_predict 2048，在「品質可接受」下縮短生成時間。  
- 若仍覺得慢，可改試 **qwen2.5:7b** 等非推理模型做一般問答；R1 留給需要推理解題的對話。

---

**總結**：目前 bot 已用較短歷程 + num_ctx=4096；DeepSeek-R1 再加 num_predict、temperature 優化。再加速可從「換小／量化模型」和「Ollama 端 OLLAMA_KEEP_ALIVE / OLLAMA_NUM_CTX」著手。
