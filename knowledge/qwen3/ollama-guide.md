# Qwen3 實作指引與 Ollama 優化建議

## 🚀 快速上手 (Ollama)

在 OpenClaw 環境中，Qwen3 是主力本地模型。以下是調用與優化指南。

### 1. 模型安裝與選擇

```bash
# 輕量首選 (快速摘要、翻譯)
ollama run qwen3:4b

# 日常主力 (代碼編寫、中等推理)
ollama run qwen3:8b

# 高品質產出 (重要報告、複雜分析)
ollama run qwen2.5:14b  # 註：Qwen3 14B 發布後請更新
```

### 2. API 調用範例 (Bash/Curl)

```bash
curl -s http://localhost:11434/api/generate -d '{
  "model": "qwen3:8b",
  "prompt": "請幫我寫一個 Python 腳本，用來自動備份指定目錄並壓縮成 tar.gz。",
  "stream": false
}'
```

### 3. OpenClaw 整合設定

在 `AGENTS.md` 中，我們定義了 Qwen3 的分配原則：
- **qwen3:4b**: 2秒出結果，適合格式轉換。
- **qwen3:8b**: 處理單一檔案修改或邏輯編寫。

---

## 🛠️ 本地部署優化建議

### 1. 硬體加速 (macOS/Metal)
Ollama 在 macOS 上預設使用 Metal 加速。若發現速度慢，請檢查：
- 確保沒有其他大量佔用顯存的應用（如大型 IDE 或多個瀏覽器分頁）。
- 記憶體分配：8B 模型建議至少 8GB 剩餘 RAM。

### 2. 量化與效能平衡
- **Q4_K_M (預設)**：效能與精準度的最佳平衡點。
- **Q2_K (極速)**：若只需極快的回應且對精準度要求不高（如純關鍵字提取），可自行 pull 量化版。

### 3. 提示詞工程 (Prompt Engineering)
Qwen3 對「中文指令」理解極佳，建議：
- **結構化指令**：使用「### 任務」、「### 要求」等標籤。
- **少樣本學習 (Few-shot)**：提供一個範例能顯著提升 Qwen3 在特定格式輸出的穩定性。

### 4. 思考模式調優 (針對 QwQ 系列)
若使用 `qwq:32b`（Qwen 的推理分支）：
- **設定足夠的超時**：推理過程可能長達 30-60 秒。
- **強制結構輸出**：要求模型在最後給出 `Final Answer:`。

---

## 📝 Code Example: 自動化文件處理

```python
import requests
import json

def ask_qwen(prompt, model="qwen3:8b"):
    url = "http://localhost:11434/api/generate"
    data = {
        "model": model,
        "prompt": f"你是一個專業的文案整理專家。請將以下內容整理成 Markdown 表格：\n{prompt}",
        "stream": False
    }
    response = requests.post(url, json=data)
    return response.json()['response']

# 範例：整理日誌
log_data = "2026-02-16 10:00 ERROR Database timeout; 2026-02-16 10:05 INFO Backup success"
print(ask_qwen(log_data))
```
