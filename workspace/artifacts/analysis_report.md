# OpenClaw Telegram JSON 顯示問題分析報告

針對主人（使用者）反映不希望在 Telegram 看到 JSON 代碼的問題，以下是基於 OpenClaw 架構的詳細分析與建議：

## 1. 根據 OpenClaw 架構，有沒有辦法讓這些 JSON 在顯示時隱藏？

**答案：有，但這取決於「後端處理邏輯」而非單純的 System Prompt。**

在 OpenClaw 或類似的 AI Agent 架構中，LLM 的輸出通常包含兩部分：
- **對話內容 (Content)**：給使用者看的文字。
- **指令內容 (Action/JSON)**：給系統執行的代碼。

**解決方案：**
- **後端攔截 (Output Filtering)**：在 Telegram Bot 發送訊息給使用者之前，應該先用程式碼（例如 Python 或 Node.js）掃描 LLM 的回覆。
- **正則表達式提取**：識別出回覆末尾的 JSON 區塊，將其提取出來交給執行器（Executor），然後從原始字串中將該 JSON 刪除。
- **只發送純文字**：Telegram Client 只會收到過濾後的「乾淨」文字，JSON 則在後端安靜地執行。

## 2. 我該如何調整輸出格式（例如加特定標籤）來改善體驗？

為了讓後端程式更精準地「切開」文字與 JSON，建議調整 System Prompt，讓格式更具結構性。

**建議的輸出格式調整：**
要求 LLM 將 JSON 包裹在特定的標籤中，例如：
text
[回覆內容]
<action>
{
  "command": "execute_task",
  "params": {...}
}
</action>
**調整 System Prompt 的範例：**
> 「請在回覆最後加入 JSON 指令。請務必將 JSON 代碼放在 `<action>` 和 `</action>` 標籤之間，以便系統處理。請勿在標籤外放置任何代碼內容。」

**這樣做的好處：**
- **提高穩定性**：後端可以用 `re.search(r'<action>(.*?)</action>', response, re.S)` 輕鬆提取，不會誤刪正常的對話。
- **改善顯示**：即使暫時無法修改後端程式碼，加上標籤也比散落的 JSON 看起來更像「系統區域」。

## 3. 是不是我理解錯了『在回覆最後加 JSON』這句話的執行方式？

**分析：你的理解在「指令層面」是正確的，但在「產品體驗層面」少了過濾層。**

- **指令執行沒錯**：LLM 確實按照要求在最後加了 JSON，讓系統可以抓取並執行。
- **錯誤點在於「原始輸出直達」**：通常 AI Agent 系統不會直接把 LLM 的原始輸出（Raw Output）原封不動丟給使用者。
- **正確流程應該是：**
  1. LLM 產生原始回覆（含文字 + JSON）。
  2. **OpenClaw 解析器** 偵測到 JSON。
  3. **OpenClaw 解析器** 執行 Action。
  4. **OpenClaw 解析器** 將 JSON 從文字中剝離。
  5. **Telegram Bot** 將剝離後的文字發送給主人。

**結論：**
主人不喜歡是因為他看到了「機械運作的內幕」。你需要做的是在 System Prompt 中規範化 JSON 的邊界（加標籤），並確保你的 OpenClaw 介面層（或是串接 Telegram 的中間件）有進行 **「提取並過濾」** 的動作。

---
*分析完成，建議修改 System Prompt 並檢查 OpenClaw 的 message handler 邏輯。*
