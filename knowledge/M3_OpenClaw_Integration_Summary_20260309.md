# M3 Ultra 與 OpenClaw 整合戰略總結報告 (2026-03-09)

## 戰略總結：從「串行指揮官」到「並行戰略家」的巨大躍遷
M3 Ultra 的 28 核心 CPU 和 96GB 統一記憶體，將使 OpenClaw 從一個依賴外部、受限於延遲和成本的「串行指揮官」，進化為一個能夠在本地並行處理海量資訊、擁有無限上下文、且成本可控的「並行戰略家」。這代表著系統的瓶頸不再是硬體，而是戰略構想的極限。

## 1. M3 Ultra 帶來的核心能力提升

### a. 強大的本地 LLM 選擇與應用
*   *96GB 記憶體*：足以穩定運行 Meta Llama 3 70B Instruct (39GB)、Mixtral 8x22B Instruct (78GB 稀疏)、Qwen1.5-72B-Chat (41GB) 和 Code Llama 70B Instruct (39GB) 等頂級開源模型，並可分配巨大上下文窗口。
*   *核心場景應用*：
    *   *代碼分析與生成*：可將整個專案源代碼作為上下文，進行系統級重構，並行執行 Code Review、樣板代碼生成等任務，實現零延遲、絕對數據隱私和架構級洞察。
    *   *知識庫 RAG 與複雜查詢*：數十 GB 的知識庫可直接載入記憶體，檢索速度提升千倍，實現近乎無限的上下文理解，處理跨文件、跨知識點的複雜查詢。
    *   *多輪對話與上下文理解*：維持超長對話上下文，避免雲端模型「遺忘」問題，精準理解意圖，提升溝通效率。

### b. 解放 Token 計費，最大化利用「免費 Token」
*   徹底擺脫外部 API 的 Token 成本限制，轉變為一次性硬體投資。
*   可無限次進行提示詞工程、複雜推理鏈測試，無需顧慮成本。
*   深度上下文利用，可無顧慮地塞入巨量上下文（數萬甚至數十萬 Token）。
*   所有敏感數據處理均在本地完成，杜絕數據外洩風險。
*   策略：無限自動化（日報、會議紀要）、深度研究探索、本地模型微調、多模型協作。

## 2. 系統遷移決策：採用 Ollama 路線

*   *決策依據*：經過小蔡與 Gemini Pro 雙重校準，我們決定採用 Ollama 作為 M3 Ultra 的推理引擎，放棄 MLX Native。
    *   *原因*：MLX 雖快 10-30%，但 Ollama 在 M3 Ultra 上已足夠快，且遷移成本為零（標準 REST API 與現有 TS Server 架構無縫接軌），生態維護開箱即用。
*   *現有代碼相容性*：OpenClaw /server/src 已具備 Ollama 整合能力（Config、Types、Logic），遷移成本為零。

## 3. M3 Ultra (96GB) 戰力配置戰略

*   *可用 VRAM*：約 80GB (保留 16GB 給 macOS 與 Docker)。
*   *策略*：「旗艦單核 + 輕量僚機」。
    *   *方案 A (極致思考)*：主力 DeepSeek-R1-Distill-Llama-70B (Q4_K_M) 佔 43GB，僚機 Qwen2.5-7B (Q4) 佔 5GB。總佔用 48GB，剩餘 32GB 給上下文。*安全可行。*
    *   *方案 B (高速執行)*：主力 Qwen2.5-32B (Q4) 佔 20GB，僚機 Qwen2.5-7B (Q4) 佔 5GB。總佔用 25GB，剩餘 55GB。*速度極快，可同時開多個 Agent。*

## 4. Day-1 接軌執行步驟 (SOP)

設備到貨後，請依序執行：
*   *Step 1: 環境準備*：安裝 Ollama (brew install ollama)，並驗證 Metal 加速。
*   *Step 2: 模型下載*：根據推薦組合下載模型（如 ollama pull deepseek-r1:70b）。
*   *Step 3: 系統切換*：修改 .env 配置 AI_PROVIDER=ollama、OLLAMA_BASE_URL，並設定 MODEL_SMART 和 MODEL_FAST，最後啟動 Server (npm run dev)。

## 5. 團隊協作校準紀錄

阿工已準確評估 MLX vs Ollama 的優劣，建議採納 Ollama 路線。