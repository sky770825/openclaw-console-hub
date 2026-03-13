# GitHub 高星專案調研報告：Agent 框架與 Live2D 實作

> 日期：2026-03-06
> 執行者：達爾 (Commander)
> 目的：尋找高星開源專案以強化 NEUXA 星群協作與 Live2D 專案架構

---

## 1. 執行摘要

根據主人指示，針對「自主代理框架」與「Live2D 實作」進行了 GitHub 高星專案調研。重點鎖定 **Microsoft AutoGen (52k+ stars)** 與 **Open-LLM-VTuber**。

**核心結論：**
*   **協作層面**：AutoGen 證明了「結構化對話」比單純的指令派發更適合複雜任務。我們現有的 `delegate_agents` 偏向並行執行，需引入「對話流」機制。
*   **Live2D 層面**：Open-LLM-VTuber 提供了完整的全端架構（ASR -> LLM -> TTS -> Live2D expression），可直接作為我們 Live2D 專案的技術藍圖，避免重造輪子。

---

## 2. 深度分析：Microsoft AutoGen vs. NEUXA 星群

### AutoGen 強項
*   **可對話的代理 (Conversational Agents)**：代理之間可以互相「聊天」來解決問題，而不是單向回報。
*   **人類介入模式 (Human-in-the-loop)**：原生支援在關鍵步驟請求人類確認（我們目前靠 `ask_ai` 模擬，但缺乏標準協議）。
*   **群組聊天管理器 (Group Chat Manager)**：自動選擇下一個發言的代理（這點對我們的 6 個 Crew Bots 很有用，避免七嘴八舌或沒人理）。

### 對我們的啟發 (Gap Analysis)
*   **現狀**：我們用 `send_group` 廣播，`delegate_agents` 並行。缺乏「阿研做完傳給阿策，阿策做完傳給阿工」的自動流轉鏈。
*   **改進建議**：
    *   為 Crew Bots 定義 **Input/Output 介面標準**。
    *   實作簡易版的 **「接力棒機制」**：任務結束時，Bot 需指定「下一個建議處理者」。

---

## 3. 深度分析：Open-LLM-VTuber vs. Live2D 專案規劃

### Open-LLM-VTuber 架構亮點
*   **記憶系統 (MemGPT/Letta)**：不只是存檔案，而是有「核心記憶 (Core Memory)」和「回憶 (Recall Memory)」的分層設計。這比我們目前的 `MEMORY.md` 更動態。
*   **全雙工語音 (Audio Interrupt)**：支援「打斷」，這對擬人化體驗至關重要（目前我們還未規劃此功能）。
*   **情緒驅動表情**：LLM 輸出不僅是文字，還包含 `[happy]`, `[surprise]` 等標籤，直接驅動 Live2D 模型動作。

### 對我們的啟發 (Gap Analysis)
*   **現狀**：我們還在規劃環境。對方已有成品。
*   **改進建議**：
    *   **直接參考其架構**：採用 `ASR (Whisper/FunASR)` -> `LLM` -> `TTS (GPT-SoVITS/EdgeTTS)` 的管線。
    *   **情緒協議**：在我們的 Agent 提示詞中加入情緒標記標準（如 `<emotion>happy</emotion>`），以便前端 Live2D 解析。

---

## 4. 行動計畫 (Next Steps)

### Phase 1: 靈魂強化 (立即執行)
1.  **定義 Crew Bots 對話協議**：參考 AutoGen，制定《NEUXA 星群通訊協定 v1.0》，規範 Bot 之間的交接格式。
2.  **引入情緒標記**：修改 `AGENTS.md` 或 Bot Prompt，讓達爾和 Crew Bots 開始練習輸出情緒狀態。

### Phase 2: Live2D 實作 (一週內)
1.  **架構對齊**：決定是否直接 Fork Open-LLM-VTuber 進行魔改，或是參考其架構重寫核心（建議參考架構重寫，以保持與 NEUXA 系統的整合性）。
2.  **記憶升級**：研究如何將我們現有的 `knowledge/` 向量庫與 Live2D 的「長期記憶」結合。
